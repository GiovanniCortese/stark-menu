// client/src/features/production/Bar.jsx - VERSIONE V105 (SOCKET, SOUND & BADGES) 🍹
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { useSocket } from '../../context/SocketContext'; 

// Suono notifica
const NOTIFICATION_SOUND = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

function Bar() {
  const { socket, joinRoom } = useSocket();
  const { slug } = useParams();
  const navigate = useNavigate();

  // URL Backend (Definito localmente per sicurezza)
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // Dati
  const [tavoli, setTavoli] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  
  // Auth & UI
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false); 
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // STATO BLOCCO (Suite Disattivata)
  const [isSuiteDisabled, setIsSuiteDisabled] = useState(false);

  // Audio Ref
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND));

  // 1. CARICAMENTO INIZIALE
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(r => r.json())
      .then(data => {
          setInfoRistorante(data);
          
          // Check Modulo Attivo
          const isSuiteActive = data.cucina_super_active !== false; 
          if (!isSuiteActive) setIsSuiteDisabled(true);

          // Auto-login se sessione esiste
          const sessionKey = `bar_session_${data.id}`;
          if (localStorage.getItem(sessionKey) === "true") {
              setIsAuthorized(true);
              joinRoom(data.id); 
              aggiorna(data.id);
          }
      })
      .catch(err => console.error(err));
  }, [slug]);

  // 2. GESTIONE SOCKET (REAL-TIME)
  useEffect(() => {
    if (!socket || !isAuthorized || !infoRistorante) return;

    setIsConnected(socket.connected);

    const handleUpdate = (data) => {
        console.log("🍹 SOCKET BAR: Aggiornamento ricevuto");
        if(data?.type === 'new') {
            audioRef.current.play().catch(e => console.log("Audio bloccato:", e));
        }
        aggiorna(infoRistorante.id);
    };

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('nuovo_ordine', () => handleUpdate({type: 'new'}));
    socket.on('refresh_ordini', () => handleUpdate({type: 'update'}));

    return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('nuovo_ordine');
        socket.off('refresh_ordini');
    };
  }, [socket, isAuthorized, infoRistorante]);

  // 3. RECUPERO DATI
  const aggiorna = (ristoranteId) => {
      const targetId = ristoranteId || infoRistorante?.id;
      if(!targetId) return;

      fetch(`${API_URL}/api/ordini/attivi/${targetId}`)
        .then(r=>r.json())
        .then(data => {
            const nuoviOrdini = (data || []).filter(o => o.stato !== 'pagato' && o.stato !== 'archiviato');
            const gruppiTavolo = {};

            nuoviOrdini.forEach(ord => {
                const prodotti = Array.isArray(ord.prodotti) ? ord.prodotti : [];
                
                // Filtro solo prodotti BAR
                const itemsDiCompetenza = prodotti.filter(p => p.is_bar === true);
                
                // Se tutto servito e ordine servito, saltiamo (ma mostriamo se c'è roba servita ancora attiva sul tavolo)
                const isTuttoServito = itemsDiCompetenza.length > 0 && itemsDiCompetenza.every(p => p.stato === 'servito');
                if (itemsDiCompetenza.length === 0 || (isTuttoServito && ord.stato === 'servito')) return; 

                const t = ord.tavolo;
                if(!gruppiTavolo[t]) gruppiTavolo[t] = { tavolo: t, items: [], orarioMin: ord.data_creazione };
                
                if(new Date(ord.data_creazione) < new Date(gruppiTavolo[t].orarioMin)) {
                    gruppiTavolo[t].orarioMin = ord.data_creazione;
                }

                prodotti.forEach((prod, idx) => {
                    if (!prod.is_bar) return; 

                    gruppiTavolo[t].items.push({
                        ...prod,
                        parentOrderId: ord.id,
                        originalIndex: idx,
                        fullOrderProducts: prodotti,
                        stato: prod.stato || 'in_attesa',      
                        riaperto: prod.riaperto, 
                        cameriere: ord.nome_cliente, 
                        cliente: ord.nome_cliente,
                        // Logica importante recuperata dal vecchio file
                        chiuso_da_cassa: prod.stato === 'servito' && !prod.ora_servizio 
                    });
                });
            });

            const listaTavoli = Object.values(gruppiTavolo).filter(gruppo => {
                if (gruppo.items.length === 0) return false;
                // Mostra il tavolo anche se tutto servito, finché non viene pagato/archiviato
                return true; 
            });

            listaTavoli.sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));
            setTavoli(listaTavoli);
        })
        .catch(e => console.error("Fetch error:", e));
  };

  // 4. LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    setLoadingLogin(true);

    if (passwordInput === infoRistorante.pw_bar) {
        setIsAuthorized(true);
        localStorage.setItem(`bar_session_${infoRistorante.id}`, "true");
        joinRoom(infoRistorante.id);
        aggiorna(infoRistorante.id);
        setLoginError(false);
    } else { 
        setLoginError(true);
    }
    setLoadingLogin(false);
  };

  const handleLogout = () => {
      if(window.confirm("Chiudere il Bar?")) {
        localStorage.removeItem(`bar_session_${infoRistorante.id}`);
        setIsAuthorized(false);
      }
  };

  // 5. AZIONI
  const segnaDrinkPronto = async (targetItems) => {
      const promises = targetItems.map(item => {
          return fetch(`${API_URL}/api/ordini/update-product`, { 
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  order_id: item.parentOrderId,
                  product_index: item.originalIndex,
                  new_status: 'servito'
              })
          });
      });

      try {
          await Promise.all(promises);
      } catch (error) {
          console.error("Errore Bar:", error);
      }
  };

  // --- LOGICHE UI ---
  const getVariantKey = (v) => {
      if(!v) return "";
      const r = (v.rimozioni || []).sort().join('_');
      const a = (v.aggiunte || []).map(x => (typeof x === 'string' ? x : x.nome)).sort().join('_');
      return `${r}|${a}`;
  };

  const processaTavolo = (items) => {
      // Raggruppiamo tutto (Bar non ha portate solitamente, usiamo un unico blocco)
      const groups = [];
      items.forEach(p => {
          const variantKey = getVariantKey(p.varianti_scelte);
          // Chiave unica che include anche lo stato e se è riaperto
          const key = `${p.nome}-${p.stato}-${p.riaperto}-${variantKey}-bar`;
          
          const existing = groups.find(g => g.key === key);
          if (existing) {
              existing.count++;
              existing.sourceItems.push(p);
          } else {
              groups.push({
                  ...p,
                  key,
                  count: 1,
                  sourceItems: [p]
              });
          }
      });
      return groups;
  };

  // --- RENDER ---
  if (isSuiteDisabled) return <div style={{textAlign:'center', padding:50}}><h1>⛔ REPARTO NON ATTIVO</h1></div>;
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Bar...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#1abc9c'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
              <h1 style={{margin:0, fontSize:'3rem'}}>🍹</h1>
              <h2 style={{margin:'10px 0', color:'#2c3e50'}}>Login Bar</h2>
              <h3 style={{margin:'0 0 20px 0', color:'#7f8c8d'}}>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input 
                    type="password" 
                    placeholder="Password Bar" 
                    value={passwordInput} 
                    onChange={e=>setPasswordInput(e.target.value)} 
                    style={{width:'100%', padding:'15px', marginBottom:'15px', fontSize:'18px', borderRadius:'5px', border: loginError ? '2px solid red' : '1px solid #ccc', textAlign:'center'}}
                  />
                  <button style={{width:'100%', padding:'15px', background:'#16a085', border:'none', color:'white', borderRadius:'5px', fontSize:'18px', fontWeight:'bold', cursor:'pointer'}}>
                    {loadingLogin ? "..." : "ENTRA"}
                  </button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{minHeight:'100vh', padding:'20px', background:'#1abc9c'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'rgba(255,255,255,0.1)', padding:10, borderRadius:8}}>
          <div>
            <h1 style={{margin:0, color:'white', fontSize:'1.5rem'}}>🍹 {infoRistorante.ristorante}</h1>
            <span style={{fontSize:'0.8rem', color: isConnected ? '#2ecc71' : '#f1c40f', fontWeight:'bold', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:4}}>
                {isConnected ? '🟢 ONLINE' : '🔴 DISCONNESSO'}
            </span>
          </div>
          <button onClick={handleLogout} style={{background:'white', color:'#16a085', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Esci</button>
      </header>
      
      <div className="ordini-grid" style={{display:'flex', flexWrap:'wrap', gap:'20px'}}>
        {tavoli.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Nessuna bibita in attesa 🧊</h2></div>}

        {tavoli.map(tavoloData => {
            const gruppi = processaTavolo(tavoloData.items);
            const primoItem = tavoloData.items[0];
            
            return (
                <div key={tavoloData.tavolo} className="ticket" style={{background:'white', width:320, borderTop:'5px solid #16a085', borderRadius:8, overflow:'hidden', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                    <div className="ticket-header" style={{
                        display:'flex', justifyContent:'space-between', alignItems:'flex-start', 
                        background: '#16a085', color: 'white', padding: '10px'
                    }}>
                        <div>
                            <span style={{fontSize:'1.8rem', display:'block', lineHeight:1}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
                            <span style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.2)', padding:'2px 6px', borderRadius:'4px'}}>{primoItem?.cameriere || 'Cliente'}</span>
                        </div>
                        <span style={{fontSize:'1.2rem', fontWeight:'bold'}}>{new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        {gruppi.map(item => {
                            const isServito = item.stato === 'servito';
                            let bg = 'white';
                            if (isServito) bg = '#e8f5e9';

                            return (
                                <div key={item.key} onClick={() => { if (!isServito) segnaDrinkPronto(item.sourceItems); }}
                                    style={{
                                        padding:'10px', borderBottom:'1px dashed #ddd', background: bg, 
                                        cursor: isServito ? 'default' : 'pointer', 
                                        display: 'flex', justifyContent:'space-between', alignItems:'center'
                                    }}>
                                    
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                        <span style={{background: isServito ? '#95a5a6' : '#16a085', color:'white', padding:'2px 8px', borderRadius:'12px', fontWeight:'bold', fontSize:'0.9rem', minWidth:'25px', textAlign:'center'}}>
                                            {item.count}x
                                        </span>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold', textDecoration: isServito ? 'line-through' : 'none', color: isServito ? '#aaa' : '#000'}}>
                                                {item.nome}
                                            </div>
                                            
                                            {/* VARIANTI */}
                                            {item.varianti_scelte && (
                                                <div style={{marginTop:'4px', lineHeight:1.2}}>
                                                    {item.varianti_scelte.rimozioni?.map((ing, i) => (
                                                        <span key={i} style={{color:'#c0392b', fontSize:'0.75rem', fontWeight:'bold', marginRight:'4px', display:'block'}}>⛔ NO {ing}</span>
                                                    ))}
                                                    {item.varianti_scelte.aggiunte?.map((ing, i) => (
                                                        <span key={i} style={{color:'#27ae60', fontSize:'0.75rem', fontWeight:'bold', marginRight:'4px', display:'block'}}>➕ {typeof ing === 'string' ? ing : ing.nome}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* BADGE DI STATO (Reintegrati dal vecchio file) */}
                                            <div style={{marginTop:'4px', display:'flex', gap:'5px'}}>
                                                {item.chiuso_da_cassa && isServito && (
                                                    <span style={{background:'#27ae60', color:'white', padding:'2px 6px', borderRadius:'4px', fontSize:'0.6rem', fontWeight:'bold'}}>
                                                        ✅ CASSA
                                                    </span>
                                                )}
                                                {item.riaperto && !isServito && (
                                                    <span style={{background:'#f39c12', color:'white', padding:'2px 5px', borderRadius:'3px', fontSize:'0.6rem', fontWeight:'bold'}}>
                                                        ⚠️ RIAPERTO
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isServito ? <span style={{fontSize:'0.8rem'}}>✅</span> : <span style={{fontSize:'1.2rem'}}>🥤</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}

export default Bar;