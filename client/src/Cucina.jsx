// client/src/Cucina.jsx - VERSIONE V36 (TAVOLO UNIFICATO + NO BAR) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [tavoli, setTavoli] = useState([]); // Ora gestiamo array di Tavoli, non di ordini
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `cucina_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`cucina_session_${slug}`,"true"); 
      } else { alert("Password Errata"); }
  };

  const handleLogout = () => {
      if(confirm("Uscire dalla cucina?")) {
        localStorage.removeItem(`cucina_session_${slug}`);
        setIsAuthorized(false);
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
           nuoviOrdini.forEach(ord => {
                // --- MODIFICA FONDAMENTALE: FILTRO "PACCHETTO CONCLUSO" ---
                // 1. Prendiamo solo i cibi (escludiamo il Bar che non ci interessa)
                const itemsDiCompetenza = Array.isArray(ord.prodotti) 
                    ? ord.prodotti.filter(p => !p.is_bar) 
                    : [];

                // 2. Controlliamo se questo specifico invio è TUTTO servito
                // (Se itemsDiCompetenza è vuoto, è probabilmente solo bar, quindi lo ignoriamo o meno a seconda della tua logica. Qui assumiamo che se è > 0 controlliamo lo stato)
                const isTuttoServito = itemsDiCompetenza.length > 0 && itemsDiCompetenza.every(p => p.stato === 'servito');

                // 3. SE È TUTTO SERVITO, SALTIAMO QUESTO ORDINE (RETURN)
                // Così non verrà aggiunto alla lista del tavolo e sparirà dallo schermo.
                if (isTuttoServito) return; 

                // --- DA QUI IN POI È LA LOGICA STANDARD ---
                const t = ord.tavolo;
                if(!gruppiTavolo[t]) gruppiTavolo[t] = { tavolo: t, items: [], orarioMin: ord.data_ora };
                
                if(new Date(ord.data_ora) < new Date(gruppiTavolo[t].orarioMin)) {
                    gruppiTavolo[t].orarioMin = ord.data_ora;
                }

                if(Array.isArray(ord.prodotti)) {
                    ord.prodotti.forEach((prod, idx) => {
                        // --- FILTRO BAR: SE È BAR, LO SALTIAMO COMPLETAMENTE ---
                        if (prod.is_bar) return;

                        gruppiTavolo[t].items.push({
                            ...prod,
                            parentOrderId: ord.id,
                            originalIndex: idx,
                            fullOrderProducts: ord.prodotti 
                        });
                    });
                }
            });

            // Convertiamo in array e filtriamo tavoli vuoti (es. solo bibite) o completati
            const listaTavoli = Object.values(gruppiTavolo).filter(gruppo => {
                if (gruppo.items.length === 0) return false;
                // Mostra il tavolo finché c'è almeno un piatto non servito
                // O se vuoi vedere lo storico finché non pagano, togli questo check.
                // Qui: nascondiamo se TUTTO è servito.
                const tuttiFiniti = gruppo.items.every(p => p.stato === 'servito');
                return !tuttiFiniti;
            });

            // Ordiniamo per orario di arrivo
            listaTavoli.sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));

            setTavoli(listaTavoli);
        })
        .catch(e => console.error("Polling error:", e));
  };

  useEffect(() => { 
      if(isAuthorized && infoRistorante) { 
          aggiorna(); 
          const i = setInterval(aggiorna, 2000); 
          return () => clearInterval(i); 
      } 
  }, [isAuthorized, infoRistorante]);

  // --- AZIONE: SEGNA COME SERVITO (GESTIONE MULTI-ORDINE) ---
  const segnaPiattoServito = async (targetItems) => {
      // targetItems è un array di oggetti { parentOrderId, originalIndex, ... }
      // Dobbiamo raggruppare le modifiche per Ordine ID, perché l'API lavora per ordine
      
      const updatesPorOrdine = {};

      targetItems.forEach(item => {
          if(!updatesPorOrdine[item.parentOrderId]) {
              updatesPorOrdine[item.parentOrderId] = {
                  originalProducts: item.fullOrderProducts, // Array originale completo (clonato dopo)
                  indicesToUpdate: []
              };
          }
          updatesPorOrdine[item.parentOrderId].indicesToUpdate.push(item.originalIndex);
      });

      // Eseguiamo le chiamate API (una per ogni ordine coinvolto)
      const promises = Object.keys(updatesPorOrdine).map(async (orderId) => {
          const data = updatesPorOrdine[orderId];
          const nuoviProdotti = [...data.originalProducts]; // Copia array
          const oraAttuale = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
          
          let nomePiattoLog = "";

          data.indicesToUpdate.forEach(idx => {
              nuoviProdotti[idx].stato = 'servito';
              nuoviProdotti[idx].ora_servizio = oraAttuale;
              nomePiattoLog = nuoviProdotti[idx].nome; // Prendiamo un nome per il log
          });

          const logMsg = `[CUCINA 👨‍🍳] HA SERVITO: ${nomePiattoLog} (x${data.indicesToUpdate.length})`;

          return fetch(`${API_URL}/api/ordine/${orderId}/update-items`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
          });
      });

      await Promise.all(promises);
      aggiorna();
  };

  // --- LOGICA CORE: RAGGRUPPAMENTO PER USCITA ---
  const processaTavolo = (items) => {
      const courses = { 1: [], 2: [], 3: [] };
      
      items.forEach(p => {
          const c = p.course || 2; 
          if(!courses[c]) courses[c] = [];
          courses[c].push(p);
      });

      // Calcolo Blocchi (Wait Logic) - IL BAR NON ESISTE PIÙ QUI, QUINDI NON BLOCCA
      const isCourseComplete = (courseNum) => {
          if (!courses[courseNum] || courses[courseNum].length === 0) return true; 
          return courses[courseNum].every(p => p.stato === 'servito');
      };

      const courseStatus = {
          1: { locked: false, completed: isCourseComplete(1) },
          2: { locked: !isCourseComplete(1), completed: isCourseComplete(2) },
          3: { locked: !isCourseComplete(1) || !isCourseComplete(2), completed: isCourseComplete(3) }
      };

      const finalStructure = [];
      [1, 2, 3].forEach(cNum => {
          if (courses[cNum].length === 0) return;

          const groups = [];
          courses[cNum].forEach(p => {
              // Raggruppiamo visivamente (es. 3x Carbonara anche se di ordini diversi)
              const key = `${p.nome}-${p.stato}-${p.is_pizzeria ? 'piz' : 'cuc'}`;
              const existing = groups.find(g => g.key === key);
              
              if (existing) {
                  existing.count++;
                  existing.sourceItems.push(p); // Salviamo i riferimenti per il click
              } else {
                  groups.push({
                      ...p, // Copia dati base per visualizzazione
                      key,
                      count: 1,
                      sourceItems: [p], // Array di items reali (con ID ordine)
                      isMyStation: !p.is_pizzeria, // CUCINA: mio se NON è pizzeria
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

  // --- RENDERING ---
  
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
              <h1>👨‍🍳 Cucina</h1>
              <h3 style={{color:'#666'}}>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', fontSize:'16px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#27ae60', border:'none', color:'white', fontSize:'16px', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container">
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', marginBottom:'20px', borderRadius:'8px'}}>
          <h1 style={{margin:0, color:'#333'}}>👨‍🍳 Cucina: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {tavoli.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Nessuna comanda in attesa 👨‍🍳</h2>
                <p>Tutto pulito!</p>
            </div>
        )}

        {tavoli.map(tavoloData => {
            const strutturaOrdine = processaTavolo(tavoloData.items);
            
            return (
                <div key={tavoloData.tavolo} className="ticket" style={{borderTop: '5px solid #d35400'}}>
                    <div className="ticket-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'1.8rem'}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
                        <span style={{fontSize:'0.9rem', color:'#666'}}>{new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        
                        {strutturaOrdine.map(section => {
                            let headerColor = "#7f8c8d"; let headerBg = "#ecf0f1"; let title = `${section.courseNum}ª USCITA`;
                            
                            if (!section.locked) {
                                if(section.courseNum === 1) { headerColor = "#27ae60"; headerBg = "#e8f8f5"; title += " (INIZIARE)"; }
                                if(section.courseNum === 2) { headerColor = "#f39c12"; headerBg = "#fef9e7"; title += " (A SEGUIRE)"; }
                                if(section.courseNum === 3) { headerColor = "#c0392b"; headerBg = "#f9ebea"; title += " (DESSERT)"; }
                            } else { title += " (IN ATTESA)"; }

                            return (
                                <div key={section.courseNum} style={{marginBottom:'15px'}}>
                                    <div style={{
                                        background: headerBg, color: headerColor, 
                                        padding:'5px 10px', fontSize:'0.85rem', fontWeight:'bold', 
                                        borderBottom:`2px solid ${headerColor}`, marginBottom:'5px',
                                        display:'flex', justifyContent:'space-between'
                                    }}>
                                        <span>{title}</span>
                                        {section.locked && <span>🔒 BLOCCATO</span>}
                                    </div>

                                    {section.items.map(item => {
                                        const isServito = item.stato === 'servito';
                                        
                                        let bg = 'white'; let opacity = 1; let cursor = 'pointer';

                                        if (section.locked && !isServito) {
                                            opacity = 0.5; cursor = 'not-allowed'; bg = '#f9f9f9';
                                        } else if (!item.isMyStation) {
                                            bg = '#f0f0f0'; cursor = 'default';
                                        } else if (isServito) {
                                            bg = '#e8f5e9'; cursor = 'default';
                                        }

                                        return (
                                            <div 
                                                key={item.key}
                                                onClick={() => {
                                                    if (item.isMyStation && !isServito && !section.locked) {
                                                        segnaPiattoServito(item.sourceItems);
                                                    }
                                                }}
                                                style={{
                                                    padding:'10px', borderBottom:'1px dashed #ddd',
                                                    background: bg, opacity: opacity, cursor: cursor,
                                                    display: 'flex', justifyContent:'space-between', alignItems:'center'
                                                }}
                                            >
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{
                                                        background: isServito ? '#95a5a6' : (item.isMyStation ? '#d35400' : '#7f8c8d'),
                                                        color:'white', padding:'2px 8px', borderRadius:'12px',
                                                        fontWeight:'bold', fontSize:'0.9rem', minWidth:'25px', textAlign:'center'
                                                    }}>
                                                        {item.count}x
                                                    </span>
                                                    <div>
                                                        <span style={{
                                                            fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold',
                                                            textDecoration: isServito ? 'line-through' : 'none',
                                                            color: isServito ? '#aaa' : '#000'
                                                        }}>
                                                            {item.nome}
                                                        </span>
                                                        {!item.isMyStation && (
                                                            <span style={{fontSize:'0.7rem', marginLeft:'8px', background:'#bdc3c7', color:'white', padding:'2px 4px', borderRadius:'3px'}}>
                                                                {item.stationName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{textAlign:'right'}}>
                                                    {isServito ? (
                                                        <div style={{color:'green', fontSize:'0.8rem'}}>✅ {item.ora_servizio}</div>
                                                    ) : ( section.locked ? <span style={{fontSize:'1.2rem'}}>⏳</span> : null )}
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

export default Cucina;