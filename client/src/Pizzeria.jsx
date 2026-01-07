// client/src/Pizzeria.jsx - VERSIONE V35 (INTELLIGENTE: VISIBILITÀ TOTALE + LOGICA BLOCCO) 🍕
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Pizzeria() {
  const [ordini, setOrdini] = useState([]);
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

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`pizzeria_session_${slug}`,"true"); 
      } else {
          alert("Password Errata");
      }
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
            const tuttiOrdini = data.nuovi_ordini || [];

            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                if (prodotti.length === 0) return false;
                
                // Mostra il ticket finché non è TUTTO servito (anche se sono cose di cucina)
                // Così il pizzaiolo vede a che punto è il tavolo
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

  // --- AZIONE: SEGNA PIZZA PRONTA ---
  const segnaPizzaPronta = async (ordineId, prodottiAttuali, indices) => {
      const nuoviProdotti = [...prodottiAttuali];
      const primoItem = nuoviProdotti[indices[0]];

      if (primoItem.stato === 'servito') return;

      const nuovoStato = 'servito';
      const oraAttuale = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});

      indices.forEach(idx => {
          const item = nuoviProdotti[idx];
          item.stato = nuovoStato;
          item.ora_servizio = oraAttuale; 
      });

      const qty = indices.length;
      const logMsg = `[PIZZERIA 🍕] HA SFORNATO: ${qty > 1 ? qty + 'x ' : ''}${primoItem.nome} alle ${oraAttuale}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // --- LOGICA CORE: RAGGRUPPAMENTO PER USCITA (IDENTICA A CUCINA MA CON TARGET DIVERSO) ---
  const processaOrdine = (prodotti) => {
      const courses = { 1: [], 2: [], 3: [] };
      
      prodotti.forEach((p, originalIndex) => {
          const c = p.course || 2; 
          if(!courses[c]) courses[c] = [];
          courses[c].push({ ...p, originalIndex });
      });

      // Calcolo Blocchi (Wait Logic)
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
                      // *** DIFFERENZA CHIAVE RISPETTO A CUCINA ***
                      isMyStation: p.is_pizzeria, // Qui controllo se è PIZZERIA
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

  // --- RENDERING (STILE ROSSO) ---
  
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
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}>
                <h2>Il forno è vuoto! 🔥</h2>
            </div>
        )}

        {ordini.map(ordine => {
            const strutturaOrdine = processaOrdine(ordine.prodotti);
            
            return (
                <div key={ordine.id} className="ticket" style={{background:'white', borderTop:'5px solid #e74c3c', marginBottom:20, borderRadius:8}}>
                    {/* Header Ticket */}
                    <div className="ticket-header" style={{padding:10, borderBottom:'1px solid #eee', background:'#fceceb', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'1.5rem', color:'#c0392b'}}>Tavolo <strong>{ordine.tavolo}</strong></span>
                        <span style={{fontSize:'0.9rem', color:'#666'}}>{new Date(ordine.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                        
                        {strutturaOrdine.map(section => {
                            // Colori Header Uscita
                            let headerColor = "#7f8c8d"; 
                            let headerBg = "#ecf0f1";
                            let title = `${section.courseNum}ª USCITA`;
                            
                            if (!section.locked) {
                                if(section.courseNum === 1) { headerColor = "#27ae60"; headerBg = "#e8f8f5"; title += " (INIZIARE)"; }
                                if(section.courseNum === 2) { headerColor = "#d35400"; headerBg = "#fdebd0"; title += " (A SEGUIRE)"; } // Arancio scuro per Pizzeria
                                if(section.courseNum === 3) { headerColor = "#c0392b"; headerBg = "#f9ebea"; title += " (DESSERT)"; }
                            } else {
                                title += " (IN ATTESA)";
                            }

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
                                        
                                        let bg = 'white';
                                        let opacity = 1;
                                        let cursor = 'pointer';

                                        if (section.locked && !isServito) {
                                            opacity = 0.5;
                                            cursor = 'not-allowed';
                                            bg = '#f9f9f9';
                                        } else if (!item.isMyStation) {
                                            bg = '#f0f0f0'; // Grigio per ciò che non è pizza
                                            cursor = 'default';
                                        } else if (isServito) {
                                            bg = '#e8f5e9'; // Verde servito
                                            cursor = 'default';
                                        }

                                        return (
                                            <div 
                                                key={item.key}
                                                onClick={() => {
                                                    if (item.isMyStation && !isServito && !section.locked) {
                                                        segnaPizzaPronta(ordine.id, ordine.prodotti, item.indices);
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
                                                        background: isServito ? '#95a5a6' : (item.isMyStation ? '#e74c3c' : '#7f8c8d'),
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
                                                        {!item.isMyStation && (
                                                            <span style={{fontSize:'0.7rem', marginLeft:'8px', background:'#bdc3c7', color:'white', padding:'2px 4px', borderRadius:'3px'}}>
                                                                {item.stationName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{textAlign:'right'}}>
                                                    {isServito ? (
                                                        <div style={{color:'green', fontSize:'0.8rem'}}>
                                                            ✅ Sfornata<br/>
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

export default Pizzeria;