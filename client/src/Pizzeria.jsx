// client/src/Pizzeria.jsx - VERSIONE V5 (FIX VARIANTI & RAGGRUPPAMENTO SICURO) 🍕
import { io } from "socket.io-client"; // Aggiungi questo in alto
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Pizzeria() {
  const [tavoli, setTavoli] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `pizzeria_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

const handleLogin = async (e) => {
    e.preventDefault();
    if(!infoRistorante?.id) return;
    try {
        const res = await fetch(`${API_URL}/api/auth/station`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                ristorante_id: infoRistorante.id, 
                role: 'pizzeria', 
                password: passwordInput 
            })
        });
        const data = await res.json();
        if(data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`pizzeria_session_${slug}`, "true");
        } else { alert("Password Errata"); }
    } catch(err) { alert("Errore connessione"); }
};
  const handleLogout = () => {
      if(confirm("Chiudere la Pizzeria?")) {
        localStorage.removeItem(`pizzeria_session_${slug}`);
        setIsAuthorized(false);
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
            const nuoviOrdini = (data.nuovi_ordini || []).filter(o => o.stato !== 'in_arrivo');
            const gruppiTavolo = {};

            nuoviOrdini.forEach(ord => {
                const itemsDiCompetenza = Array.isArray(ord.prodotti) ? ord.prodotti.filter(p => !p.is_bar) : [];
                const isTuttoServito = itemsDiCompetenza.length > 0 && itemsDiCompetenza.every(p => p.stato === 'servito');
                if (isTuttoServito) return; 

                const t = ord.tavolo;
                if(!gruppiTavolo[t]) gruppiTavolo[t] = { tavolo: t, items: [], orarioMin: ord.data_ora };
                
                if(new Date(ord.data_ora) < new Date(gruppiTavolo[t].orarioMin)) {
                    gruppiTavolo[t].orarioMin = ord.data_ora;
                }

                if(Array.isArray(ord.prodotti)) {
                    ord.prodotti.forEach((prod, idx) => {
                        if (prod.is_bar) return;

                        gruppiTavolo[t].items.push({
                            ...prod,
                            parentOrderId: ord.id,
                            originalIndex: idx,
                            fullOrderProducts: ord.prodotti,
                            stato: prod.stato,      // Importante per la chiave
                            riaperto: prod.riaperto, // Importante per la chiave
                            cameriere: ord.cameriere, 
                          cliente: ord.cliente
                        });
                    });
                }
            });

            const listaTavoli = Object.values(gruppiTavolo).filter(gruppo => {
                if (gruppo.items.length === 0) return false;
                const tuttiFiniti = gruppo.items.every(p => p.stato === 'servito');
                return !tuttiFiniti;
            });

            listaTavoli.sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));
            setTavoli(listaTavoli);
        })
        .catch(e => console.error("Polling error:", e));
  };


useEffect(() => {
    // 1. Controllo di sicurezza
    if (!isAuthorized || !infoRistorante?.id) return;

    console.log("🔌 Inizializzazione Socket per Ristorante:", infoRistorante.id);

    // 2. Carica i dati iniziali subito
    aggiorna();

    // 3. Configurazione Socket (RIMOSSO 'transports: websocket' per compatibilità Render)
    const socket = io(API_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true
    });

    // 4. Gestione Eventi Socket
    socket.on('connect', () => {
        console.log("✅ Socket Connesso! ID:", socket.id);
        // Importante: ri-entriamo nella stanza ogni volta che ci connettiamo (anche dopo riconnessione)
        socket.emit('join_room', String(infoRistorante.id));
    });

    socket.on('connect_error', (err) => {
        console.error("❌ Errore connessione Socket:", err.message);
    });

    socket.on('refresh_ordini', () => {
        console.log("🔥 EVENTO RICEVUTO: Aggiornamento ordini in corso...");
        aggiorna();
        // Feedback sonoro opzionale (se supportato dal browser)
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    });

    // 5. Pulizia
    return () => {
        console.log("🔌 Disconnessione Socket pulita");
        socket.off('connect');
        socket.off('refresh_ordini');
        socket.off('connect_error');
        socket.disconnect();
    };

    // Dipendenze: riavvia solo se cambia l'ID o l'autorizzazione
}, [isAuthorized, infoRistorante?.id]);

const segnaPizzaPronta = async (targetItems) => {
      // FIX ATOMICO: Aggiorniamo ogni pizza singolarmente
      // In questo modo non sovrascriviamo le modifiche fatte da Bar o Cucina
      const promises = targetItems.map(item => {
          return fetch(`${API_URL}/api/ordine/${item.parentOrderId}/patch-item`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  index: item.originalIndex, // L'indice esatto della pizza nell'array
                  stato: 'servito',
                  operatore: 'PIZZERIA 🍕'   // La firma che apparirà nel Log
              })
          });
      });

      try {
          await Promise.all(promises);
          aggiorna(); // Ricarica la vista subito dopo
      } catch (error) {
          console.error("Errore Pizzeria:", error);
          alert("Errore di connessione durante l'aggiornamento.");
      }
  };

  // --- HELPER: GENERA CHIAVE UNICA PER VARIANTI ---
  const getVariantKey = (v) => {
      if(!v) return "";
      const r = (v.rimozioni || []).sort().join('_');
      const a = (v.aggiunte || []).map(x => x.nome).sort().join('_');
      return `${r}|${a}`;
  };

  // --- LOGICA CORE: RAGGRUPPAMENTO ---
  const processaTavolo = (items) => {
      const courses = { 1: [], 2: [], 3: [], 4: [] };
      
      items.forEach(p => {
          let c = p.course || 2; 
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
          2: { locked: !isCourseComplete(1), completed: isCourseComplete(2) },
          3: { locked: !isCourseComplete(1) || !isCourseComplete(2), completed: isCourseComplete(3) },
          4: { locked: !isCourseComplete(1) || !isCourseComplete(2) || !isCourseComplete(3), completed: isCourseComplete(4) }
      };

      const finalStructure = [];
      [1, 2, 3, 4].forEach(cNum => {
          if (courses[cNum].length === 0) return;

          const groups = [];
          courses[cNum].forEach(p => {
              // *** FIX CHIAVE UNICA VARIANTI ***
              const variantKey = getVariantKey(p.varianti_scelte);
              const key = `${p.nome}-${p.stato}-${p.riaperto}-${variantKey}-${p.is_pizzeria ? 'piz' : 'cuc'}`;
              
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
                      isMyStation: p.is_pizzeria, 
                      stationName: p.is_pizzeria ? "PIZZERIA" : "CUCINA"
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

  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Pizzeria...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#c0392b'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center'}}>
              <h1>🍕 Pizzeria</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#e74c3c', border:'none', color:'white', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{minHeight:'100vh', padding:'20px', background:'#c0392b'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h1 style={{margin:0, color:'white'}}>🍕 Pizzeria: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'white', color:'#c0392b', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {tavoli.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Il forno è vuoto! 🔥</h2></div>}

        {tavoli.map(tavoloData => {
            const strutturaOrdine = processaTavolo(tavoloData.items);
            // --- CALCOLO CHI HA PRESO L'ORDINE ---
const primoItem = tavoloData.items[0];
const nomeChi = primoItem?.cameriere 
    ? `👤 ${primoItem.cameriere}` 
    : `📱 ${primoItem?.cliente || 'Cliente'}`;
            
            return (
                <div key={tavoloData.tavolo} className="ticket" style={{background:'white', borderTop:'5px solid #e74c3c', marginBottom:20, borderRadius:8}}>
                    <div className="ticket-header" style={{
    display:'flex', justifyContent:'space-between', alignItems:'flex-start', 
    background: '#d35400', // (Usa #c0392b se sei in Pizzeria)
    color: 'white', padding: '10px'
}}>
    <div>
        <span style={{fontSize:'1.8rem', display:'block'}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
        
        {/* --- BADGE CAMERIERE / CLIENTE --- */}
        <span style={{
            fontSize:'0.9rem', 
            background:'rgba(255,255,255,0.2)', 
            padding:'2px 8px', borderRadius:'4px', marginTop:'4px', 
            display:'inline-block', fontWeight:'bold'
        }}>
            {nomeChi}
        </span>
    </div>
    <span style={{fontSize:'0.9rem', color:'#fff', marginTop:'5px'}}>
        {new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
    </span>
</div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        
                        {strutturaOrdine.map(section => {
                            let headerColor = "#7f8c8d"; let headerBg = "#ecf0f1"; 
                            let title = `${section.courseNum}° STEP`; 
                            if (!section.locked) {
                                if(section.courseNum === 1) { headerColor = "#27ae60"; headerBg = "#e8f8f5"; }
                                else if(section.courseNum === 2) { headerColor = "#f39c12"; headerBg = "#fef9e7"; }
                                else if(section.courseNum === 3) { headerColor = "#d35400"; headerBg = "#fdebd0"; }
                                else { headerColor = "#8e44ad"; headerBg = "#f4ecf7"; }
                            } else { title += " (IN ATTESA)"; }

                            return (
                                <div key={section.courseNum} style={{marginBottom:'15px'}}>
                                    <div style={{background: headerBg, color: headerColor, padding:'5px 10px', fontSize:'0.85rem', fontWeight:'bold', borderBottom:`2px solid ${headerColor}`, marginBottom:'5px', display:'flex', justifyContent:'space-between'}}>
                                        <span>{title}</span>
                                        {section.locked && <span>🔒 BLOCCATO</span>}
                                    </div>

                                    {section.items.map(item => {
                                        const isServito = item.stato === 'servito';
                                        let bg = 'white'; let opacity = 1; let cursor = 'pointer';

                                        if (section.locked && !isServito) { opacity = 0.5; cursor = 'not-allowed'; bg = '#f9f9f9'; }
                                        else if (!item.isMyStation) { bg = '#f0f0f0'; cursor = 'default'; }
                                        else if (isServito) { bg = '#e8f5e9'; cursor = 'default'; }

                                        return (
                                            <div key={item.key} onClick={() => { if (item.isMyStation && !isServito && !section.locked) segnaPizzaPronta(item.sourceItems); }}
                                                style={{padding:'10px', borderBottom:'1px dashed #ddd', background: bg, opacity: opacity, cursor: cursor, display: 'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                
                                                <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                    <span style={{background: isServito ? '#95a5a6' : (item.isMyStation ? '#e74c3c' : '#7f8c8d'), color:'white', padding:'2px 8px', borderRadius:'12px', fontWeight:'bold', fontSize:'0.9rem', minWidth:'25px', textAlign:'center'}}>
                                                        {item.count}x
                                                    </span>
                                                    <div style={{flex:1}}>
    <div style={{
        fontSize:'1.1rem', 
        fontWeight: isServito ? 'normal' : 'bold', 
        textDecoration: isServito ? 'line-through' : 'none', 
        color: isServito ? '#aaa' : '#000'
    }}>
        {item.nome}
    </div>
    
    {/* --- NUOVA RIGA: REPARTO DI APPARTENENZA --- */}
    <div style={{fontSize:'0.75rem', color:'#7f8c8d', fontStyle:'italic', marginTop:'2px'}}>
        {item.is_pizzeria ? '🍕 Pizzeria' : '👨‍🍳 Cucina'}
    </div>

    {/* VARIANTI (Rimangono i badge colorati, ma il testo sopra è pulito) */}
    {item.varianti_scelte && (
        <div style={{marginTop:'4px'}}>
            {item.varianti_scelte.rimozioni?.map((ing, i) => (
                <span key={i} style={{background:'#c0392b', color:'white', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', marginRight:'5px', display:'inline-block'}}>
                    NO {ing}
                </span>
            ))}
            {item.varianti_scelte.aggiunte?.map((ing, i) => (
                <span key={i} style={{background:'#27ae60', color:'white', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', marginRight:'5px', display:'inline-block'}}>
                    + {ing.nome}
                </span>
            ))}
        </div>
    )}

  {/* --- INSERISCI QUI LA MODIFICA PER LA CASSA --- */}
{item.chiuso_da_cassa && item.stato === 'servito' && (
    <div style={{
        display:'inline-block', 
        marginTop:'4px', 
        background:'#27ae60', 
        color:'white', 
        padding:'2px 6px', 
        borderRadius:'4px', 
        fontSize:'0.7rem', 
        fontWeight:'bold'
    }}>
        ✅ FATTO DALLA CASSA
    </div>
)}

{item.riaperto && item.stato === 'in_attesa' && (
    <div style={{display:'inline-block', marginTop:'2px', background:'#f39c12', color:'white', padding:'2px 5px', borderRadius:'3px', fontSize:'0.7rem', fontWeight:'bold'}}>
        ⚠️ RIAPERTO
    </div>
    )}
</div>
                                                </div>

                                                <div style={{textAlign:'right'}}>
                                                    {isServito ? <div style={{color:'green', fontSize:'0.8rem'}}>✅ {item.ora_servizio}</div> : ( section.locked ? <span style={{fontSize:'1.2rem'}}>⏳</span> : null )}
                                                </div>
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

export default Pizzeria;