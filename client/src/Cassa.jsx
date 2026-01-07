// client/src/Cassa.jsx - VERSIONE V31 (STORICO LOG + FIX TOTALE) 💶
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const [tab, setTab] = useState('attivi'); 
  const [tavoliAttivi, setTavoliAttivi] = useState({}); 
  const [storico, setStorico] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedLog, setSelectedLog] = useState(null); 

  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(res=>res.json()).then(setInfoRistorante);
    if (localStorage.getItem(`cassa_session_${slug}`) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === "tonystark") { setIsAuthorized(true); localStorage.setItem(`cassa_session_${slug}`, "true"); }
    else alert("Password Errata");
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
                fullLog: "" // Aggiungiamo il campo per il log completo
            };
            raggruppati[t].ordini.push(ord);
            raggruppati[t].totale += Number(ord.totale || 0);
            
            // Concateniamo i dettagli (log) se presenti
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
        .then(data => setStorico(Array.isArray(data) ? data : []));
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
      
      // LOG MODIFICATO CON PREFISSO CASSA
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
      
      // LOG MODIFICATO CON PREFISSO CASSA
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

  if (!infoRistorante) return <div style={{padding:50, textAlign:'center'}}><h1>⏳ Caricamento...</h1></div>;
  if (!isAuthorized) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50'}}><div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}><h1>💶 Accesso Cassa</h1><p>{infoRistorante.ristorante}</p><form onSubmit={handleLogin}><input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:10, marginBottom:10}}/><button className="btn-invia" style={{width:'100%'}}>ENTRA</button></form></div></div>;

  return (
    <div style={{background:'#eee', minHeight:'100vh', padding:20}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h1 style={{margin:0, color:'#333'}}>💶 Cassa: {infoRistorante.ristorante}</h1>
          <div style={{display:'flex', gap:10}}>
            <button onClick={() => setTab('attivi')} style={{padding:'10px 20px', background: tab==='attivi'?'#2980b9':'#ccc', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Tavoli Attivi</button>
            <button onClick={() => setTab('storico')} style={{padding:'10px 20px', background: tab==='storico'?'#2980b9':'#ccc', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Storico</button>
          </div>
      </header>

      {/* --- VISTA TAVOLI ATTIVI (GRID MIGLIORATA) --- */}
      {tab === 'attivi' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
              {Object.keys(tavoliAttivi).length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', fontSize:20, color:'#888'}}>Nessun tavolo attivo.</p>}
              
              {Object.keys(tavoliAttivi).map(tavolo => (
                  <div key={tavolo} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'2px solid #ddd', paddingBottom:10, marginBottom:10}}>
    <h2 style={{margin:0, color:'#000000ff'}}>Tavolo {tavolo}</h2>
    <div style={{textAlign:'right'}}>
        <h2 style={{margin:0, color:'#27ae60', marginBottom:'5px'}}>{tavoliAttivi[tavolo].totale.toFixed(2)}€</h2>
        {/* BOTTONE VERDE LIVE */}
        <button 
          onClick={() => setSelectedLog({ id: `Tavolo ${tavolo} (LIVE)`, dettagli: tavoliAttivi[tavolo].fullLog })}
          style={{background:'#27ae60', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}
        >
            🟢 LOG LIVE
        </button>
    </div>
</div>

                      {tavoliAttivi[tavolo].ordini.map(ord => (
                          <div key={ord.id} style={{marginBottom:15, borderLeft:'4px solid #eee', paddingLeft:10}}>
                              <div style={{fontSize:12, color:'#888', marginBottom:5}}>Ord #{ord.id} - {new Date(ord.data_ora).toLocaleTimeString()}</div>
                              
                              {ord.prodotti.map((p, idx) => (
                                  <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px dashed #f0f0f0'}}>
                                      <div style={{flex:1}}>
                                          <div style={{fontWeight: p.stato === 'servito'?'normal':'bold', textDecoration: p.stato==='servito'?'line-through':'none', color:p.stato==='servito'?'#aaa':'#000'}}>
                                              {p.nome}
                                          </div>
                                          <div style={{fontSize:11, color:'#666'}}>
                                              {p.is_bar ? '🍹 Bar' : '🍽️ Cucina'} - {p.prezzo}€
                                              {/* DATA MODIFICA (ORARIO SERVIZIO) */}
                                              {p.ora_servizio && <span style={{color:'#27ae60', marginLeft:5, fontWeight:'bold'}}>✅ {p.ora_servizio}</span>}
                                          </div>
                                      </div>
                                      <div style={{display:'flex', gap:5}}>
                                          <button onClick={() => modificaStatoProdotto(ord, idx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'4px 8px', borderRadius:5, cursor:'pointer', fontSize:12}}>
                                              {p.stato === 'servito' ? 'FATTO' : 'ATTESA'}
                                          </button>
                                          <button onClick={() => eliminaProdotto(ord, idx)} style={{background:'#e74c3c', color:'white', border:'none', padding:'4px 8px', borderRadius:5, cursor:'pointer', fontSize:12}}>🗑️</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ))}
                      <button onClick={() => chiudiTavolo(tavolo)} style={{width:'100%', padding:15, background:'#2c3e50', color:'white', border:'none', fontSize:18, marginTop:20, cursor:'pointer', borderRadius:5, fontWeight:'bold'}}>💰 CHIUDI</button>
                  </div>
              ))}
          </div>
      )}

      {/* --- VISTA STORICO DETTAGLIATO --- */}
      {tab === 'storico' && (
          <div style={{background:'white', color:'#0b0b0bff', padding:20, borderRadius:10}}>
              <h2 style={{color:'#191e22ff', marginTop:0}}>📜 Storico Ordini Conclusi</h2>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{background:'#f9f9f9', textAlign:'left'}}>
                          <th style={{padding:10}}>Data Apertura</th>
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