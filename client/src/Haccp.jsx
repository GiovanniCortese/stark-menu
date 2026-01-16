// client/src/Haccp.jsx - VERSIONE V6 (MERCI + FIX LOGS + PRINT FIX)
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 

function Haccp() {
  const { slug, scanId } = useParams();
  const navigate = useNavigate();
  
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // Dati
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [merci, setMerci] = useState([]); // NUOVO STATO MERCI
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  
  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Merci (Form)
  const [merciForm, setMerciForm] = useState({
      data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '',
      temperatura: '', conforme: true, integro: true, note: ''
  });

  // Stati Asset Edit & QR
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'' });
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [showQRModal, setShowQRModal] = useState(null);

  // Stati Etichette e Stampa
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);
  const [printMode, setPrintMode] = useState(null); // 'qr' | 'label' | null

  // Stati Calendario
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); 

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  // --- INIT ---
  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
      if(scanId) setTab('temperature');
  }, [slug, scanId]);

  useEffect(() => {
      if(isAuthorized && info) {
          ricaricaDati();
          ricaricaCalendario(); 
      }
  }, [isAuthorized, info, tab, currentDate]);

  const ricaricaDati = () => {
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      // I log arrivano ordinati dal backend (il primo è il più recente)
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
      // Carica Merci
      fetch(`${API_URL}/api/haccp/merci/${info.id}`).then(r=>r.json()).then(setMerci);
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario') return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      try {
          const res = await fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${start}&end=${end}`);
          const data = await res.json();
          setCalendarLogs(data);
      } catch(e) { console.error("Err Cal", e); }
  };

  // --- AUTH ---
  const handleLogin = async (e) => {
      e.preventDefault();
      try {
          const r = await fetch(`${API_URL}/api/auth/station`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ ristorante_id: info.id, role: 'haccp', password })
          });
          const d = await r.json();
          if(d.success) {
              setIsAuthorized(true);
              localStorage.setItem(`haccp_session_${slug}`, "true");
          } else alert("Password Errata");
      } catch(e) { alert("Errore connessione"); }
  };

  const uploadFile = async (file) => {
      const fd = new FormData(); fd.append('photo', file);
      const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
      const data = await res.json(); return data.url;
  };

  // --- HELPER LOGS ---
  // Trova l'ULTIMO log di oggi per un asset. 
  // Dato che l'API restituisce i log in ordine DESC, il find() becca il più recente.
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };

  // --- LOGICA TEMPERATURE (FIX "NUOVO PASSAGGIO") ---
  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try {
          const url = await uploadFile(f);
          setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }}));
      } finally { setUploadingLog(null); }
  };

  // Questa funzione ora crea SEMPRE un nuovo log (POST), mai PUT.
  // Così manteniamo lo storico delle correzioni.
  const registraTemperatura = async (asset) => {
      const currentInput = tempInput[asset.id] || {};
      const val = parseFloat(currentInput.val);
      
      if(isNaN(val) && currentInput.val !== '0') return alert("Inserisci un numero valido");
      
      const realMin = Math.min(parseFloat(asset.range_min), parseFloat(asset.range_max));
      const realMax = Math.max(parseFloat(asset.range_min), parseFloat(asset.range_max));
      const conforme = val >= realMin && val <= realMax;
      
      let azione = "";
      if(!conforme) {
          azione = prompt(`⚠️ ATTENZIONE: Temp ${val}°C fuori range.\nDescrivi azione correttiva:`, "");
          if(!azione) return alert("Azione correttiva obbligatoria!");
      }

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', 
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val.toString(), 
              conformita: conforme, azione_correttiva: azione,
              foto_prova_url: currentInput.photo || ''
          })
      });

      // Reset stato
      setTempInput(prev => {
          const newState = {...prev};
          delete newState[asset.id]; // Rimuovi input così torna in modalità visualizzazione
          return newState;
      }); 
      ricaricaDati();
      if(scanId) navigate(`/haccp/${slug}`); 
  };

  // Quando clicco "MODIFICA / CORREGGI", attivo l'input per quell'asset
  // ma NON passo un ID log da modificare. Semplicemente mostro il form per inserirne uno nuovo.
  const abilitaNuovaMisurazione = (asset) => {
      const logEsistente = getTodayLog(asset.id);
      // Precompilo con l'ultimo valore per comodità, ma sarà un nuovo salvataggio
      setTempInput(prev => ({
          ...prev, 
          [asset.id]: { val: logEsistente ? logEsistente.valore : '', photo: '' }
      }));
  };

  // --- MERCI ---
  const salvaMerci = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/api/haccp/merci`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({...merciForm, ristorante_id: info.id, operatore: 'Staff'})
      });
      setMerciForm({
        data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: ''
      });
      ricaricaDati();
  };
  
  const eliminaMerce = async (id) => {
      if(confirm("Eliminare riga?")) {
          await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'});
          ricaricaDati();
      }
  };

  // --- ASSET CRUD ---
  const apriModaleAsset = (asset = null) => {
      if(asset) { setEditingAsset(asset); setAssetForm({ ...asset }); } 
      else { setEditingAsset(null); setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'' }); }
      setShowAssetModal(true);
  };
  const salvaAsset = async (e) => {
      e.preventDefault();
      const endpoint = editingAsset ? `${API_URL}/api/haccp/assets/${editingAsset.id}` : `${API_URL}/api/haccp/assets`;
      const method = editingAsset ? 'PUT' : 'POST';
      await fetch(endpoint, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...assetForm, ristorante_id: info.id }) });
      setShowAssetModal(false); ricaricaDati();
  };
  const handleAssetPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return; setUploadingAsset(true);
      try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, foto_url: url})); } finally { setUploadingAsset(false); }
  };

  // --- CALENDARIO ---
  const getDaysInMonth = (date) => { /* ... (Invariato) ... */ 
    const year = date.getFullYear(), month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const emptySlots = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, emptySlots };
  };
  const cambiaMese = (delta) => { 
      const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate); setSelectedDayLogs(null);
  };
  // (Render Calendario invariato salvo fix logica visualizzazione)
  const renderCalendario = () => { /* ... copia dal vecchio file ... */ 
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = [];
      const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} style={{background:'#f0f0f0'}}></div>);
      for (let d = 1; d <= days; d++) {
          const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).getDate() === d);
          const hasError = logsDelGiorno.some(l => !l.conformita);
          const hasLogs = logsDelGiorno.length > 0;
          let bgColor = 'white'; if (hasLogs) bgColor = hasError ? '#ffcccc' : '#ccffcc'; 
          grid.push(<div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno })} style={{background: bgColor, border:'1px solid #ddd', minHeight:'80px', padding:'5px', cursor:'pointer'}}>{d}</div>);
      }
      return (
          <div style={{background:'white', padding:20, borderRadius:10}}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                <button onClick={()=>cambiaMese(-1)}>◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={()=>cambiaMese(1)}>▶</button>
             </div>
             <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5}}>{grid}</div>
             {selectedDayLogs && (
                 <div style={{marginTop:20, borderTop:'1px solid #ccc', paddingTop:10}}>
                     <h4>Dettagli Giorno {selectedDayLogs.day}</h4>
                     {selectedDayLogs.logs.map(l => (
                         <div key={l.id} style={{borderBottom:'1px solid #eee', padding:5}}>
                            {new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})} - <strong>{l.nome_asset}</strong>: {l.valore}°C 
                            {l.azione_correttiva && <span style={{color:'red'}}> (Correzi: {l.azione_correttiva})</span>}
                         </div>
                     ))}
                 </div>
             )}
          </div>
      );
  };

  // --- ETICHETTE & STAMPA ---
  const handlePrintLabel = async (e) => {
      e.preventDefault();
      const scadenza = new Date(); scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      const res = await fetch(`${API_URL}/api/haccp/labels`, { 
          method:'POST', headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) 
      });
      const data = await res.json(); 
      if(data.success) { 
          setLastLabel(data.label); 
          setPrintMode('label'); // Imposta modalità stampa etichetta
          setTimeout(() => { window.print(); setPrintMode(null); }, 500); // Stampa e resetta
      }
  };

  const handlePrintQR = (asset) => {
      setShowQRModal(asset);
  };
  const executePrintQR = () => {
      setPrintMode('qr');
      setTimeout(() => { window.print(); setPrintMode(null); }, 500);
  };

  // --- UI RENDER ---
  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:50, textAlign:'center'}}><h1>🔒 Password Required</h1><form onSubmit={handleLogin}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /><button>Login</button></form></div>;

  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20, fontFamily:'sans-serif'}}>
      
      {/* HEADER NO-PRINT */}
      {!scanId && (
          <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
              <div><h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Control</h1></div>
              <div style={{display:'flex', gap:10}}>
                  {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase', background: tab===t ? '#2c3e50' : 'white', color: tab===t ? 'white' : '#333'}}>
                        {t==='merci' ? '📦 Merci' : t}
                      </button>
                  ))}
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:5}}>ESCI</button>
              </div>
          </div>
      )}

      {/* 1. TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  // Se c'è tempInput[asset.id], stiamo editando/inserendo
                  const isInputActive = !!tempInput[asset.id];
                  const currentData = tempInput[asset.id] || {};

                  // A) CARD VERDE: DATO REGISTRATO (e nessun input attivo)
                  if (todayLog && !isInputActive) {
                      // Usiamo l'ora formattata dal log (ora server italiano)
                      const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                      const isModificato = logs.filter(l => l.asset_id === asset.id && new Date(l.data_ora).toDateString() === new Date().toDateString()).length > 1;

                      return (
                          <div key={asset.id} style={{background:'#eafaf1', padding:20, borderRadius:10, border:'2px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                                  <span style={{fontSize:'24px', fontWeight:'bold'}}>{todayLog.valore}°C</span>
                              </div>
                              <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                                  {isModificato ? `🔄 Modificato alle ${timeStr}` : `Registrato alle ${timeStr}`}
                                  {todayLog.conformita ? '' : ' ⚠️ Anomalia'}
                              </div>
                              <button onClick={() => abilitaNuovaMisurazione(asset)} style={{marginTop:15, width:'100%', background:'#f39c12', color:'white', border:'none', padding:10, borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>
                                  ✏️ MODIFICA / CORREGGI
                              </button>
                          </div>
                      );
                  }

                  // B) CARD INSERIMENTO (Grigia)
                  return (
                      <div key={asset.id} style={{background:'white', padding:15, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:'5px solid #bdc3c7'}}>
                           {/* HEADER CARD PIÙ COMPATTO */}
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                                <div>
                                    <h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3>
                                    <span style={{fontSize:'11px', color:'#999'}}>{asset.marca}</span>
                                </div>
                                <span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:10}}>Range: {asset.range_min}°/{asset.range_max}°</span>
                           </div>

                           {/* LABELS SOPRA INPUT */}
                           <div style={{display:'flex', fontSize:'11px', fontWeight:'bold', color:'#7f8c8d', marginBottom:2}}>
                                <div style={{flex:2, textAlign:'center'}}>TEMPERATURA</div>
                                <div style={{width:50, textAlign:'center'}}>FOTO</div>
                                <div style={{width:80, textAlign:'center'}}>AZIONE</div>
                           </div>

                           {/* INPUTS ROW */}
                           <div style={{display:'flex', gap:5, alignItems:'stretch', height:45}}>
                              <div style={{flex:2, position:'relative'}}>
                                  <input 
                                      type="number" step="0.1" placeholder="°C" 
                                      value={currentData.val || ''} 
                                      onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})}
                                      style={{width:'100%', height:'100%', borderRadius:5, border:'1px solid #ddd', fontSize:18, textAlign:'center', fontWeight:'bold', padding:0, boxSizing:'border-box'}} 
                                  />
                              </div>
                              
                              <label style={{width:50, cursor:'pointer', background: currentData.photo ? '#2ecc71' : '#f1f2f6', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #ddd'}}>
                                  📷<input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                              </label>
                              
                              <button onClick={()=>registraTemperatura(asset)} style={{width:80, background:'#2c3e50', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold', fontSize:'12px'}}>
                                  SALVA
                              </button>
                           </div>
                           
                           {/* Pulsante annulla se stiamo editando */}
                           {isInputActive && getTodayLog(asset.id) && (
                               <button onClick={()=>{
                                   const newState = {...tempInput}; delete newState[asset.id]; setTempInput(newState);
                               }} style={{marginTop:5, width:'100%', fontSize:10, background:'transparent', border:'none', color:'#999', cursor:'pointer'}}>Annulla Modifica</button>
                           )}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. NUOVA TAB: RICEVIMENTO MERCI */}
      {tab === 'merci' && !scanId && (
          <div className="no-print">
              <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20}}>
                  <h3>📥 Nuovo Arrivo</h3>
                  <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                      <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8}} required /></div>
                      <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8}} required /></div>
                      <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8}} required /></div>
                      <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8}} /></div>
                      <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8}} /></div>
                      <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8}} /></div>
                      
                      <div style={{display:'flex', flexDirection:'column', gap:5}}>
                          <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                          <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                      </div>
                      
                      <button style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40}}>REGISTRA</button>
                  </form>
              </div>

              <div style={{background:'white', padding:20, borderRadius:10}}>
                  <h3>📦 Storico Arrivi</h3>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                      <thead>
                          <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                              <th style={{padding:8}}>Data</th>
                              <th style={{padding:8}}>Fornitore</th>
                              <th style={{padding:8}}>Prodotto</th>
                              <th style={{padding:8}}>Lotto</th>
                              <th style={{padding:8}}>Temp</th>
                              <th style={{padding:8}}>Stato</th>
                              <th style={{padding:8}}></th>
                          </tr>
                      </thead>
                      <tbody>
                          {merci.map(m => (
                              <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                  <td style={{padding:8}}>{m.fornitore}</td>
                                  <td style={{padding:8}}>{m.prodotto}</td>
                                  <td style={{padding:8}}>{m.lotto}</td>
                                  <td style={{padding:8}}>{m.temperatura ? `${m.temperatura}°C` : '-'}</td>
                                  <td style={{padding:8}}>{m.conforme && m.integro ? <span style={{color:'green'}}>OK</span> : <span style={{color:'red'}}>NON CONF.</span>}</td>
                                  <td style={{padding:8}}><button onClick={()=>eliminaMerce(m.id)} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>🗑️</button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 3. CALENDARIO */}
      {tab === 'calendario' && !scanId && renderCalendario()}

      {/* 4. ETICHETTE */}
      {tab === 'etichette' && !scanId && (
          <div className="no-print" style={{display:'flex', gap:20}}>
             {/* Form Etichette come prima, ma usa handlePrintLabel */}
             <div style={{background:'white', padding:20, borderRadius:10, flex:1}}>
                 <h3>Genera Etichetta Interna</h3>
                 <form onSubmit={handlePrintLabel} style={{display:'flex', flexDirection:'column', gap:10}}>
                    <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:10}} />
                    <select value={labelData.tipo} onChange={e=>setLabelData({...labelData, tipo:e.target.value})} style={{padding:10}}>
                        <option value="positivo">Positivo (+3°C)</option>
                        <option value="negativo">Negativo (-18°C)</option>
                        <option value="sottovuoto">Sottovuoto</option>
                    </select>
                    <input type="number" placeholder="Giorni scadenza" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{padding:10}} />
                    <input placeholder="Operatore" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{padding:10}} />
                    <button style={{background:'#2980b9', color:'white', border:'none', padding:10, marginTop:10}}>STAMPA</button>
                 </form>
             </div>
             {/* Preview */}
             <div style={{flex:1, background:'#eee', display:'flex', alignItems:'center', justifyContent:'center'}}>
                 {lastLabel && <div style={{background:'white', padding:10, border:'1px solid black', width:200, height:120}}>
                     <strong>{lastLabel.prodotto}</strong><br/>
                     <small>Scad: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</small><br/>
                     <small>Lotto: {lastLabel.lotto}</small>
                 </div>}
             </div>
          </div>
      )}

      {/* 5. SETUP (MACCHINE + QR) */}
      {tab === 'setup' && !scanId && (
          <div className="no-print">
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                  <h2>Macchinari</h2>
                  <button onClick={()=>apriModaleAsset()} style={{background:'#27ae60', color:'white', border:'none', padding:10}}>+ Nuova</button>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
                  {assets.map(a => (
                      <div key={a.id} style={{background:'white', padding:15, borderRadius:10}}>
                          <strong>{a.nome}</strong> ({a.tipo})
                          <div style={{marginTop:10}}>
                              <button onClick={()=>handlePrintQR(a)} style={{marginRight:5}}>QR Code</button>
                              <button onClick={()=>apriModaleAsset(a)}>Modifica</button>
                          </div>
                      </div>
                  ))}
              </div>
              {/* MODALE QR PREVIEW */}
              {showQRModal && (
                  <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <div style={{background:'white', padding:30, textAlign:'center'}}>
                          <h3>QR: {showQRModal.nome}</h3>
                          <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={150} />
                          <br/><br/>
                          <button onClick={executePrintQR}>STAMPA QR</button>
                          <button onClick={()=>setShowQRModal(null)} style={{marginLeft:10}}>CHIUDI</button>
                      </div>
                  </div>
              )}
              {/* MODALE ASSET (omesso per brevità, uguale a prima) */}
              {showAssetModal && (
                  /* ... codice modale form asset ... */
                  <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                     <div style={{background:'white', padding:20, width:300}}>
                        <form onSubmit={salvaAsset} style={{display:'flex', flexDirection:'column', gap:10}}>
                           <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome" />
                           <input value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" />
                           <input value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" />
                           <button>Salva</button>
                           <button type="button" onClick={()=>setShowAssetModal(false)}>Annulla</button>
                        </form>
                     </div>
                  </div>
              )}
          </div>
      )}

      {/* --- SEZIONE STAMPA INVISIBILE (GESTITA DA CSS E STATO) --- */}
      {/* 1. TEMPLATE ETICHETTA */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'58mm', height:'40mm', background:'white', color:'black', display:'flex', flexDirection:'column', padding:'2mm', boxSizing:'border-box', fontSize:'10px', fontFamily:'Arial'}}>
            <div style={{fontWeight:'bold', fontSize:'12px', textAlign:'center', borderBottom:'1px solid black', paddingBottom:'2px'}}>{lastLabel.prodotto}</div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'2px'}}><span>PROD: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span><span>OP: {lastLabel.operatore}</span></div>
            <div style={{fontWeight:'bold', fontSize:'11px', marginTop:'2px'}}>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
            <div style={{marginTop:'auto', fontSize:'9px', textAlign:'center'}}>Lotto: {lastLabel.lotto}</div>
        </div>
      )}

      {/* 2. TEMPLATE QR CODE */}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h1 style={{fontSize:'40px', marginBottom:20}}>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
             <p style={{marginTop:20, fontSize:'20px'}}>Scansiona per registrare la temperatura</p>
        </div>
      )}

      <style>{`
        @media print { 
            .no-print { display: none !important; } 
            .print-area { z-index: 9999; display: flex !important; }
            body { margin: 0; padding: 0; }
            @page { margin: 0; size: auto; }
        }
      `}</style>
    </div>
  );
}

export default Haccp;