// client/src/Haccp.jsx - VERSIONE MOBILE FRIENDLY
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
            method, 
            headers: { 'Content-Type': 'application/json' },
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
      
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
      
      for (let d = 1; d <= days; d++) {
          const currentDayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
          const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === currentDayStr);
          const merciDelGiorno = merci.filter(m => new Date(m.data_ricezione).toDateString() === currentDayStr);

          const hasLogs = logsDelGiorno.length > 0;
          const hasMerci = merciDelGiorno.length > 0;
          const hasError = logsDelGiorno.some(l => !l.conformita) || merciDelGiorno.some(m => !m.conforme || !m.integro);
          
          let bgColor = 'white'; 
          if (hasLogs || hasMerci) bgColor = hasError ? '#ffcccc' : '#ccffcc'; 

          grid.push(
            <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno })} 
                 className="calendar-cell" style={{background: bgColor}}>
                  <div className="day-number">{d}</div>
                  <div className="day-badges">
                      {hasLogs && <div>🌡️ {logsDelGiorno.length}</div>}
                      {hasMerci && <div>📦 {merciDelGiorno.length}</div>}
                  </div>
            </div>
          );
      }
      return (
          <div className="calendar-wrapper">
             <div className="calendar-header">
                <button onClick={()=>cambiaMese(-1)}>◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={()=>cambiaMese(1)}>▶</button>
             </div>
             <div className="calendar-grid">{grid}</div>
             {selectedDayLogs && (
                 <div className="day-details">
                     <h2 style={{marginTop:0}}>Dettagli {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h2>
                     
                     <div className="details-columns">
                         {/* COLONNA TEMPERATURE */}
                         <div className="detail-col">
                             <h4 style={{marginTop:0, borderBottom:'2px solid #27ae60', color:'#27ae60'}}>🌡️ Temperature</h4>
                             {selectedDayLogs.logs.length === 0 ? <p style={{color:'#999'}}>Nessuna registrazione.</p> : (
                                 <table className="mobile-table">
                                     <thead><tr style={{textAlign:'left'}}><th>Ora</th><th>Macchina</th><th>°C</th><th>Stato</th></tr></thead>
                                     <tbody>
                                        {selectedDayLogs.logs.map(l => (
                                            <tr key={l.id}>
                                                <td data-label="Ora">{new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</td>
                                                <td data-label="Macchina"><strong>{l.nome_asset}</strong></td>
                                                <td data-label="Valore">{l.valore}</td>
                                                <td data-label="Stato">
                                                    {l.conformita 
                                                        ? <span style={{color:'green', fontWeight:'bold'}}>OK</span> 
                                                        : <span style={{color:'red', fontWeight:'bold'}}>❌ ERR - {l.azione_correttiva}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                     </tbody>
                                 </table>
                             )}
                         </div>

                         {/* COLONNA MERCI */}
                         <div className="detail-col">
                             <h4 style={{marginTop:0, borderBottom:'2px solid #f39c12', color:'#f39c12'}}>📦 Arrivo Merci</h4>
                             {selectedDayLogs.merci.length === 0 ? <p style={{color:'#999'}}>Nessun arrivo.</p> : (
                                 <div style={{display:'flex', flexDirection:'column', gap:10}}>
                                     {selectedDayLogs.merci.map(m => (
                                         <div key={m.id} className="merci-card">
                                             <div style={{fontWeight:'bold'}}>{m.prodotto}</div>
                                             <div style={{fontSize:12, color:'#555'}}>{m.fornitore} | Qty: {m.quantita}</div>
                                             <div style={{fontSize:12}}>Lotto: {m.lotto} | Scad: {new Date(m.scadenza).toLocaleDateString()}</div>
                                             <div style={{marginTop:5}}>
                                                 {m.conforme ? <span className="badge-ok">OK</span> : <span className="badge-ko">NO</span>}
                                                 {m.allegato_url && <a href={m.allegato_url} target="_blank" className="link-bolla">📎 Bolla</a>}
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
  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:50, textAlign:'center'}}><h1>🔒 Password Required</h1><form onSubmit={handleLogin}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /><button>Login</button></form></div>;
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container">
      
      {!scanId && (
          <div className="header-container no-print">
              <div><h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Control</h1></div>
              
              <div className="actions-wrapper">
                  {/* PULSANTI DOWNLOAD EXCEL */}
                  <div className="download-buttons">
                      <button onClick={()=>openDownloadModal('temperature')} className="btn-down btn-green">⬇ Temp</button>
                      <button onClick={()=>openDownloadModal('merci')} className="btn-down btn-orange">⬇ Merci</button>
                      <button onClick={()=>openDownloadModal('assets')} className="btn-down btn-blue">⬇ Macchine</button>
                  </div>

                  {/* NAVIGAZIONE SCORREVOLE */}
                  <div className="nav-scroller">
                      {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                          <button key={t} onClick={()=>setTab(t)} className={`nav-tab ${tab===t ? 'active' : ''}`}>
                            {t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Macchine' : t)}
                          </button>
                      ))}
                      <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="btn-logout">ESCI</button>
                  </div>
              </div>
          </div>
      )}

      {/* 1. TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="temp-grid no-print">
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  
                  if(asset.stato === 'spento') {
                      return (
                          <div key={asset.id} className="asset-card spento">
                              <div className="badge-off">OFF</div>
                              <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                              <p style={{margin:'5px 0', fontSize:12}}>Macchinario Spento</p>
                              <div className="status-bar off">NESSUNA RILEVAZIONE</div>
                          </div>
                      );
                  }

                  const isInputActive = !!tempInput[asset.id];
                  const currentData = tempInput[asset.id] || {};
                  
                  if (todayLog && !isInputActive) {
                      const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                      return (
                          <div key={asset.id} className="asset-card complete">
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                                  <span style={{fontSize:'24px', fontWeight:'bold'}}>{todayLog.valore === 'OFF' ? 'SPENTO' : todayLog.valore + '°C'}</span>
                              </div>
                              <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                                  {todayLog.conformita ? `Registrato alle ${timeStr}` : `⚠️ ANOMALIA - ${todayLog.azione_correttiva}`}
                              </div>
                              <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-edit-log">✏️ MODIFICA</button>
                          </div>
                      );
                  }
                  
                  return (
                      <div key={asset.id} className="asset-card input-mode">
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                                <div><h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3><span style={{fontSize:'11px', color:'#999'}}>{asset.marca}</span></div>
                                <span className="range-badge">Range: {asset.range_min}°/{asset.range_max}°</span>
                           </div>
                           
                           <div className="input-row-header">
                                <div style={{flex:1}}>TEMPERATURA</div>
                                <div style={{width:160, display:'flex', justifyContent:'space-between'}}>
                                    <span style={{width:50, textAlign:'center'}}>FOTO</span>
                                    <span style={{width:100, textAlign:'center'}}>AZIONE</span>
                                </div>
                           </div>

                           <div className="input-row">
                              <input type="number" step="0.1" placeholder="°C" 
                                   value={currentData.val || ''} 
                                   onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                   className="temp-input-field" 
                              />
                              
                              <div style={{display:'flex', gap:5}}>
                                  <button onClick={()=>registraTemperatura(asset, true)} title="Segna come SPENTO" className="btn-small-off">
                                      <span>OFF</span>
                                  </button>

                                  <label className={`btn-photo ${currentData.photo ? 'done' : ''}`}>
                                      <span style={{fontSize:'20px'}}>📷</span>
                                      <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                                  </label>
                                  
                                  <button onClick={()=>registraTemperatura(asset, false)} className="btn-save">SALVA</button>
                              </div>
                           </div>
                           {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel">Annulla Modifica</button>}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. MERCI */}
      {tab === 'merci' && !scanId && (
          <div className="no-print">
              <div className="merci-form-container" style={{borderLeft: merciForm.id ? '5px solid #f39c12' : '5px solid #27ae60'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                      <h3>{merciForm.id ? '✏️ Modifica Arrivo Merce' : '📥 Nuovo Arrivo'}</h3>
                      {merciForm.id && <button onClick={resetMerciForm} className="btn-cancel-red">Annulla Modifica</button>}
                  </div>
                  <form onSubmit={salvaMerci} className="merci-form-grid">
                      <div className="f-item"><label>Data Arrivo</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} required /></div>
                      <div className="f-item grow"><label>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} required /></div>
                      <div className="f-item grow"><label>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} required /></div>
                      <div className="f-item"><label>Quantità (KG/Colli)</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Es. 10kg" /></div>
                      <div className="f-item"><label>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} /></div>
                      <div className="f-item"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} /></div>
                      <div className="f-item small"><label>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} /></div>
                      
                      <div className="f-item"><label>Destinazione</label>
                        <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})}>
                            <option value="">-- Seleziona --</option>
                            {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                        </select>
                      </div>

                      <div className="f-item grow"><label>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} placeholder="Es. Fattura 42..." /></div>
                      
                      <div className="f-item photo">
                        <label className={`btn-upload ${merciForm.allegato_url ? 'done' : ''}`}>
                            {uploadingMerci ? "Caricamento..." : (merciForm.allegato_url ? "📎 Bolla Allegata" : "📎 Allega Bolla")}
                            <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                        </label>
                      </div>

                      <div className="f-item checks">
                          <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                          <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                      </div>
                      
                      <button className={`btn-submit ${merciForm.id ? 'edit' : 'new'}`}>
                          {merciForm.id ? 'AGGIORNA' : 'REGISTRA'}
                      </button>
                  </form>
              </div>

              <div className="merci-history-container">
                  <h3>📦 Storico Arrivi</h3>
                  <table className="mobile-table">
                      <thead>
                          <tr>
                              <th>Data</th>
                              <th>Fornitore / Prodotto</th>
                              <th>Dettagli</th>
                              <th>Stato</th>
                              <th>Azioni</th>
                          </tr>
                      </thead>
                      <tbody>
                          {merci.map(m => (
                              <tr key={m.id}>
                                  <td data-label="Data">{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                  <td data-label="Prodotto"><strong>{m.fornitore}</strong><br/>{m.prodotto}</td>
                                  <td data-label="Dettagli">
                                      Qty: {m.quantita || '-'} | Lotto: {m.lotto} <br/>
                                      Scad: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                                      {m.destinazione && <div className="sub-detail">📍 {m.destinazione}</div>}
                                      {m.note && <div className="sub-detail italic">Note: {m.note}</div>}
                                  </td>
                                  <td data-label="Stato">{m.conforme && m.integro ? <span className="txt-ok">OK</span> : <span className="txt-ko">NO</span>}</td>
                                  <td data-label="Azioni" className="actions-cell">
                                      {m.allegato_url && <a href={m.allegato_url} target="_blank" className="btn-icon blue">📎</a>}
                                      <button onClick={()=>iniziaModificaMerci(m)} className="btn-icon orange">✏️</button>
                                      <button onClick={()=>eliminaMerce(m.id)} className="btn-icon red">🗑️</button>
                                  </td>
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
          <div className="labels-container no-print">
             <div className="label-form">
                 <h3>Genera Etichetta Interna</h3>
                 <form onSubmit={handlePrintLabel}>
                    <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} />
                    <select value={labelData.tipo} onChange={handleLabelTypeChange}>
                        <option value="positivo">Positivo (+3°C) - 3gg</option>
                        <option value="negativo">Negativo (-18°C) - 180gg</option>
                        <option value="sottovuoto">Sottovuoto - 10gg</option>
                    </select>
                    <div style={{fontSize:12, color:'#666'}}>Giorni scadenza (Modificabile):</div>
                    <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} />
                    <input placeholder="Operatore" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} />
                    <button>STAMPA</button>
                 </form>
             </div>
             <div className="label-preview">
                 {lastLabel && <div className="preview-box">
                     <h2 style={{margin:'0 0 10px 0', borderBottom:'1px solid black'}}>{lastLabel.prodotto}</h2>
                     <div style={{display:'flex', justifyContent:'space-between'}}>
                        <span>📅 Prod: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span>
                        <span>👨‍🍳 {lastLabel.operatore}</span>
                     </div>
                     <div style={{marginTop:10, fontWeight:'bold', fontSize:18}}>
                        SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}
                     </div>
                     <div style={{marginTop:10, fontSize:12, color:'#555'}}>Lotto: {lastLabel.lotto}</div>
                 </div>}
             </div>
          </div>
      )}

      {/* 5. SETUP (MACCHINE) */}
      {tab === 'setup' && !scanId && (
          <div className="no-print">
              <div className="setup-header">
                  <h2>Macchinari</h2>
                  <button onClick={()=>apriModaleAsset()} className="btn-new-asset">+ Nuova Macchina</button>
              </div>
              <div className="assets-grid">
                  {assets.map(a => (
                      <div key={a.id} className="asset-setup-card">
                          <div style={{display:'flex', justifyContent:'space-between'}}>
                              <strong>{a.nome}</strong> 
                              <span style={{fontSize:12, color:'#666'}}>({a.tipo})</span>
                          </div>
                          <div style={{fontSize:12, color:'#7f8c8d', margin:'5px 0'}}>SN: {a.serial_number || '-'}</div>
                          
                          <div style={{marginTop:10, display:'flex', gap:5}}>
                              <button onClick={()=>setShowQRModal(a)} className="btn-setup qr">QR Code</button>
                              <button onClick={()=>apriModaleAsset(a)} className="btn-setup edit">Modifica</button>
                          </div>
                          
                          <div style={{marginTop:10, display:'flex', gap:10, fontSize:13}}>
                                {a.foto_url ? (
                                    <button onClick={() => setPreviewImage(a.foto_url)} className="link-preview blue">📸 Foto</button>
                                ) : <span style={{color:'#ccc'}}>📸 No Foto</span>}

                                {a.etichetta_url ? (
                                    <button onClick={() => setPreviewImage(a.etichetta_url)} className="link-preview orange">📄 Etichetta</button>
                                ) : <span style={{color:'#ccc'}}>📄 No Etich.</span>}
                          </div>
                      </div>
                  ))}
              </div>
              
              {/* MODALI */}
              {showQRModal && (
                  <div className="modal-overlay">
                      <div className="modal-box">
                          <h3>QR: {showQRModal.nome}</h3>
                          <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={150} />
                          <br/><br/><button onClick={executePrintQR}>STAMPA QR</button><button onClick={()=>setShowQRModal(null)} style={{marginLeft:10}}>CHIUDI</button>
                      </div>
                  </div>
              )}
              {showAssetModal && (
                  <div className="modal-overlay">
                     <div className="modal-box asset-form-box">
                        <h3 style={{marginTop:0}}>{editingAsset ? 'Modifica Asset' : 'Nuovo Asset'}</h3>
                        <form onSubmit={salvaAsset} className="asset-form-flex">
                           <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo 1)" required />
                           <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})}>
                               <option value="attivo">✅ ATTIVA (Accesa)</option>
                               <option value="spento">⛔ SPENTA (Non in uso)</option>
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
                           <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} placeholder="Numero Seriale" />

                           <div className="row-2 photo-upload">
                                <label className={assetForm.foto_url ? 'ok' : ''}>
                                    {uploadingAsset ? '...' : (assetForm.foto_url ? '✅ Foto OK' : '📸 Foto Frigo')}
                                    <input type="file" onChange={handleAssetPhoto} style={{display:'none'}} />
                                </label>
                                <label className={assetForm.etichetta_url ? 'ok' : ''}>
                                    {uploadingLabel ? '...' : (assetForm.etichetta_url ? '✅ Etic. OK' : '📄 Etic. Frigo')}
                                    <input type="file" onChange={handleAssetLabel} style={{display:'none'}} />
                                </label>
                           </div>

                           <button className="btn-save-asset">SALVA</button>
                           <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-cancel-asset">Annulla</button>
                        </form>
                     </div>
                  </div>
              )}
          </div>
      )}

      {/* --- MODALE DOWNLOAD --- */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-box download-box">
                  <h3 style={{marginTop:0}}>Scarica Report</h3>
                  <div className="format-selector">
                       <p>Formato:</p>
                       <div>
                           <button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button>
                           <button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'active-pdf':''}>PDF</button>
                       </div>
                  </div>
                  <p className="period-label">Seleziona il periodo:</p>
                  <div className="download-actions">
                      <div className="month-picker">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                          <button onClick={()=>executeDownload('custom-month')}>SCARICA</button>
                      </div>
                      <div className="divider"></div>
                      <button onClick={()=>executeDownload('week')}>Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')}>Ultimi 30 Giorni</button>
                      <button onClick={()=>executeDownload('all')}>Tutto lo storico</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-close-modal">Annulla</button>
              </div>
          </div>
      )}

      {previewImage && (
          <div onClick={() => setPreviewImage(null)} className="image-preview-overlay">
              <img src={previewImage} alt="Anteprima" />
              <button>X</button>
          </div>
      )}

      {/* --- PRINT AREA --- */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area label-print">
            <div className="lp-title">{lastLabel.prodotto}</div>
            <div className="lp-info"><span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span><span>OP: {lastLabel.operatore}</span></div>
            <div className="lp-scad"><div>SCADENZA</div><div className="date">{new Date(lastLabel.data_scadenza).toLocaleDateString()}</div></div>
            <div className="lp-footer">Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area qr-print">
             <h1>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
             <p>Scansiona per registrare la temperatura</p>
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