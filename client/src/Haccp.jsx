// client/src/Haccp.jsx - VERSIONE PRO (BOTTOM NAV + CLEAN UI)
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
  
  // Anteprima Immagine
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
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(data => { setInfo(data); });
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
      if(scanId) setTab('temperature');
  }, [slug, scanId]);

  useEffect(() => {
      if(isAuthorized && info) { ricaricaDati(); ricaricaCalendario(); }
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

  const handleLogin = async (e) => {
      e.preventDefault();
      try {
          const r = await fetch(`${API_URL}/api/auth/station`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ ristorante_id: info.id, role: 'haccp', password })
          });
          const d = await r.json();
          if(d.success) { setIsAuthorized(true); localStorage.setItem(`haccp_session_${slug}`, "true"); } 
          else alert("Password Errata");
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
          const [y, m] = selectedMonth.split('-'); start = new Date(y, m - 1, 1); end = new Date(y, m, 0, 23, 59, 59);
          rangeName = `Mese di ${start.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`;
      } else if(range === 'all') { start = new Date('2020-01-01'); rangeName="Storico Completo"; }
      
      const query = `?start=${start.toISOString()}&end=${end.toISOString()}&rangeName=${rangeName}&format=${downloadFormat}`;
      window.open(`${API_URL}/api/haccp/export/${downloadType}/${info.id}${query}`, '_blank');
      setShowDownloadModal(false);
  };

  // --- LOGICHE TEMPERATURE ---
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
      let val = 'OFF'; let conforme = true; let azione = "";
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
      } else { val = "OFF"; conforme = true; azione = "Macchinario spento/inutilizzato"; }

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

  // --- LOGICHE MERCI / ASSET / CALENDARIO / LABELS ---
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
        const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) { resetMerciForm(); ricaricaDati(); alert("✅ Salvato!"); } else { alert("❌ Errore: " + (data.error || "Sconosciuto")); }
      } catch (err) { alert("❌ Errore Connessione"); }
  };
  const resetMerciForm = () => { setMerciForm({ id: null, data_ricezione: new Date().toISOString().split('T')[0], fornitore: '', prodotto: '', lotto: '', scadenza: '', temperatura: '', conforme: true, integro: true, note: '', quantita: '', allegato_url: '', destinazione: '' }); };
  const iniziaModificaMerci = (m) => { setMerciForm({ ...m, data_ricezione: m.data_ricezione.split('T')[0], scadenza: m.scadenza ? m.scadenza.split('T')[0] : '' }); window.scrollTo(0,0); };
  const eliminaMerce = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'}); ricaricaDati(); } };

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
  const handleAssetPhoto = async (e) => { const f = e.target.files[0]; if(!f) return; setUploadingAsset(true); try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, foto_url: url})); } finally { setUploadingAsset(false); } };
  const handleAssetLabel = async (e) => { const f = e.target.files[0]; if(!f) return; setUploadingLabel(true); try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, etichetta_url: url})); } finally { setUploadingLabel(false); } };

  const getDaysInMonth = (date) => { const year = date.getFullYear(), month = date.getMonth(); const days = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay(); const emptySlots = firstDay === 0 ? 6 : firstDay - 1; return { days, emptySlots }; };
  const cambiaMese = (delta) => { const newDate = new Date(currentDate); newDate.setMonth(newDate.getMonth() + delta); setCurrentDate(newDate); setSelectedDayLogs(null); };
  
  const handleLabelTypeChange = (e) => { const type = e.target.value; let days = 3; if (type === 'negativo') days = 180; if (type === 'sottovuoto') days = 10; setLabelData({...labelData, tipo: type, giorni_scadenza: days}); };
  const handlePrintLabel = async (e) => { e.preventDefault(); const scadenza = new Date(); scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza)); const res = await fetch(`${API_URL}/api/haccp/labels`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) }); const data = await res.json(); if(data.success) { setLastLabel(data.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); } };
  const executePrintQR = () => { setPrintMode('qr'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); };

  // --- RENDER COMPONENTI UI ---
  const renderCalendario = () => {
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = []; const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
      for (let d = 1; d <= days; d++) {
          const cDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
          const logsG = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === cDate);
          const merciG = merci.filter(m => new Date(m.data_ricezione).toDateString() === cDate);
          const hasData = logsG.length > 0 || merciG.length > 0;
          const hasError = logsG.some(l=>!l.conformita) || merciG.some(m=>!m.conforme);
          grid.push(<div key={d} onClick={()=>setSelectedDayLogs({day:d, logs:logsG, merci:merciG})} className={`cal-cell ${hasData ? (hasError ? 'err' : 'ok') : ''}`}><b>{d}</b></div>);
      }
      return (
        <div className="cal-box">
            <div className="cal-head"><button onClick={()=>cambiaMese(-1)}>◀</button><h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3><button onClick={()=>cambiaMese(1)}>▶</button></div>
            <div className="cal-grid">{grid}</div>
            {selectedDayLogs && (
                <div className="cal-detail">
                    <h4>Dettagli Giorno {selectedDayLogs.day}</h4>
                    {selectedDayLogs.logs.map(l=><div key={l.id} className="log-row"><span>{l.nome_asset}</span><b>{l.valore}°</b><span className={l.conformita?'s-ok':'s-no'}>{l.conformita?'OK':'ERR'}</span></div>)}
                    {selectedDayLogs.merci.map(m=><div key={m.id} className="log-row"><span>📦 {m.prodotto}</span><span className={m.conforme?'s-ok':'s-no'}>{m.conforme?'OK':'NO'}</span></div>)}
                </div>
            )}
        </div>
      );
  };

  if(!info) return <div className="loader">Caricamento...</div>;
  if(!isAuthorized) return <div className="login-screen"><h1>🔒 HACCP Access</h1><form onSubmit={handleLogin}><input type="password" placeholder="Password Stazione" value={password} onChange={e=>setPassword(e.target.value)} /><button>ACCEDI</button></form></div>;
  
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="app-container">
      
      {/* HEADER FISSO TOP (SOLO TITOLO E DOWNLOAD) */}
      {!scanId && (
          <header className="app-header no-print">
              <h1>🛡️ HACCP Control</h1>
              <div className="header-actions">
                  <button onClick={()=>openDownloadModal('temperature')} className="icon-btn">📥</button>
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="icon-btn logout">🛑</button>
              </div>
          </header>
      )}

      <div className="content-area">
        {/* 1. TEMPERATURE (RIDISEGNATO) */}
        {tab === 'temperature' && (
            <div className="card-grid">
                {assetsToDisplay.map(asset => {
                    const todayLog = getTodayLog(asset.id);
                    const isInputActive = !!tempInput[asset.id];
                    const currentData = tempInput[asset.id] || {};

                    // CARD SPENTO
                    if(asset.stato === 'spento') return (
                        <div key={asset.id} className="card off">
                            <div className="card-head"><h3>{asset.nome}</h3><span className="badge-gray">SPENTO</span></div>
                            <div className="card-body off-msg"><p>Macchinario non in uso</p></div>
                        </div>
                    );

                    // CARD COMPLETATA (DATO REGISTRATO)
                    if (todayLog && !isInputActive) return (
                        <div key={asset.id} className="card done">
                            <div className="card-head"><h3>{asset.nome}</h3><span className="badge-green">COMPLETATO</span></div>
                            <div className="card-body centered">
                                <div className="big-val">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°'}</div>
                                <div className="meta-info">{new Date(todayLog.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {todayLog.conformita ? 'Conforme' : 'Anomalia'}</div>
                                <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-link">Modifica</button>
                            </div>
                        </div>
                    );

                    // CARD INPUT (RIDISEGNATA PER MOBILE)
                    return (
                        <div key={asset.id} className="card input-card">
                             <div className="card-head">
                                  <div>
                                    <h3>{asset.nome}</h3>
                                    <small>{asset.marca}</small>
                                  </div>
                                  <span className="badge-outline">{asset.range_min}° / {asset.range_max}°</span>
                             </div>

                             <div className="card-body">
                                <div className="input-group-large">
                                    <input 
                                        type="number" step="0.1" inputMode="decimal" placeholder="0.0" 
                                        value={currentData.val || ''} 
                                        onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                    />
                                    <span className="unit">°C</span>
                                </div>

                                <div className="action-row">
                                    <button className="btn-secondary" onClick={()=>registraTemperatura(asset, true)}>OFF</button>
                                    
                                    <label className={`btn-secondary ${currentData.photo ? 'active-photo' : ''}`}>
                                        📷
                                        <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                    </label>

                                    <button className="btn-primary flex-grow" onClick={()=>registraTemperatura(asset, false)}>
                                        SALVA
                                    </button>
                                </div>
                                {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-text-cancel">Annulla</button>}
                             </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* 2. MERCI (OTTIMIZZATO) */}
        {tab === 'merci' && !scanId && (
            <div className="merci-wrapper">
                <div className={`card form-card ${merciForm.id ? 'editing' : ''}`}>
                    <div className="card-head"><h3>{merciForm.id ? 'Modifica Merce' : 'Nuovo Arrivo'}</h3></div>
                    <form onSubmit={salvaMerci} className="form-grid">
                        <input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required className="inp full" />
                        <input placeholder="Fornitore" value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required className="inp full" />
                        <input placeholder="Prodotto" value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required className="inp full" />
                        <div className="row-2">
                             <input placeholder="Qtà" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} className="inp" />
                             <input placeholder="Temp °C" type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} className="inp" />
                        </div>
                        <div className="row-2">
                            <input placeholder="Lotto" value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} className="inp" />
                            <input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} className="inp" />
                        </div>
                        <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} className="inp full">
                            <option value="">Destinazione...</option>
                            {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                        </select>
                        <label className={`file-upload ${merciForm.allegato_url ? 'has-file' : ''}`}>
                            {uploadingMerci ? 'Caricamento...' : (merciForm.allegato_url ? '📎 Bolla OK' : '📷 Foto Bolla')}
                            <input type="file" onChange={handleMerciPhoto} hidden />
                        </label>
                        <div className="toggles">
                            <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                            <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                        </div>
                        <button className="btn-primary full">{merciForm.id ? 'AGGIORNA' : 'REGISTRA'}</button>
                        {merciForm.id && <button type="button" onClick={resetMerciForm} className="btn-text-cancel">Annulla</button>}
                    </form>
                </div>
                
                <div className="list-container">
                    {merci.map(m => (
                        <div key={m.id} className="list-item">
                            <div className="li-head">
                                <strong>{m.prodotto}</strong>
                                <span className="date">{new Date(m.data_ricezione).toLocaleDateString().slice(0,5)}</span>
                            </div>
                            <div className="li-sub">{m.fornitore} - {m.quantita || ''}</div>
                            <div className="li-actions">
                                {m.conforme ? <span className="tag ok">OK</span> : <span className="tag no">NO</span>}
                                <div className="btns">
                                    {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon">📎</a>}
                                    <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon">✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} className="btn-icon danger">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 3. CALENDARIO */}
        {tab === 'calendario' && !scanId && renderCalendario()}

        {/* 4. SETUP / ETICHETTE */}
        {(tab === 'setup' || tab === 'etichette') && !scanId && (
            <div className="placeholder-setup">
                {tab === 'etichette' && (
                    <div className="card form-card">
                         <h3>Etichetta Interna</h3>
                         <input placeholder="Prodotto" className="inp full" value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} />
                         <select className="inp full" value={labelData.tipo} onChange={handleLabelTypeChange}>
                             <option value="positivo">Positivo (+3°C)</option><option value="negativo">Negativo (-18°C)</option><option value="sottovuoto">Sottovuoto</option>
                         </select>
                         <input type="number" className="inp full" placeholder="Giorni" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} />
                         <button onClick={handlePrintLabel} className="btn-primary full">STAMPA</button>
                    </div>
                )}
                {tab === 'setup' && (
                    <div className="list-container">
                        <button onClick={()=>apriModaleAsset()} className="btn-primary full mb-10">+ Nuova Macchina</button>
                        {assets.map(a => (
                            <div key={a.id} className="list-item">
                                <b>{a.nome}</b>
                                <div className="btns">
                                    <button onClick={()=>setShowQRModal(a)} className="btn-secondary small">QR</button>
                                    <button onClick={()=>apriModaleAsset(a)} className="btn-secondary small">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- BOTTOM NAVIGATION BAR (APP STYLE) --- */}
      {!scanId && (
          <nav className="bottom-nav no-print">
              <button onClick={()=>setTab('temperature')} className={tab==='temperature'?'active':''}>
                  <span className="icon">🌡️</span><span className="lbl">Temp</span>
              </button>
              <button onClick={()=>setTab('merci')} className={tab==='merci'?'active':''}>
                  <span className="icon">📦</span><span className="lbl">Merci</span>
              </button>
              <button onClick={()=>setTab('calendario')} className={tab==='calendario'?'active':''}>
                  <span className="icon">📅</span><span className="lbl">Log</span>
              </button>
              <button onClick={()=>setTab('etichette')} className={tab==='etichette'?'active':''}>
                  <span className="icon">🏷️</span><span className="lbl">Label</span>
              </button>
              <button onClick={()=>setTab('setup')} className={tab==='setup'?'active':''}>
                  <span className="icon">⚙️</span><span className="lbl">Set</span>
              </button>
          </nav>
      )}

      {/* MODALI DI SUPPORTO */}
      {showDownloadModal && (
          <div className="modal-backdrop" onClick={()=>setShowDownloadModal(false)}>
              <div className="modal-content" onClick={e=>e.stopPropagation()}>
                  <h3>Scarica Report</h3>
                  <div className="toggle-group">
                      <button className={downloadFormat==='excel'?'active':''} onClick={()=>setDownloadFormat('excel')}>Excel</button>
                      <button className={downloadFormat==='pdf'?'active':''} onClick={()=>setDownloadFormat('pdf')}>PDF</button>
                  </div>
                  <div className="modal-actions">
                      <button onClick={()=>executeDownload('week')}>Settimana</button>
                      <button onClick={()=>executeDownload('month')}>Mese (30gg)</button>
                      <button onClick={()=>executeDownload('all')}>Tutto</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* MODALE ASSET */}
      {showAssetModal && (
        <div className="modal-backdrop">
             <div className="modal-content form-card">
                 <h3>{editingAsset?'Modifica':'Nuovo'} Asset</h3>
                 <form onSubmit={salvaAsset} className="form-grid">
                     <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm,nome:e.target.value})} className="inp full" placeholder="Nome" required />
                     <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm,tipo:e.target.value})} className="inp full"><option value="frigo">Frigo</option><option value="cella">Cella</option><option value="vetrina">Vetrina</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino</option></select>
                     <div className="row-2">
                        <input placeholder="Min" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} className="inp" />
                        <input placeholder="Max" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} className="inp" />
                     </div>
                     <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm,stato:e.target.value})} className="inp full"><option value="attivo">Attivo</option><option value="spento">Spento</option></select>
                     <button className="btn-primary full">SALVA</button>
                     <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-text-cancel">Annulla</button>
                 </form>
             </div>
        </div>
      )}

      {/* PREVIEW IMAGE */}
      {previewImage && (
          <div onClick={() => setPreviewImage(null)} className="modal-backdrop" style={{zIndex:3000}}>
              <img src={previewImage} alt="Anteprima" style={{maxWidth:'90%', maxHeight:'80vh', borderRadius:10}} />
          </div>
      )}

      {/* PRINT AREA */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area label-print">
            <div className="lp-title">{lastLabel.prodotto}</div>
            <div className="lp-info"><span>{new Date(lastLabel.data_produzione).toLocaleDateString()}</span><span>{lastLabel.operatore}</span></div>
            <div className="lp-scad">SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
        </div>
      )}

      {/* QR PRINT */}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area qr-print" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h1>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
        </div>
      )}
      
      {/* CSS STYLES - MODERN APP THEME */}
      <style>{`
        :root {
            --primary: #10b981; /* Emerald Green */
            --primary-dark: #059669;
            --bg: #f3f4f6; /* Cool Gray */
            --card-bg: #ffffff;
            --text-main: #1f2937;
            --text-sub: #6b7280;
            --border: #e5e7eb;
            --danger: #ef4444;
        }
        body { margin: 0; background: var(--bg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: var(--text-main); padding-bottom: 80px; }
        * { box-sizing: border-box; }
        
        /* HEADER */
        .app-header { background: var(--card-bg); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 50; }
        .app-header h1 { font-size: 18px; margin: 0; font-weight: 700; color: var(--text-main); }
        .icon-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 5px; }
        .logout { color: var(--danger); }

        /* CONTENT */
        .content-area { padding: 15px; max-width: 600px; margin: 0 auto; }
        .card-grid { display: flex; flex-direction: column; gap: 15px; }
        
        /* CARD STYLES */
        .card { background: var(--card-bg); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; }
        .card-head { padding: 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
        .card-head h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .card-head small { color: var(--text-sub); font-size: 12px; }
        .card-body { padding: 20px 15px; }
        
        /* BADGES */
        .badge-outline { font-size: 11px; padding: 2px 8px; border: 1px solid var(--text-sub); border-radius: 12px; color: var(--text-sub); white-space: nowrap; }
        .badge-gray { background: #e5e7eb; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; color: #374151; }
        .badge-green { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; }

        /* INPUT CARD UI - THE CORE FIX */
        .input-group-large { display: flex; align-items: baseline; justify-content: center; margin-bottom: 20px; position: relative; }
        .input-group-large input { font-size: 42px; font-weight: 700; width: 140px; text-align: center; border: none; border-bottom: 2px solid var(--border); outline: none; padding: 5px; color: var(--text-main); background: transparent; }
        .input-group-large input:focus { border-color: var(--primary); }
        .input-group-large .unit { font-size: 20px; color: var(--text-sub); margin-left: 5px; font-weight: 500; }
        
        .action-row { display: flex; gap: 10px; align-items: center; }
        .btn-secondary { background: #f3f4f6; border: none; border-radius: 12px; height: 50px; padding: 0 20px; font-weight: 600; color: #4b5563; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .btn-primary { background: var(--primary); border: none; border-radius: 12px; height: 50px; color: white; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); }
        .btn-primary:active { transform: scale(0.98); }
        .flex-grow { flex: 1; }
        .active-photo { background: #d1fae5; color: var(--primary-dark); border: 2px solid var(--primary); }

        /* MERCI & FORMS */
        .form-grid { display: flex; flex-direction: column; gap: 12px; padding: 15px; }
        .inp { padding: 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 16px; background: #f9fafb; width: 100%; }
        .inp:focus { border-color: var(--primary); outline: none; background: white; }
        .row-2 { display: flex; gap: 10px; }
        .file-upload { display: block; text-align: center; padding: 15px; border: 2px dashed var(--border); border-radius: 10px; color: var(--text-sub); cursor: pointer; margin-bottom: 5px; }
        .file-upload.has-file { border-color: var(--primary); color: var(--primary); background: #f0fdf4; }
        .toggles { display: flex; justify-content: space-around; margin-bottom: 10px; }
        
        /* LIST ITEMS (MERCI / ASSETS) */
        .list-container { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .list-item { background: white; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .li-head { font-size: 14px; margin-bottom: 4px; }
        .li-sub { font-size: 12px; color: var(--text-sub); }
        .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        .tag.ok { background: #d1fae5; color: green; } .tag.no { background: #fee2e2; color: red; }
        .btns { display: flex; gap: 5px; }
        .btn-icon.danger { background: #fee2e2; color: red; }
        
        /* BOTTOM NAV - APP STYLE */
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-top: 1px solid var(--border); display: flex; justify-content: space-around; padding: 8px 0 25px 0; z-index: 100; box-shadow: 0 -4px 10px rgba(0,0,0,0.02); }
        .bottom-nav button { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-sub); font-size: 10px; font-weight: 600; cursor: pointer; width: 20%; }
        .bottom-nav button .icon { font-size: 22px; transition: transform 0.2s; }
        .bottom-nav button.active { color: var(--primary); }
        .bottom-nav button.active .icon { transform: translateY(-2px); }

        /* CALENDAR */
        .cal-box { background: white; border-radius: 16px; padding: 15px; }
        .cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .cal-head button { background: #f3f4f6; border: none; width: 30px; height: 30px; border-radius: 50%; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .cal-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 8px; background: #f9fafb; cursor: pointer; }
        .cal-cell.ok { background: #d1fae5; color: #065f46; }
        .cal-cell.err { background: #fee2e2; color: #991b1b; }
        .cal-detail { margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border); }
        .log-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .s-ok { color: var(--primary); font-weight: bold; } .s-no { color: var(--danger); font-weight: bold; }

        /* UTILS */
        .centered { text-align: center; }
        .big-val { font-size: 32px; font-weight: 800; color: var(--text-main); margin-bottom: 5px; }
        .meta-info { font-size: 12px; color: var(--text-sub); margin-bottom: 10px; }
        .btn-link { background: none; border: none; color: var(--primary); text-decoration: underline; cursor: pointer; }
        .btn-text-cancel { background: none; border: none; color: var(--text-sub); width: 100%; margin-top: 10px; font-size: 12px; cursor: pointer; }
        .loader, .login-screen { display: flex; height: 100vh; justify-content: center; align-items: center; flex-direction: column; font-family: sans-serif; gap: 20px; }
        .login-screen input { padding: 15px; border: 1px solid #ddd; border-radius: 10px; width: 250px; font-size: 16px; }
        .login-screen button { padding: 15px 30px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }
        
        /* MODALS */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
        .modal-content { background: white; border-radius: 20px; padding: 25px; width: 100%; max-width: 350px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .toggle-group { display: flex; background: #f3f4f6; padding: 4px; border-radius: 10px; margin-bottom: 20px; }
        .toggle-group button { flex: 1; border: none; padding: 8px; border-radius: 8px; background: transparent; cursor: pointer; font-weight: 600; color: var(--text-sub); }
        .toggle-group button.active { background: white; color: var(--text-main); shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .modal-actions { display: flex; flex-direction: column; gap: 10px; }
        .modal-actions button { padding: 12px; border: none; border-radius: 10px; background: var(--text-main); color: white; font-weight: 600; cursor: pointer; }
        
        /* PRINT */
        @media print { .no-print { display: none !important; } .print-area { display: block !important; position: fixed; top: 0; left: 0; background: white; width: 100%; height: 100%; z-index: 9999; padding: 20px; text-align: center; } .lp-title { font-size: 24px; font-weight: 900; border-bottom: 2px solid black; margin-bottom: 10px; } .lp-scad { font-size: 20px; font-weight: bold; margin-top: 20px; } body { padding: 0; background: white; } }
      `}</style>
    </div>
  );
}
export default Haccp;