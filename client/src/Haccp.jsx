// client/src/Haccp.jsx - PARTE 1
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

  // Stati Anteprima Immagine
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
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(data => setInfo(data));
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
          rangeName = `Mese ${selectedMonth}`;
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
              azione = prompt(`⚠️ Temp ${val}°C fuori range. Descrivi azione correttiva:`, "");
              if(!azione) return alert("Azione correttiva obbligatoria!");
          }
          val = val.toString();
      } else {
          val = "OFF"; conforme = true; azione = "Macchinario spento";
      }
      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val, conformita: conforme, azione_correttiva: azione, foto_prova_url: (tempInput[asset.id] || {}).photo || ''
          })
      });
      setTempInput(prev => { const n = {...prev}; delete n[asset.id]; return n; }); 
      ricaricaDati(); if(scanId) navigate(`/haccp/${slug}`); 
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
        if (!payload.scadenza) payload.scadenza = null;
        if (!payload.temperatura) payload.temperatura = null;
        if (!payload.quantita) payload.quantita = null;
        const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if ((await res.json()).success) { resetMerciForm(); ricaricaDati(); alert("✅ Salvato!"); } else alert("Errore");
      } catch (err) { alert("Errore Connessione"); }
  };
  const resetMerciForm = () => {
      setMerciForm({ id: null, data_ricezione: new Date().toISOString().split('T')[0], fornitore: '', prodotto: '', lotto: '', scadenza: '', temperatura: '', conforme: true, integro: true, note: '', quantita: '', allegato_url: '', destinazione: '' });
  };
  const iniziaModificaMerci = (m) => {
      setMerciForm({ ...m, data_ricezione: m.data_ricezione.split('T')[0], scadenza: m.scadenza ? m.scadenza.split('T')[0] : '' });
      window.scrollTo(0,0);
  };
  const eliminaMerce = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'}); ricaricaDati(); } };

  // --- ASSETS ---
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
  const handleAssetPhoto = async (e) => { const f = e.target.files[0]; if(f) { setUploadingAsset(true); const url=await uploadFile(f); setAssetForm(p=>({...p, foto_url:url})); setUploadingAsset(false); }};
  const handleAssetLabel = async (e) => { const f = e.target.files[0]; if(f) { setUploadingLabel(true); const url=await uploadFile(f); setAssetForm(p=>({...p, etichetta_url:url})); setUploadingLabel(false); }};

  // --- CALENDARIO ---
  const getDaysInMonth = (date) => { 
    const year = date.getFullYear(), month = date.getMonth();
    return { days: new Date(year, month + 1, 0).getDate(), emptySlots: (new Date(year, month, 1).getDay() || 7) - 1 };
  };
  const renderCalendario = () => {
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = [];
      const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`e-${i}`} className="cal-cell empty"></div>);
      for (let d = 1; d <= days; d++) {
          const dayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
          const logsG = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === dayStr);
          const merciG = merci.filter(m => new Date(m.data_ricezione).toDateString() === dayStr);
          const hasErr = logsG.some(l=>!l.conformita) || merciG.some(m=>!m.conforme || !m.integro);
          const hasData = logsG.length>0 || merciG.length>0;
          
          grid.push(
            <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsG, merci: merciG })} className={`cal-cell ${hasData ? (hasErr ? 'err' : 'ok') : ''}`}>
               <span className="day-n">{d}</span>
               <div className="dots">{logsG.length>0 && <span className="d-temp"/>}{merciG.length>0 && <span className="d-merci"/>}</div>
            </div>
          );
      }
      return (
          <div className="calendar-wrap">
             <div className="cal-header">
                <button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))}>◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={()=>setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))}>▶</button>
             </div>
             <div className="cal-grid"><div className="hd">Lun</div><div className="hd">Mar</div><div className="hd">Mer</div><div className="hd">Gio</div><div className="hd">Ven</div><div className="hd">Sab</div><div className="hd">Dom</div>{grid}</div>
             {selectedDayLogs && (
                 <div className="day-detail-panel">
                     <h3>📅 {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h3>
                     <div className="detail-cols">
                        <div className="col">
                            <h4>🌡️ Temperature</h4>
                            {selectedDayLogs.logs.map(l=><div key={l.id} className="item-row"><span>{new Date(l.data_ora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><strong>{l.nome_asset}</strong><span>{l.valore}°</span>{l.conformita?<span className="badge ok">OK</span>:<span className="badge err">ERR</span>}</div>)}
                        </div>
                        <div className="col">
                            <h4>📦 Merci</h4>
                            {selectedDayLogs.merci.map(m=><div key={m.id} className="item-card"><strong>{m.prodotto}</strong><small>{m.fornitore}</small><div>{m.conforme?<span className="badge ok">OK</span>:<span className="badge err">NO</span>}</div></div>)}
                        </div>
                     </div>
                 </div>
             )}
          </div>
      );
  };

  // --- LABEL ---
  const handlePrintLabel = async (e) => { e.preventDefault(); const s=new Date(); s.setDate(s.getDate()+parseInt(labelData.giorni_scadenza)); const r=await fetch(`${API_URL}/api/haccp/labels`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...labelData, ristorante_id:info.id, data_scadenza:s})}); const d=await r.json(); if(d.success){ setLastLabel(d.label); setPrintMode('label'); setTimeout(()=>window.print(),500); }};

  if(!info) return <div className="loading">Caricamento...</div>;
  if(!isAuthorized) return <div className="auth-box"><h1>🔐 Accesso HACCP</h1><form onSubmit={handleLogin}><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button>ENTRA</button></form></div>;
  const assetsDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="app-container">
      <StyleInjector />
      {!scanId && (
          <header className="app-header no-print">
              <div className="top-bar">
                  <h1>🛡️ HACCP <span>Pro</span></h1>
                  <div className="actions">
                     <div className="dropdown">
                        <button className="btn-ghost">📥 Export</button>
                        <div className="dd-menu"><div onClick={()=>openDownloadModal('temperature')}>Temperature</div><div onClick={()=>openDownloadModal('merci')}>Merci</div><div onClick={()=>openDownloadModal('assets')}>Macchine</div></div>
                     </div>
                     <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="btn-ghost danger">Esci</button>
                  </div>
              </div>
              <nav className="tabs">
                  {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} className={tab===t ? 'active' : ''}>
                        {t==='temperature' ? '🌡️ Temp' : (t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Asset' : t))}
                      </button>
                  ))}
              </nav>
          </header>
      )}

      <main className="content-area">
          {/* TAB: TEMPERATURE */}
          {tab === 'temperature' && (
              <div className="temp-grid">
                  {assetsDisplay.map(asset => {
                      const todayLog = getTodayLog(asset.id);
                      const isInput = !!tempInput[asset.id];
                      const data = tempInput[asset.id] || {};
                      
                      if(asset.stato === 'spento') return (
                          <div key={asset.id} className="card asset-card off">
                              <div className="head"><h3>{asset.nome}</h3><span className="tag">SPENTO</span></div>
                              <p>Macchinario non in uso</p>
                          </div>
                      );

                      if(todayLog && !isInput) return (
                          <div key={asset.id} className={`card asset-card ${todayLog.conformita ? 'ok' : 'alert'}`}>
                              <div className="head">
                                  <h3>{asset.nome}</h3>
                                  <div className="big-val">{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°'}</div>
                              </div>
                              <div className="meta">
                                  <span>{new Date(todayLog.data_ora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                  {todayLog.conformita ? <span className="badge ok">✅ REGOLARE</span> : <span className="badge err">⚠️ ANOMALIA</span>}
                              </div>
                              {!todayLog.conformita && <div className="alert-msg"><strong>Azione:</strong> {todayLog.azione_correttiva}</div>}
                              <button onClick={()=>abilitaNuovaMisurazione(asset)} className="btn-edit">✏️ Modifica</button>
                          </div>
                      );

                      return (
                          <div key={asset.id} className="card asset-card input-mode">
                              <div className="head">
                                  <div><h3>{asset.nome}</h3><small>{asset.marca} {asset.modello}</small></div>
                                  <span className="range">Min: <b>{asset.range_min}°</b> Max: <b>{asset.range_max}°</b></span>
                              </div>
                              <div className="input-row">
                                  <input type="number" step="0.1" placeholder="°C" value={data.val || ''} onChange={e=>setTempInput({...tempInput, [asset.id]: {...data, val: e.target.value}})} />
                                  <div className="btns">
                                      <button onClick={()=>registraTemperatura(asset, true)} className="btn-grey">OFF</button>
                                      <label className={`btn-icon ${data.photo?'has-file':''}`}>📷<input type="file" onChange={e=>handleLogPhoto(e,asset.id)} hidden/></label>
                                      <button onClick={()=>registraTemperatura(asset, false)} className="btn-save">SALVA</button>
                                  </div>
                              </div>
                              {isInput && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n)}} className="btn-cancel">Annulla</button>}
                          </div>
                      );
                  })}
              </div>
          )}

          {/* TAB: MERCI */}
          {tab === 'merci' && !scanId && (
              <div className="merci-layout no-print">
                  <div className="card form-card">
                      <div className="card-head"><h3>{merciForm.id?'✏️ Modifica':'📥 Nuovo Arrivo'}</h3>{merciForm.id && <button onClick={resetMerciForm}>Annulla</button>}</div>
                      <form onSubmit={salvaMerci} className="grid-form">
                          <div className="f-grp"><label>Data Ricezione</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm,data_ricezione:e.target.value})} required/></div>
                          <div className="f-grp span-2"><label>Fornitore</label><input placeholder="Es. Metro" value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm,fornitore:e.target.value})} required/></div>
                          <div className="f-grp span-2"><label>Prodotto</label><input placeholder="Es. Mozzarella" value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm,prodotto:e.target.value})} required/></div>
                          <div className="f-grp"><label>Quantità</label><input placeholder="KG / Colli" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm,quantita:e.target.value})}/></div>
                          <div className="f-grp"><label>Lotto</label><input placeholder="Codice Lotto" value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm,lotto:e.target.value})}/></div>
                          <div className="f-grp"><label>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm,scadenza:e.target.value})}/></div>
                          <div className="f-grp"><label>Temp. Arrivo (°C)</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm,temperatura:e.target.value})}/></div>
                          <div className="f-grp span-2"><label>Destinazione Stoccaggio</label><select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm,destinazione:e.target.value})}><option value="">-- Seleziona --</option>{assets.map(a=><option key={a.id} value={a.nome}>{a.nome}</option>)}</select></div>
                          <div className="f-grp span-2"><label>Note</label><input placeholder="Es. Imballo rovinato..." value={merciForm.note} onChange={e=>setMerciForm({...merciForm,note:e.target.value})}/></div>
                          <div className="f-actions span-2">
                             <div className="checks"><label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm,conforme:e.target.checked})}/> Conforme</label><label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm,integro:e.target.checked})}/> Integro</label></div>
                             <label className={`btn-file ${merciForm.allegato_url?'ok':''}`}>{uploadingMerci?'...':(merciForm.allegato_url?'📎 Bolla OK':'📎 Allega Bolla')}<input type="file" onChange={handleMerciPhoto} hidden/></label>
                             <button className="btn-primary">{merciForm.id?'AGGIORNA':'REGISTRA'}</button>
                          </div>
                      </form>
                  </div>

                  <div className="history-list">
                      <h3>📦 Storico Recente</h3>
                      {merci.map(m => (
                          <div key={m.id} className="card history-item">
                              <div className="hi-top">
                                  <span className="date">{new Date(m.data_ricezione).toLocaleDateString()}</span>
                                  <div className="actions">
                                      {m.allegato_url && <a href={m.allegato_url} target="_blank">📎</a>}
                                      <button onClick={()=>iniziaModificaMerci(m)}>✏️</button>
                                      <button className="del" onClick={()=>eliminaMerce(m.id)}>🗑️</button>
                                  </div>
                              </div>
                              <div className="hi-main"><strong>{m.prodotto}</strong> <span className="supp">({m.fornitore})</span></div>
                              <div className="hi-grid">
                                  <div><span>Qty:</span> {m.quantita||'-'}</div>
                                  <div><span>Lotto:</span> {m.lotto||'-'}</div>
                                  <div><span>Scad:</span> {m.scadenza?new Date(m.scadenza).toLocaleDateString():'-'}</div>
                                  <div><span>Temp:</span> {m.temperatura ? m.temperatura+'°' : '-'}</div>
                                  <div className="span-2"><span>Dest:</span> {m.destinazione||'N/D'}</div>
                              </div>
                              {m.note && <div className="hi-note">📝 {m.note}</div>}
                              <div className="hi-status">
                                  {m.conforme && m.integro ? <span className="badge ok">✅ OK</span> : <span className="badge err">⛔ NON CONFORME</span>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAB: CALENDARIO */}
          {tab === 'calendario' && !scanId && renderCalendario()}

          {/* TAB: ETICHETTE */}
          {tab === 'etichette' && !scanId && (
             <div className="labels-wrap no-print">
                 <div className="card form-card">
                     <h3>Stampa Etichetta</h3>
                     <div className="grid-form">
                         <div className="f-grp"><label>Prodotto</label><input value={labelData.prodotto} onChange={e=>setLabelData({...labelData,prodotto:e.target.value})}/></div>
                         <div className="f-grp"><label>Tipo</label><select value={labelData.tipo} onChange={e=>{const v=e.target.value; setLabelData({...labelData,tipo:v,giorni_scadenza:v==='negativo'?180:(v==='sottovuoto'?10:3)})}}><option value="positivo">Positivo (+3gg)</option><option value="negativo">Negativo (+180gg)</option><option value="sottovuoto">Sottovuoto (+10gg)</option></select></div>
                         <div className="f-grp"><label>Giorni</label><input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData,giorni_scadenza:e.target.value})}/></div>
                         <div className="f-grp"><label>Operatore</label><input value={labelData.operatore} onChange={e=>setLabelData({...labelData,operatore:e.target.value})}/></div>
                         <button onClick={handlePrintLabel} className="btn-primary mt-2">STAMPA</button>
                     </div>
                 </div>
                 <div className="preview-box">{lastLabel && <div className="lbl-mock"><h4>{lastLabel.prodotto}</h4><p>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</p></div>}</div>
             </div>
          )}

          {/* TAB: SETUP */}
          {tab === 'setup' && !scanId && (
              <div className="setup-wrap no-print">
                  <div className="head-row"><h2>Macchinari</h2><button onClick={()=>apriModaleAsset()} className="btn-primary">+ Aggiungi</button></div>
                  <div className="asset-list">
                      {assets.map(a => (
                          <div key={a.id} className="card asset-row">
                              <div className="ar-info">
                                  <h4>{a.nome} <small>({a.tipo})</small></h4>
                                  <div className="ar-meta">SN: {a.serial_number||'-'} | {a.marca} {a.modello}</div>
                                  <div className="ar-links">
                                      {a.foto_url && <span onClick={()=>setPreviewImage(a.foto_url)}>📸 Foto</span>}
                                      {a.etichetta_url && <span onClick={()=>setPreviewImage(a.etichetta_url)}>📄 Etichetta</span>}
                                  </div>
                              </div>
                              <div className="ar-actions">
                                  <button onClick={()=>setShowQRModal(a)}>QR</button>
                                  <button onClick={()=>apriModaleAsset(a)}>Edit</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </main>

      {/* --- CONTINUA NELLA PARTE 2 --- */}
      // client/src/Haccp.jsx - PARTE 2

      {/* MODALI & POPUP */}
      {showDownloadModal && (
          <div className="modal-backdrop">
              <div className="modal-box">
                  <h3>Scarica Report</h3>
                  <div className="dl-opts">
                      <div className="fmt-sw"><button onClick={()=>setDownloadFormat('excel')} className={downloadFormat==='excel'?'active':''}>Excel</button><button onClick={()=>setDownloadFormat('pdf')} className={downloadFormat==='pdf'?'active':''}>PDF</button></div>
                      <div className="row"><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} /><button onClick={()=>executeDownload('custom-month')}>Mese</button></div>
                      <button onClick={()=>executeDownload('week')}>Settimana</button>
                      <button onClick={()=>executeDownload('month')}>Ultimi 30gg</button>
                      <button onClick={()=>executeDownload('all')}>Tutto</button>
                  </div>
                  <button className="close-btn" onClick={()=>setShowDownloadModal(false)}>✕</button>
              </div>
          </div>
      )}
      {showAssetModal && (
          <div className="modal-backdrop">
              <div className="modal-box big">
                  <h3>{editingAsset?'Modifica':'Nuovo'} Asset</h3>
                  <form onSubmit={salvaAsset} className="grid-form">
                      <div className="f-grp"><label>Nome</label><input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm,nome:e.target.value})} required/></div>
                      <div className="f-grp"><label>Tipo</label><select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm,tipo:e.target.value})}><option value="frigo">Frigo</option><option value="cella">Cella</option><option value="vetrina">Vetrina</option><option value="congelatore">Congelatore</option><option value="magazzino">Magazzino</option><option value="abbattitore">Abbattitore</option></select></div>
                      <div className="f-grp"><label>Stato</label><select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm,stato:e.target.value})}><option value="attivo">Attivo</option><option value="spento">Spento</option></select></div>
                      <div className="f-grp"><label>Min °C</label><input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm,range_min:e.target.value})}/></div>
                      <div className="f-grp"><label>Max °C</label><input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm,range_max:e.target.value})}/></div>
                      <div className="f-grp"><label>Marca</label><input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm,marca:e.target.value})}/></div>
                      <div className="f-grp"><label>Modello</label><input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm,modello:e.target.value})}/></div>
                      <div className="f-grp"><label>S/N</label><input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm,serial_number:e.target.value})}/></div>
                      <div className="f-actions span-2"><label className="btn-file">Foto<input type="file" onChange={handleAssetPhoto} hidden/></label><label className="btn-file">Etichetta<input type="file" onChange={handleAssetLabel} hidden/></label><button className="btn-primary">SALVA</button></div>
                  </form>
                  <button className="close-btn" onClick={()=>setShowAssetModal(false)}>✕</button>
              </div>
          </div>
      )}
      {showQRModal && <div className="modal-backdrop"><div className="modal-box center"><h3>{showQRModal.nome}</h3><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`}/><button onClick={()=>setPrintMode('qr')||setTimeout(()=>window.print(),500)}>STAMPA</button><button className="close-btn" onClick={()=>setShowQRModal(null)}>✕</button></div></div>}
      {previewImage && <div className="modal-backdrop dark" onClick={()=>setPreviewImage(null)}><img src={previewImage} className="preview-img"/></div>}

      {/* PRINT AREA */}
      {(printMode === 'label' && lastLabel) && (
        <div className="print-area label-p">
           <div className="l-name">{lastLabel.prodotto}</div>
           <div className="l-sub"><span>{new Date(lastLabel.data_produzione).toLocaleDateString()}</span><span>{lastLabel.operatore}</span></div>
           <div className="l-date">SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
           <div className="l-lot">Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      {(printMode === 'qr' && showQRModal) && (
        <div className="print-area qr-p"><h1>{showQRModal.nome}</h1><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={300}/><p>Scansiona per registrare</p></div>
      )}
    </div>
  );
}

const StyleInjector = () => (
    <style>{`
    :root { --p: #0f172a; --s: #64748b; --bg: #f1f5f9; --card: #fff; --ok: #10b981; --err: #ef4444; --warn: #f59e0b; --lnk: #3b82f6; --rad: 12px; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--p); margin: 0; font-size: 14px; -webkit-font-smoothing: antialiased; }
    input, select, button { font-family: inherit; font-size: 14px; }
    
    /* Layout */
    .app-container { min-height: 100vh; display: flex; flex-direction: column; }
    .app-header { background: var(--card); border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; padding: 0.5rem 1rem; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .top-bar h1 { font-size: 1.25rem; margin: 0; color: var(--p); }
    .top-bar h1 span { color: var(--ok); font-weight: 300; }
    .actions { display: flex; gap: 0.5rem; }
    .content-area { padding: 1rem; max-width: 1024px; margin: 0 auto; width: 100%; box-sizing: border-box; }
    
    /* Tabs */
    .tabs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 4px; }
    .tabs::-webkit-scrollbar { display: none; }
    .tabs button { background: transparent; border: 1px solid transparent; padding: 0.5rem 1rem; border-radius: 20px; color: var(--s); font-weight: 600; cursor: pointer; white-space: nowrap; }
    .tabs button.active { background: var(--p); color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

    /* Cards generic */
    .card { background: var(--card); border-radius: var(--rad); padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 1rem; }
    .btn-primary { background: var(--p); color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-ghost { background: transparent; border: 1px solid #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; color: var(--s); }
    .btn-ghost.danger { color: var(--err); border-color: #fecaca; }
    
    /* Temp Grid */
    .temp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .asset-card { display: flex; flex-direction: column; justify-content: space-between; }
    .asset-card.off { opacity: 0.6; background: #f8fafc; }
    .asset-card.ok { border-left: 4px solid var(--ok); }
    .asset-card.alert { border-left: 4px solid var(--err); background: #fef2f2; }
    .asset-card.input-mode { border: 2px solid var(--p); }
    
    .asset-card .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .asset-card h3 { margin: 0; font-size: 1.1rem; }
    .asset-card small { color: var(--s); display: block; }
    .big-val { font-size: 2rem; font-weight: 800; }
    .range { font-size: 0.75rem; background: var(--bg); padding: 4px 8px; border-radius: 4px; color: var(--s); }
    .meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--s); }
    .alert-msg { margin-top: 0.5rem; color: var(--err); font-size: 0.85rem; background: #fff; padding: 0.5rem; border-radius: 4px; border: 1px solid #fecaca; }
    
    .input-row { display: flex; gap: 0.5rem; }
    .input-row input { flex: 1; font-size: 1.5rem; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; border-radius: 8px; width: 60px; }
    .btns { display: flex; gap: 0.5rem; }
    .btn-save { background: var(--p); color: #fff; border:none; border-radius: 6px; padding: 0 1rem; font-weight: bold; cursor: pointer; }
    .btn-grey { background: #cbd5e1; border:none; border-radius: 6px; padding: 0 0.8rem; cursor: pointer; }
    .btn-icon { display: flex; align-items: center; justify-content: center; width: 40px; background: #f1f5f9; border-radius: 6px; cursor: pointer; border: 1px solid #cbd5e1; }
    .btn-icon.has-file { background: #d1fae5; border-color: var(--ok); }
    .btn-edit { width: 100%; margin-top: 1rem; background: #fff; border: 1px solid #cbd5e1; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
    .btn-cancel { width: 100%; margin-top: 0.5rem; background: transparent; border: none; color: var(--s); cursor: pointer; text-decoration: underline; }

    /* Forms Generic */
    .grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .f-grp { display: flex; flex-direction: column; gap: 0.3rem; }
    .span-2 { grid-column: span 2; }
    .f-grp label { font-size: 0.75rem; font-weight: 700; color: var(--s); text-transform: uppercase; }
    .f-grp input, .f-grp select { padding: 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
    .f-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; flex-wrap: wrap; gap: 1rem; }
    .btn-file { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; border: 1px dashed #94a3b8; font-size: 0.85rem; }
    .btn-file.ok { background: #d1fae5; border-color: var(--ok); color: #065f46; border-style: solid; }
    .checks { display: flex; gap: 1rem; font-size: 0.9rem; }

    /* Merci History Card */
    .merci-layout { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
    @media(min-width: 768px) { .merci-layout { grid-template-columns: 350px 1fr; } }
    .history-item { padding: 0.8rem; border-left: 4px solid var(--s); }
    .hi-top { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--s); }
    .hi-main { font-size: 1rem; margin-bottom: 0.5rem; }
    .hi-main .supp { font-weight: normal; color: var(--s); }
    .hi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem; background: #f8fafc; padding: 0.5rem; border-radius: 6px; }
    .hi-grid span { color: var(--s); font-size: 0.75rem; }
    .hi-note { font-style: italic; font-size: 0.85rem; color: var(--p); margin-top: 0.5rem; background: #fffbeb; padding: 0.3rem; }
    .hi-status { margin-top: 0.5rem; display: flex; justify-content: flex-end; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    .badge.ok { background: #d1fae5; color: #065f46; }
    .badge.err { background: #fee2e2; color: #991b1b; }

    /* Calendar */
    .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .hd { background: #f8fafc; text-align: center; font-size: 0.75rem; padding: 5px; color: var(--s); }
    .cal-cell { background: #fff; min-height: 60px; border: 1px solid #f1f5f9; padding: 4px; cursor: pointer; position: relative; }
    .cal-cell.empty { background: #f8fafc; }
    .cal-cell.ok { background: #f0fdf4; }
    .cal-cell.err { background: #fef2f2; }
    .day-n { font-weight: bold; font-size: 0.8rem; }
    .dots { display: flex; gap: 3px; margin-top: 4px; }
    .d-temp { width: 6px; height: 6px; border-radius: 50%; background: var(--lnk); }
    .d-merci { width: 6px; height: 6px; border-radius: 50%; background: var(--warn); }
    
    .day-detail-panel { margin-top: 1rem; border-top: 2px solid #e2e8f0; padding-top: 1rem; }
    .detail-cols { display: flex; flex-direction: column; gap: 1rem; }
    @media(min-width: 768px) { .detail-cols { flex-direction: row; } }
    .col { flex: 1; background: #fff; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
    .item-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
    .item-card { background: #f8fafc; padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px; font-size: 0.9rem; }

    /* Assets List */
    .asset-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .ar-info h4 { margin: 0; }
    .ar-meta { font-size: 0.8rem; color: var(--s); font-family: monospace; margin: 4px 0; }
    .ar-links { font-size: 0.8rem; color: var(--lnk); display: flex; gap: 10px; cursor: pointer; font-weight: 500; }
    .ar-actions { display: flex; gap: 0.5rem; }
    .ar-actions button { padding: 0.4rem 0.8rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; }

    /* Modals */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
    .modal-box { background: #fff; padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 400px; position: relative; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .modal-box.big { max-width: 500px; }
    .modal-box.center { text-align: center; }
    .close-btn { position: absolute; top: 10px; right: 10px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; }
    .preview-img { max-width: 100%; max-height: 90vh; border-radius: 8px; }
    .dl-opts button { display: block; width: 100%; padding: 0.8rem; margin-bottom: 0.5rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; text-align: left; }
    .dl-opts .row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .fmt-sw { display: flex; gap: 5px; margin-bottom: 1rem; justify-content: center; }
    .fmt-sw button { width: auto; text-align: center; }
    .fmt-sw button.active { background: var(--p); color: #fff; border-color: var(--p); }

    .dropdown { position: relative; }
    .dd-menu { display: none; position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 140px; }
    .dropdown:hover .dd-menu { display: block; }
    .dd-menu div { padding: 8px 12px; cursor: pointer; }
    .dd-menu div:hover { background: #f1f5f9; }

    @media print { 
        .no-print { display: none !important; } 
        body { background: #fff; }
        .print-area { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #fff; z-index: 999; display: flex !important; flex-direction: column; align-items: center; justify-content: center; }
        .label-p { width: 58mm; height: 40mm; border: 1px solid #000; padding: 2mm; box-sizing: border-box; align-items: stretch; justify-content: flex-start; }
        .l-name { font-weight: 900; text-align: center; border-bottom: 2px solid #000; text-transform: uppercase; }
        .l-sub { display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px; }
        .l-date { text-align: center; font-size: 14px; font-weight: 900; margin: 5px 0; border: 1px solid #000; }
        .l-lot { font-size: 9px; text-align: center; margin-top: auto; }
    }
    `}</style>
);

export default Haccp;