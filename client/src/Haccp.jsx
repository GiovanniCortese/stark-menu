// client/src/Haccp.jsx - V14 (PRO UI + FIX ERROR 500)
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

  // --- TEMPERATURE ---
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };
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

  // --- MERCI (FIX ERROR 500) ---
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
        
        // --- FIX CRUCIALE: CLEANUP DATI ---
        const payload = { ...merciForm, ristorante_id: info.id, operatore: 'Staff' };
        // Se la scadenza è stringa vuota, mandiamo null (Postgres odia le date vuote)
        if (!payload.scadenza) payload.scadenza = null;
        if (!payload.temperatura) payload.temperatura = null;
        if (!payload.quantita) payload.quantita = null;

        const res = await fetch(endpoint, {
            method, headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            resetMerciForm(); 
            ricaricaDati();
            alert("✅ Salvataggio riuscito!");
        } else {
            alert("❌ Errore Server: " + (data.error || "Sconosciuto"));
        }
      } catch (err) {
          alert("❌ Errore Connessione: " + err.message);
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

  // --- UI CALENDARIO ---
  const getDaysInMonth = (d) => { const y=d.getFullYear(),m=d.getMonth(); return { days:new Date(y,m+1,0).getDate(), emptySlots: new Date(y,m,1).getDay()===0?6:new Date(y,m,1).getDay()-1 }; };
  const renderCalendario = () => {
     const { days, emptySlots } = getDaysInMonth(currentDate);
     const grid = [];
     for (let i = 0; i < emptySlots; i++) grid.push(<div key={`e-${i}`} style={{background:'#f8fafc'}}></div>);
     for (let d = 1; d <= days; d++) {
         const dStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
         const lG = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === dStr);
         const mG = merci.filter(m => new Date(m.data_ricezione).toDateString() === dStr);
         const hasLogs=lG.length>0, hasMerci=mG.length>0, hasErr=lG.some(l=>!l.conformita)||mG.some(m=>!m.conforme||!m.integro);
         
         let bg = 'white';
         if(hasLogs||hasMerci) bg = hasErr ? '#fecaca' : '#d1fae5';

         grid.push(<div key={d} onClick={()=>setSelectedDayLogs({day:d,logs:lG,merci:mG})} style={{background: bg, border:'1px solid #e2e8f0', minHeight:60, padding:4, borderRadius:6, fontSize:12, cursor:'pointer'}}><div style={{fontWeight:'bold', color:'#334155'}}>{d}</div><div style={{display:'flex', gap:2, marginTop:2}}>{hasLogs&&<span>🌡️</span>}{hasMerci&&<span>📦</span>}</div></div>);
     }
     return <div className="card-container">
         <div style={{display:'flex',justifyContent:'space-between',marginBottom:15, alignItems:'center'}}>
             <button className="btn-secondary small" onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))}>◀</button>
             <b style={{fontSize:18, color:'#1e293b'}}>{currentDate.toLocaleString('it-IT',{month:'long',year:'numeric'})}</b>
             <button className="btn-secondary small" onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))}>▶</button>
         </div>
         <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>{grid}</div>
         {selectedDayLogs && <div style={{marginTop:20,borderTop:'1px solid #e2e8f0',paddingTop:15}}>
            <strong style={{color:'#0f172a', fontSize:16}}>Dettagli {selectedDayLogs.day}:</strong>
            <div style={{marginTop:10, display:'grid', gap:10}}>
                {selectedDayLogs.logs.map(l=><div key={l.id} className="log-item"><span>🌡️ <b>{l.nome_asset}</b></span> <span>{l.valore}°C ({l.conformita?'OK':'ERR'})</span></div>)}
                {selectedDayLogs.merci.map(m=><div key={m.id} className="log-item"><span>📦 <b>{m.fornitore}</b></span> <span>{m.prodotto}</span></div>)}
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

  if(!info) return <div className="loading-screen">Caricamento...</div>;
  if(!isAuthorized) return <div className="auth-screen"><h1>🔒 Accesso HACCP</h1><form onSubmit={handleLogin}><input type="password" placeholder="Password Reparto" value={password} onChange={e=>setPassword(e.target.value)} /><button>Entra</button></form></div>;
  
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-wrapper">
      
      {/* HEADER PROFESSIONALE */}
      {!scanId && (
          <div className="no-print app-header">
              <div className="brand">
                  <span className="icon">🛡️</span>
                  <h1>HACCP <small>Manager</small></h1>
              </div>
              <div className="actions">
                  <div className="dropdown">
                    <button className="btn-secondary" onClick={()=>openDownloadModal('temperature')}>📊 Report</button>
                  </div>
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="btn-logout">Esci</button>
              </div>
          </div>
      )}

      {/* NAVIGATION TABS (Bottom su mobile, Top su desktop) */}
      {!scanId && (
          <div className="no-print nav-tabs">
             {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                <button key={t} onClick={()=>setTab(t)} className={`tab-item ${tab===t?'active':''}`}>
                   <span className="tab-icon">{t==='temperature' ? '🌡️' : (t==='merci' ? '📦' : (t==='setup' ? '⚙️' : (t==='etichette'?'🏷️':'📅')))}</span>
                   <span className="tab-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </button>
             ))}
          </div>
      )}

      <div className="content-area">
        {/* 1. TEMPERATURE */}
        {tab === 'temperature' && (
            <div className="no-print grid-layout">
                {assetsToDisplay.map(asset => {
                    const todayLog = getTodayLog(asset.id);
                    const modified = isLogModifiedToday(asset.id);

                    if(asset.stato === 'spento') return (
                        <div key={asset.id} className="card asset-off">
                            <div className="card-status badge-gray">OFF</div>
                            <h3>{asset.nome}</h3>
                            <p>Macchinario Spento</p>
                        </div>
                    );

                    const isInputActive = !!tempInput[asset.id];
                    const currentData = tempInput[asset.id] || {};
                    
                    if (todayLog && !isInputActive) {
                        const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                        return (
                            <div key={asset.id} className="card asset-ok">
                                <div className="card-header">
                                    <h3>{asset.nome}</h3>
                                    <div className="temp-badge">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°C'}</div>
                                </div>
                                <div className="card-body">
                                    <div className={`status-text ${todayLog.conformita ? 'text-green' : 'text-red'}`}>
                                        {todayLog.conformita 
                                            ? (modified ? `✏️ Modificato: ${timeStr}` : `✅ Registrato: ${timeStr}`) 
                                            : `⚠️ ANOMALIA: ${todayLog.azione_correttiva}`}
                                    </div>
                                    <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-outline">Modifica</button>
                                </div>
                            </div>
                        );
                    }
                    
                    return (
                        <div key={asset.id} className="card asset-input">
                            <div className="card-header">
                                <h3>{asset.nome}</h3>
                                <span className="badge-light">{asset.range_min}° / {asset.range_max}°</span>
                            </div>
                            <div className="input-group">
                                <input type="number" step="0.1" placeholder="°C" 
                                    value={currentData.val || ''} 
                                    onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                />
                                <div className="input-actions">
                                    <button onClick={()=>registraTemperatura(asset, true)} className="btn-small btn-gray">OFF</button>
                                    <label className={`btn-small btn-icon ${currentData.photo ? 'btn-green' : 'btn-light'}`}>
                                        📷 <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                    </label>
                                    <button onClick={()=>registraTemperatura(asset, false)} className="btn-small btn-primary">SALVA</button>
                                </div>
                            </div>
                            {isInputActive && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-link">Annulla</button>}
                        </div>
                    );
                })}
            </div>
        )}

        {/* 2. MERCI */}
        {tab === 'merci' && !scanId && (
            <div className="no-print">
                <div className="card form-container">
                    <div className="card-header-simple">
                        <h3>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Nuovo Arrivo Merce'}</h3>
                        {merciForm.id && <button onClick={resetMerciForm} className="btn-link">Annulla</button>}
                    </div>
                    <form onSubmit={salvaMerci} className="modern-form">
                        <div className="form-row">
                            <div className="form-group"><label>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required /></div>
                            <div className="form-group grow"><label>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required placeholder="Es. Metro" /></div>
                            <div className="form-group grow"><label>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required placeholder="Es. Salmone" /></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Kg/Pz" /></div>
                            <div className="form-group"><label>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} placeholder="L-123" /></div>
                            <div className="form-group"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} /></div>
                            <div className="form-group small"><label>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} /></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Destinazione</label>
                                <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                                    <option value="">-- Seleziona --</option>
                                    {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                                </select>
                            </div>
                            <div className="form-group grow"><label>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} /></div>
                        </div>
                        <div className="form-footer">
                            <div className="checks">
                                <label className="check-label"><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                                <label className="check-label"><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                            </div>
                            <div className="actions">
                                <label className={`btn-secondary ${merciForm.allegato_url ? 'active' : ''}`}>
                                    {uploadingMerci ? "..." : (merciForm.allegato_url ? "📎 Bolla OK" : "📎 Allega Bolla")}
                                    <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} hidden />
                                </label>
                                <button className="btn-primary large">{merciForm.id ? 'Aggiorna' : 'Registra Arrivo'}</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="list-container">
                    <h3>📦 Ultimi Arrivi</h3>
                    <div className="responsive-table">
                        <div className="table-header">
                            <div>Data</div><div>Fornitore</div><div>Prodotto</div><div>Stato</div><div>Azioni</div>
                        </div>
                        {merci.map(m => (
                            <div key={m.id} className="table-row">
                                <div className="col-date">{new Date(m.data_ricezione).toLocaleDateString()}</div>
                                <div className="col-main"><b>{m.fornitore}</b></div>
                                <div className="col-desc">
                                    {m.prodotto}
                                    <span className="sub-info">Qty: {m.quantita} • Lotto: {m.lotto}</span>
                                </div>
                                <div className="col-status">
                                    {m.conforme && m.integro ? <span className="badge-green">OK</span> : <span className="badge-red">NO</span>}
                                </div>
                                <div className="col-actions">
                                    {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon">📎</a>}
                                    <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon">✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} className="btn-icon danger">🗑️</button>
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
            <div className="no-print grid-layout two-col">
                <div className="card">
                    <h3>Genera Etichetta</h3>
                    <form onSubmit={handlePrintLabel} className="modern-form">
                        <div className="form-group"><label>Prodotto</label><input required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} placeholder="Nome prodotto" /></div>
                        <div className="form-group"><label>Tipo Conservazione</label>
                            <select value={labelData.tipo} onChange={e=>{
                                let d=3; if(e.target.value==='negativo')d=180; if(e.target.value==='sottovuoto')d=10;
                                setLabelData({...labelData, tipo:e.target.value, giorni_scadenza:d});
                            }}>
                                <option value="positivo">Positivo (+3°C)</option>
                                <option value="negativo">Negativo (-18°C)</option>
                                <option value="sottovuoto">Sottovuoto</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Giorni Scad.</label><input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} /></div>
                            <div className="form-group"><label>Operatore</label><input value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} /></div>
                        </div>
                        <button className="btn-primary full">STAMPA</button>
                    </form>
                </div>
            </div>
        )}

        {/* 5. SETUP */}
        {tab === 'setup' && !scanId && (
            <div className="no-print">
                <div className="flex-header">
                    <h2>Macchinari</h2>
                    <button onClick={()=>apriModaleAsset()} className="btn-primary small">+ Aggiungi</button>
                </div>
                <div className="grid-layout">
                    {assets.map(a => (
                        <div key={a.id} className="card asset-setup">
                            <div className="setup-header">
                                <strong>{a.nome}</strong> 
                                <span className="type-badge">{a.tipo}</span>
                            </div>
                            <div className="setup-body">
                                <p>SN: {a.serial_number || '-'}</p>
                                <div className="setup-actions">
                                    <button onClick={()=>setShowQRModal(a)} className="btn-secondary small">QR</button>
                                    <button onClick={()=>apriModaleAsset(a)} className="btn-outline small">Edit</button>
                                </div>
                                <div className="setup-links">
                                    {a.foto_url && <span onClick={() => setPreviewImage(a.foto_url)}>📷 Foto</span>}
                                    {a.etichetta_url && <span onClick={() => setPreviewImage(a.etichetta_url)}>📄 Etichetta</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Modal Setup */}
                {showAssetModal && (
                  <div className="modal-overlay">
                     <div className="modal-card">
                        <h3>{editingAsset ? 'Modifica' : 'Nuovo'} Asset</h3>
                        <form onSubmit={salvaAsset} className="modern-form">
                           <div className="form-group"><label>Nome</label><input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} required /></div>
                           <div className="form-row">
                               <div className="form-group"><label>Stato</label><select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}><option value="attivo">Attivo</option><option value="spento">Spento</option></select></div>
                               <div className="form-group"><label>Tipo</label><select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})}><option value="frigo">Frigo</option><option value="cella">Cella</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino</option></select></div>
                           </div>
                           <div className="form-row">
                               <div className="form-group"><label>Min °C</label><input value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} /></div>
                               <div className="form-group"><label>Max °C</label><input value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} /></div>
                           </div>
                           <div className="modal-actions">
                               <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-link">Annulla</button>
                               <button className="btn-primary">Salva</button>
                           </div>
                        </form>
                     </div>
                  </div>
                )}
            </div>
        )}
      </div>

      {/* MODALS HELPERS */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-card small">
                  <h3>Scarica Report</h3>
                  <div className="tab-switch">
                      <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button>
                      <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'active':''}>PDF</button>
                  </div>
                  <div className="download-list">
                      <div className="dl-item"><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /><button onClick={()=>executeDownload('custom-month')}>Scarica Mese</button></div>
                      <button className="dl-btn" onClick={()=>executeDownload('week')}>Ultima Settimana</button>
                      <button className="dl-btn" onClick={()=>executeDownload('month')}>Ultimi 30 Giorni</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-link center">Chiudi</button>
              </div>
          </div>
      )}
      {previewImage && <div className="modal-overlay" onClick={()=>setPreviewImage(null)}><img src={previewImage} className="preview-img" /><button className="close-preview">✕</button></div>}
      {showQRModal && <div className="modal-overlay"><div className="modal-card center"><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={200} /><div style={{marginTop:20}}><button className="btn-primary" onClick={()=>window.print()}>Stampa</button><button className="btn-link" onClick={()=>setShowQRModal(null)}>Chiudi</button></div></div></div>}

      {/* --- CSS STYLE BLOCK (PROFESSIONAL THEME) --- */}
      <style>{`
        :root {
            --primary: #2563eb; --primary-dark: #1e40af;
            --secondary: #64748b; --bg: #f1f5f9; --surface: #ffffff;
            --text: #0f172a; --text-light: #64748b;
            --success: #10b981; --danger: #ef4444; --warning: #f59e0b;
            --radius: 12px; --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        .haccp-wrapper { background: var(--bg); min-height: 100vh; padding-bottom: 80px; color: var(--text); }
        
        /* HEADER */
        .app-header { background: var(--surface); padding: 15px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand h1 { font-size: 20px; margin: 0; font-weight: 700; color: var(--text); }
        .brand h1 small { color: var(--text-light); font-weight: 400; font-size: 14px; }
        .actions { display: flex; gap: 10px; }
        
        /* TABS - MOBILE BOTTOM BAR */
        .nav-tabs { position: fixed; bottom: 0; left: 0; width: 100%; background: var(--surface); display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid #e2e8f0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05); }
        .tab-item { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-light); font-size: 10px; cursor: pointer; flex: 1; }
        .tab-item.active { color: var(--primary); }
        .tab-icon { font-size: 20px; }
        
        /* CONTENT */
        .content-area { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .two-col { grid-template-columns: 1fr 1fr; }
        
        /* CARDS */
        .card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; transition: transform 0.2s; border: 1px solid #f0f0f0; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
        
        /* ASSETS STATUS */
        .asset-off { opacity: 0.7; border: 2px dashed #cbd5e1; box-shadow: none; }
        .asset-ok { border-left: 5px solid var(--success); }
        .asset-input { border-left: 5px solid var(--primary); }
        .temp-badge { font-size: 24px; font-weight: 700; color: var(--text); }
        .status-text { font-size: 13px; margin-bottom: 15px; font-weight: 500; }
        .text-green { color: var(--success); } .text-red { color: var(--danger); }
        
        /* INPUTS */
        .input-group { display: flex; flex-direction: column; gap: 10px; }
        .input-group input { font-size: 24px; text-align: center; padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-weight: 600; color: var(--primary); }
        .input-group input:focus { border-color: var(--primary); outline: none; }
        .input-actions { display: flex; gap: 8px; }
        
        /* BUTTONS */
        button, .btn-icon { cursor: pointer; transition: 0.2s; font-family: inherit; }
        .btn-primary { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; }
        .btn-primary:hover { background: var(--primary-dark); }
        .btn-secondary { background: #e2e8f0; color: var(--text); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; }
        .btn-logout { background: #fee2e2; color: var(--danger); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; }
        .btn-small { flex: 1; padding: 8px; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; }
        .btn-gray { background: #f1f5f9; color: var(--text-light); }
        .btn-green { background: #d1fae5; color: var(--success); border: 1px solid var(--success); }
        .btn-light { background: #f8fafc; border: 1px solid #e2e8f0; }
        .btn-link { background: none; border: none; color: var(--text-light); text-decoration: underline; font-size: 13px; }
        .btn-outline { background: none; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; color: var(--text); font-size: 12px; width: 100%; }

        /* FORMS */
        .modern-form { display: flex; flex-direction: column; gap: 15px; }
        .form-row { display: flex; gap: 15px; flex-wrap: wrap; }
        .form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 120px; }
        .form-group.grow { flex: 2; }
        .form-group.small { max-width: 100px; }
        .form-group label { font-size: 12px; font-weight: 600; color: var(--text-light); text-transform: uppercase; }
        .form-group input, .form-group select { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; }
        .form-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 15px; flex-wrap: wrap; gap: 10px; }
        .checks { display: flex; gap: 15px; }
        
        /* TABLE RESPONSIVE */
        .responsive-table { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .table-header { display: grid; grid-template-columns: 1fr 1.5fr 2fr 0.5fr 0.8fr; font-size: 12px; font-weight: 600; color: var(--text-light); padding: 0 10px; margin-bottom: 5px; }
        .table-row { background: var(--surface); padding: 15px; border-radius: 8px; display: grid; grid-template-columns: 1fr 1.5fr 2fr 0.5fr 0.8fr; align-items: center; border: 1px solid #f1f5f9; font-size: 14px; gap: 10px; }
        .sub-info { display: block; font-size: 11px; color: var(--text-light); margin-top: 2px; }
        .badge-green { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .badge-red { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .col-actions { display: flex; gap: 5px; justify-content: flex-end; }
        .btn-icon { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .btn-icon.danger { color: var(--danger); background: #fef2f2; }

        /* MODALS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 200; backdrop-filter: blur(2px); }
        .modal-card { background: var(--surface); padding: 25px; border-radius: 16px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-card h3 { margin-top: 0; }
        .preview-img { max-width: 90%; max-height: 80vh; border-radius: 8px; }
        .close-preview { position: absolute; top: 20px; right: 20px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-weight: bold; }
        
        /* UTILS */
        .loading-screen, .auth-screen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg); color: var(--text); gap: 20px; }
        .auth-screen input { padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; width: 250px; text-align: center; }
        .no-print { }

        @media (max-width: 768px) {
            .table-header { display: none; }
            .table-row { grid-template-columns: 1fr; gap: 5px; }
            .col-actions { justify-content: flex-start; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            .nav-tabs { padding-bottom: 20px; } /* Space for iPhone home bar */
            .app-header .brand h1 { font-size: 18px; }
            .content-area { padding-bottom: 100px; }
        }
        @media print { .no-print { display: none !important; } .haccp-wrapper { background: white; } .card { box-shadow: none; border: 1px solid #000; } }
      `}</style>
    </div>
  );
}

export default Haccp;