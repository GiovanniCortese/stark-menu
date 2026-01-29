// client/src/Cassa.jsx - VERSIONE V95 (VISUAL MAP INTEGRATION) 🗺️
import { io } from "socket.io-client";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const navigate = useNavigate(); 
  
  // STATI DATI
  const [tab, setTab] = useState('attivi'); // 'attivi', 'storico', 'pin'
  const [viewMode, setViewMode] = useState('map'); // 'map' oppure 'grid' <--- NUOVO SWITCH
  
  const [tavoliAttivi, setTavoliAttivi] = useState([]); 
  const [storico, setStorico] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); 
  
  // STATI PIN & SALA
  const [layoutSala, setLayoutSala] = useState([]); // Array coordinate grafico
  const [tavoliStatus, setTavoliStatus] = useState([]); // Array stato reale (PIN, occupato)
  const [showPinModal, setShowPinModal] = useState(null);

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
          
          // Parsing Layout Sala
          if (data.layout_sala) {
              try {
                  const parsed = typeof data.layout_sala === 'string' ? JSON.parse(data.layout_sala) : data.layout_sala;
                  const validLayout = Array.isArray(parsed) ? parsed : [];
                  setLayoutSala(validLayout);
                  // Se non c'è layout grafico salvato, forza la vista a griglia
                  if (validLayout.length === 0) setViewMode('grid');
              } catch(e) { 
                  setLayoutSala([]); 
                  setViewMode('grid'); 
              }
          } else {
              setViewMode('grid');
          }

          if (data.moduli && data.moduli.cassa === false) setIsModuleDisabled(true);
      })
      .catch(err => console.error(err));

    const sessionKey = `cassa_session_${slug}`;
    if (localStorage.getItem(sessionKey)) setIsAuthorized(true);
  }, [slug]);

  // 2. POLLING DATI
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
                        tavolo: tKey, ordini: [], totale: 0, coperti: o.coperti || 0, fullLog: "", orarioMin: o.data_ora
                    };
                    grouped[tKey].ordini.push(o);
                    grouped[tKey].totale += parseFloat(o.totale);
                    if(o.coperti > grouped[tKey].coperti) grouped[tKey].coperti = o.coperti; 
                });
                
                const lista = Object.values(grouped).sort((a,b) => new Date(a.orarioMin) - new Date(b.orarioMin));
                // Genera Log testuale
                lista.forEach(t => { t.fullLog = t.ordini.map(o => (o.dettagli || "").trim()).filter(d=>d).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"); });
                setTavoliAttivi(lista);
            });

        // Stato Tavoli (PIN & Coperti)
        fetch(`${API_URL}/api/cassa/tavoli/status/${infoRistorante.id}`)
            .then(r => r.json())
            .then(data => setTavoliStatus(data)); 
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); 
    const socket = io(API_URL);
    socket.emit('join_room', String(infoRistorante.id));
    socket.on('refresh_ordini', fetchData);
    socket.on('refresh_tavoli', fetchData); 

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
        } else { setLoginError(true); }
    } catch (err) { alert("Errore connessione"); } 
    finally { setLoadingLogin(false); }
  };

  // --- AZIONI UI ---
  const handleTavoloClick = async (tavoloNome) => {
      // 1. Cerca se il tavolo è già attivo
      const statoTavolo = tavoliStatus.find(t => t.numero === tavoloNome && t.stato === 'occupato');
      
      if (statoTavolo) {
          if(confirm(`Tavolo ${tavoloNome} già aperto (PIN: ${statoTavolo.active_pin}).\nVai agli ordini?`)) {
               setTab('attivi');
          }
          return;
      }

      // 2. Apri tavolo
      const copertiInput = prompt(`🍽️ Apertura ${tavoloNome}\nInserisci numero coperti:`, "2");
      if (copertiInput === null) return; 

      try {
          const res = await fetch(`${API_URL}/api/cassa/tavolo/status`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  ristorante_id: infoRistorante.id, 
                  numero: tavoloNome, 
                  stato: 'occupato', 
                  coperti: parseInt(copertiInput) 
              })
          });
          const data = await res.json();

          if(data.success) {
              setShowPinModal({ numero: tavoloNome, pin: data.tavolo.active_pin });
              // Refresh locale rapido
              setTavoliStatus(prev => {
                  const exists = prev.find(p => p.numero === tavoloNome);
                  if(exists) return prev.map(p => p.numero === tavoloNome ? {...p, active_pin: data.tavolo.active_pin, stato: 'occupato'} : p);
                  return [...prev, data.tavolo];
              });
          } else { alert("Errore apertura: " + data.error); }
      } catch(e) { alert("Errore di connessione."); }
  };

  const getPinForTable = (nomeTavolo) => {
      const found = tavoliStatus.find(t => t.numero === nomeTavolo && t.stato === 'occupato');
      return found ? found.active_pin : null;
  };

  const chiudiTavolo = async (t) => {
      if(!confirm(`Incassare Tavolo ${t}?`)) return;
      await fetch(`${API_URL}/api/cassa/paga-tavolo`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: t }) });
  };

  const inviaInProduzione = async (ordiniDaInviare) => {
      if(!confirm(`Confermi di inviare ${ordiniDaInviare.length} ordini in cucina?`)) return;
      try { await Promise.all(ordiniDaInviare.map(ord => fetch(`${API_URL}/api/ordine/invia-produzione`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id_ordine: ord.id }) }))); } catch(e) { alert("Errore invio ordine"); }
  };

  const modificaStatoProdotto = async (ord, indexDaModificare) => {
    const nuoviProdotti = [...ord.prodotti]; const item = nuoviProdotti[indexDaModificare];
    const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito'; item.stato = nuovoStato;
    if (nuovoStato === 'in_attesa') { item.riaperto = true; delete item.ora_servizio; } else { item.ora_servizio = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}); item.chiuso_da_cassa = true; }
    const logMsg = nuovoStato === 'in_attesa' ? `[CASSA 💶] ⚠️ RIAPERTO: ${item.nome}` : `[CASSA 💶] ✅ FATTO: ${item.nome}`;
    await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, logMsg }) });
  };

  const eliminaProdotto = async (ord, indexDaEliminare) => {
      if(!confirm("Eliminare questo piatto?")) return;
      const itemEliminato = ord.prodotti[indexDaEliminare]; const nuoviProdotti = ord.prodotti.filter((_, idx) => idx !== indexDaEliminare);
      const nuovoTotale = Number(ord.totale) - Number(itemEliminato.prezzo || 0);
      const logMsg = `[CASSA 💶] HA ELIMINATO: ${itemEliminato.nome} (${itemEliminato.prezzo}€). Nuovo Totale: ${nuovoTotale.toFixed(2)}€`;
      await fetch(`${API_URL}/api/ordine/${ord.id}/update-items`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prodotti: nuoviProdotti, totale: nuovoTotale, logMsg }) });
  };

  if (isModuleDisabled) return <div style={{padding:50, textAlign:'center'}}><h1>⛔ MODULO CASSA NON ATTIVO</h1></div>;
  if (!isAuthorized) return (<div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#2c3e50'}}><div style={{background:'white', padding:40, borderRadius:10, textAlign:'center', width:300}}><h2>💰 Accesso Cassa</h2><p>{infoRistorante?.ristorante}</p><form onSubmit={handleLogin}><input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="PIN Cassa" style={{padding:10, fontSize:18, width:'100%', marginBottom:10, textAlign:'center'}} autoFocus />{loginError && <p style={{color:'red'}}>PIN Errato</p>}<button type="submit" style={{width:'100%', padding:10, background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold'}}>{loadingLogin ? "..." : "ENTRA"}</button></form></div></div>);

  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', flexDirection:'column'}}>
      
      {/* MODALE PIN GIGANTE */}
      {showPinModal && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.95)', zIndex:99999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white'}}>
              <h2 style={{fontSize:'3rem', margin:0}}>TAVOLO {showPinModal.numero} APERTO!</h2>
              <div style={{fontSize:'1.5rem', marginTop:20, color:'#bbb'}}>COMUNICA AL CLIENTE:</div>
              <div style={{fontSize:'8rem', fontWeight:'bold', color:'#f1c40f', border:'5px dashed #f1c40f', padding:'20px 60px', margin:'30px 0', borderRadius:30, letterSpacing: 15, background:'rgba(255,255,255,0.1)'}}>{showPinModal.pin}</div>
              <button onClick={() => setShowPinModal(null)} style={{marginTop:30, padding:'20px 60px', fontSize:'2rem', background:'white', color:'black', border:'none', borderRadius:15, cursor:'pointer', fontWeight:'bold'}}>OK, FATTO 👍</button>
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

      <div style={{padding:20, flex:1, overflowY:'auto'}}>
          {/* TAB 1: ORDINI IN CORSO (Invariata) */}
          {tab === 'attivi' && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
                  {tavoliAttivi.length === 0 && <p style={{textAlign:'center', width:'100%', color:'#888'}}>Nessun ordine attivo.</p>}
                  {tavoliAttivi.map((info, i) => {
                      const ordiniDaInviare = info.ordini.filter(o => o.stato === 'in_arrivo');
                      const richiedeApprovazione = ordiniDaInviare.length > 0;
                      const pin = getPinForTable(info.tavolo);
                      return (
                      <div key={i} style={{background:'white', borderRadius:10, padding:15, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', border: `4px solid ${richiedeApprovazione ? '#e67e22' : 'transparent'}`}}>
                          {richiedeApprovazione && (<div style={{background:'#e67e22', color:'white', padding:'10px', borderRadius:'8px', marginBottom:'10px', textAlign:'center'}}><h3 style={{margin:0}}>🔔 {ordiniDaInviare.length} NUOVI</h3><button onClick={() => inviaInProduzione(ordiniDaInviare)} style={{marginTop:10, background:'white', color:'#e67e22', border:'none', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer'}}>ACCETTA E INVIA</button></div>)}
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:10, marginBottom:10}}>
                              <h3 style={{margin:0, fontSize:22}}>{info.tavolo}</h3>
                              <div style={{textAlign:'right'}}><div style={{fontSize:18, fontWeight:'bold', color:'#27ae60'}}>€ {info.totale.toFixed(2)}</div><div style={{fontSize:12, color:'#7f8c8d'}}>Coperti: {info.coperti}</div></div>
                          </div>
                          <div style={{maxHeight:250, overflowY:'auto', fontSize:13, marginBottom:15}}>{info.ordini.map(ord => renderProdotti(ord, modificaStatoProdotto, eliminaProdotto))}</div>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f9', padding:10, borderRadius:5}}>
                              <div><span style={{fontSize:10, color:'#999'}}>PIN:</span><br/><strong style={{fontSize:16, color:'#e67e22'}}>{pin || "---"}</strong></div>
                              <button onClick={() => setSelectedLog({ id: `Log ${info.tavolo}`, dettagli: info.fullLog })} style={{background:'#3498db', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>LOG</button>
                              <button onClick={()=>chiudiTavolo(info.tavolo)} style={{background:'#2c3e50', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer'}}>Paga</button>
                          </div>
                      </div>
                  )})}
              </div>
          )}

          {/* TAB 2: MAPPA GRAFICA & GESTIONE PIN */}
          {tab === 'pin' && (
              <div>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                      <h3 style={{color:'#34495e', margin:0}}>Gestione Sala</h3>
                      {layoutSala.length > 0 && (
                          <div style={{display:'flex', gap:10}}>
                              <button onClick={()=>setViewMode('map')} style={{background: viewMode==='map'?'#2ecc71':'#ecf0f1', padding:'8px 15px', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>🗺️ Mappa</button>
                              <button onClick={()=>setViewMode('grid')} style={{background: viewMode==='grid'?'#2ecc71':'#ecf0f1', padding:'8px 15px', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>▦ Griglia</button>
                          </div>
                      )}
                  </div>

                  {/* VISTA MAPPA GRAFICA */}
                  {viewMode === 'map' && layoutSala.length > 0 && (
                      <div style={{
                          width: '100%', height: '600px', 
                          background: '#e0e0e0', position: 'relative', 
                          borderRadius: 10, overflow: 'auto', 
                          border: '2px solid #bdc3c7',
                          backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', backgroundSize: '20px 20px'
                      }}>
                          {layoutSala.map(t => {
                              const pin = getPinForTable(t.label); // Usa label grafico per cercare
                              const isOccupied = !!pin;
                              
                              return (
                                  <div key={t.id} onClick={() => handleTavoloClick(t.label)} 
                                       style={{
                                           position: 'absolute', left: t.x, top: t.y,
                                           width: t.shape === 'rect' ? 120 : (t.shape === 'round' ? 80 : 70),
                                           height: t.shape === 'round' ? 80 : 70,
                                           borderRadius: t.shape === 'round' ? '50%' : '8px',
                                           background: isOccupied ? '#2ecc71' : '#ecf0f1', // VERDE = OCCUPATO, GRIGIO = LIBERO
                                           border: isOccupied ? '3px solid #27ae60' : '2px solid #bdc3c7',
                                           display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                           cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                           color: isOccupied ? 'white' : '#7f8c8d', fontWeight:'bold'
                                       }}>
                                      <div style={{fontSize:14}}>{t.label}</div>
                                      {isOccupied && <div style={{fontSize:10, marginTop:2}}>PIN: {pin}</div>}
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {/* VISTA GRIGLIA (Fallback o Mobile) */}
                  {(viewMode === 'grid' || layoutSala.length === 0) && (
                      <div style={{display:'flex', flexWrap:'wrap', gap:15}}>
                          {(layoutSala.length > 0 ? layoutSala : tavoliStatus).map((t, i) => {
                              const nome = t.label || t.numero;
                              const currentPin = getPinForTable(nome);
                              return (
                                  <div key={i} onClick={()=>handleTavoloClick(nome)} 
                                       style={{
                                           width:100, height:100, 
                                           background: currentPin ? '#2ecc71' : '#ecf0f1', 
                                           color: currentPin ? 'white' : '#7f8c8d',
                                           borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                                           cursor:'pointer', border: currentPin ? '2px solid #27ae60' : '2px solid #bdc3c7'
                                       }}>
                                      <div style={{fontWeight:'bold', fontSize:16}}>{nome}</div>
                                      {currentPin ? <div style={{fontSize:10}}>PIN: {currentPin}</div> : <div style={{fontSize:10}}>LIBERO</div>}
                                  </div>
                              );
                          })}
                          <div onClick={() => { const nome = prompt("Nome Tavolo Manuale:"); if(nome) handleTavoloClick(nome); }} style={{width:100, height:100, border:'2px dashed #95a5a6', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#7f8c8d'}}>+ Manuale</div>
                      </div>
                  )}
              </div>
          )}

          {/* TAB 3: STORICO */}
          {tab === 'storico' && (
              <div style={{background:'white', padding:20, borderRadius:10}}>
                  <h3 style={{margin:0, marginBottom:10}}>Storico Recente</h3>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#f9f9f9', textAlign:'left'}}><th style={{padding:10}}>Data</th><th>Tavolo</th><th>Totale</th><th>Action</th></tr></thead>
                      <tbody>{storico.map(ord => (<tr key={ord.id} style={{borderBottom:'1px solid #eee'}}><td style={{padding:10}}>{new Date(ord.data_ora).toLocaleTimeString()}</td><td>{ord.tavolo}</td><td>{ord.totale}€</td><td><button onClick={()=>setSelectedLog(ord)}>Log</button></td></tr>))}</tbody>
                  </table>
              </div>
          )}
      </div>

      {selectedLog && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}} onClick={()=>setSelectedLog(null)}>
            <div style={{background:'white', padding:30, borderRadius:10, maxWidth:600, width:'90%', maxHeight:'80vh', overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                <h2>Log Tavolo</h2>
                <div style={{background:'#222', color:'#0f0', padding:20, borderRadius:5, fontFamily:'monospace', whiteSpace:'pre-wrap'}}>{(selectedLog.dettagli||"").replace(/\n/g, "\n")}</div>
                <button onClick={()=>setSelectedLog(null)} style={{marginTop:20, padding:10, width:'100%'}}>Chiudi</button>
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
                <div style={{fontSize:'0.75rem', color:'#666'}}>{p.is_bar?'🍹':(p.is_pizzeria?'🍕':'👨‍🍳')} • {Number(p.prezzo).toFixed(2)}€</div>
            </div>
            <div style={{display:'flex', gap:5}}>
                <button onClick={() => modificaStatoProdotto(ord, p.originalIdx)} style={{background: p.stato==='servito'?'#27ae60':'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11}}>{p.stato === 'servito' ? 'FATTO' : 'ATTESA'}</button>
                <button onClick={() => eliminaProdotto(ord, p.originalIdx)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:12}}>🗑️</button>
            </div>
        </div>
    ));
};

export default Cassa;