// client/src/Pizzeria.jsx - VERSIONE V5 (FIX VARIANTI & RAGGRUPPAMENTO SICURO) 🍕
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
            const nuoviOrdini = data.nuovi_ordini || [];
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
                            riaperto: prod.riaperto // Importante per la chiave
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
      if(isAuthorized && infoRistorante) { 
          aggiorna(); 
          const i = setInterval(aggiorna, 2000); 
          return () => clearInterval(i); 
      } 
  }, [isAuthorized, infoRistorante]);

  const segnaPizzaPronta = async (targetItems) => {
      const updatesPorOrdine = {};

      targetItems.forEach(item => {
          if(!updatesPorOrdine[item.parentOrderId]) {
              updatesPorOrdine[item.parentOrderId] = {
                  originalProducts: item.fullOrderProducts,
                  indicesToUpdate: []
              };
          }
          updatesPorOrdine[item.parentOrderId].indicesToUpdate.push(item.originalIndex);
      });

      const promises = Object.keys(updatesPorOrdine).map(async (orderId) => {
          const data = updatesPorOrdine[orderId];
          const nuoviProdotti = [...data.originalProducts];
          const oraAttuale = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
          
          let nomePiattoLog = "";
          data.indicesToUpdate.forEach(idx => {
              nuoviProdotti[idx].stato = 'servito';
              nuoviProdotti[idx].ora_servizio = oraAttuale;
              nomePiattoLog = nuoviProdotti[idx].nome;
          });

          const logMsg = `[PIZZERIA 🍕] HA SFORNATO: ${nomePiattoLog} (x${data.indicesToUpdate.length})`;

          return fetch(`${API_URL}/api/ordine/${orderId}/update-items`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
          });
      });

      await Promise.all(promises);
      aggiorna();
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
            const nomeCameriere = tavoloData.items[0]?.cameriere;
            
            return (
                <div key={tavoloData.tavolo} className="ticket" style={{background:'white', borderTop:'5px solid #e74c3c', marginBottom:20, borderRadius:8}}>
                    <div className="ticket-header" style={{padding:10, borderBottom:'1px solid #eee', background:'#fceceb', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
    <div style={{display:'flex', flexDirection:'column'}}>
        <span style={{fontSize:'1.8rem', color:'#c0392b'}}>Tavolo <strong>{tavoloData.tavolo}</strong></span>
        
        {/* --- AGGIUNGI QUESTO BLOCCO --- */}
        {nomeCameriere && (
            <span style={{fontSize:'0.9rem', background:'rgba(192, 57, 43, 0.1)', color: '#c0392b', padding:'2px 8px', borderRadius:'4px', marginTop:'2px', display:'inline-block', width:'fit-content', fontWeight: 'bold'}}>
                👤 {nomeCameriere}
            </span>
        )}
    </div>
    <span style={{fontSize:'0.9rem', color:'#000000ff'}}>{new Date(tavoloData.orarioMin).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
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
                                                        <div style={{fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold', textDecoration: isServito ? 'line-through' : 'none', color: isServito ? '#aaa' : '#000'}}>
                                                            {item.nome}
                                                        </div>
                                                        
                                                        {/* --- VISUALIZZAZIONE VARIANTI FIXATA --- */}
                                                        {item.varianti_scelte && (
                                                            <div style={{marginTop:'2px'}}>
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

                                                        {item.riaperto && item.stato === 'in_attesa' && <div style={{display:'inline-block', marginTop:'2px', background:'#f39c12', color:'white', padding:'2px 5px', borderRadius:'3px', fontSize:'0.7rem', fontWeight:'bold'}}>⚠️ RIAPERTO</div>}
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