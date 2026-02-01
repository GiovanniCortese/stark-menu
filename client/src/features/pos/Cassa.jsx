// client/src/features/pos/Cassa.jsx - VERSIONE V105 (SOCKET, MAPPA & DETTAGLI) 💰
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import API_URL from '../../config';

// Suono cassa
const CASH_SOUND = "https://actions.google.com/sounds/v1/cartoon/clank_car_crash.ogg";

function Cassa() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { socket, joinRoom } = useSocket();

  // --- DATI ---
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [tavoliOrdini, setTavoliOrdini] = useState({}); // { "1": [ordini], "2": [ordini] }
  const [layoutSala, setLayoutSala] = useState([]); 
  const [storico, setStorico] = useState([]);
  
  // --- UI ---
  const [tab, setTab] = useState('sala'); // 'sala', 'lista', 'storico'
  const [selectedTavolo, setSelectedTavolo] = useState(null); // Numero tavolo selezionato
  const [loading, setLoading] = useState(true);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);

  // --- AUTH ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);

  // 1. CARICAMENTO & AUTH CHECK
  useEffect(() => {
    const init = async () => {
        try {
            // Fetch Menu & Config
            const res = await fetch(`${API_URL}/api/menu/${slug}`);
            const data = await res.json();
            setInfoRistorante(data);

            // Check Modulo Abilitato
            if (data.modulo_cassa === false) {
                setIsModuleDisabled(true);
                setLoading(false);
                return;
            }
            
            // Fetch Layout Sala
            if(data.id) {
                try {
                    const resConf = await fetch(`${API_URL}/api/ristorante/config/${data.id}`);
                    const conf = await resConf.json();
                    if(conf.layout_sala) setLayoutSala(conf.layout_sala);
                } catch(e) {}
            }

            // --- ADMIN BYPASS & SESSION CHECK ---
            const sessionKey = `cassa_session_${data.id}`;
            const adminSession = localStorage.getItem(`stark_admin_session_${slug}`);
            const userStored = localStorage.getItem("user");
            
            let autoAuth = false;
            if (localStorage.getItem(sessionKey) === "true") autoAuth = true;
            if (adminSession === 'true') autoAuth = true;
            
            // Check God Mode / Owner
            if (userStored) {
                try {
                    const u = JSON.parse(userStored);
                    if (u.slug === slug || u.is_god_mode) autoAuth = true;
                } catch(e){}
            }

            if (autoAuth) {
                setIsAuthorized(true);
                joinRoom(data.id);
                fetchDati(data.id);
            }
            
            setLoading(false);

        } catch (err) {
            console.error("Init Error:", err);
            setLoading(false);
        }
    };
    init();
  }, [slug]);

  // 2. SOCKET LISTENER
  useEffect(() => {
      if (!socket || !isAuthorized || !infoRistorante) return;

      const handleRefresh = (data) => {
          console.log("💰 CASSA: Aggiornamento dati ricevuto", data);
          // Se riceviamo i dati direttamente (socket ottimizzato), usiamoli, altrimenti fetch
          fetchDati(infoRistorante.id);
      };

      socket.on('refresh_ordini', handleRefresh);
      socket.on('nuovo_ordine', handleRefresh);
      socket.on('aggiornamento_ordini', handleRefresh); // Compatibilità vecchi eventi

      return () => {
          socket.off('refresh_ordini', handleRefresh);
          socket.off('nuovo_ordine', handleRefresh);
          socket.off('aggiornamento_ordini', handleRefresh);
      };
  }, [socket, isAuthorized, infoRistorante]);

  // 3. RECUPERO DATI
  const fetchDati = async (ristoranteId) => {
      try {
          const res = await fetch(`${API_URL}/api/ordini/attivi/${ristoranteId}`);
          const ordini = await res.json();
          
          // Raggruppa per Tavolo
          const mappa = {};
          ordini.forEach(o => {
              const tName = o.tavolo || "Banco";
              if(!mappa[tName]) mappa[tName] = [];
              mappa[tName].push(o);
          });
          setTavoliOrdini(mappa);
      } catch (e) { console.error("Err fetch cassa", e); }
  };

  const fetchStorico = async () => {
      if(!infoRistorante) return;
      const res = await fetch(`${API_URL}/api/cassa/storico/${infoRistorante.id}`);
      const data = await res.json();
      setStorico(data);
  };

  // 4. AZIONI
  const playSound = () => {
      try { const audio = new Audio(CASH_SOUND); audio.volume = 0.5; audio.play(); } catch(e){}
  };

  const handlePagamento = async (ordineId) => {
      try {
          await fetch(`${API_URL}/api/ordini/${ordineId}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ stato: 'pagato' })
          });
          // Il socket aggiornerà la lista, ma per feedback immediato:
          playSound();
      } catch(e) { alert("Errore pagamento"); }
  };

  const handleIncassaTutto = async () => {
      if(!selectedTavolo || !window.confirm(`Incassare tutto il tavolo ${selectedTavolo}?`)) return;
      const ordini = tavoliOrdini[selectedTavolo] || [];
      
      // Eseguiamo in parallelo
      await Promise.all(ordini.map(o => handlePagamento(o.id)));
      
      setSelectedTavolo(null);
  };

  // 5. LOGIN HANDLER
  const handleLogin = (e) => {
    e.preventDefault();
    if (!infoRistorante) return;
    
    // Verifica PIN Cassa o Password Admin
    if (passwordInput === infoRistorante.pw_cassa || passwordInput === infoRistorante.password) {
        setIsAuthorized(true);
        localStorage.setItem(`cassa_session_${infoRistorante.id}`, "true");
        joinRoom(infoRistorante.id);
        fetchDati(infoRistorante.id);
        setLoginError(false);
    } else {
        setLoginError(true);
    }
  };

  // --- HELPER CALCOLO ---
  const getTotaleTavolo = (tavoloNum) => {
      const ords = tavoliOrdini[tavoloNum] || [];
      return ords.reduce((acc, o) => acc + parseFloat(o.prezzo_totale || o.totale || 0), 0);
  };

  // --- RENDER ---
  if (loading) return <div className="loading-screen">Caricamento Cassa...</div>;
  if (isModuleDisabled) return <div className="error-screen"><h1>⛔ Modulo Cassa Disabilitato</h1></div>;

  if (!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50'}}>
          <div style={{background:'white', padding:40, borderRadius:12, textAlign:'center', width:'100%', maxWidth:350, boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
              <div style={{fontSize:'3rem', marginBottom:10}}>💰</div>
              <h2 style={{margin:0, color:'#333'}}>Cassa Smart</h2>
              <p style={{color:'#7f8c8d', marginBottom:20}}>{infoRistorante?.ristorante}</p>
              
              <form onSubmit={handleLogin}>
                  <input 
                    type="password" 
                    placeholder="PIN Cassa" 
                    value={passwordInput} 
                    onChange={e=>setPasswordInput(e.target.value)} 
                    style={{padding:12, width:'100%', marginBottom:15, borderRadius:6, border:'1px solid #ddd', fontSize:16, textAlign:'center'}} 
                    autoFocus
                  />
                  {loginError && <p style={{color:'#e74c3c', fontSize:14, marginTop:-10, marginBottom:10}}>PIN Errato</p>}
                  <button style={{padding:12, width:'100%', background:'#27ae60', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:16}}>ACCEDI</button>
              </form>
          </div>
      </div>
  );

  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', flexDirection:'column', fontFamily:'sans-serif'}}>
      
      {/* HEADER */}
      <div style={{background:'#2c3e50', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
          <div style={{display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <span style={{fontSize:'1.5rem'}}>💰</span>
                  <div>
                      <h2 style={{margin:0, fontSize:'1.2rem'}}>{infoRistorante.ristorante}</h2>
                      <span style={{fontSize:'0.8rem', opacity:0.8}}>Cassa Operatore</span>
                  </div>
              </div>
              
              <div style={{display:'flex', gap:5, background:'rgba(255,255,255,0.1)', padding:5, borderRadius:8}}>
                  <NavBtn active={tab==='sala'} onClick={()=>setTab('sala')}>🗺️ Sala</NavBtn>
                  <NavBtn active={tab==='lista'} onClick={()=>setTab('lista')}>📋 Lista Tavoli</NavBtn>
                  <NavBtn active={tab==='storico'} onClick={()=>{setTab('storico'); fetchStorico();}}>📜 Storico</NavBtn>
              </div>
          </div>
          <button onClick={()=>{if(confirm("Uscire?")){localStorage.removeItem(`cassa_session_${infoRistorante.id}`); setIsAuthorized(false);}}} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Esci</button>
      </div>

      {/* BODY */}
      <div style={{padding:20, flex:1, overflowY:'auto'}}>
          
          {/* VISTA 1: LISTA TAVOLI */}
          {tab === 'lista' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:20}}>
                  {Object.keys(tavoliOrdini).length === 0 && <p style={{color:'#7f8c8d', width:'100%', textAlign:'center'}}>Nessun ordine attivo.</p>}
                  {Object.keys(tavoliOrdini).map(tNum => (
                      <div key={tNum} onClick={()=>setSelectedTavolo(tNum)} className="table-card" style={{background:'white', padding:20, borderRadius:12, cursor:'pointer', borderLeft:'6px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', transition:'transform 0.2s'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                              <h2 style={{margin:0, fontSize:'1.8rem', color:'#2c3e50'}}>{tNum}</h2>
                              <span style={{background:'#eafaf1', color:'#27ae60', padding:'2px 8px', borderRadius:10, fontSize:'0.8rem', fontWeight:'bold'}}>ATTIVO</span>
                          </div>
                          <div style={{color:'#7f8c8d', fontSize:13, marginTop:5}}>{tavoliOrdini[tNum].length} Ordini</div>
                          <div style={{marginTop:15, fontSize:'1.5rem', fontWeight:'bold', color:'#2c3e50'}}>€ {getTotaleTavolo(tNum).toFixed(2)}</div>
                      </div>
                  ))}
              </div>
          )}

          {/* VISTA 2: MAPPA SALA */}
          {tab === 'sala' && (
              <div style={{position:'relative', width:'100%', height:'calc(100vh - 100px)', background:'#dcdde1', borderRadius:12, overflow:'auto', border:'4px solid #bdc3c7'}}>
                  <div style={{width:'2000px', height:'2000px', position:'relative'}}>
                    {layoutSala.length === 0 && <div style={{position:'absolute', top:50, left:50, color:'#555'}}>Mappa non configurata. Usa la vista Lista.</div>}
                    {layoutSala.map(t => {
                        const isActive = tavoliOrdini[t.label] || tavoliOrdini[t.numero]; // Supporto label o numero
                        const tot = isActive ? getTotaleTavolo(t.label || t.numero) : 0;
                        
                        return (
                            <div 
                                key={t.id}
                                onClick={()=>{if(isActive) setSelectedTavolo(t.label || t.numero)}}
                                style={{
                                    position:'absolute', 
                                    left: t.x, top: t.y,
                                    width: t.width || (t.shape === 'rect' ? 100 : 70),
                                    height: t.height || 70,
                                    background: isActive ? '#27ae60' : '#95a5a6',
                                    color: 'white',
                                    borderRadius: t.shape === 'round' ? '50%' : '8px',
                                    display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
                                    fontWeight:'bold', cursor: isActive ? 'pointer' : 'default',
                                    boxShadow: isActive ? '0 0 15px rgba(39, 174, 96, 0.6)' : 'none',
                                    border: '2px solid white',
                                    zIndex: isActive ? 10 : 1,
                                    transition: 'transform 0.2s'
                                }}
                                className={isActive ? 'map-table-active' : ''}
                            >
                                <span style={{fontSize:'1rem'}}>{t.label || t.numero}</span>
                                {isActive && <span style={{fontSize:'0.7rem', background:'rgba(0,0,0,0.2)', padding:'1px 4px', borderRadius:4}}>€{tot.toFixed(0)}</span>}
                            </div>
                        )
                    })}
                  </div>
              </div>
          )}

          {/* VISTA 3: STORICO */}
          {tab === 'storico' && (
              <div style={{background:'white', borderRadius:10, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead style={{background:'#f1f2f6', color:'#555'}}>
                          <tr>
                              <th style={{padding:15, textAlign:'left'}}>Data</th>
                              <th style={{padding:15, textAlign:'left'}}>Tavolo</th>
                              <th style={{padding:15, textAlign:'left'}}>Totale</th>
                              <th style={{padding:15, textAlign:'left'}}>Info</th>
                          </tr>
                      </thead>
                      <tbody>
                          {storico.map(o => (
                              <tr key={o.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:15}}>{new Date(o.data_ordine || o.data_creazione).toLocaleString()}</td>
                                  <td style={{padding:15}}><span style={{fontWeight:'bold', background:'#eee', padding:'3px 8px', borderRadius:4}}>{o.tavolo}</span></td>
                                  <td style={{padding:15, fontWeight:'bold', color:'#27ae60'}}>€ {parseFloat(o.totale || o.prezzo_totale).toFixed(2)}</td>
                                  <td style={{padding:15, fontSize:'0.9rem', color:'#7f8c8d'}}>{o.id}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>

      {/* --- MODALE DETTAGLIO TAVOLO (RICCA) --- */}
      {selectedTavolo && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', justifyContent:'end'}}>
              <div style={{width:'100%', maxWidth:'450px', background:'white', height:'100%', display:'flex', flexDirection:'column', boxShadow:'-5px 0 25px rgba(0,0,0,0.2)', animation:'slideIn 0.3s ease-out'}}>
                  
                  {/* Modal Header */}
                  <div style={{padding:20, background:'#2c3e50', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                          <h2 style={{margin:0}}>Tavolo {selectedTavolo}</h2>
                          <span style={{fontSize:'0.9rem', opacity:0.8}}>Riepilogo Conto</span>
                      </div>
                      <button onClick={()=>setSelectedTavolo(null)} style={{background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:35, height:35, borderRadius:'50%', cursor:'pointer', fontSize:'1.2rem'}}>✕</button>
                  </div>

                  {/* Modal Body (Lista Prodotti Dettagliata) */}
                  <div style={{flex:1, overflowY:'auto', padding:20, background:'#f8f9fa'}}>
                      {tavoliOrdini[selectedTavolo]?.map((ord, idx) => (
                          <div key={ord.id} style={{background:'white', padding:15, borderRadius:10, marginBottom:15, border:'1px solid #eee', boxShadow:'0 2px 5px rgba(0,0,0,0.03)'}}>
                              <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #eee', paddingBottom:8, marginBottom:8}}>
                                  <span style={{fontSize:'0.8rem', color:'#95a5a6', fontWeight:'bold'}}>ORDINE #{ord.id}</span>
                                  <span style={{fontSize:'0.8rem', color:'#95a5a6'}}>{new Date(ord.data_ordine || ord.data_creazione).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                              
                              {/* Prodotti dell'ordine */}
                              {ord.prodotti.map((p, i) => (
                                  <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                                      <div style={{flex:1}}>
                                          <div style={{display:'flex', alignItems:'center', gap:5}}>
                                              {/* Icona Reparto */}
                                              <span style={{fontSize:'1rem'}}>{p.is_bar ? '🍹' : (p.is_pizzeria ? '🍕' : '👨‍🍳')}</span>
                                              <span style={{fontWeight:'bold', color:'#2c3e50'}}>{p.qta}x {p.nome}</span>
                                          </div>
                                          
                                          {/* Varianti & Note */}
                                          <div style={{fontSize:'0.8rem', paddingLeft:25, color:'#7f8c8d'}}>
                                              {p.varianti_scelte?.rimozioni?.length > 0 && (
                                                  <div style={{color:'#c0392b'}}>⛔ No: {p.varianti_scelte.rimozioni.join(', ')}</div>
                                              )}
                                              {p.varianti_scelte?.aggiunte?.length > 0 && (
                                                  <div style={{color:'#27ae60'}}>➕ {p.varianti_scelte.aggiunte.join(', ')}</div>
                                              )}
                                          </div>
                                      </div>
                                      <div style={{fontWeight:'bold', color:'#333'}}>€ {parseFloat(p.prezzo).toFixed(2)}</div>
                                  </div>
                              ))}

                              {/* Note Cliente Ordine */}
                              {ord.note_cliente && (
                                  <div style={{background:'#fff3cd', color:'#856404', padding:'8px', borderRadius:6, fontSize:'0.85rem', marginTop:10, fontStyle:'italic'}}>
                                      📝 "{ord.note_cliente}"
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

                  {/* Modal Footer (Totale & Azioni) */}
                  <div style={{padding:20, background:'white', borderTop:'1px solid #eee', boxShadow:'0 -5px 15px rgba(0,0,0,0.05)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                          <span style={{fontSize:'1.1rem', color:'#7f8c8d'}}>TOTALE DA PAGARE</span>
                          <span style={{fontSize:'2rem', fontWeight:'bold', color:'#27ae60'}}>€ {getTotaleTavolo(selectedTavolo).toFixed(2)}</span>
                      </div>
                      
                      <button 
                        onClick={handleIncassaTutto}
                        style={{width:'100%', padding:18, background:'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color:'white', border:'none', fontSize:'1.1rem', fontWeight:'bold', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 4px 15px rgba(39, 174, 96, 0.4)'}}
                      >
                          <span>💶</span> INCASSA TUTTO
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .table-card:hover { transform: translateY(-3px); }
        .map-table-active:hover { transform: scale(1.1); z-index: 20 !important; }
        .loading-screen { display:flex; justify-content:center; align-items:center; height:100vh; font-size:1.5rem; color:#7f8c8d; }
        .error-screen { display:flex; justify-content:center; align-items:center; height:100vh; background:#111; color:white; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// Helper Component per bottoni navigazione
const NavBtn = ({ active, children, onClick }) => (
    <button 
        onClick={onClick} 
        style={{
            background: active ? 'white' : 'transparent', 
            color: active ? '#2c3e50' : 'white', 
            border:'none', 
            padding:'8px 15px', 
            borderRadius:6, 
            cursor:'pointer', 
            fontWeight: active ? 'bold' : 'normal',
            transition: 'all 0.2s'
        }}
    >
        {children}
    </button>
);

export default Cassa;