// client/src/features/production/Cucina.jsx - VERSIONE V106 (SOCKET, PORTATE & BADGES) 👨‍🍳
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import API_URL from '../../config';

// Suono notifica
const NOTIFICATION_SOUND = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

function Cucina() {
  const { socket, joinRoom } = useSocket();
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

  // Priorità Portate (per ordinamento)
  const prioritaPortate = {
      "antipasti": 1,
      "primi": 2,
      "secondi": 3,
      "contorni": 4,
      "pizze": 5,
      "dessert": 6,
      "bevande": 99,
      "altro": 10
  };

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
          const sessionKey = `cucina_session_${data.id}`;
          if (localStorage.getItem(sessionKey) === "true") {
              setIsAuthorized(true);
              joinRoom(data.id); 
              aggiorna(data.id);
          }
      })
      .catch(err => console.error(err));
  }, [slug]);

  // 2. GESTIONE SOCKET
  useEffect(() => {
    if (!socket || !isAuthorized || !infoRistorante) return;

    setIsConnected(socket.connected);

    const handleUpdate = (data) => {
        console.log("👨‍🍳 SOCKET CUCINA: Aggiornamento", data);
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

  // 3. RECUPERO E ELABORAZIONE DATI (LOGICA PORTATE)
  const aggiorna = (ristoranteId) => {
      const targetId = ristoranteId || infoRistorante?.id;
      if(!targetId) return;

      fetch(`${API_URL}/api/ordini/attivi/${targetId}`)
        .then(r => r.json())
        .then(data => {
            const nuoviOrdini = (data || []).filter(o => o.stato !== 'pagato' && o.stato !== 'archiviato');
            const mapTavoli = {};

            nuoviOrdini.forEach(ord => {
                const prodotti = Array.isArray(ord.prodotti) ? ord.prodotti : [];
                
                // Filtro competenza CUCINA (tutto tranne bar e pizzeria pura, a meno che non sia misto)
                // Qui assumiamo che is_bar=false e is_pizzeria=false siano cucina.
                // Oppure tutto ciò che non è bar. Adattare in base alla logica del tuo backend.
                // Nel dubbio: mostriamo tutto ciò che NON è bar puro.
                const itemsCucina = prodotti.filter(p => !p.is_bar && !p.is_pizzeria); // Solo cucina pura
                // Se vuoi mostrare anche le pizze nel monitor cucina, togli !p.is_pizzeria

                // Se tutto servito, saltiamo l'ordine (ma manteniamo il tavolo se ha altri ordini attivi)
                const isTuttoServito = itemsCucina.length > 0 && itemsCucina.every(p => p.stato === 'servito');
                if (itemsCucina.length === 0 || (isTuttoServito && ord.stato === 'servito')) return;

                const tName = ord.tavolo;
                if (!mapTavoli[tName]) {
                    mapTavoli[tName] = { 
                        tavolo: tName, 
                        orarioMin: ord.data_creazione, 
                        sezioni: {} // "Antipasti": [items], "Primi": [items]
                    };
                }

                // Aggiorna orario per ordinamento ticket
                if(new Date(ord.data_creazione) < new Date(mapTavoli[tName].orarioMin)) {
                    mapTavoli[tName].orarioMin = ord.data_creazione;
                }

                itemsCucina.forEach((prod, idx) => {
                    // Normalizziamo la categoria per il raggruppamento
                    let categoria = (prod.categoria || 'altro').toLowerCase();
                    if(categoria.includes('antipast')) categoria = 'antipasti';
                    else if(categoria.includes('prim')) categoria = 'primi';
                    else if(categoria.includes('second')) categoria = 'secondi';
                    else if(categoria.includes('pizz')) categoria = 'pizze';
                    else if(categoria.includes('dessert') || categoria.includes('dolc')) categoria = 'dessert';
                    else if(categoria.includes('contorn')) categoria = 'contorni';
                    else categoria = 'altro';

                    if(!mapTavoli[tName].sezioni[categoria]) {
                        mapTavoli[tName].sezioni[categoria] = [];
                    }

                    mapTavoli[tName].sezioni[categoria].push({
                        ...prod,
                        parentOrderId: ord.id,
                        originalIndex: idx,
                        cameriere: ord.nome_cliente,
                        riaperto: prod.riaperto,
                        stato: prod.stato || 'in_attesa'
                    });
                });
            });

            // Trasformiamo la mappa in array ordinato
            const listaTavoli = Object.values(mapTavoli).map(t => {
                // Ordiniamo le sezioni interne per priorità (Antipasti -> Primi...)
                const sezioniOrdinate = Object.keys(t.sezioni)
                    .sort((a,b) => (prioritaPortate[a] || 99) - (prioritaPortate[b] || 99))
                    .map(key => ({
                        nome: key.charAt(0).toUpperCase() + key.slice(1),
                        items: t.sezioni[key]
                    }));
                
                return { ...t, sezioniArray: sezioniOrdinate };
            });

            // Ordiniamo i tavoli per orario di arrivo (FIFO)
            listaTavoli.sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));
            
            setTavoli(listaTavoli);
        })
        .catch(e => console.error("Err fetch cucina:", e));
  };

  // 4. LOGIN HANDLER
  const handleLogin = (e) => {
    e.preventDefault();
    setLoadingLogin(true);

    if (passwordInput === infoRistorante.pw_cucina || passwordInput === infoRistorante.password) {
        setIsAuthorized(true);
        localStorage.setItem(`cucina_session_${infoRistorante.id}`, "true");
        joinRoom(infoRistorante.id);
        aggiorna(infoRistorante.id);
        setLoginError(false);
    } else { 
        setLoginError(true);
    }
    setLoadingLogin(false);
  };

  const handleLogout = () => {
      if(window.confirm("Chiudere la Cucina?")) {
        localStorage.removeItem(`cucina_session_${infoRistorante.id}`);
        setIsAuthorized(false);
      }
  };

  // 5. AZIONI
  const segnaPiattoPronto = async (item) => {
      try {
          await fetch(`${API_URL}/api/ordini/update-product`, { 
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  order_id: item.parentOrderId,
                  product_index: item.originalIndex,
                  new_status: 'servito'
              })
          });
          // Il socket farà il refresh, ma per reattività possiamo chiamare aggiorna()
      } catch (error) { console.error("Errore update:", error); }
  };

  // --- RENDER ---
  if (isSuiteDisabled) return <div style={{textAlign:'center', padding:50}}><h1>⛔ REPARTO NON ATTIVO</h1></div>;
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Cucina...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#e67e22'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
              <h1 style={{margin:0, fontSize:'3rem'}}>👨‍🍳</h1>
              <h2 style={{margin:'10px 0', color:'#2c3e50'}}>Login Cucina</h2>
              <h3 style={{margin:'0 0 20px 0', color:'#7f8c8d'}}>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input 
                    type="password" 
                    placeholder="Password Cucina" 
                    value={passwordInput} 
                    onChange={e=>setPasswordInput(e.target.value)} 
                    style={{width:'100%', padding:'15px', marginBottom:'15px', fontSize:'18px', borderRadius:'5px', border: loginError ? '2px solid red' : '1px solid #ccc', textAlign:'center'}}
                  />
                  <button style={{width:'100%', padding:'15px', background:'#d35400', border:'none', color:'white', borderRadius:'5px', fontSize:'18px', fontWeight:'bold', cursor:'pointer'}}>
                    {loadingLogin ? "..." : "ENTRA"}
                  </button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{minHeight:'100vh', padding:'20px', background:'#e67e22'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'rgba(255,255,255,0.1)', padding:10, borderRadius:8}}>
          <div>
            <h1 style={{margin:0, color:'white', fontSize:'1.5rem'}}>👨‍🍳 {infoRistorante.ristorante}</h1>
            <span style={{fontSize:'0.8rem', color: isConnected ? '#2ecc71' : '#f1c40f', fontWeight:'bold', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:4}}>
                {isConnected ? '🟢 ONLINE' : '🔴 DISCONNESSO'}
            </span>
          </div>
          <button onClick={handleLogout} style={{background:'white', color:'#d35400', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Esci</button>
      </header>
      
      <div className="ordini-grid" style={{display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'flex-start'}}>
        {tavoli.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Tutto tranquillo Chef! 🔥</h2></div>}

        {tavoli.map(tavoloData => (
            <div key={tavoloData.tavolo} className="ticket" style={{background:'white', width:320, borderTop:'5px solid #d35400', borderRadius:8, overflow:'hidden', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                
                {/* TICKET HEADER */}
                <div className="ticket-header" style={{
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start', 
                    background: '#d35400', color: 'white', padding: '10px'
                }}>
                    <div>
                        <span style={{fontSize:'1.8rem', display:'block', lineHeight:1}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
                        <span style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.2)', padding:'2px 6px', borderRadius:'4px'}}>{tavoloData.sezioniArray[0]?.items[0]?.cameriere || 'Sala'}</span>
                    </div>
                    <span style={{fontSize:'1.2rem', fontWeight:'bold'}}>{new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                
                {/* TICKET BODY (SEZIONI) */}
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {tavoloData.sezioniArray.map((sezione, sIdx) => (
                        <div key={sezione.nome} style={{borderBottom: sIdx < tavoloData.sezioniArray.length -1 ? '2px solid #eee' : 'none'}}>
                            {/* Header Sezione (es. "Antipasti") */}
                            <div style={{background:'#fcf3cf', padding:'4px 10px', fontSize:'0.75rem', fontWeight:'bold', color:'#7f8c8d', letterSpacing:'1px', textTransform:'uppercase'}}>
                                {sezione.nome}
                            </div>
                            
                            {sezione.items.map((item, i) => {
                                const isServito = item.stato === 'servito';
                                let bg = 'white';
                                if (isServito) bg = '#e8f5e9';
                                
                                return (
                                    <div key={`${item.parentOrderId}-${item.originalIndex}`} 
                                        onClick={() => { if (!isServito) segnaPiattoPronto(item); }}
                                        style={{
                                            padding:'10px', borderBottom:'1px dashed #ddd', background: bg, 
                                            cursor: isServito ? 'default' : 'pointer', 
                                            display: 'flex', justifyContent:'space-between', alignItems:'center'
                                        }}
                                    >
                                        <div style={{flex:1}}>
                                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                                                <span style={{fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold', textDecoration: isServito ? 'line-through' : 'none', color: isServito ? '#aaa' : '#000'}}>
                                                    1x {item.nome}
                                                </span>
                                            </div>

                                            {/* VARIANTI */}
                                            {item.varianti_scelte && (
                                                <div style={{marginTop:'4px', lineHeight:1.2}}>
                                                    {item.varianti_scelte.rimozioni?.map((ing, k) => (
                                                        <span key={k} style={{color:'#c0392b', fontSize:'0.75rem', fontWeight:'bold', marginRight:'4px', display:'block'}}>⛔ NO {ing}</span>
                                                    ))}
                                                    {item.varianti_scelte.aggiunte?.map((ing, k) => (
                                                        <span key={k} style={{color:'#27ae60', fontSize:'0.75rem', fontWeight:'bold', marginRight:'4px', display:'block'}}>➕ {typeof ing === 'string' ? ing : ing.nome}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* BADGE RIAPERTO */}
                                            {item.riaperto && !isServito && (
                                                <div style={{marginTop:'4px'}}>
                                                    <span style={{background:'#f39c12', color:'white', padding:'2px 5px', borderRadius:'3px', fontSize:'0.6rem', fontWeight:'bold'}}>
                                                        ⚠️ RIAPERTO
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {isServito ? <span style={{fontSize:'0.9rem'}}>✅</span> : <span style={{fontSize:'1.2rem'}}>🍳</span>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;