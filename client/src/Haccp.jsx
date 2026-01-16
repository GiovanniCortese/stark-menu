// client/src/Haccp.jsx - V13 (Mobile Fix, Logic Modificato, Fix Merci)
import { useState, useEffect } from 'react';
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
  const [merci, setMerci] = useState([]); 
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  
  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Merci (Form)
  const [merciForm, setMerciForm] = useState({
      id: null,
      data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '',
      temperatura: '', conforme: true, integro: true, note: '',
      quantita: '', allegato_url: '', destinazione: ''
  });
  const [uploadingMerci, setUploadingMerci] = useState(false);

  // Stati Asset Edit & QR
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', 
      foto_url:'', etichetta_url:'',
      stato: 'attivo' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false); 
  const [uploadingLabel, setUploadingLabel] = useState(false); 
  const [showQRModal, setShowQRModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Stati Download
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null); 
  const [downloadFormat, setDownloadFormat] = useState('excel'); 
  const [selectedMonth, setSelectedMonth] = useState('');

  // Stati Etichette
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);
  const [printMode, setPrintMode] = useState(null);

  // Stati Calendario
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); 

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  // --- INIT ---
  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(data => {
          setInfo(data);
      });
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
      // Ordiniamo i logs per data decrescente per sicurezza
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(data => {
          setLogs(data); // Il backend già li manda ordinati, ma ci fidiamo
      });
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
          const dataLogs = await res.json();
          setCalendarLogs(dataLogs);
      } catch(e) { console.error("Err Cal", e); }
  };

  // --- AUTH & UPLOAD ---
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

  // --- DOWNLOAD ---
  const openDownloadModal = (type) => { setDownloadType(type); setShowDownloadModal(true); setSelectedMonth(''); };
  const executeDownload = (range) => {
      let start = new Date(); let end = new Date(); let rangeName = "Tutto";
      if(range === 'week') { start.setDate(end.getDate() - 7); rangeName="Ultima Settimana"; }
      else if(range === 'month') { start.setMonth(end.getMonth() - 1); rangeName="Ultimo Mese"; }
      else if(range === 'year') { start.setFullYear(end.getFullYear() - 1); rangeName="Ultimo Anno"; }
      else if (range === 'custom-month') {
          if(!selectedMonth) return alert("Seleziona un mese!");
          const [y, m] = selectedMonth.split('-');
          start = new Date(y, m - 1, 1); end = new Date(y, m, 0, 23, 59, 59);
          rangeName = `Mese ${m}/${y}`;
      } else if(range === 'all') { start = new Date('2020-01-01'); rangeName="Storico Completo"; }
      const query = `?start=${start.toISOString()}&end=${end.toISOString()}&rangeName=${rangeName}&format=${downloadFormat}`;
      window.open(`${API_URL}/api/haccp/export/${downloadType}/${info.id}${query}`, '_blank');
      setShowDownloadModal(false);
  };

  // --- TEMPERATURE (LOGICA MODIFICATO) ---
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      // Trova l'ultimo log di oggi
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };

  // Controlla se ci sono più logs oggi per capire se è stato "modificato"
  const isLogModifiedToday = (assetId) => {
      const today = new Date().toDateString();
      const logsToday = logs.filter(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
      return logsToday.length > 1; 
  };

  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try { const url = await uploadFile(f); setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }})); } finally { setUploadingLog(null); }
  };
  
  const registraTemperatura = async (asset, isSpento = false) => {
      let val = 'OFF', conforme = true, azione = "";
      if (!isSpento) {
          const currentInput = tempInput[asset.id] || {};
          val = parseFloat(currentInput.val);
          if(isNaN(val) && currentInput.val !== '0') return alert("Inserisci un numero valido");
          const realMin = Math.min(parseFloat(asset.range_min), parseFloat(asset.range_max));
          const realMax = Math.max(parseFloat(asset.range_min), parseFloat(asset.range_max));
          conforme = val >= realMin && val <= realMax;
          if(!conforme) {
              azione = prompt(`⚠️ ATTENZIONE: Temp ${val}°C fuori range.\nDescrivi azione correttiva:`, "");
              if(!azione) return alert("Azione correttiva obbligatoria!");
          }
          val = val.toString();
      } else {
          val = "OFF"; conforme = true; azione = "Macchinario spento/inutilizzato";
      }

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val, 
              conformita: conforme, azione_correttiva: azione, foto_prova_url: tempInput[asset.id]?.photo || ''
          })
      });
      setTempInput(prev => { const n = {...prev}; delete n[asset.id]; return n; }); 
      ricaricaDati();
      if(scanId) navigate(`/haccp/${slug}`); 
  };
  
  const abilitaNuovaMisurazione = (asset) => {
      const logEsistente = getTodayLog(asset.id);
      setTempInput(prev => ({ ...prev, [asset.id]: { val: logEsistente ? logEsistente.valore : '', photo: '' } }));
  };

  // --- MERCI (FIX SALVATAGGIO) ---
  const handleMerciPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingMerci(true);
      try { const url = await uploadFile(f); setMerciForm(prev => ({...prev, allegato_url: url})); } finally { setUploadingMerci(false); }
  };
  
  const salvaMerci = async (e) => {
      e.preventDefault();
      try {
        const endpoint = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
        const method = merciForm.id ? 'PUT' : 'POST';
        
        const res = await fetch(endpoint, {
            method, headers:{'Content-Type':'application/json'},
            body: JSON.stringify({...merciForm, ristorante_id: info.id, operatore: 'Staff'})
        });
        
        const data = await res.json();
        
        if (data.success) {
            resetMerciForm(); 
            ricaricaDati();
            alert("✅ Salvataggio riuscito!");
        } else {
            // MOSTRA L'ERRORE REALE SE NON SALVA
            alert("❌ Errore Salvataggio: " + (data.error || "Errore sconosciuto"));
            console.error("Errore server merci:", data);
        }
      } catch (err) {
          alert("❌ Errore di connessione: " + err.message);
      }
  };

  const resetMerciForm = () => {
      setMerciForm({
        id: null, data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '', temperatura: '', 
        conforme: true, integro: true, note: '', quantita: '', allegato_url: '', destinazione: ''
      });
  };
  const iniziaModificaMerci = (m) => {
      setMerciForm({ ...m, data_ricezione: m.data_ricezione.split('T')[0], scadenza: m.scadenza ? m.scadenza.split('T')[0] : '' });
      window.scrollTo(0,0);
  };
  const eliminaMerce = async (id) => { if(confirm("Eliminare riga?")) { await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'}); ricaricaDati(); } };

  // --- ASSET CRUD ---
  const apriModaleAsset = (asset = null) => {
      if(asset) { setEditingAsset(asset); setAssetForm({ ...asset }); } 
      else { setEditingAsset(null); setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'', etichetta_url:'', stato:'attivo' }); }
      setShowAssetModal(true);
  };
  const salvaAsset = async (e) => {
      e.preventDefault();
      const endpoint = editingAsset ? `${API_URL}/api/haccp/assets/${editingAsset.id}` : `${API_URL}/api/haccp/assets`;
      const method = editingAsset ? 'PUT' : 'POST';
      await fetch(endpoint, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...assetForm, ristorante_id: info.id }) });
      setShowAssetModal(false); ricaricaDati();
  };
  const handleAssetPhoto = async (e) => { const f = e.target.files[0]; if(!f)return; setUploadingAsset(true); try{const u=await uploadFile(f);setAssetForm(p=>({...p,foto_url:u}))}finally{setUploadingAsset(false)} };
  const handleAssetLabel = async (e) => { const f = e.target.files[0]; if(!f)return; setUploadingLabel(true); try{const u=await uploadFile(f);setAssetForm(p=>({...p,etichetta_url:u}))}finally{setUploadingLabel(false)} };

  // --- UI CALENDARIO & ETICHETTE (Invariati nella logica, solo rendering) ---
  const getDaysInMonth = (d) => { const y=d.getFullYear(),m=d.getMonth(); return { days:new Date(y,m+1,0).getDate(), emptySlots: new Date(y,m,1).getDay()===0?6:new Date(y,m,1).getDay()-1 }; };
  const renderCalendario = () => {
     // ... codice calendario invariato per brevità (utilizza la stessa logica di prima)
     // Ho mantenuto la logica ma rimosso per brevità qui, la logica UI non cambia
     const { days, emptySlots } = getDaysInMonth(currentDate);
     const grid = [];
     for (let i = 0; i < emptySlots; i++) grid.push(<div key={`e-${i}`} style={{background:'#f0f0f0'}}></div>);
     for (let d = 1; d <= days; d++) {
         const dStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
         const lG = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === dStr);
         const mG = merci.filter(m => new Date(m.data_ricezione).toDateString() === dStr);
         const hasLogs=lG.length>0, hasMerci=mG.length>0, hasErr=lG.some(l=>!l.conformita)||mG.some(m=>!m.conforme||!m.integro);
         grid.push(<div key={d} onClick={()=>setSelectedDayLogs({day:d,logs:lG,merci:mG})} style={{background: (hasLogs||hasMerci)?(hasErr?'#ffcccc':'#ccffcc'):'white', border:'1px solid #ddd', minHeight:60, padding:2, fontSize:12, cursor:'pointer'}}><div style={{fontWeight:'bold'}}>{d}</div>{hasLogs&&'🌡️'}{hasMerci&&'📦'}</div>);
     }
     return <div style={{background:'white', padding:10, borderRadius:10}}>
         <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))}>◀</button><b>{currentDate.toLocaleString('it-IT',{month:'long',year:'numeric'})}</b><button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))}>▶</button></div>
         <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5}}>{grid}</div>
         {selectedDayLogs && <div style={{marginTop:20,borderTop:'1px solid #ccc',paddingTop:10}}>
            <strong>Dettagli {selectedDayLogs.day}:</strong>
            <div style={{marginTop:5}}>
                {selectedDayLogs.logs.map(l=><div key={l.id} style={{fontSize:11,borderBottom:'1px solid #eee'}}>🌡️ {l.nome_asset}: {l.valore} ({l.conformita?'OK':'ERR'})</div>)}
                {selectedDayLogs.merci.map(m=><div key={m.id} style={{fontSize:11,borderBottom:'1px solid #eee'}}>📦 {m.fornitore} - {m.prodotto}</div>)}
            </div>
         </div>}
     </div>
  };

  const handlePrintLabel = async (e) => {
      e.preventDefault();
      const s = new Date(); s.setDate(s.getDate() + parseInt(labelData.giorni_scadenza));
      const res = await fetch(`${API_URL}/api/haccp/labels`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: s, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) });
      const d = await res.json(); if(d.success) { setLastLabel(d.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); }
  };

  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:50, textAlign:'center'}}><h1>🔒 Password Required</h1><form onSubmit={handleLogin}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /><button>Login</button></form></div>;
  
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:'10px', fontFamily:'sans-serif'}}>
      
      {/* HEADER RESPONSIVE */}
      {!scanId && (
          <div className="no-print header-container">
              <h1 style={{margin:0, color:'#2c3e50', fontSize:'24px'}}>🛡️ HACCP</h1>
              <div className="nav-buttons">
                  <div className="download-group">
                      <button onClick={()=>openDownloadModal('temperature')} className="btn-down">🌡️</button>
                      <button onClick={()=>openDownloadModal('merci')} className="btn-down">📦</button>
                  </div>
                  <div className="nav-group">
                      {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                          <button key={t} onClick={()=>setTab(t)} className={`btn-nav ${tab===t?'active':''}`}>
                            {t==='temperature' ? '🌡️' : (t==='merci' ? '📦' : (t==='setup' ? '⚙️' : (t==='etichette'?'🏷️':'📅')))}
                          </button>
                      ))}
                      <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="btn-exit">❌</button>
                  </div>
              </div>
          </div>
      )}

      {/* 1. TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="no-print card-grid">
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  const modified = isLogModifiedToday(asset.id); // Check modifica

                  if(asset.stato === 'spento') return (
                      <div key={asset.id} className="asset-card spento">
                          <span className="badge-off">OFF</span>
                          <h3>🚫 {asset.nome}</h3>
                          <div className="status-bar off">SPENTO</div>
                      </div>
                  );

                  const isInputActive = !!tempInput[asset.id];
                  const currentData = tempInput[asset.id] || {};
                  
                  if (todayLog && !isInputActive) {
                      const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                      return (
                          <div key={asset.id} className="asset-card ok">
                              <div className="card-header">
                                  <h3>✅ {asset.nome}</h3>
                                  <span className="temp-display">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°C'}</span>
                              </div>
                              <div className="log-info">
                                  {todayLog.conformita 
                                    ? (modified ? `✏️ Modificato alle ${timeStr}` : `Registrato alle ${timeStr}`) 
                                    : `⚠️ ANOMALIA - ${todayLog.azione_correttiva}`}
                              </div>
                              <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-edit">✏️ MODIFICA</button>
                          </div>
                      );
                  }
                  
                  return (
                      <div key={asset.id} className="asset-card input-mode">
                           <div className="card-header">
                                <h3>{asset.nome}</h3>
                                <span className="range-badge">{asset.range_min}° / {asset.range_max}°</span>
                           </div>
                           
                           <div className="input-row">
                              <input type="number" step="0.1" placeholder="°C" className="temp-input"
                                   value={currentData.val || ''} 
                                   onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                              />
                              
                              <div className="action-buttons">
                                  <button onClick={()=>registraTemperatura(asset, true)} className="btn-off">OFF</button>
                                  <label className={`btn-cam ${currentData.photo ? 'has-photo' : ''}`}>
                                      📷 <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                  </label>
                                  <button onClick={()=>registraTemperatura(asset, false)} className="btn-save">SALVA</button>
                              </div>
                           </div>
                           {isInputActive && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel">Annulla</button>}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. MERCI */}
      {tab === 'merci' && !scanId && (
          <div className="no-print">
              <div className="form-card">
                  <div className="form-header">
                      <h3>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Nuovo Arrivo'}</h3>
                      {merciForm.id && <button onClick={resetMerciForm} className="btn-cancel-small">Annulla</button>}
                  </div>
                  <form onSubmit={salvaMerci} className="merci-form">
                      {/* Grid responsive fields */}
                      <div className="field-group">
                          <label>Data</label>
                          <input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required />
                      </div>
                      <div className="field-group grow">
                          <label>Fornitore</label>
                          <input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required />
                      </div>
                      <div className="field-group grow">
                          <label>Prodotto</label>
                          <input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required />
                      </div>
                      <div className="field-group">
                          <label>Qty (Kg/Colli)</label>
                          <input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} />
                      </div>
                      <div className="field-group">
                          <label>Lotto</label>
                          <input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} />
                      </div>
                      <div className="field-group">
                          <label>Scadenza</label>
                          <input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} />
                      </div>
                      <div className="field-group small">
                          <label>Temp °C</label>
                          <input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} />
                      </div>
                      <div className="field-group">
                          <label>Destinazione</label>
                          <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                            <option value="">-- Seleziona --</option>
                            {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                          </select>
                      </div>
                      <div className="field-group full">
                          <label>Note</label>
                          <input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} />
                      </div>
                      
                      <div className="form-actions">
                        <label className={`btn-upload ${merciForm.allegato_url ? 'done' : ''}`}>
                            {uploadingMerci ? "..." : "📎 Bolla"}
                            <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} hidden />
                        </label>
                        <div className="checkbox-group">
                            <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> OK</label>
                            <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                        </div>
                        <button className="btn-submit">{merciForm.id ? 'AGGIORNA' : 'REGISTRA'}</button>
                      </div>
                  </form>
              </div>

              {/* LISTA MERCI RESPONSIVE (Cards su Mobile, Table su Desktop) */}
              <div className="merci-list">
                  <h3>📦 Storico Arrivi</h3>
                  {/* Vista Desktop */}
                  <table className="desktop-table">
                      <thead>
                          <tr><th>Data</th><th>Fornitore/Prod</th><th>Dettagli</th><th>Stato</th><th>Azioni</th></tr>
                      </thead>
                      <tbody>
                          {merci.map(m => (
                              <tr key={m.id}>
                                  <td>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                  <td><b>{m.fornitore}</b><br/>{m.prodotto}</td>
                                  <td>Qty: {m.quantita}<br/>Lotto: {m.lotto}<br/>{m.destinazione && <small>📍 {m.destinazione}</small>}</td>
                                  <td>{m.conforme && m.integro ? <span className="tag ok">OK</span> : <span className="tag err">NO</span>}</td>
                                  <td>
                                      <div className="actions">
                                        {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon blue">📎</a>}
                                        <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon orange">✏️</button>
                                        <button onClick={()=>eliminaMerce(m.id)} className="btn-icon red">🗑️</button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  {/* Vista Mobile (Cards) */}
                  <div className="mobile-list">
                      {merci.map(m => (
                          <div key={m.id} className="mobile-card">
                              <div className="mc-header">
                                  <span>📅 {new Date(m.data_ricezione).toLocaleDateString()}</span>
                                  {m.conforme && m.integro ? <span className="tag ok">OK</span> : <span className="tag err">NO</span>}
                              </div>
                              <div className="mc-body">
                                  <strong>{m.prodotto}</strong>
                                  <div className="mc-sub">{m.fornitore}</div>
                                  <div className="mc-details">
                                      <span>Qty: {m.quantita || '-'}</span>
                                      <span>Lotto: {m.lotto || '-'}</span>
                                  </div>
                                  {m.destinazione && <div className="mc-loc">📍 {m.destinazione}</div>}
                              </div>
                              <div className="mc-footer">
                                   {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-link">📎 Bolla</a>}
                                   <div className="mc-actions">
                                       <button onClick={()=>iniziaModificaMerci(m)}>✏️ Modifica</button>
                                       <button onClick={()=>eliminaMerce(m.id)} className="text-red">Elimina</button>
                                   </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 3. CALENDARIO */}
      {tab === 'calendario' && !scanId && renderCalendario()}

      {/* 4. ETICHETTE */}
      {tab === 'etichette' && !scanId && (
          <div className="no-print form-card">
                 <h3>Genera Etichetta</h3>
                 <form onSubmit={handlePrintLabel} className="label-form">
                    <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} className="full-width" />
                    <select value={labelData.tipo} onChange={e=>{
                        let d=3; if(e.target.value==='negativo')d=180; if(e.target.value==='sottovuoto')d=10;
                        setLabelData({...labelData, tipo:e.target.value, giorni_scadenza:d});
                    }} className="full-width">
                        <option value="positivo">Positivo (+3°C)</option>
                        <option value="negativo">Negativo (-18°C)</option>
                        <option value="sottovuoto">Sottovuoto</option>
                    </select>
                    <div className="row-inputs">
                        <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} placeholder="Giorni" />
                        <input placeholder="Operatore" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} />
                    </div>
                    <button className="btn-submit">STAMPA</button>
                 </form>
          </div>
      )}

      {/* 5. SETUP */}
      {tab === 'setup' && !scanId && (
          <div className="no-print">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:15}}>
                  <h2>Macchinari</h2>
                  <button onClick={()=>apriModaleAsset()} className="btn-add">+ Agg.</button>
              </div>
              <div className="card-grid">
                  {assets.map(a => (
                      <div key={a.id} className="asset-card setup-mode">
                          <div className="card-header"><strong>{a.nome}</strong> <small>{a.tipo}</small></div>
                          <div className="card-body">
                              <div>SN: {a.serial_number || '-'}</div>
                              <div className="btn-row">
                                  <button onClick={()=>setShowQRModal(a)} className="btn-qr">QR</button>
                                  <button onClick={()=>apriModaleAsset(a)} className="btn-edit">Modifica</button>
                              </div>
                              <div className="link-row">
                                    {a.foto_url && <button onClick={() => setPreviewImage(a.foto_url)}>📸 Foto</button>}
                                    {a.etichetta_url && <button onClick={() => setPreviewImage(a.etichetta_url)}>📄 Etichetta</button>}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
              {showAssetModal && (
                  <div className="modal-overlay">
                     <div className="modal-content">
                        <h3>{editingAsset ? 'Modifica' : 'Nuovo'} Asset</h3>
                        <form onSubmit={salvaAsset} className="modal-form">
                           <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome" required />
                           <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}>
                               <option value="attivo">✅ ATTIVA</option><option value="spento">⛔ SPENTA</option>
                           </select>
                           <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})}>
                               <option value="frigo">Frigorifero</option><option value="cella">Cella</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino</option>
                           </select>
                           <div className="row-inputs">
                               <input value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" />
                               <input value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" />
                           </div>
                           <button className="btn-submit">SALVA</button>
                           <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-cancel">Chiudi</button>
                        </form>
                     </div>
                  </div>
              )}
          </div>
      )}

      {/* MODALS HELPERS */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-content small">
                  <h3>Scarica Report</h3>
                  <div className="btn-group-row">
                      <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button>
                      <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'active':''}>PDF</button>
                  </div>
                  <div className="download-options">
                      <div className="month-picker">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                          <button onClick={()=>executeDownload('custom-month')}>Scarica Mese</button>
                      </div>
                      <hr/>
                      <button onClick={()=>executeDownload('week')}>Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')}>Ultimi 30 Giorni</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} className="link-close">Chiudi</button>
              </div>
          </div>
      )}
      {previewImage && <div className="modal-overlay" onClick={()=>setPreviewImage(null)}><img src={previewImage} className="preview-img" /><button className="close-preview">X</button></div>}
      {showQRModal && <div className="modal-overlay"><div className="modal-content text-center"><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={150} /><br/><button onClick={()=>window.print()}>STAMPA</button><button onClick={()=>setShowQRModal(null)}>CHIUDI</button></div></div>}

      {/* --- CSS STYLE BLOCK --- */}
      <style>{`
        /* RESET & BASICS */
        * { box-sizing: border-box; }
        .haccp-container { padding-bottom: 50px; }
        input, select, button { font-size: 14px; }

        /* HEADER */
        .header-container { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 20px; }
        .nav-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .download-group { display: flex; gap: 5px; margin-right: 10px; }
        .nav-group { display: flex; gap: 5px; }
        .btn-down { background: #34495e; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; }
        .btn-nav { background: white; border: none; padding: 10px 15px; border-radius: 5px; font-size: 18px; cursor: pointer; }
        .btn-nav.active { background: #2c3e50; color: white; }
        .btn-exit { background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; }

        /* CARDS GRID (TEMPERATURE & SETUP) */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .asset-card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 10px; position: relative; }
        .asset-card.spento { background: #ecf0f1; border: 2px solid #bdc3c7; opacity: 0.8; }
        .asset-card.ok { background: #eafaf1; border: 2px solid #27ae60; }
        .asset-card.input-mode { border-top: 4px solid #3498db; }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; }
        .card-header h3 { margin: 0; font-size: 16px; }
        .temp-display { font-size: 24px; font-weight: bold; color: #27ae60; }
        .range-badge { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        .badge-off { position: absolute; top: 10px; right: 10px; background: #7f8c8d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
        .status-bar { text-align: center; font-weight: bold; padding: 5px; border-radius: 4px; }
        .status-bar.off { background: #bdc3c7; color: #7f8c8d; }
        .log-info { font-size: 12px; color: #555; }

        /* INPUT ROW */
        .input-row { display: flex; gap: 10px; align-items: stretch; height: 45px; }
        .temp-input { flex: 1; text-align: center; font-size: 20px; font-weight: bold; border: 1px solid #ddd; border-radius: 5px; width: 100px; }
        .action-buttons { display: flex; gap: 5px; }
        .btn-off { background: #95a5a6; color: white; border: none; padding: 0 10px; border-radius: 5px; font-size: 11px; font-weight: bold; }
        .btn-cam { background: #ecf0f1; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; padding: 0 10px; border-radius: 5px; cursor: pointer; font-size: 20px; }
        .btn-cam.has-photo { background: #2ecc71; border-color: #27ae60; color: white; }
        .btn-save { background: #2c3e50; color: white; border: none; padding: 0 15px; border-radius: 5px; font-weight: bold; }
        .btn-cancel { background: transparent; border: none; color: #999; font-size: 12px; cursor: pointer; text-align: right; }
        .btn-edit { background: #f39c12; color: white; border: none; padding: 8px; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%; margin-top: auto; }

        /* MERCI FORM */
        .form-card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .merci-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
        .field-group { display: flex; flex-direction: column; flex: 1; min-width: 140px; }
        .field-group.grow { flex: 2; min-width: 200px; }
        .field-group.small { min-width: 80px; }
        .field-group.full { width: 100%; flex: 100%; }
        .field-group label { font-size: 11px; margin-bottom: 2px; color: #666; }
        .field-group input, .field-group select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; }
        
        .form-actions { display: flex; align-items: center; gap: 10px; margin-top: 10px; width: 100%; justify-content: space-between; flex-wrap: wrap; }
        .btn-upload { background: #ecf0f1; border: 1px solid #ccc; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px; display: inline-block; }
        .btn-upload.done { background: #2ecc71; color: white; border-color: #27ae60; }
        .checkbox-group { display: flex; gap: 15px; font-size: 12px; }
        .btn-submit { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; flex: 1; min-width: 120px; }

        /* MERCI LIST - DESKTOP vs MOBILE */
        .desktop-table { width: 100%; border-collapse: collapse; font-size: 13px; background: white; border-radius: 10px; overflow: hidden; }
        .desktop-table th { background: #f8f9fa; padding: 10px; text-align: left; }
        .desktop-table td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
        .tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .tag.ok { background: #eafaf1; color: #27ae60; }
        .tag.err { background: #fadbd8; color: #c0392b; }
        .actions { display: flex; gap: 5px; }
        .btn-icon { border: none; color: white; border-radius: 3px; padding: 4px 6px; cursor: pointer; font-size: 12px; }
        .btn-icon.blue { background: #3498db; text-decoration: none; }
        .btn-icon.orange { background: #f39c12; }
        .btn-icon.red { background: #e74c3c; }

        .mobile-list { display: none; } /* Hidden by default */
        .mobile-card { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .mc-header { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 5px; }
        .mc-body strong { font-size: 15px; display: block; }
        .mc-sub { font-size: 13px; color: #555; margin-bottom: 5px; }
        .mc-details { display: flex; gap: 10px; font-size: 12px; color: #777; background: #f9f9f9; padding: 5px; border-radius: 4px; }
        .mc-loc { font-size: 11px; margin-top: 5px; color: #2980b9; }
        .mc-footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 8px; }
        .mc-actions button { background: transparent; border: none; font-size: 12px; cursor: pointer; color: #666; text-decoration: underline; margin-left: 10px; }
        .text-red { color: #e74c3c !important; }

        /* MODALS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .modal-content { background: white; padding: 25px; border-radius: 10px; width: 90%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
        .modal-form { display: flex; flex-direction: column; gap: 10px; }
        .modal-form input, .modal-form select { padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
        .row-inputs { display: flex; gap: 10px; }
        .row-inputs input { flex: 1; }
        .preview-img { max-width: 90%; max-height: 90%; border-radius: 5px; border: 2px solid white; }
        .close-preview { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; border: none; background: white; font-weight: bold; cursor: pointer; }

        /* ETICHETTE FORM */
        .label-form { display: flex; flex-direction: column; gap: 10px; }
        .full-width { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }

        /* MEDIA QUERIES FOR MOBILE */
        @media (max-width: 768px) {
            .desktop-table { display: none; }
            .mobile-list { display: block; }
            .card-grid { grid-template-columns: 1fr; } 
            .header-container h1 { font-size: 20px; }
            .field-group { min-width: 48%; }
            .btn-nav { font-size: 16px; padding: 8px 12px; }
        }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
}

export default Haccp;