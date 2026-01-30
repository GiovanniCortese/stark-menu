// client/src/Cassa.jsx - VERSIONE V102 (FIX: DEFAULT GRID VIEW) 🛠️
import { io } from "socket.io-client";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const navigate = useNavigate(); 
  
  // STATI DATI
  const [tab, setTab] = useState('attivi'); // 'attivi', 'storico', 'pin'
  
  // *** FIX: Impostiamo 'grid' come default, così vedi subito gli ordini anche senza mappa disegnata ***
  const [viewMode, setViewMode] = useState('grid'); // 'map' oppure 'grid'
  
  const [tavoliAttivi, setTavoliAttivi] = useState([]); 
  const [storico, setStorico] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); 
  
  // STATI PIN & SALA
  const [layoutSala, setLayoutSala] = useState([]); 
  const [tavoliStatus, setTavoliStatus] = useState([]); 
  const [showPinModal, setShowPinModal] = useState(null);

  // STATI AUTH
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- 1. CHECK LOGIN ---
  useEffect(() => {
    const checkSession = async () => {
        const sessionKey = `stark_cassa_session_${slug}`;
        const token = localStorage.getItem(sessionKey);
        
        if (token === 'AUTHORIZED') {
            setIsAuthorized(true);
            caricaDati();
        } else {
            // Controlla se esiste il ristorante
            try {
                const res = await fetch(`${API_URL}/api/menu/${slug}`);
                const data = await res.json();
                if (data.modulo_cassa === false) {
                    setIsModuleDisabled(true);
                }
            } catch (err) { console.error(err); }
        }
    };
    checkSession();
  }, [slug]);

  // --- 2. LOGIN HANDLER ---
  const handleLogin = async (e) => {
      e.preventDefault();
      setLoadingLogin(true);
      setLoginError(false);
      try {
          const res = await fetch(`${API_URL}/api/cassa/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, password: passwordInput })
          });
          const data = await res.json();
          if (data.success) {
              localStorage.setItem(`stark_cassa_session_${slug}`, 'AUTHORIZED');
              setIsAuthorized(true);
              caricaDati();
          } else {
              setLoginError(true);
          }
      } catch (err) { alert("Errore connessione"); }
      setLoadingLogin(false);
  };

  // --- 3. CARICAMENTO DATI ---
  const caricaDati = () => {
      fetchOrders();
      fetchConfig();

      const socket = io(API_URL);
      socket.emit('join_ristorante', slug);

      socket.on('aggiornamento_ordini', (data) => {
          if(!Array.isArray(data)) return; // Safety check
          
          const attivi = data.filter(o => o.stato !== 'pagato');
          const pagati = data.filter(o => o.stato === 'pagato');
          
          setTavoliAttivi(attivi);
          setStorico(pagati);
          
          // Aggiorna stato tavoli per la mappa
          calcolaStatoTavoli(attivi);
      });

      return () => socket.disconnect();
  };

  const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/menu/${slug}`);
        const data = await res.json();
        setInfoRistorante(data);
        if(data.layout_sala) setLayoutSala(data.layout_sala);
      } catch(err){ console.error(err); }
  };

  const fetchOrders = async () => {
      try {
          const res = await fetch(`${API_URL}/api/ordini/cassa/${slug}`);
          const data = await res.json();
          
          if(Array.isArray(data)) {
              const attivi = data.filter(o => o.stato !== 'pagato');
              const pagati = data.filter(o => o.stato === 'pagato');
              setTavoliAttivi(attivi);
              setStorico(pagati);
              calcolaStatoTavoli(attivi);
          }
      } catch (error) { console.error("Errore fetch ordini:", error); }
  };

  // --- LOGICA MAPPA ---
  const calcolaStatoTavoli = (ordiniAttivi) => {
      // Mappa: { "Tavolo 1": { occupato: true, totale: 50.00 }, ... }
      const statusMap = {};
      ordiniAttivi.forEach(o => {
          if (!statusMap[o.tavolo]) {
              statusMap[o.tavolo] = { occupato: true, totale: 0, orario: o.data_ordine };
          }
          statusMap[o.tavolo].totale += parseFloat(o.totale || 0);
      });
      setTavoliStatus(statusMap);
  };

  // --- AZIONI ---
  const modificaStatoProdotto = async (ordine, productIndex) => {
      const p = ordine.prodotti[productIndex];
      const nuovoStato = p.stato === 'in attesa' ? 'servito' : 'in attesa';
      
      const nuoviProdotti = [...ordine.prodotti];
      nuoviProdotti[productIndex] = { ...p, stato: nuovoStato };
      
      // Controllo se tutti serviti -> ordine servito
      const tuttiServiti = nuoviProdotti.every(pr => pr.stato === 'servito');
      const nuovoStatoOrdine = tuttiServiti ? 'servito' : 'in attesa';

      try {
          await fetch(`${API_URL}/api/ordini/${ordine.id}/stato`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  stato: nuovoStatoOrdine,
                  prodotti: nuoviProdotti
              })
          });
          // Socket aggiornerà la UI
      } catch (err) { alert("Errore aggiornamento"); }
  };

  const segnaComePagato = async (ordine) => {
      if(!confirm(`Segnare Tavolo ${ordine.tavolo} come PAGATO (€ ${ordine.totale})?`)) return;
      try {
          await fetch(`${API_URL}/api/ordini/${ordine.id}/pagato`, { method: 'PUT' });
      } catch(err) { alert("Errore pagamento"); }
  };

  const eliminaOrdine = async (id) => {
      if(!confirm("Eliminare definitivamente questo ordine?")) return;
      try {
          await fetch(`${API_URL}/api/ordini/${id}`, { method: 'DELETE' });
      } catch(err) { alert("Errore eliminazione"); }
  };

  const logout = () => {
      if(confirm("Uscire dalla cassa?")) {
          localStorage.removeItem(`stark_cassa_session_${slug}`);
          window.location.reload();
      }
  };

  const apriLog = (ordine) => setSelectedLog(ordine);
  const chiudiLog = () => setSelectedLog(null);

  // --- RENDER COMPONENTI ---
  
  if (isModuleDisabled) return (
      <div style={{padding:50, textAlign:'center', color:'white', background:'#222', minHeight:'100vh'}}>
          <h1>⛔ Modulo Cassa Disabilitato</h1>
          <p>Contatta l'amministrazione per attivare questo servizio.</p>
      </div>
  );

  if (!isAuthorized) return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#222'}}>
        <div style={{background:'white', padding:30, borderRadius:12, width:350, textAlign:'center'}}>
            <h2 style={{color:'#333'}}>🔐 Accesso Cassa</h2>
            <form onSubmit={handleLogin}>
                <input 
                    type="password" 
                    placeholder="Password Cassa" 
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    style={{width:'100%', padding:12, marginBottom:15, borderRadius:6, border:'1px solid #ddd'}}
                />
                {loginError && <p style={{color:'red'}}>Password errata</p>}
                <button type="submit" disabled={loadingLogin} style={{width:'100%', padding:12, background:'#27ae60', color:'white', border:'none', borderRadius:6, fontWeight:'bold', cursor:'pointer'}}>
                    {loadingLogin ? 'Verifica...' : 'ACCEDI'}
                </button>
            </form>
        </div>
    </div>
  );

  const renderOrdini = () => {
      if(tavoliAttivi.length === 0) return <div style={{textAlign:'center', width:'100%', padding:40, color:'#888'}}>Nessun ordine attivo al momento.</div>;
      
      return tavoliAttivi.map(ord => (
          <div key={ord.id} className="ticket" style={{borderTop: `5px solid ${ord.stato === 'servito' ? '#27ae60' : '#f39c12'}`}}>
              <div className="ticket-header" style={{background:'white', color:'#333', borderBottom:'1px solid #eee'}}>
                  <div>
                      <span style={{fontSize:'1.2rem'}}>Tavolo <b>{ord.tavolo}</b></span>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>{new Date(ord.data_ordine).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'1.3rem', fontWeight:'bold', color:'#27ae60'}}>€ {Number(ord.totale).toFixed(2)}</div>
                      <div style={{fontSize:'0.7rem', color: ord.pagamento_metodo==='contanti'?'#d35400':'#2980b9', textTransform:'uppercase'}}>{ord.pagamento_metodo}</div>
                  </div>
              </div>
              
              <div className="ticket-body" style={{fontSize:'0.9rem'}}>
                  {/* LISTA PRODOTTI */}
                  {renderProdotti(ord, modificaStatoProdotto)}
                  
                  {ord.note && (
                      <div style={{marginTop:10, padding:8, background:'#fff3cd', borderRadius:4, fontSize:'0.85rem', color:'#856404'}}>
                          📝 {ord.note}
                      </div>
                  )}
              </div>

              <div style={{padding:10, display:'flex', gap:5, background:'#f9f9f9'}}>
                  <button onClick={() => segnaComePagato(ord)} style={{flex:1, background:'#27ae60', color:'white'}}>💰 INCASSA</button>
                  <button onClick={() => apriLog(ord)} style={{width:40, background:'#3498db', color:'white'}}>ℹ️</button>
                  <button onClick={() => eliminaOrdine(ord.id)} style={{width:40, background:'#c0392b', color:'white'}}>🗑️</button>
              </div>
          </div>
      ));
  };

  return (
    <div className="cassa-container" style={{background:'#ecf0f1', minHeight:'100vh', padding:20}}>
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, background:'white', padding:15, borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
          <div>
              <h1 style={{margin:0, fontSize:'1.5rem', color:'#2c3e50'}}>💰 Cassa: {infoRistorante?.ristorante || slug}</h1>
              <div style={{fontSize:'0.9rem', color:'#7f8c8d'}}>
                  Incasso Giornaliero: <b>€ {storico.reduce((acc, o) => acc + parseFloat(o.totale), 0).toFixed(2)}</b>
              </div>
          </div>
          <div style={{display:'flex', gap:10}}>
              <button onClick={logout} style={{background:'#c0392b', color:'white'}}>Esci</button>
          </div>
      </div>

      {/* TABS VIEW MODE */}
      <div style={{display:'flex', justifyContent:'center', marginBottom:20, gap:15}}>
          <div style={{background:'white', padding:5, borderRadius:30, display:'flex', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
             <button onClick={()=>setViewMode('grid')} style={{background: viewMode==='grid'?'#34495e':'transparent', color: viewMode==='grid'?'white':'#555', borderRadius:25, padding:'8px 20px'}}>
                 📋 Lista Ordini
             </button>
             <button onClick={()=>setViewMode('map')} style={{background: viewMode==='map'?'#e67e22':'transparent', color: viewMode==='map'?'white':'#555', borderRadius:25, padding:'8px 20px'}}>
                 🗺️ Mappa Sala
             </button>
          </div>
      </div>

      {/* NAVIGATION TABS (Attivi / Storico) */}
      <div style={{marginBottom:20, borderBottom:'2px solid #ddd', display:'flex', gap:20}}>
          <div onClick={() => setTab('attivi')} style={{padding:'10px 0', cursor:'pointer', borderBottom: tab==='attivi'?'3px solid #27ae60':'none', fontWeight:'bold', color: tab==='attivi'?'#27ae60':'#95a5a6'}}>
              IN CORSO ({tavoliAttivi.length})
          </div>
          <div onClick={() => setTab('storico')} style={{padding:'10px 0', cursor:'pointer', borderBottom: tab==='storico'?'3px solid #2980b9':'none', fontWeight:'bold', color: tab==='storico'?'#2980b9':'#95a5a6'}}>
              STORICO PAGATI ({storico.length})
          </div>
          <div onClick={() => setTab('pin')} style={{padding:'10px 0', cursor:'pointer', borderBottom: tab==='pin'?'3px solid #e74c3c':'none', fontWeight:'bold', color: tab==='pin'?'#e74c3c':'#95a5a6'}}>
              🔐 GESTIONE PIN
          </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      {tab === 'attivi' && (
         <>
             {viewMode === 'grid' ? (
                 <div className="ordini-grid">
                     {renderOrdini()}
                 </div>
             ) : (
                 <div className="sala-map-container" style={{
                     width:'100%', height:'600px', background:'#2c3e50', borderRadius:12, position:'relative', overflow:'hidden', border:'4px solid #34495e'
                 }}>
                     {layoutSala.length === 0 && (
                         <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'white', textAlign:'center'}}>
                             <h3>Mappa non configurata</h3>
                             <p>Vai in Admin &gt; Sala per disegnare i tavoli.</p>
                             <button onClick={()=>setViewMode('grid')} style={{marginTop:10, background:'#e67e22', color:'white'}}>Torna alla Griglia</button>
                         </div>
                     )}
                     {layoutSala.map(obj => {
                         const status = tavoliStatus[obj.label]; // { occupato: true, totale: 50 }
                         const isOccupied = status?.occupato;
                         return (
                             <div key={obj.id} style={{
                                 position:'absolute', 
                                 left: obj.x, top: obj.y, 
                                 width: obj.width, height: obj.height, 
                                 borderRadius: obj.type === 'tavolo-rotondo' ? '50%' : '8px',
                                 background: isOccupied ? '#e74c3c' : '#2ecc71',
                                 color: 'white', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
                                 boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border:'2px solid white',
                                 cursor: isOccupied ? 'pointer' : 'default', transition:'transform 0.2s'
                             }}
                             onClick={() => { if(isOccupied) setViewMode('grid'); }} // Cliccando il tavolo occupato torna alla griglia (semplificazione)
                             >
                                 <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{obj.label}</div>
                                 {isOccupied && <div style={{fontSize:'0.75rem'}}>€{status.totale.toFixed(2)}</div>}
                             </div>
                         )
                     })}
                 </div>
             )}
         </>
      )}

      {/* STORICO */}
      {tab === 'storico' && (
          <div style={{background:'white', borderRadius:12, overflow:'hidden'}}>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead style={{background:'#f4f4f4', borderBottom:'2px solid #ddd'}}>
                      <tr>
                          <th style={{padding:15, textAlign:'left'}}>Data</th>
                          <th style={{padding:15, textAlign:'left'}}>Tavolo</th>
                          <th style={{padding:15, textAlign:'left'}}>Totale</th>
                          <th style={{padding:15, textAlign:'left'}}>Metodo</th>
                          <th style={{padding:15, textAlign:'left'}}>Info</th>
                      </tr>
                  </thead>
                  <tbody>
                      {storico.map(ord => (
                          <tr key={ord.id} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:15}}>{new Date(ord.data_ordine).toLocaleString()}</td>
                              <td style={{padding:15}}><b>{ord.tavolo}</b></td>
                              <td style={{padding:15, color:'#27ae60', fontWeight:'bold'}}>€ {Number(ord.totale).toFixed(2)}</td>
                              <td style={{padding:15, textTransform:'uppercase'}}>{ord.pagamento_metodo}</td>
                              <td style={{padding:15}}><button onClick={()=>apriLog(ord)}>📜</button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODALE LOG */}
      {selectedLog && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', justifyContent:'center', alignItems:'center'}}>
            <div style={{background:'white', padding:30, borderRadius:12, maxWidth:500, width:'90%', maxHeight:'80vh', overflowY:'auto'}}>
                <h3>Dettaglio Ordine #{selectedLog.id}</h3>
                <p><b>Data:</b> {new Date(selectedLog.data_ordine).toLocaleString()}</p>
                <p><b>Cliente:</b> {selectedLog.cliente_nome} ({selectedLog.cliente_telefono})</p>
                <hr/>
                {selectedLog.prodotti.map((p,i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'5px 0'}}>
                        <span>{p.nome} {p.varianti_scelte?.rimozioni?.length > 0 && <small style={{color:'red'}}>(-{p.varianti_scelte.rimozioni.join(',')})</small>}</span>
                        <span>€{p.prezzo}</span>
                    </div>
                ))}
                <hr/>
                <h2 style={{textAlign:'right'}}>Totale: €{selectedLog.totale}</h2>
                <button onClick={chiudiLog} style={{marginTop:20, padding:10, width:'100%', cursor:'pointer'}}>Chiudi</button>
            </div>
        </div>
      )}
    </div>
  );
}

const renderProdotti = (ord, modificaStatoProdotto) => {
    // Aggiungo indice originale per non perdere riferimento
    const prods = ord.prodotti.map((p, i) => ({...p, originalIdx: i}));
    
    return prods.map((p, idx) => (
        <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed #ddd'}}>
            <div style={{flex:1}}>
                <div style={{fontWeight: p.stato === 'servito'?'normal':'bold', textDecoration: p.stato==='servito'?'line-through':'none', color: p.stato==='servito'?'#aaa':'#000', fontSize:14}}>{p.nome}</div>
                <div style={{fontSize:'0.75rem', color:'#666'}}>
                    {p.is_bar?'🍹':(p.is_pizzeria?'🍕':'👨‍🍳')} • {Number(p.prezzo).toFixed(2)}€
                    {p.varianti_scelte?.rimozioni?.length > 0 && <span style={{color:'#c0392b', marginLeft:5}}>No: {p.varianti_scelte.rimozioni.join(', ')}</span>}
                    {p.varianti_scelte?.aggiunte?.length > 0 && <span style={{color:'#27ae60', marginLeft:5}}>+ {p.varianti_scelte.aggiunte.join(', ')}</span>}
                </div>
            </div>
            <div style={{display:'flex', gap:5}}>
                <button onClick={() => modificaStatoProdotto(ord, p.originalIdx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11}}>
                    {p.stato === 'servito' ? '✅' : '⏳'}
                </button>
            </div>
        </div>
    ));
};

export default Cassa;