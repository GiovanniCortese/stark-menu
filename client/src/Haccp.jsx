// client/src/Haccp.jsx - VERSIONE "INSTAGRAM STYLE" UI
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 

// --- ICONE SVG PER LA NAVIGAZIONE ---
const Icons = {
  Temp: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>,
  Box: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  Calendar: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Label: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  Settings: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
};

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
  const [downloadFormat, setDownloadFormat] = useState('excel'); 
  const [selectedMonth, setSelectedMonth] = useState('');

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
            method, headers: { 'Content-Type': 'application/json' },
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
          
          let statusClass = 'cal-cell'; 
          if (hasLogs || hasMerci) statusClass += hasError ? ' error' : ' success'; 

          grid.push(
            <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno })} 
                 className={statusClass}>
                  <div className="day-number">{d}</div>
                  <div className="day-dots">
                      {hasLogs && <span className="dot temp"></span>}
                      {hasMerci && <span className="dot merci"></span>}
                  </div>
            </div>
          );
      }
      return (
          <div className="calendar-container">
             <div className="cal-header">
                <button onClick={()=>cambiaMese(-1)} className="btn-icon">◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={()=>cambiaMese(1)} className="btn-icon">▶</button>
             </div>
             <div className="cal-grid">{grid}</div>
             {selectedDayLogs && (
                 <div className="cal-details animate-slide-up">
                     <h3 className="section-title">Dettagli {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h3>
                     
                     <div className="details-wrapper">
                         {/* COLONNA TEMPERATURE */}
                         <div className="detail-card">
                             <h4 className="text-success">🌡️ Temperature</h4>
                             {selectedDayLogs.logs.length === 0 ? <p className="text-muted">Nessuna registrazione.</p> : (
                                 <div className="log-list">
                                        {selectedDayLogs.logs.map(l => (
                                            <div key={l.id} className="log-item">
                                                <div className="log-time">{new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</div>
                                                <div className="log-info">
                                                    <strong>{l.nome_asset}</strong>
                                                    <span className={l.conformita ? "status-ok" : "status-err"}>
                                                        {l.valore}{l.valore !== 'OFF' && '°C'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                 </div>
                             )}
                         </div>

                         {/* COLONNA MERCI */}
                         <div className="detail-card">
                             <h4 className="text-warning">📦 Arrivo Merci</h4>
                             {selectedDayLogs.merci.length === 0 ? <p className="text-muted">Nessun arrivo.</p> : (
                                 <div className="log-list">
                                     {selectedDayLogs.merci.map(m => (
                                         <div key={m.id} className="log-item merci-item">
                                             <div className="merci-header">
                                                <strong>{m.prodotto}</strong>
                                                <small>{m.fornitore}</small>
                                             </div>
                                             <div className="merci-status">
                                                 {m.conforme ? <span className="badge-ok">OK</span> : <span className="badge-err">NO</span>}
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
      if (type === 'negativo') days = 180; // 6 mesi
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
    <div className="auth-screen">
        <div className="auth-card">
            <h1>🔒 Accesso HACCP</h1>
            <p>Inserisci la password della stazione</p>
            <form onSubmit={handleLogin}>
                <input type="password" placeholder="Password..." value={password} onChange={e=>setPassword(e.target.value)} />
                <button type="submit">Entra</button>
            </form>
        </div>
    </div>
  );

  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="app-container">
      {/* HEADER */}
      {!scanId && (
          <header className="app-header no-print">
              <div className="header-content">
                <div>
                    <h1>🛡️ HACCP Control</h1>
                    <p className="subtitle">{info.nome_ristorante || 'Gestione Sicurezza'}</p>
                </div>
                <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="btn-logout">Esci</button>
              </div>
              
              {/* Top Quick Actions (Downloads) */}
              <div className="quick-actions">
                  <span className="qa-label">Export Dati:</span>
                  <button onClick={()=>openDownloadModal('temperature')} className="btn-chip temp"><Icons.Download/> Temp</button>
                  <button onClick={()=>openDownloadModal('merci')} className="btn-chip merci"><Icons.Download/> Merci</button>
                  <button onClick={()=>openDownloadModal('assets')} className="btn-chip asset"><Icons.Download/> Asset</button>
              </div>
          </header>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`main-content ${scanId ? 'scan-mode' : ''}`}>
          
          {/* 1. TEMPERATURE TAB */}
          {tab === 'temperature' && (
              <div className="grid-cards">
                  {assetsToDisplay.map(asset => {
                      const todayLog = getTodayLog(asset.id);
                      const isInputActive = !!tempInput[asset.id];
                      const currentData = tempInput[asset.id] || {};
                      
                      // CARD: SPENTO
                      if(asset.stato === 'spento') {
                          return (
                              <div key={asset.id} className="card asset-card off">
                                  <div className="card-badge off">OFF</div>
                                  <h3>{asset.nome}</h3>
                                  <p className="card-sub">Macchinario Spento</p>
                              </div>
                          );
                      }

                      // CARD: COMPLETATO
                      if (todayLog && !isInputActive) {
                          const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                          return (
                              <div key={asset.id} className="card asset-card success animate-pop">
                                  <div className="card-header-row">
                                      <h3>{asset.nome}</h3>
                                      <div className="temp-display">{todayLog.valore === 'OFF' ? 'OFF' : `${todayLog.valore}°`}</div>
                                  </div>
                                  <div className="card-status-row">
                                      {todayLog.conformita ? 
                                          <span className="status-text ok">✅ Registrato alle {timeStr}</span> : 
                                          <span className="status-text err">⚠️ ANOMALIA</span>
                                      }
                                  </div>
                                  <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-edit">✏️ Modifica</button>
                              </div>
                          );
                      }
                      
                      // CARD: DA COMPILARE
                      return (
                          <div key={asset.id} className="card asset-card input-mode">
                               <div className="card-header-row">
                                    <div>
                                        <h3>{asset.nome}</h3>
                                        <span className="range-badge">{asset.range_min}° / {asset.range_max}°</span>
                                    </div>
                               </div>
                               
                               <div className="input-group-row">
                                  <input type="number" step="0.1" placeholder="°C" 
                                       className="big-input"
                                       value={currentData.val || ''} 
                                       onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                  />
                                  <div className="action-buttons-col">
                                      <label className={`btn-photo ${currentData.photo ? 'active' : ''}`}>
                                          📷 <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} hidden />
                                      </label>
                                      <button onClick={()=>registraTemperatura(asset, true)} className="btn-off">OFF</button>
                                  </div>
                               </div>
                               <button onClick={()=>registraTemperatura(asset, false)} className="btn-save-primary">SALVA REGISTRAZIONE</button>
                               {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel">Annulla</button>}
                          </div>
                      );
                  })}
              </div>
          )}

          {/* 2. MERCI TAB */}
          {tab === 'merci' && !scanId && (
              <div className="content-wrapper">
                  {/* FORM MERCI */}
                  <div className={`card form-card ${merciForm.id ? 'editing' : ''}`}>
                      <div className="card-header-simple">
                          <h3>{merciForm.id ? '✏️ Modifica Merce' : '📥 Nuovo Arrivo'}</h3>
                          {merciForm.id && <button onClick={resetMerciForm} className="btn-close">X</button>}
                      </div>
                      <form onSubmit={salvaMerci} className="merci-form">
                          <div className="form-row">
                              <div className="field half"><label>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required /></div>
                              <div className="field half"><label>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required placeholder="Es. Metro" /></div>
                          </div>
                          <div className="field"><label>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required placeholder="Es. Salmone Fresco" /></div>
                          
                          <div className="form-row">
                             <div className="field third"><label>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} /></div>
                             <div className="field third"><label>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} /></div>
                             <div className="field third"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} /></div>
                          </div>
                          
                          <div className="form-row">
                             <div className="field half"><label>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} /></div>
                             <div className="field half">
                                <label>Destinazione</label>
                                <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                                    <option value="">-- Seleziona --</option>
                                    {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                                </select>
                             </div>
                          </div>

                          <div className="field"><label>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} /></div>

                          <div className="checks-row">
                              <label className="checkbox-label"><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                              <label className="checkbox-label"><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                          </div>
                          
                          <div className="form-actions">
                            <label className={`btn-upload ${merciForm.allegato_url ? 'done' : ''}`}>
                                {uploadingMerci ? "..." : (merciForm.allegato_url ? "📎 Bolla OK" : "📎 Foto Bolla")}
                                <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} hidden />
                            </label>
                            <button className="btn-submit">{merciForm.id ? 'AGGIORNA' : 'REGISTRA'}</button>
                          </div>
                      </form>
                  </div>

                  {/* LISTA MERCI (MOBILE FRIENDLY) */}
                  <h3 className="section-title">📦 Ultimi Arrivi</h3>
                  <div className="merci-list">
                      {merci.map(m => (
                          <div key={m.id} className="card merci-item-card">
                              <div className="merci-card-top">
                                  <span className="merci-date">{new Date(m.data_ricezione).toLocaleDateString()}</span>
                                  <div className="merci-actions">
                                      {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon-sm">📎</a>}
                                      <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon-sm edit">✏️</button>
                                      <button onClick={()=>eliminaMerce(m.id)} className="btn-icon-sm del">🗑️</button>
                                  </div>
                              </div>
                              <div className="merci-main-info">
                                  <h4>{m.prodotto}</h4>
                                  <p>{m.fornitore}</p>
                              </div>
                              <div className="merci-details">
                                  <span>Qty: {m.quantita || '-'}</span>
                                  <span>Lotto: {m.lotto || '-'}</span>
                                  <span>Scad: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}</span>
                              </div>
                              <div className={`merci-status-bar ${m.conforme && m.integro ? 'ok' : 'ko'}`}>
                                  {m.conforme && m.integro ? 'CONFORME' : 'NON CONFORME'}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* 3. CALENDARIO */}
          {tab === 'calendario' && !scanId && renderCalendario()}

          {/* 4. ETICHETTE */}
          {tab === 'etichette' && !scanId && (
              <div className="content-wrapper">
                 <div className="card form-card">
                     <h3>Genera Etichetta Interna</h3>
                     <form onSubmit={handlePrintLabel} className="stack-form">
                        <div className="field"><label>Prodotto</label><input required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} placeholder="Es. Ragù" /></div>
                        <div className="field"><label>Tipo Conservazione</label>
                            <select value={labelData.tipo} onChange={handleLabelTypeChange}>
                                <option value="positivo">Positivo (+3°C)</option>
                                <option value="negativo">Negativo (-18°C)</option>
                                <option value="sottovuoto">Sottovuoto</option>
                            </select>
                        </div>
                        <div className="field"><label>Giorni Scadenza</label><input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} /></div>
                        <div className="field"><label>Operatore</label><input value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} placeholder="Nome" /></div>
                        <button className="btn-submit primary">STAMPA ETICHETTA</button>
                     </form>
                 </div>
                 
                 {lastLabel && <div className="card preview-label">
                     <h4>Anteprima Ultima Stampa</h4>
                     <div className="fake-label">
                         <div className="fl-head">{lastLabel.prodotto}</div>
                         <div className="fl-body">
                             <span>Prod: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span>
                             <span>Op: {lastLabel.operatore}</span>
                         </div>
                         <div className="fl-big">SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
                     </div>
                 </div>}
              </div>
          )}

          {/* 5. SETUP (MACCHINE) */}
          {tab === 'setup' && !scanId && (
              <div className="content-wrapper">
                  <div className="setup-header">
                      <h2>Macchinari</h2>
                      <button onClick={()=>apriModaleAsset()} className="btn-add">+ Aggiungi</button>
                  </div>
                  <div className="grid-cards">
                      {assets.map(a => (
                          <div key={a.id} className="card asset-setup-card">
                              <div className="asc-head">
                                  <strong>{a.nome}</strong> 
                                  <span className="badge-type">{a.tipo}</span>
                              </div>
                              <div className="asc-sub">SN: {a.serial_number || '-'}</div>
                              
                              <div className="asc-actions">
                                  <button onClick={()=>setShowQRModal(a)} className="btn-outline">QR Code</button>
                                  <button onClick={()=>apriModaleAsset(a)} className="btn-outline">Modifica</button>
                              </div>
                              
                              <div className="asc-links">
                                    <button onClick={() => a.foto_url && setPreviewImage(a.foto_url)} className={!a.foto_url ? 'disabled' : ''}>📸 Foto</button>
                                    <button onClick={() => a.etichetta_url && setPreviewImage(a.etichetta_url)} className={!a.etichetta_url ? 'disabled' : ''}>📄 Etichetta</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </main>

      {/* --- BOTTOM NAVIGATION BAR (FIXED) --- */}
      {!scanId && (
          <nav className="bottom-nav no-print">
              <button onClick={()=>setTab('temperature')} className={tab==='temperature' ? 'active' : ''}><Icons.Temp/><span>Temp</span></button>
              <button onClick={()=>setTab('merci')} className={tab==='merci' ? 'active' : ''}><Icons.Box/><span>Merci</span></button>
              <button onClick={()=>setTab('calendario')} className={tab==='calendario' ? 'active' : ''}><Icons.Calendar/><span>Diario</span></button>
              <button onClick={()=>setTab('etichette')} className={tab==='etichette' ? 'active' : ''}><Icons.Label/><span>Etichette</span></button>
              <button onClick={()=>setTab('setup')} className={tab==='setup' ? 'active' : ''}><Icons.Settings/><span>Setup</span></button>
          </nav>
      )}

      {/* --- MODALS & POPUPS --- */}
      
      {/* DOWNLOAD MODAL */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-card small">
                  <h3>Scarica Report</h3>
                  <p className="modal-sub">Scegli formato e periodo</p>
                  
                  <div className="format-selector">
                       <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel' ? 'active' : ''}>Excel</button>
                       <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf' ? 'active' : ''}>PDF</button>
                  </div>

                  <div className="range-list">
                      <div className="range-row-custom">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                          <button onClick={()=>executeDownload('custom-month')}>Scarica Mese</button>
                      </div>
                      <button onClick={()=>executeDownload('week')}>Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')}>Ultimi 30 Giorni</button>
                      <button onClick={()=>executeDownload('all')}>Tutto lo storico</button>
                  </div>
                  
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-text">Chiudi</button>
              </div>
          </div>
      )}

      {/* ASSET EDIT MODAL */}
      {showAssetModal && (
          <div className="modal-overlay">
             <div className="modal-card">
                <h3>{editingAsset ? 'Modifica Asset' : 'Nuovo Macchinario'}</h3>
                <form onSubmit={salvaAsset} className="stack-form">
                   <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo 1)" required />
                   <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}>
                       <option value="attivo">✅ ATTIVA</option>
                       <option value="spento">⛔ SPENTA</option>
                   </select>
                   <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})}>
                       <option value="frigo">Frigorifero</option><option value="cella">Cella Frigo</option><option value="vetrina">Vetrina</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino</option><option value="abbattitore">Abbattitore</option>
                   </select>
                   <div className="flex-row">
                       <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" />
                       <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" />
                   </div>
                   <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} placeholder="Marca" />
                   <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} placeholder="Modello" />
                   <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} placeholder="Serial Number" />

                   <div className="flex-row gap-10">
                        <label className={`btn-upload-small ${assetForm.foto_url ? 'ok' : ''}`}>
                            {uploadingAsset ? '...' : '📸 Foto'}
                            <input type="file" onChange={handleAssetPhoto} hidden />
                        </label>
                        <label className={`btn-upload-small ${assetForm.etichetta_url ? 'ok' : ''}`}>
                            {uploadingLabel ? '...' : '📄 Etichetta'}
                            <input type="file" onChange={handleAssetLabel} hidden />
                        </label>
                   </div>

                   <button className="btn-submit">SALVA</button>
                   <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-cancel">Annulla</button>
                </form>
             </div>
          </div>
      )}

      {/* QR MODAL */}
      {showQRModal && (
          <div className="modal-overlay">
              <div className="modal-card text-center">
                  <h3>{showQRModal.nome}</h3>
                  <div className="qr-wrapper">
                    <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={180} />
                  </div>
                  <div className="modal-actions">
                    <button onClick={executePrintQR} className="btn-submit">STAMPA</button>
                    <button onClick={()=>setShowQRModal(null)} className="btn-cancel">Chiudi</button>
                  </div>
              </div>
          </div>
      )}

      {/* IMAGE PREVIEW */}
      {previewImage && (
          <div className="modal-overlay dark" onClick={() => setPreviewImage(null)}>
              <img src={previewImage} alt="Anteprima" className="preview-img" />
              <button className="close-preview">X</button>
          </div>
      )}

      {/* PRINT AREAS (Hidden on screen) */}
      <div className="print-only">
          {printMode === 'label' && lastLabel && (
            <div className="print-label-box">
                <div className="pl-name">{lastLabel.prodotto}</div>
                <div className="pl-info"><span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span><span>OP: {lastLabel.operatore}</span></div>
                <div className="pl-scad"><small>SCADENZA</small><strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></div>
                <div className="pl-lot">Lotto: {lastLabel.lotto}</div>
            </div>
          )}
          {printMode === 'qr' && showQRModal && (
            <div className="print-qr-box">
                 <h1>{showQRModal.nome}</h1>
                 <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
                 <p>Scansiona per registrare</p>
            </div>
          )}
      </div>

      {/* --- STYLES (CSS IN JS) --- */}
      <style>{`
        /* RESET & FONTS */
        :root { --primary: #0f172a; --accent: #2563eb; --success: #10b981; --warning: #f59e0b; --danger: #ef4444; --bg: #f3f4f6; --card: #ffffff; --text: #334155; }
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
        
        /* LAYOUT */
        .app-container { min-height: 100vh; padding-bottom: 80px; /* Space for bottom nav */ position: relative; }
        .app-header { background: var(--card); padding: 15px 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 50; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .app-header h1 { margin: 0; font-size: 1.2rem; color: var(--primary); display: flex; align-items: center; gap: 8px; }
        .subtitle { margin: 0; font-size: 0.8rem; color: #94a3b8; }
        .main-content { padding: 20px; max-width: 800px; margin: 0 auto; }
        
        /* BOTTOM NAV (Instagram Style) */
        .bottom-nav { position: fixed; bottom: 0; left: 0; width: 100%; background: var(--card); border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 10px 0; z-index: 100; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
        .bottom-nav button { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 4px; color: #94a3b8; font-size: 10px; cursor: pointer; transition: color 0.2s; width: 100%; }
        .bottom-nav button svg { width: 24px; height: 24px; }
        .bottom-nav button.active { color: var(--primary); font-weight: 600; }
        .bottom-nav button.active svg { stroke: var(--primary); stroke-width: 2.5px; }

        /* CARDS GENERAL */
        .card { background: var(--card); border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; }
        .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .section-title { font-size: 1rem; color: #64748b; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }

        /* TEMPERATURE CARDS */
        .asset-card.off { opacity: 0.7; background: #e2e8f0; border: 2px dashed #94a3b8; }
        .card-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-bottom: 5px; }
        .card-badge.off { background: #64748b; color: white; }
        .asset-card h3 { margin: 0; font-size: 1.1rem; color: var(--primary); }
        .card-sub { font-size: 0.8rem; color: #64748b; margin: 4px 0 0 0; }
        
        .asset-card.success { border-left: 5px solid var(--success); background: #f0fdf4; }
        .card-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .temp-display { font-size: 1.8rem; font-weight: 800; color: var(--primary); }
        .status-text { font-size: 0.8rem; font-weight: 600; }
        .status-text.ok { color: var(--success); }
        .status-text.err { color: var(--danger); }
        
        .asset-card.input-mode { border-top: 4px solid #cbd5e1; }
        .range-badge { font-size: 0.75rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #64748b; }
        .input-group-row { display: flex; gap: 10px; margin: 15px 0; height: 50px; }
        .big-input { flex: 1; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1.5rem; text-align: center; font-weight: bold; color: var(--primary); outline: none; }
        .big-input:focus { border-color: var(--accent); }
        .action-buttons-col { display: flex; gap: 5px; }
        .btn-photo { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 50px; cursor: pointer; font-size: 1.2rem; }
        .btn-photo.active { background: #dcfce7; border-color: var(--success); }
        .btn-off { background: #94a3b8; color: white; border: none; border-radius: 8px; width: 50px; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
        
        .btn-save-primary { width: 100%; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 0.9rem; cursor: pointer; }
        .btn-edit { width: 100%; background: var(--warning); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; margin-top: 10px; cursor: pointer; }
        .btn-cancel { width: 100%; background: transparent; border: none; color: #94a3b8; margin-top: 5px; cursor: pointer; text-decoration: underline; }

        /* MERCI FORM & LIST */
        .form-card.editing { border: 2px solid var(--warning); }
        .card-header-simple { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .btn-close { background: #ef4444; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; }
        .merci-form { display: flex; flex-direction: column; gap: 12px; }
        .form-row { display: flex; gap: 10px; }
        .field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .field input, .field select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; outline: none; background: #f8fafc; }
        .field input:focus { border-color: var(--accent); background: white; }
        .checks-row { display: flex; gap: 15px; margin-top: 5px; }
        .checkbox-label { font-size: 0.9rem; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .form-actions { display: flex; gap: 10px; margin-top: 10px; }
        .btn-upload { flex: 1; border: 1px dashed #cbd5e1; color: #64748b; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.9rem; padding: 10px; background: #f8fafc; }
        .btn-upload.done { border-style: solid; border-color: var(--success); color: var(--success); background: #f0fdf4; }
        .btn-submit { flex: 2; background: var(--success); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        
        /* MERCI LIST CARD */
        .merci-item-card { border-left: 4px solid transparent; padding: 12px; }
        .merci-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
        .merci-date { font-size: 0.75rem; color: #94a3b8; }
        .merci-actions { display: flex; gap: 5px; }
        .btn-icon-sm { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; text-decoration: none; }
        .btn-icon-sm.edit { background: var(--warning); color: white; }
        .btn-icon-sm.del { background: var(--danger); color: white; }
        .merci-main-info h4 { margin: 0; font-size: 1rem; color: var(--primary); }
        .merci-main-info p { margin: 0; font-size: 0.85rem; color: #64748b; }
        .merci-details { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; font-size: 0.75rem; color: #475569; background: #f1f5f9; padding: 5px 8px; border-radius: 6px; }
        .merci-status-bar { margin-top: 8px; font-size: 0.7rem; font-weight: bold; text-align: center; padding: 2px; border-radius: 4px; }
        .merci-status-bar.ok { color: var(--success); background: #dcfce7; }
        .merci-status-bar.ko { color: var(--danger); background: #fee2e2; }

        /* QUICK ACTIONS HEADER */
        .quick-actions { display: flex; gap: 8px; align-items: center; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .qa-label { font-size: 0.7rem; color: #94a3b8; font-weight: bold; white-space: nowrap; }
        .btn-chip { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--text); }
        .btn-chip svg { width: 14px; height: 14px; }
        
        /* CALENDAR */
        .calendar-container { background: var(--card); border-radius: 16px; padding: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .cal-header h3 { margin: 0; font-size: 1rem; color: var(--primary); }
        .btn-icon { background: #f1f5f9; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; color: var(--primary); }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .cal-cell { aspect-ratio: 1; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative; }
        .cal-cell.empty { background: transparent; border: none; cursor: default; }
        .cal-cell.success { background: #dcfce7; border-color: var(--success); color: #065f46; }
        .cal-cell.error { background: #fee2e2; border-color: var(--danger); color: #991b1b; }
        .day-number { font-weight: bold; font-size: 0.9rem; }
        .day-dots { display: flex; gap: 2px; margin-top: 2px; }
        .dot { width: 4px; height: 4px; border-radius: 50%; }
        .dot.temp { background: var(--primary); }
        .dot.merci { background: var(--warning); }
        
        .cal-details { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        .details-wrapper { display: flex; flex-direction: column; gap: 15px; }
        .detail-card { background: #f8fafc; padding: 10px; border-radius: 10px; }
        .detail-card h4 { margin: 0 0 10px 0; font-size: 0.85rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .log-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid #eee; }
        .log-time { color: #64748b; font-size: 0.75rem; width: 50px; }
        .log-info { flex: 1; display: flex; justify-content: space-between; }
        .status-ok { color: var(--success); font-weight: bold; }
        .status-err { color: var(--danger); font-weight: bold; }
        .merci-header { display: flex; flex-direction: column; }
        .merci-header small { color: #64748b; }
        .badge-ok { background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }
        .badge-err { background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }

        /* SETUP & ASSETS */
        .setup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .btn-add { background: var(--success); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; }
        .asset-setup-card { border-left: 4px solid var(--primary); }
        .asc-head { display: flex; justify-content: space-between; font-size: 1rem; color: var(--primary); }
        .badge-type { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; color: #475569; }
        .asc-sub { font-size: 0.8rem; color: #94a3b8; margin: 4px 0 10px 0; }
        .asc-actions { display: flex; gap: 8px; margin-bottom: 10px; }
        .btn-outline { flex: 1; border: 1px solid #cbd5e1; background: white; padding: 6px; border-radius: 6px; cursor: pointer; color: var(--text); font-size: 0.85rem; }
        .asc-links { display: flex; gap: 15px; font-size: 0.85rem; border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .asc-links button { background: none; border: none; color: var(--accent); cursor: pointer; padding: 0; }
        .asc-links button.disabled { color: #cbd5e1; cursor: default; }

        /* MODALS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-overlay.dark { background: rgba(0,0,0,0.9); }
        .modal-card { background: white; width: 100%; max-width: 400px; padding: 24px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
        .modal-card.small { max-width: 320px; text-align: center; }
        .modal-card h3 { margin: 0 0 5px 0; color: var(--primary); font-size: 1.2rem; }
        .modal-sub { margin: 0 0 20px 0; color: #64748b; font-size: 0.9rem; }
        .format-selector { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; background: #f1f5f9; padding: 4px; border-radius: 25px; display: inline-flex; }
        .format-selector button { border: none; background: transparent; padding: 6px 16px; border-radius: 20px; cursor: pointer; color: #64748b; font-size: 0.9rem; }
        .format-selector button.active { background: white; color: var(--primary); font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .range-list { display: flex; flex-direction: column; gap: 8px; }
        .range-list button { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; cursor: pointer; text-align: left; font-weight: 500; color: var(--text); }
        .range-row-custom { display: flex; gap: 5px; }
        .range-row-custom input { flex: 1; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .range-row-custom button { background: var(--accent); color: white; border: none; }
        .btn-text { background: none; border: none; color: #94a3b8; margin-top: 15px; cursor: pointer; text-decoration: underline; }
        
        .preview-img { max-width: 100%; max-height: 80vh; border-radius: 8px; border: 2px solid white; }
        .close-preview { position: absolute; top: 20px; right: 20px; background: white; width: 40px; height: 40px; border-radius: 50%; border: none; font-weight: bold; cursor: pointer; }

        /* AUTH SCREEN */
        .auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
        .auth-card { background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 90%; max-width: 350px; }
        .auth-card h1 { color: var(--primary); font-size: 1.5rem; margin-bottom: 10px; }
        .auth-card input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 1rem; box-sizing: border-box; }
        .auth-card button { width: 100%; padding: 12px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer; }

        /* PRINT */
        .print-only { display: none; }
        @media print {
            .no-print { display: none !important; }
            .print-only { display: block; }
            .print-label-box { width: 58mm; height: 40mm; border: 1px solid black; padding: 2mm; box-sizing: border-box; font-family: Arial, sans-serif; display: flex; flex-direction: column; text-align: center; }
            .pl-name { font-weight: 900; font-size: 12pt; border-bottom: 2px solid black; text-transform: uppercase; margin-bottom: 2mm; }
            .pl-info { display: flex; justify-content: space-between; font-size: 7pt; }
            .pl-scad { margin-top: 3mm; }
            .pl-scad strong { display: block; font-size: 14pt; font-weight: 900; }
            .pl-lot { margin-top: auto; border-top: 1px solid black; font-size: 7pt; }
            
            .print-qr-box { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        }
      `}</style>
    </div>
  );
}

export default Haccp;