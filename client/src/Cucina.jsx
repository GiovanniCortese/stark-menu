// client/src/Cucina.jsx - VERSIONE V35 (INTELLIGENTE: USCITE, BLOCCHI E VISIBILITÀ INCROCIATA) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
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
      } else {
          alert("Password Errata");
      }
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
            const tuttiOrdini = data.nuovi_ordini || [];

            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                if (prodotti.length === 0) return false;
                // Mostriamo il ticket finché non è TUTTO servito (anche roba della pizzeria)
                // Così la cucina vede quando l'ordine è chiuso definitivamente
                const tuttiFiniti = prodotti.every(p => p.stato === 'servito');
                return !tuttiFiniti;
            });

            setOrdini(ordiniDaMostrare);
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

  // --- AZIONE: SEGNA COME SERVITO ---
  const segnaPiattoServito = async (ordineId, prodottiAttuali, indices) => {
      const nuoviProdotti = [...prodottiAttuali];
      const primoItem = nuoviProdotti[indices[0]];

      if (primoItem.stato === 'servito') return;

      const nuovoStato = 'servito';
      const oraAttuale = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});

      indices.forEach(idx => {
          const item = nuoviProdotti[idx];
          item.stato = nuovoStato;
          item.ora_servizio = oraAttuale; // Salviamo l'orario
      });

      const qty = indices.length;
      const logMsg = `[CUCINA 👨‍🍳] HA SERVITO: ${qty > 1 ? qty + 'x ' : ''}${primoItem.nome} alle ${oraAttuale}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // --- LOGICA CORE: RAGGRUPPAMENTO PER USCITA E PRODOTTO ---
  const processaOrdine = (prodotti) => {
      // 1. Organizziamo per Uscita (Course)
      // Default course = 2 se non specificato
      const courses = { 1: [], 2: [], 3: [] };
      
      prodotti.forEach((p, originalIndex) => {
          const c = p.course || 2; 
          if(!courses[c]) courses[c] = [];
          courses[c].push({ ...p, originalIndex });
      });

      // 2. Calcoliamo lo stato di blocco
      // L'Uscita 2 è bloccata se l'Uscita 1 ha elementi NON serviti.
      // L'Uscita 3 è bloccata se l'Uscita 2 ha elementi NON serviti.
      const isCourseComplete = (courseNum) => {
          if (!courses[courseNum] || courses[courseNum].length === 0) return true; // Se vuota, è "completa"
          return courses[courseNum].every(p => p.stato === 'servito');
      };

      const courseStatus = {
          1: { locked: false, completed: isCourseComplete(1) },
          2: { locked: !isCourseComplete(1), completed: isCourseComplete(2) },
          3: { locked: !isCourseComplete(1) || !isCourseComplete(2), completed: isCourseComplete(3) }
      };

      // 3. Raggruppiamo i prodotti "3x Carbonara" all'interno di ogni course
      const finalStructure = [];
      [1, 2, 3].forEach(cNum => {
          if (courses[cNum].length === 0) return;

          const groups = [];
          courses[cNum].forEach(p => {
              const key = `${p.nome}-${p.stato}-${p.is_pizzeria ? 'piz' : 'cuc'}`;
              const existing = groups.find(g => g.key === key);
              if (existing) {
                  existing.count++;
                  existing.indices.push(p.originalIndex);
              } else {
                  groups.push({
                      ...p,
                      key,
                      count: 1,
                      indices: [p.originalIndex],
                      // Flag per visualizzazione
                      isMyStation: !p.is_bar && !p.is_pizzeria, 
                      stationName: p.is_pizzeria ? "PIZZERIA" : (p.is_bar ? "BAR" : "CUCINA")
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
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Nessuna comanda in attesa 👨‍🍳</h2>
                <p>Tutto pulito!</p>
            </div>
        )}

        {ordini.map(ordine => {
            const strutturaOrdine = processaOrdine(ordine.prodotti);
            
            return (
                <div key={ordine.id} className="ticket" style={{borderTop: '5px solid #d35400'}}>
                    {/* Header Ticket */}
                    <div className="ticket-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'1.5rem'}}>Tavolo <strong>{ordine.tavolo}</strong></span>
                        <span style={{fontSize:'0.9rem', color:'#666'}}>{new Date(ordine.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        
                        {strutturaOrdine.map(section => {
                            // Colori Header Uscita
                            let headerColor = "#7f8c8d"; // Default Locked
                            let headerBg = "#ecf0f1";
                            let title = `${section.courseNum}ª USCITA`;
                            
                            if (!section.locked) {
                                if(section.courseNum === 1) { headerColor = "#27ae60"; headerBg = "#e8f8f5"; title += " (INIZIARE)"; }
                                if(section.courseNum === 2) { headerColor = "#f39c12"; headerBg = "#fef9e7"; title += " (A SEGUIRE)"; }
                                if(section.courseNum === 3) { headerColor = "#c0392b"; headerBg = "#f9ebea"; title += " (DESSERT)"; }
                            } else {
                                title += " (IN ATTESA)";
                            }

                            return (
                                <div key={section.courseNum} style={{marginBottom:'15px'}}>
                                    {/* Intestazione Uscita */}
                                    <div style={{
                                        background: headerBg, color: headerColor, 
                                        padding:'5px 10px', fontSize:'0.85rem', fontWeight:'bold', 
                                        borderBottom:`2px solid ${headerColor}`, marginBottom:'5px',
                                        display:'flex', justifyContent:'space-between'
                                    }}>
                                        <span>{title}</span>
                                        {section.locked && <span>🔒 BLOCCATO</span>}
                                    </div>

                                    {/* Lista Piatti */}
                                    {section.items.map(item => {
                                        const isServito = item.stato === 'servito';
                                        
                                        // LOGICA VISIVA
                                        // 1. Se è bloccato e non è servito -> Opacità bassa, non cliccabile
                                        // 2. Se non è mio (è pizzeria) -> Sfondo grigio, non cliccabile
                                        // 3. Se è mio e attivo -> Bianco, Cliccabile
                                        
                                        let bg = 'white';
                                        let opacity = 1;
                                        let cursor = 'pointer';

                                        if (section.locked && !isServito) {
                                            opacity = 0.5;
                                            cursor = 'not-allowed';
                                            bg = '#f9f9f9';
                                        } else if (!item.isMyStation) {
                                            bg = '#f0f0f0'; // Grigio per Pizzeria/Bar
                                            cursor = 'default'; // Non cliccabile
                                        } else if (isServito) {
                                            bg = '#e8f5e9'; // Verde servito
                                            cursor = 'default';
                                        }

                                        return (
                                            <div 
                                                key={item.key}
                                                onClick={() => {
                                                    // Si può cliccare SOLO se: è mio, non è servito, non è bloccato
                                                    if (item.isMyStation && !isServito && !section.locked) {
                                                        segnaPiattoServito(ordine.id, ordine.prodotti, item.indices);
                                                    }
                                                }}
                                                style={{
                                                    padding:'10px', 
                                                    borderBottom:'1px dashed #ddd',
                                                    background: bg,
                                                    opacity: opacity,
                                                    cursor: cursor,
                                                    display: 'flex', justifyContent:'space-between', alignItems:'center'
                                                }}
                                            >
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{
                                                        background: isServito ? '#95a5a6' : (item.isMyStation ? '#d35400' : '#7f8c8d'),
                                                        color:'white', padding:'2px 8px', borderRadius:'12px',
                                                        fontWeight:'bold', fontSize:'0.8rem', minWidth:'25px', textAlign:'center'
                                                    }}>
                                                        {item.count}x
                                                    </span>
                                                    
                                                    <div>
                                                        <span style={{
                                                            fontSize:'1rem', 
                                                            fontWeight: isServito ? 'normal' : 'bold',
                                                            textDecoration: isServito ? 'line-through' : 'none',
                                                            color: isServito ? '#aaa' : '#000'
                                                        }}>
                                                            {item.nome}
                                                        </span>
                                                        {/* Badge competenza se non è mio */}
                                                        {!item.isMyStation && (
                                                            <span style={{fontSize:'0.7rem', marginLeft:'8px', background:'#bdc3c7', color:'white', padding:'2px 4px', borderRadius:'3px'}}>
                                                                {item.stationName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stato / Orario */}
                                                <div style={{textAlign:'right'}}>
                                                    {isServito ? (
                                                        <div style={{color:'green', fontSize:'0.8rem'}}>
                                                            ✅ Fatto<br/>
                                                            <small>{item.ora_servizio}</small>
                                                        </div>
                                                    ) : (
                                                        section.locked ? <span style={{fontSize:'1.2rem'}}>⏳</span> : null
                                                    )}
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