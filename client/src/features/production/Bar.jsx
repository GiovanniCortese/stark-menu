// client/src/features/production/Bar.jsx - VERSIONE V7 (SOCKET CONTEXT + SOUND) 🍹
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { useSocket } from '../../context/SocketContext'; // <--- USA IL CONTEXT
import API_URL from '../../config';

// Suono notifica
const NOTIFICATION_SOUND = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

function Bar() {
  const { socket, joinRoom } = useSocket(); // Recupera socket globale
  const { slug } = useParams();
  const navigate = useNavigate();

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
              joinRoom(data.id); // Entra nella stanza socket
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
    
    // Ascolta eventi
    socket.on('nuovo_ordine', () => handleUpdate({type: 'new'}));
    socket.on('refresh_ordini', () => handleUpdate({type: 'update'}));

    return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('nuovo_ordine');
        socket.off('refresh_ordini');
    };
  }, [socket, isAuthorized, infoRistorante]);

  // 3. RECUPERO DATI (SOLO BAR)
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
                
                // --- FILTRO CRUCIALE: SOLO PRODOTTI BAR ---
                const itemsDiCompetenza = prodotti.filter(p => p.is_bar === true);
                
                // Se non c'è nulla da bere o tutto servito, salta
                const isTuttoServito = itemsDiCompetenza.length > 0 && itemsDiCompetenza.every(p => p.stato === 'servito');
                if (itemsDiCompetenza.length === 0 || (isTuttoServito && ord.stato === 'servito')) return; 

                const t = ord.tavolo;
                if(!gruppiTavolo[t]) gruppiTavolo[t] = { tavolo: t, items: [], orarioMin: ord.data_creazione };
                
                if(new Date(ord.data_creazione) < new Date(gruppiTavolo[t].orarioMin)) {
                    gruppiTavolo[t].orarioMin = ord.data_creazione;
                }

                prodotti.forEach((prod, idx) => {
                    // --- SE NON E' BAR, SALTA ---
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
                        chiuso_da_cassa: prod.stato === 'servito' && !prod.ora_servizio 
                    });
                });
            });

            const listaTavoli = Object.values(gruppiTavolo).filter(gruppo => {
                if (gruppo.items.length === 0) return false;
                const tuttiFiniti = gruppo.items.every(p => p.stato === 'servito');
                return !tuttiFiniti;
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

    // Controllo PW Bar
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

  // 5. AZIONI (Segna Drink Pronto)
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
          // Socket farà refresh automatico
      } catch (error) {
          console.error("Errore Bar:", error);
          alert("Errore di connessione.");
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
      // Nel Bar solitamente non ci sono portate, mettiamo tutto insieme o usiamo step 1
      // Ma manteniamo la struttura per compatibilità
      const courses = { 1: [], 2: [], 3: [], 4: [] };
      
      items.forEach(p => {
          let c = p.course || 1; // Default a 1 per il Bar
          if(c < 1) c = 1; 
          if(c > 4) c = 4;
          if(!courses[c]) courses[c] = [];
          courses[c].push(p);
      });

      const isCourseComplete = (courseNum) => {
          if (!courses[courseNum] || courses[courseNum].length === 0) return true; 
          return courses[courseNum].every(p => p.stato === 'servito');
      };

      const courseStatus = {
          1: { locked: false, completed: isCourseComplete(1) },
          2: { locked: false, completed: isCourseComplete(2) }, // Bar sbloccato sempre
          3: { locked: false, completed: isCourseComplete(3) },
          4: { locked: false, completed: isCourseComplete(4) }
      };

      const finalStructure = [];
      [1, 2, 3, 4].forEach(cNum => {
          if (courses[cNum].length === 0) return;

          const groups = [];
          courses[cNum].forEach(p => {
              const variantKey = getVariantKey(p.varianti_scelte);
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
                      sourceItems: [p],
                      isMyStation: true, 
                      stationName: "BAR"
                  });
              }
          });
          
          finalStructure.push({
              courseNum: cNum,
              locked: courseStatus[cNum].locked,
              items: groups
          });
      });
      return finalStructure;
  };

  // --- RENDER 1: BLOCCO ---
  if (isSuiteDisabled) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background:'#ecf0f1', color:'#2c3e50'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#c0392b', textTransform:'uppercase'}}>REPARTO NON ATTIVO</h2>
              <button onClick={() => navigate('/')} style={{marginTop:20, padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Home</button>
          </div>
      );
  }

  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Bar...</h1></div>;

  // --- RENDER 2: LOGIN ---
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
                  {loginError && <div style={{color:'red', marginBottom:'10px'}}>Password Errata!</div>}
                  <button style={{width:'100%', padding:'15px', background:'#16a085', border:'none', color:'white', borderRadius:'5px', fontSize:'18px', fontWeight:'bold', cursor:'pointer'}}>
                    {loadingLogin ? "..." : "ENTRA"}
                  </button>
              </form>
          </div>
      </div>
  );

  // --- RENDER 3: KDS BAR ---
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
            const strutturaOrdine = processaTavolo(tavoloData.items);
            const primoItem = tavoloData.items[0];
            
            return (
                <div key={tavoloData.tavolo} className="ticket" style={{background:'white', width:320, borderTop:'5px solid #16a085', borderRadius:8, overflow:'hidden', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                    <div className="ticket-header" style={{
                        display:'flex', justifyContent:'space-between', alignItems:'flex-start', 
                        background: '#16a085', 
                        color: 'white', padding: '10px'
                    }}>
                        <div>
                            <span style={{fontSize:'1.8rem', display:'block', lineHeight:1}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
                            <span style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.2)', padding:'2px 6px', borderRadius:'4px'}}>{primoItem?.cameriere || 'Cliente'}</span>
                        </div>
                        <span style={{fontSize:'1.2rem', fontWeight:'bold'}}>{new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        {strutturaOrdine.map(section => {
                            return (
                                <div key={section.courseNum} style={{marginBottom:'10px'}}>
                                    {/* Nel Bar spesso non servono gli header step, ma li teniamo se necessari */}
                                    {/* <div style={{background: '#eee', padding:'2px 5px', fontSize:'0.7rem'}}>STEP {section.courseNum}</div> */}

                                    {section.items.map(item => {
                                        const isServito = item.stato === 'servito';
                                        let bg = 'white'; let opacity = 1; let cursor = 'pointer';

                                        if (isServito) { bg = '#e8f5e9'; cursor = 'default'; }

                                        return (
                                            <div key={item.key} onClick={() => { if (!isServito) segnaDrinkPronto(item.sourceItems); }}
                                                style={{padding:'10px', borderBottom:'1px dashed #ddd', background: bg, opacity: opacity, cursor: cursor, display: 'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                
                                                <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                    <span style={{background: isServito ? '#95a5a6' : '#16a085', color:'white', padding:'2px 8px', borderRadius:'12px', fontWeight:'bold', fontSize:'0.9rem', minWidth:'25px', textAlign:'center'}}>
                                                        {item.count}x
                                                    </span>
                                                    <div style={{flex:1}}>
                                                        <div style={{fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold', textDecoration: isServito ? 'line-through' : 'none', color: isServito ? '#aaa' : '#000'}}>
                                                            {item.nome}
                                                        </div>
                                                        
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
                                                    </div>
                                                </div>
                                                {isServito ? <span style={{fontSize:'0.8rem'}}>✅</span> : <span style={{fontSize:'1.2rem'}}>🥤</span>}
                                            </div>
                                        );
                                    })}
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