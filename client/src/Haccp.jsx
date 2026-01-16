// client/src/Haccp.jsx - VERSIONE PRO (Mobile Ready & UI Fixes)
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 

function Haccp() {
  const { slug, scanId } = useParams();
  const navigate = useNavigate();
  
  // --- STATI GLOBALI ---
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // --- DATI ---
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [merci, setMerci] = useState([]); 
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  
  // --- STATI UI/UX ---
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  const [merciForm, setMerciForm] = useState({
      id: null, data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '',
      temperatura: '', conforme: true, integro: true, note: '',
      quantita: '', allegato_url: '', destinazione: ''
  });
  const [uploadingMerci, setUploadingMerci] = useState(false);

  // --- MODALI & EDITING ---
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', foto_url:'', etichetta_url:'', stato: 'attivo' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false); 
  const [uploadingLabel, setUploadingLabel] = useState(false); 
  const [showQRModal, setShowQRModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // --- DOWNLOAD & PRINT ---
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null); 
  const [downloadFormat, setDownloadFormat] = useState('excel'); 
  const [selectedMonth, setSelectedMonth] = useState(''); 
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);
  const [printMode, setPrintMode] = useState(null);

  // --- CALENDARIO ---
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); 

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  // --- EFFETTI ---
  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      if(localStorage.getItem(`haccp_session_${slug}`) === "true") setIsAuthorized(true);
      if(scanId) setTab('temperature');
  }, [slug, scanId]);

  useEffect(() => {
      if(isAuthorized && info) { ricaricaDati(); ricaricaCalendario(); }
  }, [isAuthorized, info, tab, currentDate]);

  // --- API CALLS ---
  const ricaricaDati = () => {
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
      fetch(`${API_URL}/api/haccp/merci/${info.id}`).then(r=>r.json()).then(setMerci);
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario') return;
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      try {
          const res = await fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${start}&end=${end}`);
          setCalendarLogs(await res.json());
      } catch(e) { console.error(e); }
  };

  const handleLogin = async (e) => {
      e.preventDefault();
      try {
          const res = await fetch(`${API_URL}/api/auth/station`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ ristorante_id: info.id, role: 'haccp', password })
          });
          const d = await res.json();
          if(d.success) { setIsAuthorized(true); localStorage.setItem(`haccp_session_${slug}`, "true"); } 
          else alert("Password Errata");
      } catch(e) { alert("Errore connessione"); }
  };

  const uploadFile = async (file) => {
      const fd = new FormData(); fd.append('photo', file);
      const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
      const data = await res.json(); return data.url;
  };

  // --- DOWNLOAD MANAGER ---
  const executeDownload = (range) => {
      let start = new Date(), end = new Date(), rangeName = "Tutto";
      if(range === 'week') { start.setDate(end.getDate() - 7); rangeName="Ultima Settimana"; } 
      else if(range === 'month') { start.setMonth(end.getMonth() - 1); rangeName="Ultimo Mese"; }
      else if (range === 'custom-month') {
          if(!selectedMonth) return alert("Seleziona un mese!");
          const [y, m] = selectedMonth.split('-');
          start = new Date(y, m - 1, 1); end = new Date(y, m, 0, 23, 59, 59);
          rangeName = `Mese ${selectedMonth}`;
      } else if(range === 'all') start = new Date('2020-01-01');
      
      const query = `?start=${start.toISOString()}&end=${end.toISOString()}&rangeName=${rangeName}&format=${downloadFormat}`;
      window.open(`${API_URL}/api/haccp/export/${downloadType}/${info.id}${query}`, '_blank');
      setShowDownloadModal(false);
  };

  // --- LOGIC: TEMPERATURE ---
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };
  
  // LOGICA "MODIFICATO": Verifica se created_at è diverso da updated_at
  const getUpdateStatus = (logData) => {
      // Se il backend supporta updated_at e created_at, usiamo quelli.
      // Fallback: se la logica di update aggiorna solo il record esistente, consideriamo che
      // se l'orario è molto recente rispetto a un orario standard di apertura, è stato modificato.
      // PER ORA: Ci basiamo sulla presenza di updated_at se esiste, altrimenti assumiamo modificato se l'utente ci clicca sopra.
      if (logData.updated_at && logData.created_at !== logData.updated_at) return "✏️ Modificato alle";
      return "✅ Registrato alle";
  };

  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try { const url = await uploadFile(f); setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }})); } 
      finally { setUploadingLog(null); }
  };
  
  const registraTemperatura = async (asset, isSpento = false) => {
      let val = 'OFF', conforme = true, azione = "";
      if (!isSpento) {
          val = parseFloat((tempInput[asset.id] || {}).val);
          if(isNaN(val)) return alert("Inserisci un numero valido");
          const min = Math.min(parseFloat(asset.range_min), parseFloat(asset.range_max));
          const max = Math.max(parseFloat(asset.range_min), parseFloat(asset.range_max));
          conforme = val >= min && val <= max;
          if(!conforme) {
              azione = prompt(`⚠️ Temp ${val}°C fuori range. Azione correttiva:`, "");
              if(!azione) return alert("Azione obbligatoria!");
          }
          val = val.toString();
      } else { azione = "Macchinario spento"; }

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val, conformita: conforme, 
              azione_correttiva: azione, foto_prova_url: (tempInput[asset.id] || {}).photo || ''
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

  // --- LOGIC: MERCI ---
  const salvaMerci = async (e) => {
      e.preventDefault();
      try {
        const url = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
        const method = merciForm.id ? 'PUT' : 'POST';
        const payload = { ...merciForm, ristorante_id: info.id, operatore: 'Staff' };
        ['scadenza','temperatura','quantita'].forEach(k => { if(!payload[k]) payload[k]=null; });

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if ((await res.json()).success) { resetMerciForm(); ricaricaDati(); alert("Salvato!"); }
        else alert("Errore salvataggio");
      } catch (err) { alert("Errore connessione"); }
  };
  const resetMerciForm = () => setMerciForm({
      id: null, data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '', temperatura: '', 
      conforme: true, integro: true, note: '', quantita: '', allegato_url: '', destinazione: ''
  });
  const iniziaModificaMerci = (m) => {
      setMerciForm({ ...m, data_ricezione: m.data_ricezione.split('T')[0], scadenza: m.scadenza ? m.scadenza.split('T')[0] : '' });
      window.scrollTo(0,0);
  };
  const eliminaMerce = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'}); ricaricaDati(); } };
  const handleMerciPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingMerci(true);
      try { const url = await uploadFile(f); setMerciForm(prev => ({...prev, allegato_url: url})); } finally { setUploadingMerci(false); }
  };

  // --- LOGIC: ASSETS ---
  const apriModaleAsset = (asset = null) => {
      if(asset) { setEditingAsset(asset); setAssetForm({ ...asset }); } 
      else { setEditingAsset(null); setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'', etichetta_url:'', stato:'attivo' }); }
      setShowAssetModal(true);
  };
  const salvaAsset = async (e) => {
      e.preventDefault();
      const url = editingAsset ? `${API_URL}/api/haccp/assets/${editingAsset.id}` : `${API_URL}/api/haccp/assets`;
      await fetch(url, { method: editingAsset ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...assetForm, ristorante_id: info.id }) });
      setShowAssetModal(false); ricaricaDati();
  };
  const handleAssetPhoto = async (e) => { const f=e.target.files[0]; if(f){ setUploadingAsset(true); try{ const url=await uploadFile(f); setAssetForm(prev=>({...prev, foto_url:url})); } finally{ setUploadingAsset(false); } } };
  const handleAssetLabel = async (e) => { const f=e.target.files[0]; if(f){ setUploadingLabel(true); try{ const url=await uploadFile(f); setAssetForm(prev=>({...prev, etichetta_url:url})); } finally{ setUploadingLabel(false); } } };

  // --- CALENDARIO ---
  const getDaysInMonth = (date) => { 
    const year = date.getFullYear(), month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const emptySlots = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, emptySlots };
  };
  const renderCalendario = () => {
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = []; const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} className="cal-empty"></div>);
      for (let d = 1; d <= days; d++) {
          const currentDayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
          const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === currentDayStr);
          const merciDelGiorno = merci.filter(m => new Date(m.data_ricezione).toDateString() === currentDayStr);
          const hasLogs = logsDelGiorno.length > 0; const hasMerci = merciDelGiorno.length > 0;
          const hasError = logsDelGiorno.some(l => !l.conformita) || merciDelGiorno.some(m => !m.conforme || !m.integro);
          let bgClass = 'cal-day'; if(hasLogs||hasMerci) bgClass += hasError ? ' error' : ' ok';
          grid.push(<div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno })} className={bgClass}><span>{d}</span><div className="cal-dots">{hasLogs && <span>🌡️</span>}{hasMerci && <span>📦</span>}</div></div>);
      }
      return (
          <>
             <div className="cal-header"><button onClick={()=>{const d=new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d);}}>◀</button><h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3><button onClick={()=>{const d=new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d);}}>▶</button></div>
             <div className="cal-grid">{grid}</div>
             {selectedDayLogs && (
                 <div className="cal-details">
                     <h3>Dettagli {selectedDayLogs.day}</h3>
                     <div className="cal-cols">
                         <div className="cal-col"><h4>🌡️ Temperature</h4>{selectedDayLogs.logs.map(l=><div key={l.id} className="cal-item"><strong>{l.nome_asset}</strong>: {l.valore}° <small>{l.conformita?'OK':'ERR'}</small></div>)}</div>
                         <div className="cal-col"><h4>📦 Merci</h4>{selectedDayLogs.merci.map(m=><div key={m.id} className="cal-item"><strong>{m.prodotto}</strong> <small>{m.fornitore}</small></div>)}</div>
                     </div>
                 </div>
             )}
          </>
      );
  };

  // --- LOGIC: ETICHETTE ---
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

  // --- RENDER HELPERS ---
  if(!info) return <div className="loading-screen">🛡️ Caricamento Sistema HACCP...</div>;
  if(!isAuthorized) return (
      <div className="auth-screen">
          <div className="auth-card">
              <h1>🔒 Accesso HACCP</h1>
              <p>Area riservata al personale autorizzato</p>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Inserisci Password" value={password} onChange={e=>setPassword(e.target.value)} />
                  <button>ENTRA</button>
              </form>
          </div>
          <style>{`.auth-screen{height:100vh;display:flex;align-items:center;justify-content:center;background:#ecf0f1;}.auth-card{background:white;padding:30px;border-radius:10px;text-align:center;box-shadow:0 4px 10px rgba(0,0,0,0.1);}.auth-card input{padding:10px;width:100%;margin:10px 0;border:1px solid #ccc;border-radius:5px;}.auth-card button{width:100%;padding:10px;background:#2c3e50;color:white;border:none;border-radius:5px;cursor:pointer;}`}</style>
      </div>
  );

  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina','congelatore','abbattitore'].includes(a.tipo));

  return (
    <div className="app-container">
      
      {!scanId && (
          <header className="app-header no-print">
              <div className="header-top">
                  <h1>🛡️ HACCP Control</h1>
                  <button className="btn-logout" onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}}>ESCI</button>
              </div>
              
              <div className="header-actions">
                   <div className="download-group">
                      <button onClick={()=>setTab('temperature')} className={`nav-btn ${tab==='temperature'?'active':''}`}>🌡️ Temp</button>
                      <button onClick={()=>setTab('merci')} className={`nav-btn ${tab==='merci'?'active':''}`}>📦 Merci</button>
                      <button onClick={()=>setTab('calendario')} className={`nav-btn ${tab==='calendario'?'active':''}`}>📅 Cal</button>
                      <button onClick={()=>setTab('etichette')} className={`nav-btn ${tab==='etichette'?'active':''}`}>🏷️ Label</button>
                      <button onClick={()=>setTab('setup')} className={`nav-btn ${tab==='setup'?'active':''}`}>⚙️ Setup</button>
                   </div>
              </div>
          </header>
      )}

      <main className="app-content">
          
          {/* TAB 1: TEMPERATURE */}
          {tab === 'temperature' && (
              <>
                {!scanId && (
                   <div className="action-bar no-print">
                      <h2>Rilevazione Temperature</h2>
                      <button onClick={()=>{setDownloadType('temperature'); setShowDownloadModal(true);}} className="btn-secondary">⬇ Report</button>
                   </div>
                )}
                <div className="grid-responsive">
                  {assetsToDisplay.map(asset => {
                      const todayLog = getTodayLog(asset.id);
                      const isInputActive = !!tempInput[asset.id];
                      const currentData = tempInput[asset.id] || {};
                      
                      // CARD 1: SPENTO
                      if(asset.stato === 'spento') return (
                          <div key={asset.id} className="card card-off">
                              <div className="card-badge off">OFF</div>
                              <h3>{asset.nome}</h3>
                              <div className="status-box off">MACCHINARIO SPENTO</div>
                          </div>
                      );

                      // CARD 2: REGISTRATO (MOSTRA ORA CORRETTA O "MODIFICATO")
                      if (todayLog && !isInputActive) {
                          const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                          const statusLabel = getUpdateStatus(todayLog);

                          return (
                              <div key={asset.id} className={`card card-ok ${!todayLog.conformita ? 'card-error' : ''}`}>
                                  <div className="card-header">
                                      <h3>{asset.nome}</h3>
                                      <span className="temp-display">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°'}</span>
                                  </div>
                                  <div className="card-meta">
                                      {todayLog.conformita ? 
                                          <span>{statusLabel} <strong>{timeStr}</strong></span> : 
                                          <span className="error-text">⚠️ {todayLog.azione_correttiva}</span>
                                      }
                                  </div>
                                  <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-edit full-width">
                                      ✏️ MODIFICA
                                  </button>
                              </div>
                          );
                      }
                      
                      // CARD 3: INPUT MODE
                      return (
                          <div key={asset.id} className="card card-input">
                               <div className="card-header-sm">
                                    <div>
                                        <h3>{asset.nome}</h3>
                                        <small>{asset.marca}</small>
                                    </div>
                                    <span className="badge-range">{asset.range_min}° / {asset.range_max}°</span>
                               </div>
                               
                               <div className="input-row">
                                  <input 
                                       type="number" inputMode="decimal" step="0.1" placeholder="°C" 
                                       value={currentData.val || ''} 
                                       onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                       className="input-temp"
                                  />
                                  <button onClick={()=>registraTemperatura(asset, true)} className="btn-icon btn-grey">OFF</button>
                                  <label className={`btn-icon ${currentData.photo ? 'btn-green' : 'btn-light'}`}>
                                      📷 <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                  </label>
                                  <button onClick={()=>registraTemperatura(asset, false)} className="btn-primary">SALVA</button>
                               </div>
                               {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-link text-center full-width">Annulla</button>}
                          </div>
                      );
                  })}
                </div>
              </>
          )}

          {/* TAB 2: MERCI */}
          {tab === 'merci' && !scanId && (
              <div className="no-print">
                  <div className="action-bar">
                      <h2>Carico Merci</h2>
                      <button onClick={()=>{setDownloadType('merci'); setShowDownloadModal(true);}} className="btn-secondary">⬇ Report</button>
                  </div>
                  
                  {/* FORM MERCI */}
                  <div className="card form-card">
                      <div className="card-header">
                          <h3>{merciForm.id ? '✏️ Modifica Merce' : '📥 Nuovo Arrivo'}</h3>
                          {merciForm.id && <button onClick={resetMerciForm} className="btn-danger-outline">Annulla</button>}
                      </div>
                      <form onSubmit={salvaMerci} className="form-grid">
                          <div className="form-group"><label>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required /></div>
                          <div className="form-group span-2"><label>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required /></div>
                          <div className="form-group span-2"><label>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required /></div>
                          <div className="form-group"><label>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} /></div>
                          <div className="form-group"><label>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} /></div>
                          <div className="form-group"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} /></div>
                          <div className="form-group"><label>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} /></div>
                          <div className="form-group span-2"><label>Destinazione</label>
                            <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                                <option value="">-- Seleziona --</option>{assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                            </select>
                          </div>
                          <div className="form-group full-width"><label>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} /></div>
                          
                          <div className="form-actions full-width">
                              <div className="checkbox-group">
                                  <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                                  <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                              </div>
                              <label className={`btn-upload ${merciForm.allegato_url ? 'uploaded' : ''}`}>
                                  {uploadingMerci ? "..." : (merciForm.allegato_url ? "📎 OK" : "📎 Bolla")}
                                  <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} hidden />
                              </label>
                              <button className="btn-primary big-btn">{merciForm.id ? 'AGGIORNA' : 'REGISTRA'}</button>
                          </div>
                      </form>
                  </div>

                  {/* LISTA MERCI RESPONSIVE */}
                  <div className="card list-card">
                      <h3>Storico Recente</h3>
                      <div className="table-responsive">
                          <table className="clean-table">
                              <thead><tr><th>Data</th><th>Dettagli Prodotto</th><th>Info</th><th>Stato</th><th>Azioni</th></tr></thead>
                              <tbody>
                                  {merci.map(m => (
                                      <tr key={m.id}>
                                          <td data-label="Data">{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                          <td data-label="Prodotto"><strong>{m.prodotto}</strong><br/><small>{m.fornitore}</small></td>
                                          <td data-label="Info">Qty: {m.quantita}<br/>Lotto: {m.lotto}</td>
                                          <td data-label="Stato">{m.conforme ? <span className="tag ok">OK</span> : <span className="tag no">NO</span>}</td>
                                          <td data-label="Azioni" className="actions-cell">
                                              {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon btn-blue">📎</a>}
                                              <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon btn-orange">✏️</button>
                                              <button onClick={()=>eliminaMerce(m.id)} className="btn-icon btn-red">🗑️</button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB 3: CALENDARIO */}
          {tab === 'calendario' && !scanId && (
             <div className="card">
                 {renderCalendario()} 
             </div>
          )}

          {/* TAB 4: ETICHETTE */}
          {tab === 'etichette' && !scanId && (
              <div className="split-view no-print">
                  <div className="card">
                     <h3>Stampa Etichetta</h3>
                     <form onSubmit={handlePrintLabel} className="form-stack">
                        <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} />
                        <select value={labelData.tipo} onChange={e=>{
                            const t=e.target.value; setLabelData({...labelData, tipo:t, giorni_scadenza: t==='negativo'?180:(t==='sottovuoto'?10:3)});
                        }}>
                            <option value="positivo">Positivo (+3°C)</option>
                            <option value="negativo">Negativo (-18°C)</option>
                            <option value="sottovuoto">Sottovuoto</option>
                        </select>
                        <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} placeholder="Giorni" />
                        <input placeholder="Operatore" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} />
                        <button className="btn-primary">STAMPA</button>
                     </form>
                  </div>
                  <div className="preview-box">
                      {lastLabel ? (
                          <div className="label-preview">
                             <strong>{lastLabel.prodotto}</strong>
                             <p>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</p>
                          </div>
                      ) : <p>Anteprima etichetta</p>}
                  </div>
              </div>
          )}

          {/* TAB 5: SETUP */}
          {tab === 'setup' && !scanId && (
              <div className="no-print">
                  <div className="action-bar">
                      <h2>Gestione Macchinari</h2>
                      <button onClick={()=>apriModaleAsset()} className="btn-primary">+ Nuovo</button>
                  </div>
                  <div className="grid-responsive">
                      {assets.map(a => (
                          <div key={a.id} className="card card-setup">
                              <div className="card-header">
                                  <strong>{a.nome}</strong>
                                  <span className="badge-type">{a.tipo}</span>
                              </div>
                              <div className="card-actions-row">
                                  <button onClick={()=>setShowQRModal(a)} className="btn-secondary small">QR Code</button>
                                  <button onClick={()=>apriModaleAsset(a)} className="btn-secondary small">Modifica</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </main>

      {/* --- MODALS --- */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h3>Scarica Report</h3>
                  <div className="modal-body">
                      <div className="format-toggle">
                          <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button>
                          <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'active':''}>PDF</button>
                      </div>
                      <div className="date-picker-row">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                          <button onClick={()=>executeDownload('custom-month')} className="btn-primary">SCARICA MESE</button>
                      </div>
                      <hr/>
                      <button onClick={()=>executeDownload('week')} className="btn-block">Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')} className="btn-block">Ultimi 30 Giorni</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-link">Chiudi</button>
              </div>
          </div>
      )}
      
      {showAssetModal && (
          <div className="modal-overlay">
             <div className="modal-content large">
                <h3>{editingAsset ? 'Modifica' : 'Nuovo'} Asset</h3>
                <form onSubmit={salvaAsset} className="form-grid">
                   <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome" className="full-width" required />
                   <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}><option value="attivo">Attivo</option><option value="spento">Spento</option></select>
                   <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})}><option value="frigo">Frigo</option><option value="congelatore">Congelatore</option></select>
                   <div className="row-2"><input placeholder="Min" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} /><input placeholder="Max" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} /></div>
                   <button className="btn-primary full-width">SALVA</button>
                   <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-link full-width">Annulla</button>
                </form>
             </div>
          </div>
      )}

      {/* --- STILI CSS MODERNI --- */}
      <style>{`
        :root { --primary: #2c3e50; --secondary: #34495e; --accent: #27ae60; --danger: #e74c3c; --bg: #f3f4f6; --white: #ffffff; --text: #1f2937; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
        
        /* LAYOUT */
        .app-container { min-height: 100vh; padding-bottom: 40px; }
        .app-header { background: var(--white); padding: 15px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .header-top h1 { margin: 0; font-size: 1.2rem; color: var(--primary); }
        .app-content { max-width: 1200px; margin: 20px auto; padding: 0 15px; }

        /* NAVIGATION (SCROLLABLE) */
        .download-group { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .nav-btn { white-space: nowrap; padding: 8px 16px; border: 1px solid #e5e7eb; background: var(--white); border-radius: 20px; font-weight: 600; font-size: 0.9rem; color: #6b7280; cursor: pointer; transition: all 0.2s; }
        .nav-btn.active { background: var(--primary); color: var(--white); border-color: var(--primary); }
        
        /* GRID SYSTEM */
        .grid-responsive { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        @media(max-width: 480px) { .grid-responsive { grid-template-columns: 1fr; } }

        /* CARDS */
        .card { background: var(--white); border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 15px; position: relative; border-top: 4px solid transparent; }
        .card-ok { border-top-color: var(--accent); background: #f0fdf4; }
        .card-error { border-top-color: var(--danger); background: #fef2f2; }
        .card-off { border-top-color: #9ca3af; opacity: 0.8; }
        .card-input { border-top-color: var(--secondary); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .card-header h3 { margin: 0; font-size: 1.1rem; }
        .temp-display { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .card-meta { font-size: 0.85rem; color: #6b7280; margin-bottom: 15px; }
        
        /* INPUTS & FORMS */
        .input-row { display: flex; gap: 10px; height: 48px; }
        .input-temp { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; text-align: center; font-size: 1.2rem; font-weight: bold; width: 0; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #6b7280; }
        .form-group input, .form-group select { padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; }
        .span-2 { grid-column: span 2; }
        .full-width { width: 100%; grid-column: span 2; }
        @media(max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .span-2, .full-width { grid-column: span 1; } }

        /* BUTTONS */
        button { border: none; cursor: pointer; transition: opacity 0.2s; }
        .btn-primary { background: var(--primary); color: var(--white); border-radius: 8px; font-weight: 600; padding: 0 20px; }
        .btn-secondary { background: #e5e7eb; color: var(--text); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
        .btn-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin: 0 2px;}
        .btn-grey { background: #9ca3af; color: white; font-size: 0.7rem; font-weight: bold; }
        .btn-green { background: var(--accent); color: white; }
        .btn-light { background: #f3f4f6; border: 1px solid #d1d5db; }
        .btn-blue { background: #3498db; color: white; }
        .btn-orange { background: #f39c12; color: white; }
        .btn-red { background: #e74c3c; color: white; }
        .btn-logout { background: var(--danger); color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; }
        .btn-edit { background: #f59e0b; color: white; padding: 10px; border-radius: 8px; font-weight: bold; margin-top: 10px; }
        .text-center { text-align: center; display: block;}

        /* TABLE RESPONSIVE */
        .clean-table { width: 100%; border-collapse: collapse; }
        .clean-table th { text-align: left; padding: 12px; background: #f9fafb; color: #6b7280; font-size: 0.85rem; }
        .clean-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        
        @media(max-width: 600px) {
            .clean-table thead { display: none; }
            .clean-table tr { display: block; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; padding: 10px; }
            .clean-table td { display: flex; justify-content: space-between; border: none; padding: 5px 0; font-size: 0.9rem; }
            .clean-table td::before { content: attr(data-label); font-weight: bold; color: #9ca3af; margin-right: 10px; }
            .clean-table td.actions-cell { justify-content: flex-end; gap: 10px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
        }
        
        /* CALENDAR */
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .cal-day { border: 1px solid #e5e7eb; min-height: 70px; padding: 5px; border-radius: 6px; cursor: pointer; position: relative; font-weight: bold; }
        .cal-day.ok { background: #d1fae5; border-color: #34d399; }
        .cal-day.error { background: #fee2e2; border-color: #f87171; }
        .cal-dots { font-size: 0.7rem; margin-top: 5px; }
        .cal-details { margin-top: 20px; border-top: 2px solid #eee; padding-top: 15px; }
        .cal-cols { display: flex; gap: 15px; flex-wrap: wrap; }
        .cal-col { flex: 1; background: #f9fafb; padding: 10px; border-radius: 8px; min-width: 250px; }
        .cal-item { background: white; padding: 8px; margin-bottom: 5px; border-radius: 5px; border: 1px solid #eee; font-size: 0.9rem; }

        /* UTILS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
        .print-area { display: none; }
        @media print { .no-print { display: none !important; } .print-area { display: flex !important; } }
      `}</style>
    </div>
  );
}

export default Haccp;