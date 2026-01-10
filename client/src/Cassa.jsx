// client/src/Cassa.jsx - VERSIONE V35 (SECURE AUTH + GESTIONE CASSA) 💶
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  
  // STATI DATI
  const [tab, setTab] = useState('attivi'); 
  const [tavoliAttivi, setTavoliAttivi] = useState({}); 
  const [storico, setStorico] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); 

  // STATI AUTH
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(res=>res.json()).then(setInfoRistorante);
    const sessionKey = `cassa_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  // --- NUOVA FUNZIONE LOGIN SICURO (API) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if(!infoRistorante?.id) return;
    
    setLoadingLogin(true);
    setLoginError(false);

    try {
        const res = await fetch(`${API_URL}/api/auth/station`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                ristorante_id: infoRistorante.id, 
                role: 'cassa', // Ruolo specifico per la Cassa
                password: passwordInput 
            })
        });
        const data = await res.json();

        if(data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`cassa_session_${slug}`, "true");
        } else {
            setLoginError(true);
        }
    } catch(err) { 
        alert("Errore connessione al server"); 
    } finally { 
        setLoadingLogin(false); 
    }
  };

  const handleLogout = () => {
      if(confirm("Vuoi uscire dalla Cassa?")) {
          localStorage.removeItem(`cassa_session_${slug}`);
          setIsAuthorized(false);
          setPasswordInput("");
      }
  };

  const aggiornaDati = () => {
    if (!infoRistorante?.id) return;
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
        const ordini = Array.isArray(data.nuovi_ordini) ? data.nuovi_ordini : [];
        const raggruppati = {};
        
        ordini.forEach(ord => {
            const t = ord.tavolo;
            if(!raggruppati[t]) raggruppati[t] = { 
                ordini: [], 
                totale: 0,
                fullLog: "",
                cameriere: ord.cameriere,
             cliente: ord.cliente
            };
            raggruppati[t].ordini.push(ord);
            raggruppati[t].totale += Number(ord.totale || 0);
            
            // LOG LIVE: Concatena i dettagli
            if(ord.dettagli && ord.dettagli.trim() !== "") {
                raggruppati[t].fullLog += ord.dettagli + "\n";
            }
        });
        setTavoliAttivi(raggruppati);
      })
      .catch(e => console.error("Errore polling:", e));
  };

  const caricaStorico = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/cassa/storico/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => setStorico(Array.isArray(data) ? data : []))
        .catch(e => console.error("Errore storico:", e));
  };

  useEffect(() => {
    if (isAuthorized && infoRistorante) {
      if(tab === 'attivi') {
          aggiornaDati();
          const i = setInterval(aggiornaDati, 2000);
          return () => clearInterval(i);
      } else {
          caricaStorico();
      }
    }
  }, [isAuthorized, infoRistorante, tab]);

  // --- AZIONI ---

  const modificaStatoProdotto = async (ord, indexDaModificare) => {
      const nuoviProdotti = [...ord.prodotti];
      const item = nuoviProdotti[indexDaModificare];
      const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito';
      
      item.stato = nuovoStato;
      if (nuovoStato === 'servito') {
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
          delete item.ora_servizio;
      }
      
      const logMsg = `[CASSA 💶] HA SEGNATO ${nuovoStato === 'servito' ? 'SERVITO' : 'IN ATTESA'}: ${item.nome}`;

      await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg })
      });
      aggiornaDati();
  };

  const eliminaProdotto = async (ord, indexDaEliminare) => {
      if(!confirm("Eliminare questo piatto?")) return;
      
      const itemEliminato = ord.prodotti[indexDaEliminare];
      const nuoviProdotti = ord.prodotti.filter((_, idx) => idx !== indexDaEliminare);
      const nuovoTotale = Number(ord.totale) - Number(itemEliminato.prezzo || 0);
      
      const logMsg = `[CASSA 💶] HA ELIMINATO: ${itemEliminato.nome} (${itemEliminato.prezzo}€). Nuovo Totale: ${nuovoTotale.toFixed(2)}€`;

      await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, totale: nuovoTotale, logMsg })
      });
      aggiornaDati();
  };

  const chiudiTavolo = async (t) => {
      if(!confirm(`Incassare Tavolo ${t}?`)) return;
      await fetch(`${API_URL}/api/cassa/paga-tavolo`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: t })
      });
      aggiornaDati();
  };

  if (!infoRistorante) return <div style={{padding:50, textAlign:'center', color:'#fff'}}><h1>⏳ Caricamento...</h1></div>;

  if (!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50', flexDirection:'column'}}>
          <div style={{background:'white', color:'black', padding:40, borderRadius:10, textAlign:'center', maxWidth:'400px', width:'90%', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
              <h1 style={{margin:0, fontSize:'3rem'}}>💶</h1>
              <h2 style={{margin:'10px 0', color:'#2c3e50'}}>Accesso Cassa</h2>
              <h3 style={{margin:'0 0 20px 0', color:'#7f8c8d', fontWeight:'normal'}}>{infoRistorante.ristorante}</h3>
              
              <form onSubmit={handleLogin}>
                  <input 
                    type="password" 
                    placeholder="Password Cassa" 
                    value={passwordInput} 
                    onChange={e=>setPasswordInput(e.target.value)} 
                    style={{
                        width:'100%', padding:15, marginBottom:15, fontSize:'18px',
                        boxSizing:'border-box', border: loginError ? '2px solid red' : '1px solid #ccc', borderRadius:5, textAlign:'center'
                    }}
                  />
                  {loginError && <div style={{color:'red', marginBottom:'10px', fontWeight:'bold'}}>Password Errata! ⛔</div>}
                  
                  <button className="btn-invia" style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:'18px'}}>
                      {loadingLogin ? "Verifica..." : "ENTRA"}
                  </button>
              </form>
          </div>
      </div>
  );

  return (
    <div style={{background:'#eee', minHeight:'100vh', padding:20}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h1 style={{margin:0, color:'#333'}}>💶 Cassa: {infoRistorante.ristorante}</h1>
          <div style={{display:'flex', gap:10}}>
            <button onClick={() => setTab('attivi')} style={{padding:'10px 20px', background: tab==='attivi'?'#2980b9':'#ccc', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Tavoli Attivi</button>
            <button onClick={() => setTab('storico')} style={{padding:'10px 20px', background: tab==='storico'?'#2980b9':'#ccc', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Storico</button>
            <button onClick={handleLogout} style={{padding:'10px 20px', background:'#333', color:'white', border:'none', borderRadius:5, cursor:'pointer', marginLeft:10, fontWeight:'bold'}}>ESCI</button>
          </div>
      </header>

      {/* --- VISTA TAVOLI ATTIVI --- */}
      {tab === 'attivi' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
    {Object.keys(tavoliAttivi).length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', fontSize:20, color:'#888'}}>Nessun tavolo attivo.</p>}
    
    {Object.keys(tavoliAttivi).map(tavolo => {
        // --- INIZIO NUOVA LOGICA AGGIUNTA ---
        const info = tavoliAttivi[tavolo];
        const nomeChi = info.cameriere 
            ? `👤 ${info.cameriere}` 
            : `📱 ${info.cliente || 'Cliente'}`;
        // --- FINE NUOVA LOGICA ---

        return (
            <div key={tavolo} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                
                {/* HEADER MODIFICATO CON NOME */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'2px solid #ddd', paddingBottom:10, marginBottom:10}}>
                    <div>
                        <h2 style={{margin:0, color:'#000'}}>Tavolo {tavolo}</h2>
                        {/* Etichetta chi ha preso l'ordine */}
                        <span style={{
                            fontSize:'0.9rem', color:'#666', background:'#eee', 
                            padding:'2px 8px', borderRadius:'4px', marginTop:'5px', 
                            display:'inline-block', fontWeight:'bold'
                        }}>
                            {nomeChi}
                        </span>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <h2 style={{margin:0, color:'#27ae60', marginBottom:'5px'}}>{info.totale.toFixed(2)}€</h2>
                        <button 
                        onClick={() => setSelectedLog({ id: `Tavolo ${tavolo} (LIVE)`, dettagli: info.fullLog })}
                        style={{background:'#27ae60', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}
                        >
                            🟢 LOG LIVE
                        </button>
                    </div>
                </div>

                {/* LOGICA ESISTENTE DEI PRODOTTI (NON TOCCATA) */}
                {info.ordini.map(ord => (
                    <div key={ord.id} style={{marginBottom:20, borderLeft:'4px solid #eee', paddingLeft:10}}>
                        <div style={{fontSize:12, color:'#888', marginBottom:10}}>Ord #{ord.id} - {new Date(ord.data_ora).toLocaleTimeString()}</div>
                        
                        {(() => {
                            const prods = ord.prodotti.map((p, i) => ({...p, originalIdx: i}));
                            
                            const getCourse = (p) => {
                                if (p.course !== undefined) return p.course === 0 ? 5 : p.course; 
                                if (p.is_bar) return 5; 
                                if (p.is_pizzeria) return 3; 
                                return 2; 
                            };

                            const courses = [...new Set(prods.map(p => getCourse(p)))].sort((a,b)=>a-b);

                            const styles = {
                                1: { label: '🟢 1ª PORTATA (Antipasti)', bg: '#eafaf1', border: '#27ae60', color: '#27ae60' },
                                2: { label: '🟡 2ª PORTATA (Primi)', bg: '#fef5e7', border: '#f1c40f', color: '#d35400' },
                                3: { label: '🔴 3ª PORTATA (Secondi/Pizze)', bg: '#fdf2e9', border: '#e67e22', color: '#c0392b' },
                                4: { label: '🍰 DESSERT', bg: '#fceceb', border: '#c0392b', color: '#c0392b' },
                                5: { label: '🍹 BAR', bg: '#eef6fb', border: '#3498db', color: '#2980b9' }
                            };

                            return courses.map(course => {
                                const st = styles[course] || { label: 'ALTRO', bg: '#f9f9f9', border: '#ccc', color:'#666' };
                                const items = prods.filter(p => getCourse(p) === course);

                                return (
                                    <div key={course} style={{marginBottom: 8, background: st.bg, borderRadius: 6, border: `1px solid ${st.border}`, overflow:'hidden'}}>
                                        <div style={{padding:'4px 8px', background: st.border, color:'white', fontSize:11, fontWeight:'bold'}}>
                                            {st.label}
                                        </div>
                                        <div style={{padding:'0 8px'}}>
                                            {items.map(p => (
                                                <div key={p.originalIdx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed #ddd'}}>
                                                    <div style={{flex:1}}>
                                                        <div style={{
                                                            fontWeight: p.stato === 'servito'?'normal':'bold', 
                                                            textDecoration: p.stato==='servito'?'line-through':'none', 
                                                            color: p.stato==='servito'?'#aaa':'#000', fontSize:14
                                                        }}>
                                                            {p.nome}
                                                        </div>
                                                        
                                                        {/* SOTTOTITOLO REPARTO E PREZZO */}
                                                        <div style={{fontSize:'0.75rem', color:'#666', fontStyle:'italic', marginTop:'2px'}}>
                                                            {p.is_bar ? '🍹 Bar' : (p.is_pizzeria ? '🍕 Pizzeria' : '👨‍🍳 Cucina')} 
                                                            <span style={{marginLeft:'5px', fontWeight:'bold', color:'#333'}}>
                                                                • {Number(p.prezzo).toFixed(2)}€
                                                            </span>
                                                        </div>
                                                        
                                                        {p.ora_servizio && <div style={{fontSize:'0.7rem', color:'#27ae60', fontWeight:'bold'}}>✅ Servito: {p.ora_servizio}</div>}
                                                    </div>
                                                    <div style={{display:'flex', gap:5}}>
                                                        <button onClick={() => modificaStatoProdotto(ord, p.originalIdx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>
                                                            {p.stato === 'servito' ? 'FATTO' : 'ATTESA'}
                                                        </button>
                                                        <button onClick={() => eliminaProdotto(ord, p.originalIdx)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:12}}>🗑️</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()}

                    </div>
                ))}
                <button onClick={() => chiudiTavolo(tavolo)} style={{width:'100%', padding:15, background:'#2c3e50', color:'white', border:'none', fontSize:18, marginTop:20, cursor:'pointer', borderRadius:5, fontWeight:'bold'}}>💰 CHIUDI CONTO</button>
            </div>
        );
    })}
</div>
      )}

      {/* --- VISTA STORICO --- */}
      {tab === 'storico' && (
          <div style={{background:'white', color:'#0b0b0bff', padding:20, borderRadius:10}}>
              <h2 style={{color:'#191e22ff', marginTop:0}}>📜 Storico Ordini Conclusi</h2>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{background:'#f9f9f9', textAlign:'left'}}>
                          <th style={{padding:10}}>Data</th>
                          <th style={{padding:10}}>Tavolo</th>
                          <th style={{padding:10}}>Prodotti</th>
                          <th style={{padding:10}}>Totale</th>
                          <th style={{padding:10}}>Log</th>
                      </tr>
                  </thead>
                  <tbody>
                      {storico.map(ord => (
                          <tr key={ord.id} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:10}}>{new Date(ord.data_ora).toLocaleString()}</td>
                              <td style={{padding:10}}>Tavolo {ord.tavolo}</td>
                              <td style={{padding:10, fontSize:13}}>{ord.prodotti.map(p=>p.nome).join(', ')}</td>
                              <td style={{padding:10, fontWeight:'bold'}}>{ord.totale}€</td>
                              <td style={{padding:10}}>
                                  <button onClick={() => setSelectedLog(ord)} style={{padding:'5px 10px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>📝 LOG</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* --- MODAL LOG --- */}
      {selectedLog && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
              <div style={{background:'white', padding:30, borderRadius:10, maxWidth:600, width:'90%', maxHeight:'80vh', overflowY:'auto'}}>
                  <h2 style={{color:'#000'}}>Dettagli Ordine #{selectedLog.id}</h2>
                  <div style={{background:'#f0f0f0', color:'#0f0e0eff', padding:15, borderRadius:5, fontFamily:'monospace', whiteSpace:'pre-wrap', fontSize:13}}>
                      {selectedLog.dettagli || "Nessun dettaglio registrato."}
                  </div>
                  <button onClick={() => setSelectedLog(null)} style={{marginTop:20, padding:'10px 20px', background:'#2c3e50', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Chiudi</button>
              </div>
          </div>
      )}
    </div>
  );
}

export default Cassa;