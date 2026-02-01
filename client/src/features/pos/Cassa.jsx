// client/src/features/pos/Cassa.jsx - VERSIONE V7 (SOCKET & NO-POLLING) 💰
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext'; // <--- CONTEXT
import API_URL from '../../config';

// Suono cassa (opzionale)
const CASH_SOUND = "https://actions.google.com/sounds/v1/cartoon/clank_car_crash.ogg"; // O un suono di monete

function Cassa() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { socket, joinRoom } = useSocket();

  // Dati
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [tavoliOrdini, setTavoliOrdini] = useState({}); // Oggetto { "1": [ordini], "2": [ordini] }
  const [layoutSala, setLayoutSala] = useState([]); // Per la mappa visiva
  const [storico, setStorico] = useState([]);
  
  // UI
  const [tab, setTab] = useState('sala'); // 'sala', 'lista', 'storico'
  const [selectedTavolo, setSelectedTavolo] = useState(null); // Tavolo selezionato per dettagli
  const [loading, setLoading] = useState(true);

  // Auth
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);

  // 1. CARICAMENTO INIZIALE
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(r => r.json())
      .then(data => {
          setInfoRistorante(data);
          
          // Layout Sala (se esiste)
          if(data.layout_sala) {
              try { setLayoutSala(JSON.parse(data.layout_sala)); } catch(e){}
          }

          // Auto-Login Sessione
          const sessionKey = `cassa_session_${data.id}`;
          if (localStorage.getItem(sessionKey) === "true") {
              setIsAuthorized(true);
              joinRoom(data.id);
              fetchDati(data.id);
          }
      })
      .catch(err => console.error(err));
  }, [slug]);

  // 2. SOCKET LISTENER
  useEffect(() => {
      if (!socket || !isAuthorized || !infoRistorante) return;

      const handleRefresh = () => {
          console.log("💰 CASSA: Aggiornamento dati ricevuto");
          fetchDati(infoRistorante.id);
      };

      socket.on('refresh_ordini', handleRefresh);
      socket.on('nuovo_ordine', handleRefresh); // Aggiorna anche su nuovi ordini

      return () => {
          socket.off('refresh_ordini', handleRefresh);
          socket.off('nuovo_ordine', handleRefresh);
      };
  }, [socket, isAuthorized, infoRistorante]);

  // 3. RECUPERO DATI (Ordini Attivi)
  const fetchDati = async (ristoranteId) => {
      try {
          const res = await fetch(`${API_URL}/api/ordini/attivi/${ristoranteId}`);
          const ordini = await res.json();
          
          // Raggruppa per Tavolo
          const mappa = {};
          ordini.forEach(o => {
              if(!mappa[o.tavolo]) mappa[o.tavolo] = [];
              mappa[o.tavolo].push(o);
          });
          setTavoliOrdini(mappa);
          setLoading(false);
      } catch (e) { console.error("Err fetch cassa", e); }
  };

  const fetchStorico = async () => {
      if(!infoRistorante) return;
      const res = await fetch(`${API_URL}/api/cassa/storico/${infoRistorante.id}`);
      const data = await res.json();
      setStorico(data);
  };

  // 4. AZIONI (Pagamento)
  const handlePagamento = async (ordineId) => {
      if(!window.confirm("Confermi il pagamento e chiusura ordine?")) return;

      try {
          await fetch(`${API_URL}/api/ordini/${ordineId}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ stato: 'pagato' }) // 'pagato' lo archivia
          });
          // Il socket farà refresh automatico
          setSelectedTavolo(null); // Chiude modale
      } catch(e) { alert("Errore pagamento"); }
  };

  // 5. LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    // Usa pw_cassa o password admin
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

  // --- RENDER LOGIN ---
  if (!infoRistorante) return <div style={{padding:20}}>Caricamento...</div>;
  if (!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50'}}>
          <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center', minWidth:300}}>
              <h1>💰 Cassa</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="PIN Cassa" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{padding:10, width:'100%', marginBottom:10}} />
                  {loginError && <p style={{color:'red'}}>PIN Errato</p>}
                  <button style={{padding:10, width:'100%', background:'#27ae60', color:'white', border:'none', cursor:'pointer'}}>ACCEDI</button>
              </form>
          </div>
      </div>
  );

  // Helper calcolo totale tavolo
  const getTotaleTavolo = (tavoloNum) => {
      const ords = tavoliOrdini[tavoloNum] || [];
      return ords.reduce((acc, o) => acc + parseFloat(o.prezzo_totale), 0);
  };

  // --- RENDER CASSA ---
  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', flexDirection:'column'}}>
      
      {/* HEADER */}
      <div style={{background:'#2c3e50', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:20}}>
              <h2 style={{margin:0}}>💰 Cassa: {infoRistorante.ristorante}</h2>
              <div style={{display:'flex', gap:10}}>
                  <button onClick={()=>setTab('sala')} style={{background: tab==='sala'?'#3498db':'#34495e', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Mappa Sala</button>
                  <button onClick={()=>setTab('lista')} style={{background: tab==='lista'?'#3498db':'#34495e', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Lista Tavoli</button>
                  <button onClick={()=>{setTab('storico'); fetchStorico();}} style={{background: tab==='storico'?'#3498db':'#34495e', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Storico</button>
              </div>
          </div>
          <button onClick={()=>{localStorage.removeItem(`cassa_session_${infoRistorante.id}`); setIsAuthorized(false);}} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Esci</button>
      </div>

      {/* BODY */}
      <div style={{padding:20, flex:1, overflowY:'auto'}}>
          
          {/* VISTA 1: LISTA SEMPLICE */}
          {tab === 'lista' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:20}}>
                  {Object.keys(tavoliOrdini).length === 0 && <p>Nessun tavolo attivo.</p>}
                  {Object.keys(tavoliOrdini).map(tNum => (
                      <div key={tNum} onClick={()=>setSelectedTavolo(tNum)} style={{background:'white', padding:20, borderRadius:8, cursor:'pointer', borderLeft:'5px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                          <h2 style={{margin:0}}>Tavolo {tNum}</h2>
                          <div style={{color:'#7f8c8d', fontSize:14}}>{tavoliOrdini[tNum].length} Ordini</div>
                          <div style={{marginTop:10, fontSize:20, fontWeight:'bold', color:'#2c3e50'}}>€ {getTotaleTavolo(tNum).toFixed(2)}</div>
                      </div>
                  ))}
              </div>
          )}

          {/* VISTA 2: MAPPA GRAFICA (Semplificata) */}
          {tab === 'sala' && (
              <div style={{position:'relative', width:'100%', height:'600px', background:'#ddd', borderRadius:10, overflow:'hidden'}}>
                  {layoutSala.length === 0 && <p style={{padding:20}}>Nessun layout configurato. Usa la vista Lista.</p>}
                  {layoutSala.map(t => {
                      const isActive = tavoliOrdini[t.numero];
                      return (
                          <div 
                            key={t.id}
                            onClick={()=>{if(isActive) setSelectedTavolo(t.numero)}}
                            style={{
                                position:'absolute', 
                                left: t.x, top: t.y,
                                width: t.shape === 'rect' ? 100 : 70,
                                height: 70,
                                background: isActive ? '#27ae60' : '#bdc3c7',
                                color: isActive ? 'white' : '#555',
                                borderRadius: t.shape === 'round' ? '50%' : '8px',
                                display:'flex', justifyContent:'center', alignItems:'center',
                                fontWeight:'bold', cursor: isActive ? 'pointer' : 'default',
                                boxShadow: isActive ? '0 0 10px rgba(39, 174, 96, 0.5)' : 'none',
                                border: '2px solid white'
                            }}
                          >
                              {t.numero}
                              {isActive && <div style={{position:'absolute', bottom:-20, background:'white', color:'black', padding:'2px 5px', borderRadius:4, fontSize:10, border:'1px solid #ccc'}}>€{getTotaleTavolo(t.numero).toFixed(2)}</div>}
                          </div>
                      )
                  })}
              </div>
          )}

          {/* VISTA 3: STORICO */}
          {tab === 'storico' && (
              <table style={{width:'100%', background:'white', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{background:'#eee', textAlign:'left'}}>
                          <th style={{padding:10}}>Data</th>
                          <th style={{padding:10}}>Tavolo</th>
                          <th style={{padding:10}}>Totale</th>
                          <th style={{padding:10}}>Cliente</th>
                      </tr>
                  </thead>
                  <tbody>
                      {storico.map(o => (
                          <tr key={o.id} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:10}}>{new Date(o.data_creazione).toLocaleString()}</td>
                              <td style={{padding:10}}>{o.tavolo}</td>
                              <td style={{padding:10}}>€ {parseFloat(o.prezzo_totale).toFixed(2)}</td>
                              <td style={{padding:10}}>{o.nome_cliente || '-'}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* MODALE DETTAGLIO TAVOLO */}
      {selectedTavolo && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'end'}}>
              <div style={{width:400, background:'white', height:'100%', padding:20, boxShadow:'-5px 0 15px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                      <h2 style={{margin:0}}>Tavolo {selectedTavolo}</h2>
                      <button onClick={()=>setSelectedTavolo(null)} style={{background:'none', border:'none', fontSize:20, cursor:'pointer'}}>✕</button>
                  </div>

                  <div style={{flex:1, overflowY:'auto'}}>
                      {tavoliOrdini[selectedTavolo]?.map(ord => (
                          <div key={ord.id} style={{marginBottom:15, borderBottom:'1px solid #eee', paddingBottom:10}}>
                              <div style={{fontSize:12, color:'#7f8c8d'}}>{new Date(ord.data_creazione).toLocaleTimeString()}</div>
                              {ord.prodotti.map((p, i) => (
                                  <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:14, margin:'5px 0'}}>
                                      <span>{p.qta}x {p.nome}</span>
                                      <span>€ {parseFloat(p.prezzo).toFixed(2)}</span>
                                  </div>
                              ))}
                              {ord.note_cliente && <div style={{background:'#fff3cd', fontSize:12, padding:5}}>Note: {ord.note_cliente}</div>}
                          </div>
                      ))}
                  </div>

                  <div style={{marginTop:20, borderTop:'2px solid #333', paddingTop:20}}>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:'bold', marginBottom:20}}>
                          <span>TOTALE:</span>
                          <span>€ {getTotaleTavolo(selectedTavolo).toFixed(2)}</span>
                      </div>
                      
                      <button 
                        onClick={() => {
                            // Paghiamo tutti gli ordini di questo tavolo
                            // In un sistema reale, potresti voler unire i conti o pagare separatamente.
                            // Qui paghiamo ordine per ordine per semplicità
                            tavoliOrdini[selectedTavolo].forEach(o => handlePagamento(o.id));
                        }}
                        style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', fontSize:18, borderRadius:5, cursor:'pointer'}}
                      >
                          INCASSA TUTTO 💶
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

export default Cassa;