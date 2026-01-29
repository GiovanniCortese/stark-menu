// client/src/Cassa.jsx - VERSIONE V91 (PIN SYSTEM & COPERTI) 💶
import { io } from "socket.io-client";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const navigate = useNavigate(); 
  
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  
  // STATI DATI
  const [tab, setTab] = useState('attivi'); // 'attivi', 'storico', 'pin'
  const [tavoliAttivi, setTavoliAttivi] = useState([]); 
  const [storico, setStorico] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); 
  
  // STATI PIN & SALA
  const [layoutSala, setLayoutSala] = useState([]); // Tavoli disegnati dall'Admin
  const [tavoliStatus, setTavoliStatus] = useState([]); // PIN attivi dal DB
  const [showPinModal, setShowPinModal] = useState(null); // { numero: 'T1', pin: '1234' }

  // STATI AUTH
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 1. CARICAMENTO INIZIALE
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => {
          setInfoRistorante(data);
          
          // Carica Layout Sala (se esiste)
          if (data.layout_sala) {
              try {
                  const parsed = typeof data.layout_sala === 'string' ? JSON.parse(data.layout_sala) : data.layout_sala;
                  setLayoutSala(Array.isArray(parsed) ? parsed : []);
              } catch(e) { setLayoutSala([]); }
          }

          if (data.moduli && data.moduli.cassa === false) setIsModuleDisabled(true);
      })
      .catch(err => console.error(err));

    const sessionKey = `cassa_session_${slug}`;
    if (localStorage.getItem(sessionKey)) setIsAuthorized(true);
  }, [slug]);

  // 2. POLLING DATI (Ogni 5 sec + Socket)
  useEffect(() => {
    if (!isAuthorized || !infoRistorante) return;
    
    const fetchData = () => {
        // Ordini Attivi
        fetch(`${API_URL}/api/ordini/${infoRistorante.id}`)
            .then(r => r.json())
            .then(data => {
                const grouped = {};
                data.forEach(o => {
                    const tKey = o.tavolo_numero;
                    if (!grouped[tKey]) grouped[tKey] = { 
                        tavolo: tKey, 
                        ordini: [], 
                        totale: 0, 
                        coperti: o.coperti || 0, // Prende i coperti dall'ordine
                        fullLog: "",
                        orarioMin: o.data_ora
                    };
                    grouped[tKey].ordini.push(o);
                    grouped[tKey].totale += parseFloat(o.totale);
                    // Aggiorna coperti se trovi un valore più alto
                    if(o.coperti > grouped[tKey].coperti) grouped[tKey].coperti = o.coperti; 
                });
                
                const lista = Object.values(grouped).sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));
                
                // Genera Log testuale
                lista.forEach(t => {
                    t.fullLog = t.ordini.map(o => (o.dettagli || "").trim()).filter(d=>d).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
                });

                setTavoliAttivi(lista);
            });

        // Stato Tavoli (PIN & Coperti nel DB tavoli)
        fetch(`${API_URL}/api/cassa/tavoli/status/${infoRistorante.id}`)
            .then(r => r.json())
            .then(data => setTavoliStatus(data)); 
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); 
    const socket = io(API_URL);
    socket.emit('join_room', String(infoRistorante.id));
    socket.on('refresh_ordini', fetchData);
    socket.on('refresh_tavoli', fetchData); // Ascolta generazione PIN o chiusura

    return () => { clearInterval(interval); socket.disconnect(); };
  }, [isAuthorized, infoRistorante]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    try {
        const res = await fetch(`${API_URL}/api/auth/station`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ristorante_id: infoRistorante.id, role: 'cassa', password: passwordInput })
        });
        const data = await res.json();
        if (data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`cassa_session_${slug}`, "true");
        } else {
            setLoginError(true);
        }
    } catch (err) { alert("Errore connessione"); } 
    finally { setLoadingLogin(false); }
  };

  // --- 🔥 NUOVA LOGICA: GESTIONE APERTURA TAVOLO ---
  const handleTavoloClick = async (tavoloNome) => {
      // 1. Cerca se il tavolo è già attivo (ha un PIN)
      const statoTavolo = tavoliStatus.find(t => t.numero === tavoloNome && t.stato === 'occupato');
      
      if (statoTavolo) {
          // SE È GIÀ APERTO: Mostra solo il PIN (utile se il cliente l'ha perso) o vai all'ordine
          if(confirm(`Tavolo ${tavoloNome} già aperto (PIN: ${statoTavolo.active_pin}).\nVuoi chiuderlo o vedere l'ordine?`)) {
               // Qui potresti reindirizzare alla tab ordini
               setTab('attivi');
          }
          return;
      }

      // 2. SE È LIBERO: Apri procedura
      const copertiInput = prompt(`🍽️ Apertura ${tavoloNome}\nInserisci numero coperti:`, "2");
      if (copertiInput === null) return; // Annullato

      try {
          // Chiamata alla nuova API che salva coperti e genera PIN
          const res = await fetch(`${API_URL}/api/cassa/tavolo/status`, {
              method: 'POST', 
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  id: getTableIdByName(tavoloNome), // Se non abbiamo ID, il backend dovrebbe gestire lookup per numero o crearlo
                  ristorante_id: infoRistorante.id, // Fallback se ID mancante
                  numero: tavoloNome,              // Fallback se ID mancante
                  stato: 'occupato',
                  coperti: parseInt(copertiInput) 
              })
          });
          
          const data = await res.json();

          if(data.success) {
              // 3. MOSTRA IL PIN GIGANTE
              setShowPinModal({
                  numero: tavoloNome,
                  pin: data.tavolo.active_pin
              });
              
              // Refresh locale rapido
              setTavoliStatus(prev => {
                  const exists = prev.find(p => p.numero === tavoloNome);
                  if(exists) return prev.map(p => p.numero === tavoloNome ? {...p, active_pin: data.tavolo.active_pin, stato: 'occupato'} : p);
                  return [...prev, data.tavolo];
              });
          } else {
              alert("Errore apertura: " + data.error);
          }
      } catch(e) { 
          console.error(e);
          alert("Errore di connessione."); 
      }
  };

  // Helper per trovare l'ID del tavolo dal layout o dallo status
  const getTableIdByName = (nome) => {
      const tStatus = tavoliStatus.find(t => t.numero === nome);
      if(tStatus) return tStatus.id;
      // Se non esiste ancora nel DB (nuovo layout), mandiamo null, il backend dovrà gestirlo
      return null;
  };

  const getPinForTable = (nomeTavolo) => {
      const found = tavoliStatus.find(t => t.numero === nomeTavolo && t.stato === 'occupato');
      return found ? found.active_pin : null;
  };

  const inviaInProduzione = async (ordiniDaInviare) => {
      if(!confirm(`Confermi di inviare ${ordiniDaInviare.length} ordini in cucina?`)) return;
      try {
          await Promise.all(ordiniDaInviare.map(ord => 
              fetch(`${API_URL}/api/ordine/invia-produzione`, {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ id_ordine: ord.id })
              })
          ));
      } catch(e) { alert("Errore invio ordine"); }
  };

  const modificaStatoProdotto = async (ord, indexDaModificare) => {
    const nuoviProdotti = [...ord.prodotti];
    const item = nuoviProdotti[indexDaModificare];
    const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito';
    item.stato = nuovoStato;
    if (nuovoStato === 'in_attesa') { item.riaperto = true; delete item.ora_servizio; } 
    else { item.ora_servizio = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}); item.chiuso_da_cassa = true; }
    
    const logMsg = nuovoStato === 'in_attesa' ? `[CASSA 💶] ⚠️ RIAPERTO: ${item.nome}` : `[CASSA 💶] ✅ FATTO: ${item.nome}`;
    await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, logMsg }) });
  };

  const eliminaProdotto = async (ord, indexDaEliminare) => {
      if(!confirm("Eliminare questo piatto?")) return;
      const itemEliminato = ord.prodotti[indexDaEliminare];
      const nuoviProdotti = ord.prodotti.filter((_, idx) => idx !== indexDaEliminare);
      const nuovoTotale = Number(ord.totale) - Number(itemEliminato.prezzo || 0);
      const logMsg = `[CASSA 💶] HA ELIMINATO: ${itemEliminato.nome} (${itemEliminato.prezzo}€). Nuovo Totale: ${nuovoTotale.toFixed(2)}€`;
      await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, totale: nuovoTotale, logMsg }) });
  };

  const chiudiTavolo = async (t) => {
      if(!confirm(`Incassare Tavolo ${t}?`)) return;
      await fetch(`${API_URL}/api/cassa/paga-tavolo`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: t }) });
  };

  if (isModuleDisabled) return <div style={{padding:50, textAlign:'center'}}><h1>⛔ MODULO CASSA NON ATTIVO</h1></div>;

  if (!isAuthorized) {
      return (
          <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#2c3e50'}}>
              <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center', width:300}}>
                  <h2>💰 Accesso Cassa</h2>
                  <p>{infoRistorante?.ristorante}</p>
                  <form onSubmit={handleLogin}>
                      <input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="PIN Cassa" style={{padding:10, fontSize:18, width:'100%', marginBottom:10, textAlign:'center'}} autoFocus />
                      {loginError && <p style={{color:'red'}}>PIN Errato</p>}
                      <button type="submit" style={{width:'100%', padding:10, background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold'}}>{loadingLogin ? "..." : "ENTRA"}</button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', flexDirection:'column'}}>
      
      {/* --- MODALE PIN GIGANTE --- */}
      {showPinModal && (
          <div style={{
              position:'fixed', top:0, left:0, right:0, bottom:0, 
              background:'rgba(0,0,0,0.95)', zIndex:99999, 
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'
          }}>
              <h2 style={{fontSize:'3rem', margin:0}}>TAVOLO {showPinModal.numero} APERTO!</h2>
              <div style={{fontSize:'1.5rem', marginTop:20, color:'#bbb'}}>COMUNICA AL CLIENTE:</div>
              <div style={{
                  fontSize:'8rem', fontWeight:'bold', color:'#f1c40f', 
                  border:'5px dashed #f1c40f', padding:'20px 60px', margin:'30px 0', 
                  borderRadius:30, letterSpacing: 15, background:'rgba(255,255,255,0.1)'
              }}>
                  {showPinModal.pin}
              </div>
              <p style={{fontSize:'1.2rem'}}>Coperti registrati. Il tavolo è sbloccato.</p>
              <button 
                  onClick={() => setShowPinModal(null)}
                  style={{marginTop:30, padding:'20px 60px', fontSize:'2rem', background:'white', color:'black', border:'none', borderRadius:15, cursor:'pointer', fontWeight:'bold'}}
              >
                  OK, FATTO 👍
              </button>
          </div>
      )}

      {/* HEADER */}
      <div style={{background:'#34495e', padding:'10px 20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>💰 Cassa: {infoRistorante?.ristorante}</h2>
          <div>
              <button onClick={()=>setTab('attivi')} style={{marginRight:10, padding:'8px 15px', background: tab==='attivi'?'#f1c40f':'#2c3e50', color: tab==='attivi'?'black':'white', border:'1px solid #fff', borderRadius:5}}>In Corso</button>
              <button onClick={()=>setTab('pin')} style={{marginRight:10, padding:'8px 15px', background: tab==='pin'?'#e67e22':'#2c3e50', color: 'white', border:'1px solid #fff', borderRadius:5}}>🔑 Sala & PIN</button>
              <button onClick={()=>setTab('storico')} style={{marginRight:10, padding:'8px 15px', background: tab==='storico'?'#2980b9':'#2c3e50', color: 'white', border:'1px solid #fff', borderRadius:5}}>Storico</button>
              <button onClick={()=>{localStorage.removeItem(`cassa_session_${slug}`); setIsAuthorized(false);}} style={{padding:'8px 15px', background:'#c0392b', color:'white', border:'none', borderRadius:5}}>Esci</button>
          </div>
      </div>

      {/* CONTENUTO */}
      <div style={{padding:20, flex:1, overflowY:'auto'}}>
          
          {/* VISTA 1: ORDINI ATTIVI */}
          {tab === 'attivi' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
                  {tavoliAttivi.length === 0 && <p style={{textAlign:'center', width:'100%', color:'#888'}}>Nessun ordine attivo.</p>}
                  
                  {tavoliAttivi.map((info, i) => {
                      const tavolo = info.tavolo;
                      const ordiniDaInviare = info.ordini.filter(o => o.stato === 'in_arrivo');
                      const richiedeApprovazione = ordiniDaInviare.length > 0;
                      const borderColor = richiedeApprovazione ? '#e67e22' : 'transparent';
                      const currentPin = getPinForTable(tavolo);

                      return (
                      <div key={i} style={{background:'white', borderRadius:10, padding:15, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', border: `4px solid ${borderColor}`}}>
                          {richiedeApprovazione && (
                                <div style={{background:'#e67e22', color:'white', padding:'10px', borderRadius:'8px', marginBottom:'10px', textAlign:'center', animation: 'pulse 1.5s infinite'}}>
                                    <h3 style={{margin:0}}>🔔 {ordiniDaInviare.length} NUOVI ORDINI</h3>
                                    <button onClick={() => inviaInProduzione(ordiniDaInviare)} style={{marginTop:10, background:'white', color:'#e67e22', border:'none', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer'}}>ACCETTA E INVIA</button>
                                </div>
                          )}

                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:10, marginBottom:10}}>
                              <h3 style={{margin:0, fontSize:22}}>{tavolo}</h3>
                              <div style={{textAlign:'right'}}>
                                  <div style={{fontSize:18, fontWeight:'bold', color:'#27ae60'}}>€ {info.totale.toFixed(2)}</div>
                                  <div style={{fontSize:12, color:'#7f8c8d'}}>Coperti: {info.coperti}</div>
                              </div>
                          </div>
                          
                          <div style={{maxHeight:250, overflowY:'auto', fontSize:13, marginBottom:15}}>
                              {info.ordini.map(ord => renderProdotti(ord, modificaStatoProdotto, eliminaProdotto))}
                          </div>

                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f9', padding:10, borderRadius:5}}>
                              <div>
                                  <span style={{fontSize:10, color:'#999'}}>PIN ATTUALE:</span><br/>
                                  <strong style={{fontSize:16, color:'#e67e22'}}>{currentPin || "---"}</strong>
                              </div>
                              <button onClick={() => setSelectedLog({ id: `Tavolo ${tavolo} (LIVE)`, dettagli: info.fullLog })} style={{background:'#3498db', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold', marginRight:5}}>LOG</button>
                              <button onClick={()=>chiudiTavolo(tavolo)} style={{background:'#2c3e50', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer'}}>Chiudi & Paga</button>
                          </div>
                      </div>
                  )})}
              </div>
          )}

          {/* VISTA 2: GESTIONE PIN & SALA */}
          {tab === 'pin' && (
              <div>
                  <h3 style={{color:'#34495e'}}>Mappa Sala & Codici Accesso</h3>
                  <p>Clicca su un tavolo GRIGIO per <strong>APRIRLO</strong> (Inserire Coperti + Generare PIN). Clicca su un tavolo VERDE per dettagli.</p>
                  
                  <div style={{display:'flex', flexWrap:'wrap', gap:15}}>
                      {/* LOGICA: Se abbiamo il layout grafico, usiamo quello. Altrimenti lista standard o bottoni manuali */}
                      {(layoutSala.length > 0 ? layoutSala : tavoliStatus).map((t, i) => {
                          const nome = t.label || t.numero; // label da layout admin, numero da status DB
                          const currentPin = getPinForTable(nome);
                          const isOccupied = !!currentPin;
                          
                          return (
                              <div key={i} onClick={()=>handleTavoloClick(nome)} 
                                   style={{
                                       width:120, height:120, 
                                       background: isOccupied ? '#2ecc71' : '#ecf0f1', 
                                       color: isOccupied ? 'white' : '#7f8c8d',
                                       borderRadius:10, 
                                       display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                                       cursor:'pointer', border: isOccupied ? '2px solid #27ae60' : '2px solid #bdc3c7',
                                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                       transition: 'transform 0.1s'
                                   }}>
                                  <div style={{fontWeight:'bold', fontSize:18, marginBottom:5}}>{nome}</div>
                                  
                                  {isOccupied ? (
                                      <>
                                        <div style={{background:'rgba(0,0,0,0.2)', padding:'2px 8px', borderRadius:4, fontWeight:'bold', fontSize:20}}>
                                            {currentPin}
                                        </div>
                                        <div style={{fontSize:10, marginTop:5}}>OCCUPATO</div>
                                      </>
                                  ) : (
                                      <>
                                        <div style={{fontSize:30, opacity:0.3}}>🍽️</div>
                                        <div style={{fontSize:10, marginTop:5}}>LIBERO</div>
                                      </>
                                  )}
                              </div>
                          );
                      })}

                      {/* Tasto per tavolo manuale (se layout admin non configurato) */}
                      <div onClick={() => {
                          const nome = prompt("Nome Tavolo Manuale (es. T-99):");
                          if(nome) handleTavoloClick(nome);
                      }} style={{width:120, height:120, border:'2px dashed #95a5a6', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#7f8c8d', flexDirection:'column'}}>
                          <span style={{fontSize:30}}>+</span>
                          <span>Manuale</span>
                      </div>
                  </div>
              </div>
          )}

          {/* VISTA 3: STORICO */}
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
      </div>

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
    </div>
  );
}

const renderProdotti = (ord, modificaStatoProdotto, eliminaProdotto) => {
    const prods = ord.prodotti.map((p, i) => ({...p, originalIdx: i}));
    return prods.map((p, idx) => (
        <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed #ddd'}}>
            <div style={{flex:1}}>
                <div style={{fontWeight: p.stato === 'servito'?'normal':'bold', textDecoration: p.stato==='servito'?'line-through':'none', color: p.stato==='servito'?'#aaa':'#000', fontSize:14}}>{p.nome}</div>
                {p.varianti_scelte && (<div style={{marginTop:'2px', display:'flex', flexWrap:'wrap', gap:'4px'}}>{p.varianti_scelte.rimozioni?.map((ing, i)=><span key={i} style={{background:'#fceaea', color:'#c0392b', fontSize:'10px', padding:'1px 5px', borderRadius:'3px'}}>NO {ing}</span>)}{p.varianti_scelte.aggiunte?.map((ing, i)=><span key={i} style={{background:'#e8f5e9', color:'#27ae60', fontSize:'10px', padding:'1px 5px', borderRadius:'3px'}}>+ {ing.nome}</span>)}</div>)}
                <div style={{fontSize:'0.75rem', color:'#666', fontStyle:'italic', marginTop:'2px'}}>{p.is_bar ? '🍹 Bar' : (p.is_pizzeria ? '🍕 Pizzeria' : '👨‍🍳 Cucina')} • {Number(p.prezzo).toFixed(2)}€</div>
                {p.stato === 'servito' && (
                    <div style={{color: '#27ae60', fontSize: '11px', fontWeight: 'bold', marginTop: '4px', background: '#eafaf1', display: 'inline-block', padding: '2px 6px', borderRadius: '4px'}}>
                        ✅ SERVITO ALLE {p.ora_servizio || "--:--"}
                    </div>
                )}
            </div>
            <div style={{display:'flex', gap:5}}>
                <button onClick={() => modificaStatoProdotto(ord, p.originalIdx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>{p.stato === 'servito' ? 'FATTO' : 'ATTESA'}</button>
                <button onClick={() => eliminaProdotto(ord, p.originalIdx)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:12}}>🗑️</button>
            </div>
        </div>
    ));
};

export default Cassa;