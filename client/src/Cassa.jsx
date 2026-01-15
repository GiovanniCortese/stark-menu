// client/src/Cassa.jsx - VERSIONE V42 (FIX ORDINAMENTO CRONOLOGICO) 💶
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  
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

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if(!infoRistorante?.id) return;
    setLoadingLogin(true);
    setLoginError(false);
    try {
        const res = await fetch(`${API_URL}/api/auth/station`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ristorante_id: infoRistorante.id, role: 'cassa', password: passwordInput })
        });
        const data = await res.json();
        if(data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`cassa_session_${slug}`, "true");
        } else { setLoginError(true); }
    } catch(err) { alert("Errore connessione al server"); } finally { setLoadingLogin(false); }
  };

  const handleLogout = () => {
      if(confirm("Vuoi uscire dalla Cassa?")) {
          localStorage.removeItem(`cassa_session_${slug}`);
          setIsAuthorized(false);
          setPasswordInput("");
      }
  };

  const apriDettagliUtente = async (id) => {
    if(!id) return;
    setLoadingUser(true);
    setSelectedUserData(null);
    try {
        const res = await fetch(`${API_URL}/api/cliente/stats/${id}`);
        const data = await res.json();
        setSelectedUserData(data);
    } catch(e) { alert("Errore caricamento dati utente"); } finally { setLoadingUser(false); }
  };

  // --- HELPER CALCOLO LIVELLO CLIENTE ---
  const getLivello = (n) => {
      const num = parseInt(n || 0);
      if (num >= 100) return { label: "Legend 💎", color: "#3498db", bg: "#eafaf1" };
      if (num >= 30) return { label: "VIP 🥇", color: "#f1c40f", bg: "#fef9e7" };
      if (num >= 15) return { label: "Cliente Top 🥈", color: "#7f8c8d", bg: "#f4f6f7" };
      if (num >= 5) return { label: "Buongustaio 🥉", color: "#cd7f32", bg: "#fdf2e9" };
      return { label: "Novizio 🌱", color: "#27ae60", bg: "#e8f8f5" };
  };

  // --- FUNZIONE: INVIA ORDINE AI REPARTI (APPROVAZIONE) ---
  const inviaInProduzione = async (ordiniDaInviare) => {
      if(!confirm(`Confermi di inviare ${ordiniDaInviare.length} ordini in cucina?`)) return;
      
      try {
          await Promise.all(ordiniDaInviare.map(ord => 
              fetch(`${API_URL}/api/ordine/invia-produzione`, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ id_ordine: ord.id })
              })
          ));
          aggiornaDati(); 
      } catch(e) { alert("Errore invio ordine"); }
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
                cliente: ord.cliente, 
                storico_ordini: ord.storico_ordini || 0,
                utente_id: ord.utente_id,
                hasPending: false 
            };
            
            if (ord.stato === 'in_arrivo') {
                raggruppati[t].hasPending = true;
            }

            raggruppati[t].ordini.push(ord);
            raggruppati[t].totale += Number(ord.totale || 0);
            
            if(ord.dettagli && ord.dettagli.trim() !== "") {
                raggruppati[t].fullLog += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" + ord.dettagli + "\n";
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

  // --- AZIONI SUI PRODOTTI ---
  const modificaStatoProdotto = async (ord, indexDaModificare) => {
    const nuoviProdotti = [...ord.prodotti];
    const item = nuoviProdotti[indexDaModificare];
    const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito';
    item.stato = nuovoStato;
    if (nuovoStato === 'in_attesa') { item.riaperto = true; delete item.ora_servizio; } 
    else { item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); item.chiuso_da_cassa = true; }
    
    const logMsg = nuovoStato === 'in_attesa' ? `[CASSA 💶] ⚠️ RIAPERTO: ${item.nome}` : `[CASSA 💶] ✅ FATTO: ${item.nome}`;
    await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, logMsg }) });
    aggiornaDati();
  };

  const eliminaProdotto = async (ord, indexDaEliminare) => {
      if(!confirm("Eliminare questo piatto?")) return;
      const itemEliminato = ord.prodotti[indexDaEliminare];
      const nuoviProdotti = ord.prodotti.filter((_, idx) => idx !== indexDaEliminare);
      const nuovoTotale = Number(ord.totale) - Number(itemEliminato.prezzo || 0);
      const logMsg = `[CASSA 💶] HA ELIMINATO: ${itemEliminato.nome} (${itemEliminato.prezzo}€). Nuovo Totale: ${nuovoTotale.toFixed(2)}€`;
      await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, totale: nuovoTotale, logMsg }) });
      aggiornaDati();
  };

  const chiudiTavolo = async (t) => {
      if(!confirm(`Incassare Tavolo ${t}?`)) return;
      await fetch(`${API_URL}/api/cassa/paga-tavolo`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: t }) });
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
                  <input type="password" placeholder="Password Cassa" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:15, marginBottom:15, fontSize:'18px', boxSizing:'border-box', border: loginError ? '2px solid red' : '1px solid #ccc', borderRadius:5, textAlign:'center'}} />
                  {loginError && <div style={{color:'red', marginBottom:'10px', fontWeight:'bold'}}>Password Errata! ⛔</div>}
                  <button className="btn-invia" style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:'18px'}}>{loadingLogin ? "Verifica..." : "ENTRA"}</button>
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

      {tab === 'attivi' && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
            {Object.keys(tavoliAttivi).length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', fontSize:20, color:'#888'}}>Nessun tavolo attivo.</p>}
            
            {Object.keys(tavoliAttivi).map(tavolo => {
                const info = tavoliAttivi[tavolo];
                
                // --- FIX ORDINAMENTO: DAL PRIMO (VECCHIO) ALL'ULTIMO (NUOVO) ---
                info.ordini.sort((a,b) => new Date(a.data_ora) - new Date(b.data_ora));

                const ordiniDaInviare = info.ordini.filter(o => o.stato === 'in_arrivo');
                const richiedeApprovazione = ordiniDaInviare.length > 0;
                const borderColor = richiedeApprovazione ? '#e67e22' : 'transparent';

                return (
                    <div key={tavolo} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 4px 10px rgba(0,0,0,0.1)', border: `4px solid ${borderColor}`}}>
                        
                        {richiedeApprovazione && (
                            <div style={{
                                background:'#e67e22', color:'white', padding:'15px', 
                                borderRadius:'8px', marginBottom:'20px', textAlign:'center',
                                animation: 'pulse 1.5s infinite' 
                            }}>
                                <h3 style={{margin:'0 0 10px 0', fontSize:'18px'}}>🔔 {ordiniDaInviare.length} ORDINI DA CLIENTE</h3>
                                <button onClick={() => inviaInProduzione(ordiniDaInviare)} style={{background:'white', color:'#e67e22', border:'none', padding:'10px 20px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', fontSize:'16px', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>✅ ACCETTA E INVIA IN CUCINA</button>
                            </div>
                        )}

                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'2px solid #ddd', paddingBottom:10, marginBottom:10}}>
                            <div>
                                <h2 style={{margin:0, color:'#000', fontSize:'1.6rem'}}>Tavolo {tavolo}</h2>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <h2 style={{margin:0, color: richiedeApprovazione ? '#e67e22' : '#27ae60', marginBottom:'5px'}}>{info.totale.toFixed(2)}€</h2>
                                <button onClick={() => setSelectedLog({ id: `Tavolo ${tavolo} (LIVE)`, dettagli: info.fullLog })} style={{background:'#27ae60', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>🟢 LOG LIVE</button>
                            </div>
                        </div>

                        {info.ordini.map(ord => {
                            // --- LOGICA NOME, ICONE E LIVELLO ---
                            const isStaffOrder = !!ord.cameriere; 
                            const nomeAutore = isStaffOrder ? `Staff: ${ord.cameriere}` : (ord.cliente || "Ospite");
                            const isUser = !ord.cameriere && ord.utente_id; 
                            const iconaAutore = isStaffOrder ? '👤' : '📱';
                            
                            // CALCOLO LIVELLO
                            const livelloInfo = isUser ? getLivello(ord.storico_ordini) : null;

                            return (
                                <div key={ord.id} style={{
                                    marginBottom:20, 
                                    borderLeft:`4px solid ${ord.stato === 'in_arrivo' ? '#e67e22' : '#eee'}`, 
                                    paddingLeft:10,
                                    opacity: ord.stato === 'in_arrivo' ? 0.6 : 1
                                }}>
                                    {ord.stato === 'in_arrivo' && <div style={{color:'#e67e22', fontWeight:'bold', fontSize:'0.8rem', marginBottom:5}}>⚠️ IN ATTESA DI CONFERMA</div>}
                                    
                                    {/* HEADER ORDINE: ID, ORA, NOME E GRADO */}
                                    <div style={{fontSize:12, color:'#888', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <span>Ord #{ord.id} - {new Date(ord.data_ora).toLocaleTimeString()}</span>
                                        
                                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                            <span 
                                                onClick={(e) => {
                                                    if(isUser) { e.stopPropagation(); apriDettagliUtente(ord.utente_id); }
                                                }}
                                                style={{
                                                    color: isUser ? '#2980b9' : '#555',
                                                    fontWeight: 'bold',
                                                    cursor: isUser ? 'pointer' : 'default',
                                                    textDecoration: isUser ? 'underline' : 'none',
                                                    background: '#f0f0f0',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px'
                                                }}
                                            >
                                                {iconaAutore} {nomeAutore}
                                            </span>

                                            {/* --- MOSTRA IL GRADO SE È UN UTENTE --- */}
                                            {isUser && livelloInfo && (
                                                <span style={{
                                                    fontSize: '10px', 
                                                    background: livelloInfo.bg, 
                                                    color: livelloInfo.color, 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px', 
                                                    fontWeight: 'bold',
                                                    border: `1px solid ${livelloInfo.color}`
                                                }}>
                                                    {livelloInfo.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {renderProdotti(ord, modificaStatoProdotto, eliminaProdotto)}
                                </div>
                            );
                        })}

                        <button onClick={() => chiudiTavolo(tavolo)} style={{width:'100%', padding:15, background:'#2c3e50', color:'white', border:'none', fontSize:18, marginTop:5, cursor:'pointer', borderRadius:5, fontWeight:'bold'}}>💰 CHIUDI CONTO</button>
                    </div>
                );
            })}
          </div>
      )}

      {/* --- TAB STORICO --- */}
      {tab === 'storico' && (
          <div style={{background:'white', color:'#0b0b0bff', padding:20, borderRadius:10}}>
              <h2 style={{color:'#191e22ff', marginTop:0}}>📜 Storico Ordini Conclusi</h2>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{background:'#f9f9f9', textAlign:'left'}}><th style={{padding:10}}>Data</th><th style={{padding:10}}>Tavolo</th><th style={{padding:10}}>Prodotti</th><th style={{padding:10}}>Totale</th><th style={{padding:10}}>Log</th></tr>
                  </thead>
                  <tbody>
                      {storico.map(ord => (
                          <tr key={ord.id} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:10}}>{new Date(ord.data_ora).toLocaleString()}</td>
                              <td style={{padding:10}}>Tavolo {ord.tavolo}</td>
                              <td style={{padding:10, fontSize:13}}>{ord.prodotti.map(p=>p.nome).join(', ')}</td>
                              <td style={{padding:10, fontWeight:'bold'}}>{ord.totale}€</td>
                              <td style={{padding:10}}><button onClick={() => setSelectedLog(ord)} style={{padding:'5px 10px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>📝 LOG</button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {selectedLog && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}} onClick={()=>setSelectedLog(null)}>
            <div style={{background:'white', padding:30, borderRadius:10, maxWidth:600, width:'90%', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 50px rgba(0,0,0,0.5)'}} onClick={e=>e.stopPropagation()}>
                <h2 style={{color:'#000', marginTop:0, borderBottom:'2px solid #eee', paddingBottom:'10px'}}>📋 LOG DETTAGLIATO</h2>
                <div style={{background:'#1a1a1a', color:'#2ecc71', padding:20, borderRadius:8, fontFamily:'"Courier New", monospace', whiteSpace:'pre-wrap', fontSize:13, lineHeight:'1.5', border:'1px solid #333', marginTop:'15px'}}>
                    {(selectedLog.dettagli || "").replace(/\n/g, "\n").split("----------------------------------").join("\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n")}
                </div>
                <button onClick={() => setSelectedLog(null)} style={{width:'100%', marginTop:25, padding:'15px', background:'#2c3e50', color:'white', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>CHIUDI SCHERMATA</button>
            </div>
        </div>
      )}

      {selectedUserData && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => setSelectedUserData(null)}>
              <div style={{background:'white', padding:30, borderRadius:15, width:'90%', maxWidth:400, textAlign:'center', position:'relative'}} onClick={e=>e.stopPropagation()}>
                  <button onClick={() => setSelectedUserData(null)} style={{position:'absolute', top:10, right:10, border:'none', background:'transparent', fontSize:20, cursor:'pointer'}}>✕</button>
                  <div style={{width:80, height:80, background: selectedUserData.livello.colore, borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, color:'white', boxShadow:`0 5px 15px ${selectedUserData.livello.colore}66`}}>{selectedUserData.livello.nome.split(' ')[1] || '👤'}</div>
                  <h2 style={{margin:0, color:'#2c3e50'}}>{selectedUserData.nome}</h2>
                  <div style={{background: selectedUserData.livello.bg, color: selectedUserData.livello.colore, padding:'5px 10px', borderRadius:20, display:'inline-block', fontWeight:'bold', marginTop:5, border:`1px solid ${selectedUserData.livello.colore}`}}>{selectedUserData.livello.nome} • Affidabilità: {selectedUserData.livello.affidabilita}</div>
                  <div style={{marginTop:25, textAlign:'left', background:'#f8f9fa', padding:15, borderRadius:10}}>
                      <p style={{margin:'5px 0'}}><strong>📧 Email:</strong> {selectedUserData.email}</p>
                      <p style={{margin:'5px 0'}}><strong>📞 Telefono:</strong> {selectedUserData.telefono || 'Non inserito'}</p>
                      <p style={{margin:'5px 0'}}><strong>📍 Indirizzo:</strong> {selectedUserData.indirizzo || 'Non inserito'}</p>
                      <p style={{margin:'5px 0'}}><strong>📊 Ordini Totali:</strong> {selectedUserData.num_ordini}</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const renderProdotti = (ord, modificaStatoProdotto, eliminaProdotto) => {
    const prods = ord.prodotti.map((p, i) => ({...p, originalIdx: i}));
    const getCourse = (p) => { if (p.course !== undefined) return p.course === 0 ? 5 : p.course; if (p.is_bar) return 5; if (p.is_pizzeria) return 3; return 2; };
    const courses = [...new Set(prods.map(p => getCourse(p)))].sort((a,b)=>a-b);
    const styles = { 1: { label: '🟢 1ª PORTATA (Antipasti)', bg: '#eafaf1', border: '#27ae60' }, 2: { label: '🟡 2ª PORTATA (Primi)', bg: '#fef5e7', border: '#f1c40f' }, 3: { label: '🔴 3ª PORTATA (Secondi/Pizze)', bg: '#fdf2e9', border: '#e67e22' }, 4: { label: '🍰 DESSERT', bg: '#fceceb', border: '#c0392b' }, 5: { label: '🍹 BAR', bg: '#eef6fb', border: '#3498db' } };

    return courses.map(course => {
        const st = styles[course] || { label: 'ALTRO', bg: '#f9f9f9', border: '#ccc' };
        const items = prods.filter(p => getCourse(p) === course);
        return (
            <div key={course} style={{marginBottom: 8, background: st.bg, borderRadius: 6, border: `1px solid ${st.border}`, overflow:'hidden'}}>
                <div style={{padding:'4px 8px', background: st.border, color:'white', fontSize:11, fontWeight:'bold'}}>{st.label}</div>
                <div style={{padding:'0 8px'}}>
                    {items.map(p => (
                        <div key={p.originalIdx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed #ddd'}}>
                            <div style={{flex:1}}>
                                <div style={{fontWeight: p.stato === 'servito'?'normal':'bold', textDecoration: p.stato==='servito'?'line-through':'none', color: p.stato==='servito'?'#aaa':'#000', fontSize:14}}>{p.nome}</div>
                                {p.varianti_scelte && (<div style={{marginTop:'2px', display:'flex', flexWrap:'wrap', gap:'4px'}}>{p.varianti_scelte.rimozioni?.map((ing, i)=><span key={i} style={{background:'#fceaea', color:'#c0392b', fontSize:'10px', padding:'1px 5px', borderRadius:'3px'}}>NO {ing}</span>)}{p.varianti_scelte.aggiunte?.map((ing, i)=><span key={i} style={{background:'#e8f5e9', color:'#27ae60', fontSize:'10px', padding:'1px 5px', borderRadius:'3px'}}>+ {ing.nome}</span>)}</div>)}
                                <div style={{fontSize:'0.75rem', color:'#666', fontStyle:'italic', marginTop:'2px'}}>{p.is_bar ? '🍹 Bar' : (p.is_pizzeria ? '🍕 Pizzeria' : '👨‍🍳 Cucina')} • {Number(p.prezzo).toFixed(2)}€</div>
                                
                                {/* --- NUOVA RIGA: ORARIO SERVIZIO VERDE --- */}
                                {p.stato === 'servito' && (
                                    <div style={{
                                        color: '#27ae60', 
                                        fontSize: '11px', 
                                        fontWeight: 'bold', 
                                        marginTop: '4px',
                                        background: '#eafaf1',
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        ✅ SERVITO ALLE {p.ora_servizio || "--:--"}
                                    </div>
                                )}
                            </div>
                            <div style={{display:'flex', gap:5}}>
                                <button onClick={() => modificaStatoProdotto(ord, p.originalIdx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>{p.stato === 'servito' ? 'FATTO' : 'ATTESA'}</button>
                                <button onClick={() => eliminaProdotto(ord, p.originalIdx)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:12}}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    });
};

export default Cassa;