// client/src/Haccp.jsx - VERSIONE AGGIORNATA (UI DESIGN PRO & MOBILE FIRST)
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

  // NUOVO: Stati Anteprima Immagine (Popup)
  const [previewImage, setPreviewImage] = useState(null);

  // Stati Download Excel/PDF
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null); 
  const [downloadFormat, setDownloadFormat] = useState('excel'); // 'excel' o 'pdf'
  const [selectedMonth, setSelectedMonth] = useState(''); // Per il download mese specifico

  // Stati Etichette e Stampa
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
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
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

  // --- EXCEL/PDF DOWNLOAD ---
  const openDownloadModal = (type) => {
      setDownloadType(type);
      setShowDownloadModal(true);
      setSelectedMonth(''); 
  };

  const executeDownload = (range) => {
      let start = new Date();
      let end = new Date();
      let rangeName = "Tutto";

      if(range === 'week') { 
          start.setDate(end.getDate() - 7); 
          rangeName="Ultima Settimana"; 
      } else if(range === 'month') { 
          start.setMonth(end.getMonth() - 1); 
          rangeName="Ultimo Mese"; 
      } else if(range === 'year') { 
          start.setFullYear(end.getFullYear() - 1); 
          rangeName="Ultimo Anno"; 
      } else if (range === 'custom-month') {
          if(!selectedMonth) return alert("Seleziona un mese!");
          const [y, m] = selectedMonth.split('-');
          start = new Date(y, m - 1, 1); 
          end = new Date(y, m, 0, 23, 59, 59); 
          const nomeMese = start.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
          rangeName = `Mese di ${nomeMese}`;
      } else if(range === 'all') { 
          start = new Date('2020-01-01'); 
          rangeName="Storico Completo"; 
      }
      
      const query = `?start=${start.toISOString()}&end=${end.toISOString()}&rangeName=${rangeName}&format=${downloadFormat}`;
      window.open(`${API_URL}/api/haccp/export/${downloadType}/${info.id}${query}`, '_blank');
      setShowDownloadModal(false);
  };

  // --- TEMPERATURE ---
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };
  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try {
          const url = await uploadFile(f);
          setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }}));
      } finally { setUploadingLog(null); }
  };
  
  const registraTemperatura = async (asset, isSpento = false) => {
      let val = 'OFF';
      let conforme = true;
      let azione = "";
      
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
          val = "OFF";
          conforme = true;
          azione = "Macchinario spento/inutilizzato in data odierna";
      }

      const currentInput = tempInput[asset.id] || {};

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val, 
              conformita: conforme, azione_correttiva: azione, foto_prova_url: currentInput.photo || ''
          })
      });
      setTempInput(prev => { const newState = {...prev}; delete newState[asset.id]; return newState; }); 
      ricaricaDati();
      if(scanId) navigate(`/haccp/${slug}`); 
  };
  
  const abilitaNuovaMisurazione = (asset) => {
      const logEsistente = getTodayLog(asset.id);
      setTempInput(prev => ({ ...prev, [asset.id]: { val: logEsistente ? logEsistente.valore : '', photo: '' } }));
  };

  // --- MERCI ---
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
        const payload = { ...merciForm, ristorante_id: info.id, operatore: 'Staff' };
        if (!payload.scadenza || payload.scadenza === "") payload.scadenza = null;
        if (!payload.temperatura || payload.temperatura === "") payload.temperatura = null;
        if (!payload.quantita || payload.quantita === "") payload.quantita = null;

        const res = await fetch(endpoint, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if (data.success) {
            resetMerciForm(); ricaricaDati(); alert("✅ Salvataggio riuscito!");
        } else { alert("❌ Errore Server: " + (data.error || "Sconosciuto")); }
      } catch (err) { alert("❌ Errore Connessione: " + err.message); }
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
  const handleAssetPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return; setUploadingAsset(true);
      try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, foto_url: url})); } finally { setUploadingAsset(false); }
  };
  const handleAssetLabel = async (e) => {
      const f = e.target.files[0]; if(!f) return; setUploadingLabel(true);
      try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, etichetta_url: url})); } finally { setUploadingLabel(false); }
  };

  // --- CALENDARIO ---
  const getDaysInMonth = (date) => { 
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
  const renderCalendario = () => {
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = [];
      const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
      
      for (let d = 1; d <= days; d++) {
          const currentDayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
          const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === currentDayStr);
          const merciDelGiorno = merci.filter(m => new Date(m.data_ricezione).toDateString() === currentDayStr);
          const hasLogs = logsDelGiorno.length > 0;
          const hasMerci = merciDelGiorno.length > 0;
          const hasError = logsDelGiorno.some(l => !l.conformita) || merciDelGiorno.some(m => !m.conforme || !m.integro);
          
          let statusClass = 'neutral';
          if (hasLogs || hasMerci) statusClass = hasError ? 'danger' : 'success';

          grid.push(
            <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno })} 
                 className={`cal-cell ${statusClass}`}>
                  <div className="day-number">{d}</div>
                  <div className="day-dots">
                      {hasLogs && <span className="dot temp"></span>}
                      {hasMerci && <span className="dot goods"></span>}
                  </div>
            </div>
          );
      }
      return (
          <div className="card calendar-container">
             <div className="calendar-header">
                <button className="btn-icon" onClick={()=>cambiaMese(-1)}>◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button className="btn-icon" onClick={()=>cambiaMese(1)}>▶</button>
             </div>
             <div className="calendar-grid">
                <div className="cal-head">Lun</div><div className="cal-head">Mar</div><div className="cal-head">Mer</div><div className="cal-head">Gio</div><div className="cal-head">Ven</div><div className="cal-head">Sab</div><div className="cal-head">Dom</div>
                {grid}
             </div>
             {selectedDayLogs && (
                 <div className="day-details">
                     <h2>Dettagli {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h2>
                     <div className="details-flex">
                         <div className="detail-col">
                             <h4 className="txt-success">🌡️ Temperature</h4>
                             {selectedDayLogs.logs.length === 0 ? <p className="txt-muted">Nessuna registrazione.</p> : (
                                 <div className="detail-list">
                                    {selectedDayLogs.logs.map(l => (
                                        <div key={l.id} className="detail-item">
                                            <span className="time">{new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</span>
                                            <strong>{l.nome_asset}</strong>
                                            <span className="val">{l.valore}{l.valore !== 'OFF' && '°C'}</span>
                                            {l.conformita ? <span className="badge success">OK</span> : <span className="badge danger">ERR</span>}
                                        </div>
                                    ))}
                                 </div>
                             )}
                         </div>
                         <div className="detail-col">
                             <h4 className="txt-warning">📦 Arrivo Merci</h4>
                             {selectedDayLogs.merci.length === 0 ? <p className="txt-muted">Nessun arrivo.</p> : (
                                 <div className="detail-list">
                                     {selectedDayLogs.merci.map(m => (
                                         <div key={m.id} className="detail-item-merci">
                                             <div className="head"><strong>{m.prodotto}</strong> <small>({m.fornitore})</small></div>
                                             <div className="sub">Qty: {m.quantita} | Lotto: {m.lotto}</div>
                                             <div className="status">
                                                 {m.conforme ? <span className="badge success">OK</span> : <span className="badge danger">NO</span>}
                                                 {m.allegato_url && <a href={m.allegato_url} target="_blank" className="link-icon">📎</a>}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             )}
          </div>
      );
  };

  // --- ETICHETTE ---
  const handleLabelTypeChange = (e) => {
      const type = e.target.value;
      let days = 3;
      if (type === 'negativo') days = 180;
      if (type === 'sottovuoto') days = 10;
      setLabelData({...labelData, tipo: type, giorni_scadenza: days});
  };

  const handlePrintLabel = async (e) => {
      e.preventDefault();
      const scadenza = new Date(); scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      const res = await fetch(`${API_URL}/api/haccp/labels`, { 
          method:'POST', headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) 
      });
      const data = await res.json(); 
      if(data.success) { setLastLabel(data.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); }
  };
  const executePrintQR = () => { setPrintMode('qr'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); };

  // --- UI RENDER ---
  if(!info) return <div className="loading-screen">Caricamento HACCP...</div>;
  if(!isAuthorized) return (
      <div className="auth-container">
          <div className="auth-card">
              <h1>🛡️ HACCP Login</h1>
              <p>Area riservata al personale</p>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="PIN Sicurezza" value={password} onChange={e=>setPassword(e.target.value)} />
                  <button type="submit">ACCEDI</button>
              </form>
          </div>
      </div>
  );
  
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-app">
      <StyleInjector />
      
      {!scanId && (
          <div className="no-print app-header">
              <div className="header-top">
                  <h1>🛡️ HACCP <span>Control</span></h1>
                  <div className="header-actions">
                      <div className="dropdown">
                          <button className="btn-secondary btn-sm">⬇ Report</button>
                          <div className="dropdown-content">
                              <a onClick={()=>openDownloadModal('temperature')}>Temperature</a>
                              <a onClick={()=>openDownloadModal('merci')}>Merci</a>
                              <a onClick={()=>openDownloadModal('assets')}>Macchine</a>
                          </div>
                      </div>
                      <button className="btn-danger btn-sm" onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}}>Esci</button>
                  </div>
              </div>
              <div className="nav-tabs">
                  {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} className={tab===t ? 'active' : ''}>
                        {t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Macchine' : (t==='temperature' ? '🌡️ Temp' : t))}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <main className="app-content">
      {/* 1. TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="grid-temp">
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  const isInputActive = !!tempInput[asset.id];
                  const currentData = tempInput[asset.id] || {};
                  
                  if(asset.stato === 'spento') {
                      return (
                          <div key={asset.id} className="card asset-card disabled">
                              <div className="card-status">OFF</div>
                              <h3>{asset.nome}</h3>
                              <p className="subtitle">Non in uso</p>
                          </div>
                      );
                  }

                  if (todayLog && !isInputActive) {
                      return (
                          <div key={asset.id} className="card asset-card success">
                              <div className="card-header">
                                  <h3>{asset.nome}</h3>
                                  <span className="big-val">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°'}</span>
                              </div>
                              <div className="card-meta">
                                  {todayLog.conformita ? 
                                    <span className="badge success">✅ OK {new Date(todayLog.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span> 
                                    : <span className="badge danger">⚠️ {todayLog.azione_correttiva}</span>}
                              </div>
                              <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-outline">Modifica</button>
                          </div>
                      );
                  }
                  
                  return (
                      <div key={asset.id} className="card asset-card input-mode">
                           <div className="card-header">
                                <div>
                                    <h3>{asset.nome}</h3>
                                    <span className="range-badge">Range: {asset.range_min}° / {asset.range_max}°</span>
                                </div>
                           </div>
                           
                           <div className="input-group-temp">
                              <input type="number" step="0.1" placeholder="°C" 
                                   value={currentData.val || ''} 
                                   onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                   className="temp-input"
                              />
                              <div className="action-buttons">
                                  <button onClick={()=>registraTemperatura(asset, true)} className="btn-off">OFF</button>
                                  <label className={`btn-icon ${currentData.photo ? 'active' : ''}`}>
                                      📷
                                      <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                  </label>
                                  <button onClick={()=>registraTemperatura(asset, false)} className="btn-save">SALVA</button>
                              </div>
                           </div>
                           {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-link">Annulla</button>}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. MERCI */}
      {tab === 'merci' && !scanId && (
          <div className="merci-wrapper no-print">
              <div className={`card form-card ${merciForm.id ? 'editing' : ''}`}>
                  <div className="card-header-row">
                      <h3>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Nuovo Arrivo'}</h3>
                      {merciForm.id && <button onClick={resetMerciForm} className="btn-secondary btn-sm">Annulla</button>}
                  </div>
                  <form onSubmit={salvaMerci} className="form-grid">
                      <div className="fg fg-date"><label>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required /></div>
                      <div className="fg fg-full"><label>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required placeholder="Es. Metro" /></div>
                      <div className="fg fg-full"><label>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required placeholder="Es. Pollo Fresco" /></div>
                      <div className="fg"><label>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Es. 5kg" /></div>
                      <div className="fg"><label>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} /></div>
                      <div className="fg"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} /></div>
                      <div className="fg"><label>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} /></div>
                      <div className="fg"><label>Destinazione</label>
                        <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                            <option value="">-- Seleziona --</option>
                            {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                        </select>
                      </div>
                      <div className="fg fg-full"><label>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} /></div>
                      
                      <div className="fg-actions">
                          <label className={`btn-upload ${merciForm.allegato_url ? 'done' : ''}`}>
                             {uploadingMerci ? "..." : "📎 Bolla"}
                             <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} hidden />
                          </label>
                          <div className="checks">
                              <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                              <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                          </div>
                      </div>
                      <button className="btn-primary btn-block">{merciForm.id ? 'AGGIORNA' : 'REGISTRA'}</button>
                  </form>
              </div>

              <div className="card table-card">
                  <h3>📦 Storico Recente</h3>
                  <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Prodotto / Fornitore</th>
                                <th>Info</th>
                                <th>Stato</th>
                                <th style={{textAlign:'right'}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merci.map(m => (
                                <tr key={m.id}>
                                    <td>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                    <td><div className="fw-bold">{m.prodotto}</div><small>{m.fornitore}</small></td>
                                    <td><small>Lotto: {m.lotto}<br/>Scad: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}</small></td>
                                    <td>{m.conforme && m.integro ? <span className="badge success">OK</span> : <span className="badge danger">NO</span>}</td>
                                    <td className="actions-cell">
                                        {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon-sm">📎</a>}
                                        <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon-sm edit">✏️</button>
                                        <button onClick={()=>eliminaMerce(m.id)} className="btn-icon-sm delete">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {/* 3. CALENDARIO */}
      {tab === 'calendario' && !scanId && renderCalendario()}

      {/* 4. ETICHETTE */}
      {tab === 'etichette' && !scanId && (
          <div className="labels-layout no-print">
             <div className="card label-form">
                 <h3>Genera Etichetta</h3>
                 <form onSubmit={handlePrintLabel}>
                    <label>Prodotto</label>
                    <input placeholder="Es. Sugo Pomodoro" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} />
                    
                    <label>Tipo Conservazione</label>
                    <select value={labelData.tipo} onChange={handleLabelTypeChange}>
                        <option value="positivo">Positivo (+3°C) - 3gg</option>
                        <option value="negativo">Negativo (-18°C) - 180gg</option>
                        <option value="sottovuoto">Sottovuoto - 10gg</option>
                    </select>
                    
                    <label>Giorni Scadenza</label>
                    <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} />
                    
                    <label>Operatore</label>
                    <input placeholder="Chi sei?" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} />
                    
                    <button className="btn-primary mt-4">🖨️ STAMPA ETICHETTA</button>
                 </form>
             </div>
             <div className="label-preview-area">
                 {lastLabel ? (
                     <div className="label-preview">
                         <h4>Anteprima di Stampa</h4>
                         <div className="real-label">
                             <h2>{lastLabel.prodotto}</h2>
                             <div className="label-meta">
                                <span>📅 {new Date(lastLabel.data_produzione).toLocaleDateString()}</span>
                                <span>👨‍🍳 {lastLabel.operatore}</span>
                             </div>
                             <div className="label-expiry">SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
                             <small>Lotto: {lastLabel.lotto}</small>
                         </div>
                     </div>
                 ) : <div className="placeholder-text">Compila il form per vedere l'anteprima</div>}
             </div>
          </div>
      )}

      {/* 5. SETUP (MACCHINE) */}
      {tab === 'setup' && !scanId && (
          <div className="setup-wrapper no-print">
              <div className="setup-header">
                  <h2>Gestione Macchinari</h2>
                  <button onClick={()=>apriModaleAsset()} className="btn-primary">+ Aggiungi</button>
              </div>
              <div className="grid-assets">
                  {assets.map(a => (
                      <div key={a.id} className="card asset-item">
                          <div className="asset-info">
                              <h4>{a.nome}</h4>
                              <span className="asset-type">{a.tipo}</span>
                          </div>
                          <div className="asset-details">
                              SN: {a.serial_number || 'N/A'}
                          </div>
                          <div className="asset-actions">
                              <button onClick={()=>setShowQRModal(a)} className="btn-secondary">QR Code</button>
                              <button onClick={()=>apriModaleAsset(a)} className="btn-outline">Modifica</button>
                          </div>
                          <div className="asset-links">
                                {a.foto_url ? <span onClick={() => setPreviewImage(a.foto_url)} className="link active">📸 Foto</span> : <span className="link disabled">📸 No Foto</span>}
                                {a.etichetta_url ? <span onClick={() => setPreviewImage(a.etichetta_url)} className="link active">📄 Etichetta</span> : <span className="link disabled">📄 No Etic.</span>}
                          </div>
                      </div>
                  ))}
              </div>
              
              {showQRModal && (
                  <div className="modal-overlay">
                      <div className="modal-content text-center">
                          <h3>QR: {showQRModal.nome}</h3>
                          <div className="qr-box">
                             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={200} />
                          </div>
                          <div className="modal-actions centered">
                              <button onClick={executePrintQR} className="btn-primary">STAMPA</button>
                              <button onClick={()=>setShowQRModal(null)} className="btn-secondary">CHIUDI</button>
                          </div>
                      </div>
                  </div>
              )}

              {showAssetModal && (
                  <div className="modal-overlay">
                     <div className="modal-content">
                        <h3>{editingAsset ? 'Modifica Macchina' : 'Nuova Macchina'}</h3>
                        <form onSubmit={salvaAsset} className="form-stack">
                           <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo Bar)" required />
                           <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}>
                               <option value="attivo">✅ ATTIVA</option>
                               <option value="spento">⛔ SPENTA (Fuori uso)</option>
                           </select>
                           <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})}>
                               <option value="frigo">Frigorifero</option><option value="cella">Cella Frigo</option><option value="vetrina">Vetrina</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino Secco</option><option value="abbattitore">Abbattitore</option>
                           </select>
                           <div className="row-2">
                               <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" />
                               <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" />
                           </div>
                           <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} placeholder="Marca" />
                           <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} placeholder="Modello" />
                           <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} placeholder="Serial Number" />

                           <div className="row-2">
                                <label className={`btn-file ${assetForm.foto_url ? 'ok' : ''}`}>
                                    {uploadingAsset ? '...' : (assetForm.foto_url ? '✅ Foto' : '📸 Foto')}
                                    <input type="file" onChange={handleAssetPhoto} hidden />
                                </label>
                                <label className={`btn-file ${assetForm.etichetta_url ? 'ok' : ''}`}>
                                    {uploadingLabel ? '...' : (assetForm.etichetta_url ? '✅ Etic.' : '📄 Etic.')}
                                    <input type="file" onChange={handleAssetLabel} hidden />
                                </label>
                           </div>

                           <div className="modal-actions">
                               <button className="btn-primary">SALVA</button>
                               <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-text">Annulla</button>
                           </div>
                        </form>
                     </div>
                  </div>
              )}
          </div>
      )}

      {/* --- MODALE DOWNLOAD --- */}
      {showDownloadModal && (
          <div className="modal-overlay z-high">
              <div className="modal-content narrow text-center">
                  <h3>Scarica Report</h3>
                  <p className="txt-muted">Scegli formato e periodo</p>
                  
                  <div className="format-selector">
                       <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button>
                       <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'pdf-active':''}>PDF</button>
                  </div>

                  <div className="download-options">
                      <div className="custom-month-row">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                          <button onClick={()=>executeDownload('custom-month')} className="btn-purple">GO</button>
                      </div>
                      <div className="divider">oppure</div>
                      <button onClick={()=>executeDownload('week')} className="btn-opt">Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')} className="btn-opt">Ultimo Mese</button>
                      <button onClick={()=>executeDownload('all')} className="btn-opt">Tutto lo storico</button>
                  </div>
                  
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-text mt-4">Annulla</button>
              </div>
          </div>
      )}

      {/* --- PREVIEW IMAGE --- */}
      {previewImage && (
          <div className="image-overlay" onClick={() => setPreviewImage(null)}>
              <img src={previewImage} alt="Anteprima" />
              <button className="close-preview">✕</button>
          </div>
      )}
      </main>

      {/* --- PRINT TEMPLATES --- */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area label-print">
            <div className="lp-name">{lastLabel.prodotto}</div>
            <div className="lp-meta"><span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span><span>OP: {lastLabel.operatore}</span></div>
            <div className="lp-scad"><div>SCADENZA</div><strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></div>
            <div className="lp-lot">Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area qr-print">
             <h1>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
             <p>Scansiona per registrare la temperatura</p>
        </div>
      )}
    </div>
  );
}

// STYLES COMPONENT (CSS IN JS)
const StyleInjector = () => (
    <style>{`
    :root {
        --primary: #2563eb; --primary-dark: #1e40af;
        --success: #10b981; --success-bg: #d1fae5; --success-text: #065f46;
        --warning: #f59e0b; --warning-bg: #fef3c7; --warning-text: #92400e;
        --danger: #ef4444; --danger-bg: #fee2e2; --danger-text: #b91c1c;
        --bg: #f3f4f6; --card: #ffffff; --text: #1f2937; --muted: #6b7280;
        --border: #e5e7eb;
        --radius: 12px;
    }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    
    /* Layout & Header */
    .haccp-app { min-height: 100vh; display: flex; flex-direction: column; }
    .app-header { background: var(--card); padding: 1rem 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
    .header-top { display: flex; justifyContent: space-between; align-items: center; margin-bottom: 1rem; }
    .header-top h1 { margin: 0; font-size: 1.5rem; color: var(--primary-dark); }
    .header-top h1 span { color: var(--text); font-weight: 300; }
    .header-actions { display: flex; gap: 0.5rem; align-items: center; }

    /* Navigation */
    .nav-tabs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 5px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .nav-tabs::-webkit-scrollbar { display: none; }
    .nav-tabs button {
        white-space: nowrap; padding: 0.6rem 1.2rem; border-radius: 20px; border: 1px solid var(--border);
        background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .nav-tabs button.active { background: var(--text); color: white; border-color: var(--text); transform: scale(1.02); }
    .app-content { padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }

    /* Cards */
    .card { background: var(--card); border-radius: var(--radius); padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border); transition: transform 0.2s; }
    .card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    
    /* Temp Grid */
    .grid-temp { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .asset-card { position: relative; display: flex; flex-direction: column; justify-content: space-between; }
    .asset-card.disabled { opacity: 0.6; background: #f9fafb; }
    .asset-card.success { border-left: 5px solid var(--success); }
    .asset-card.input-mode { border-top: 5px solid var(--primary); }
    
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .card-header h3 { margin: 0; font-size: 1.1rem; }
    .big-val { font-size: 2rem; font-weight: 800; color: var(--text); }
    .range-badge { font-size: 0.75rem; background: var(--bg); padding: 2px 6px; border-radius: 4px; color: var(--muted); }
    
    .input-group-temp { display: flex; gap: 0.5rem; margin-top: auto; }
    .temp-input { flex: 1; font-size: 1.5rem; font-weight: bold; text-align: center; border: 2px solid var(--border); border-radius: 8px; width: 80px; }
    .temp-input:focus { border-color: var(--primary); outline: none; }
    .action-buttons { display: flex; gap: 0.5rem; }
    
    /* Buttons */
    .btn-primary { background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
    .btn-danger { background: var(--danger); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
    .btn-save { background: var(--text); color: white; border: none; padding: 0 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-off { background: var(--muted); color: white; border: none; padding: 0 0.8rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; }
    .btn-icon { display: flex; align-items: center; justify-content: center; background: var(--bg); width: 45px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 1.2rem; }
    .btn-icon.active { background: var(--success-bg); border-color: var(--success); }
    .btn-link { background: none; border: none; color: var(--muted); text-decoration: underline; cursor: pointer; font-size: 0.8rem; margin-top: 5px; }
    .btn-block { width: 100%; margin-top: 1rem; }
    .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
    .btn-purple { background: #8b5cf6; color: white; border:none; padding: 0 1rem; border-radius: 6px; cursor: pointer; }
    
    /* Badges */
    .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge.success { background: var(--success-bg); color: var(--success-text); }
    .badge.danger { background: var(--danger-bg); color: var(--danger-text); }

    /* Merci Form Grid */
    .merci-wrapper { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; align-items: start; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
    .fg { display: flex; flex-direction: column; gap: 0.3rem; }
    .fg-full { grid-column: span 2; }
    .fg label { font-size: 0.8rem; font-weight: 600; color: var(--muted); }
    .fg input, .fg select { padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; }
    .fg-actions { grid-column: span 2; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
    .btn-upload { background: var(--bg); border: 1px dashed var(--muted); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .btn-upload.done { background: var(--success-bg); border-color: var(--success); color: var(--success-text); }
    .checks { display: flex; gap: 1rem; font-size: 0.85rem; }

    /* Table */
    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; color: var(--muted); font-size: 0.8rem; padding: 0.8rem; border-bottom: 2px solid var(--bg); }
    td { padding: 0.8rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    .actions-cell { display: flex; gap: 5px; justify-content: flex-end; }
    .btn-icon-sm { width: 30px; height: 30px; border-radius: 4px; border:none; cursor: pointer; display: flex; alignItems: center; justifyContent: center; }
    .btn-icon-sm.edit { background: var(--warning-bg); color: var(--warning-text); }
    .btn-icon-sm.delete { background: var(--danger-bg); color: var(--danger-text); }
    
    /* Calendar */
    .calendar-container { padding: 1rem; }
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; background: var(--border); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .cal-head { background: #f8fafc; text-align: center; font-size: 0.75rem; color: var(--muted); padding: 0.5rem 0; font-weight: 600; }
    .cal-cell { background: white; min-height: 80px; padding: 5px; cursor: pointer; position: relative; transition: background 0.2s; }
    .cal-cell:hover { background: #f0f9ff; }
    .cal-cell.empty { background: #f9fafb; cursor: default; }
    .cal-cell.danger { background: var(--danger-bg); }
    .cal-cell.success { background: var(--success-bg); }
    .day-number { font-weight: bold; font-size: 0.9rem; margin-bottom: 5px; }
    .day-dots { display: flex; gap: 3px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot.temp { background: var(--primary); }
    .dot.goods { background: var(--warning); }
    
    .day-details { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); animation: fadeIn 0.3s; }
    .details-flex { display: flex; gap: 2rem; }
    .detail-col { flex: 1; background: #f8fafc; padding: 1rem; border-radius: 8px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
    .detail-item-merci { background: white; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; }

    /* Setup Assets */
    .grid-assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .asset-item { border-left: 4px solid var(--text); padding: 1.2rem; }
    .asset-info h4 { margin: 0 0 0.2rem 0; font-size: 1.1rem; }
    .asset-type { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .asset-details { font-size: 0.85rem; color: var(--muted); margin: 0.5rem 0 1rem 0; font-family: monospace; }
    .asset-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .asset-actions button { flex: 1; }
    .asset-links { display: flex; gap: 1rem; font-size: 0.85rem; }
    .asset-links .link { cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .asset-links .link.active { color: var(--primary); font-weight: 500; }
    .asset-links .link.disabled { color: var(--border); cursor: default; }

    /* Modals & Overlays */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.2s; }
    .z-high { z-index: 3000; }
    .modal-content { background: white; padding: 2rem; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
    .modal-content.narrow { max-width: 350px; }
    .text-center { text-align: center; }
    
    .format-selector { background: var(--bg); padding: 5px; border-radius: 25px; display: inline-flex; margin-bottom: 1.5rem; }
    .format-selector button { border: none; background: transparent; padding: 0.5rem 1.5rem; border-radius: 20px; font-weight: 600; color: var(--muted); cursor: pointer; transition: 0.2s; }
    .format-selector button.active { background: white; color: var(--success-text); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .format-selector button.pdf-active { background: white; color: var(--danger-text); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    
    .download-options { display: flex; flex-direction: column; gap: 0.8rem; }
    .custom-month-row { display: flex; gap: 0.5rem; }
    .custom-month-row input { flex: 1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; }
    .btn-opt { background: white; border: 1px solid var(--border); padding: 0.8rem; border-radius: 8px; text-align: left; font-weight: 500; cursor: pointer; transition: 0.2s; }
    .btn-opt:hover { background: var(--bg); border-color: var(--primary); color: var(--primary); }
    .divider { font-size: 0.8rem; color: var(--muted); margin: 5px 0; }

    /* Image Preview */
    .image-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 4000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
    .image-overlay img { max-width: 90vw; max-height: 90vh; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
    .close-preview { position: absolute; top: 20px; right: 20px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-weight: bold; cursor: pointer; }

    /* Labels & Auth */
    .labels-layout { display: flex; gap: 1.5rem; }
    .label-form { flex: 1; }
    .label-preview-area { flex: 1; background: var(--bg); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; padding: 2rem; border: 2px dashed var(--border); }
    .real-label { background: white; width: 280px; padding: 1.5rem; border: 2px solid black; box-shadow: 0 10px 15px rgba(0,0,0,0.05); }
    .real-label h2 { border-bottom: 2px solid black; padding-bottom: 0.5rem; margin-top: 0; text-align: center; text-transform: uppercase; font-size: 1.2rem; }
    .label-meta { display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 1rem; }
    .label-expiry { text-align: center; margin: 1rem 0; font-weight: 800; font-size: 1.4rem; border: 1px solid black; padding: 0.5rem; }
    
    .auth-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--primary); }
    .auth-card { background: white; padding: 3rem; border-radius: 16px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
    .auth-card input { width: 100%; padding: 1rem; border: 2px solid var(--bg); border-radius: 8px; font-size: 1.1rem; margin: 1.5rem 0; box-sizing: border-box; text-align: center; }
    .auth-card button { width: 100%; padding: 1rem; background: var(--text); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

    /* Print */
    @media print { 
        .no-print { display: none !important; } 
        body { background: white; }
        .print-area { position: fixed; top: 0; left: 0; z-index: 9999; display: block !important; background: white; }
        .label-print { width: 58mm; height: 40mm; padding: 2mm; box-sizing: border-box; border: 1px solid black; font-family: Arial, sans-serif; display: flex; flex-direction: column; }
        .lp-name { font-weight: 900; font-size: 12px; text-align: center; border-bottom: 2px solid black; padding-bottom: 2px; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
        .lp-meta { display: flex; justify-content: space-between; font-size: 8px; margin-top: 4px; }
        .lp-scad { margin-top: 4px; text-align: center; font-size: 8px; }
        .lp-scad strong { font-size: 14px; display: block; }
        .lp-lot { margin-top: auto; font-size: 7px; text-align: center; border-top: 1px solid black; }
        .qr-print { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .app-content { padding: 1rem; }
        .merci-wrapper { grid-template-columns: 1fr; }
        .grid-temp { grid-template-columns: 1fr; }
        .details-flex { flex-direction: column; }
        .labels-layout { flex-direction: column; }
        .btn-sm { font-size: 0.75rem; padding: 0.3rem 0.6rem; }
        .dropdown-content { right: 0; left: auto; }
        .cal-cell { min-height: 60px; }
    }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .dropdown { position: relative; display: inline-block; }
    .dropdown-content { display: none; position: absolute; left: 0; background-color: white; min-width: 160px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); z-index: 1; border-radius: 8px; overflow: hidden; }
    .dropdown-content a { color: black; padding: 12px 16px; text-decoration: none; display: block; font-size: 0.9rem; cursor: pointer; }
    .dropdown-content a:hover { background-color: var(--bg); }
    .dropdown:hover .dropdown-content { display: block; }

    `}</style>
);

export default Haccp;