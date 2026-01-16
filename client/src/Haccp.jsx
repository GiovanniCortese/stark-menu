// client/src/Haccp.jsx - MOBILE VERSION V1.0 📱
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

      if(range === 'week') { start.setDate(end.getDate() - 7); rangeName="Ultima Settimana"; } 
      else if(range === 'month') { start.setMonth(end.getMonth() - 1); rangeName="Ultimo Mese"; } 
      else if(range === 'year') { start.setFullYear(end.getFullYear() - 1); rangeName="Ultimo Anno"; } 
      else if (range === 'custom-month') {
          if(!selectedMonth) return alert("Seleziona un mese!");
          const [y, m] = selectedMonth.split('-');
          start = new Date(y, m - 1, 1);
          end = new Date(y, m, 0, 23, 59, 59);
          rangeName = `Mese ${m}-${y}`;
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

        const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      
      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} style={{background:'#f0f0f0'}}></div>);
      
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
                 style={{background: bgColor, border:'1px solid #ddd', minHeight:'60px', padding:'5px', cursor:'pointer', position:'relative', borderRadius:5}}>
                  <div style={{fontWeight:'bold'}}>{d}</div>
                  <div style={{fontSize:'10px', marginTop:5, display:'flex', gap:2, flexWrap:'wrap'}}>
                      {hasLogs && <span>🌡️</span>} {hasMerci && <span>📦</span>}
                  </div>
            </div>
          );
      }
      return (
          <div style={{background:'white', padding:15, borderRadius:10}}>
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center'}}>
                <button onClick={()=>cambiaMese(-1)} style={{padding:10, fontSize:18, border:'none', background:'#eee', borderRadius:5}}>◀</button>
                <h3 style={{margin:0}}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={()=>cambiaMese(1)} style={{padding:10, fontSize:18, border:'none', background:'#eee', borderRadius:5}}>▶</button>
             </div>
             <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5}}>{grid}</div>
             
             {selectedDayLogs && (
                 <div style={{marginTop:20, borderTop:'2px solid #333', paddingTop:20}}>
                     <h2 style={{marginTop:0}}>Giorno {selectedDayLogs.day}</h2>
                     <div style={{display:'flex', flexDirection:'column', gap:15}}>
                         <div style={{background:'#f9f9f9', padding:10, borderRadius:5}}>
                             <h4 style={{marginTop:0, color:'#27ae60'}}>🌡️ Temperature</h4>
                             {selectedDayLogs.logs.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessuna registrazione.</p> : (
                                 selectedDayLogs.logs.map(l => (
                                     <div key={l.id} style={{padding:'8px 0', borderBottom:'1px solid #ddd', display:'flex', justifyContent:'space-between', fontSize:13}}>
                                         <span><strong>{l.nome_asset}</strong>: {l.valore}°C</span>
                                         <span>{l.conformita ? '✅' : '❌'}</span>
                                     </div>
                                 ))
                             )}
                         </div>
                         <div style={{background:'#f9f9f9', padding:10, borderRadius:5}}>
                             <h4 style={{marginTop:0, color:'#f39c12'}}>📦 Arrivo Merci</h4>
                             {selectedDayLogs.merci.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessun arrivo.</p> : (
                                 selectedDayLogs.merci.map(m => (
                                     <div key={m.id} style={{padding:'8px 0', borderBottom:'1px solid #ddd', fontSize:13}}>
                                         <div style={{fontWeight:'bold'}}>{m.prodotto}</div>
                                         <div style={{color:'#666'}}>{m.fornitore}</div>
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 </div>
             )}
          </div>
      );
  };

  // --- ETICHETTE & STAMPA ---
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

  // --- RENDER UI ---
  if(!info) return <div style={{padding:20, textAlign:'center'}}>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:20, textAlign:'center', marginTop:50}}><h1>🔒 Accesso HACCP</h1><form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:10, maxWidth:300, margin:'0 auto'}}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password Reparto" style={{padding:15, fontSize:18, borderRadius:5, border:'1px solid #ccc'}} /><button style={{padding:15, background:'#2c3e50', color:'white', borderRadius:5, fontSize:16, border:'none'}}>Entra</button></form></div>;
  
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:'10px', paddingBottom:'80px', fontFamily:'sans-serif'}}>
      
      {!scanId && (
          <div className="no-print">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <h2 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Mobile</h2>
                <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, fontSize:12}}>ESCI</button>
              </div>

              {/* NAVIGAZIONE MOBILE (GRID) */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:15}}>
                  {['temperature', 'merci', 'calendario', 'etichette', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} style={{
                          padding:'12px 5px', borderRadius:8, border:'none', 
                          fontSize:'12px', fontWeight:'bold', textTransform:'uppercase', 
                          background: tab===t ? '#2c3e50' : 'white', 
                          color: tab===t ? 'white' : '#333',
                          boxShadow:'0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Asset' : t==='temperature' ? '🌡️ Temp' : t)}
                      </button>
                  ))}
                  <button onClick={()=>openDownloadModal('temperature')} style={{background:'#27ae60', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:'bold'}}>⬇ Report</button>
              </div>
          </div>
      )}

      {/* 1. TEMPERATURE (MOBILE CARD) */}
      {tab === 'temperature' && (
          <div className="no-print" style={{display:'flex', flexDirection:'column', gap:15}}>
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  const isInputActive = !!tempInput[asset.id];
                  const currentData = tempInput[asset.id] || {};
                  
                  if(asset.stato === 'spento') {
                      return (
                          <div key={asset.id} style={{background:'#e0e0e0', padding:15, borderRadius:10, border:'2px solid #999', opacity:0.8}}>
                              <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                              <div style={{background:'#ccc', padding:10, marginTop:10, borderRadius:5, textAlign:'center', fontWeight:'bold', fontSize:14, color:'#666'}}>SPENTO</div>
                          </div>
                      );
                  }

                  if (todayLog && !isInputActive) {
                      return (
                          <div key={asset.id} style={{background:'#eafaf1', padding:15, borderRadius:10, borderLeft:'6px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <h3 style={{margin:0, color:'#27ae60', fontSize:18}}>{asset.nome}</h3>
                                  <span style={{fontSize:'28px', fontWeight:'bold'}}>{todayLog.valore === 'OFF' ? 'OFF' : todayLog.valore + '°'}</span>
                              </div>
                              <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                                  {todayLog.conformita ? `✅ OK alle ${new Date(todayLog.data_ora).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}` : `⚠️ ERR: ${todayLog.azione_correttiva}`}
                              </div>
                              <button onClick={() => abilitaNuovaMisurazione(asset)} style={{marginTop:15, width:'100%', background:'#f39c12', color:'white', border:'none', padding:12, borderRadius:8, fontWeight:'bold', fontSize:14}}>✏️ MODIFICA</button>
                          </div>
                      );
                  }
                  
                  return (
                      <div key={asset.id} style={{background:'white', padding:15, borderRadius:10, boxShadow:'0 4px 10px rgba(0,0,0,0.1)', borderTop:'4px solid #34495e'}}>
                           <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                                <div><h3 style={{margin:0, fontSize:'18px'}}>{asset.nome}</h3><span style={{fontSize:'12px', color:'#7f8c8d'}}>Range: {asset.range_min}° / {asset.range_max}°</span></div>
                           </div>
                           
                           {/* INPUT GRANDE PER MOBILE */}
                           <div style={{display:'flex', gap:10, height:60, marginBottom:10}}>
                              <input type="number" step="0.1" placeholder="°C" 
                                   value={currentData.val || ''} 
                                   onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                                   style={{flex:1, borderRadius:10, border:'2px solid #3498db', fontSize:24, textAlign:'center', fontWeight:'bold', color:'#2c3e50'}} 
                              />
                              <label style={{width:60, cursor:'pointer', background: currentData.photo ? '#2ecc71' : '#f1f2f6', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #ddd'}}>
                                  <span style={{fontSize:'24px'}}>📷</span>
                                  <input type="file" accept="image/*" capture="environment" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                              </label>
                           </div>

                           <div style={{display:'flex', gap:10}}>
                               <button onClick={()=>registraTemperatura(asset, true)} style={{flex:1, padding:12, background:'#95a5a6', color:'white', border:'none', borderRadius:8, fontWeight:'bold'}}>OFF</button>
                               <button onClick={()=>registraTemperatura(asset, false)} style={{flex:2, padding:12, background:'#2c3e50', color:'white', border:'none', borderRadius:8, fontWeight:'bold', fontSize:16}}>SALVA</button>
                           </div>

                           {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} style={{marginTop:10, width:'100%', padding:10, background:'transparent', border:'none', color:'#e74c3c'}}>Annulla</button>}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. MERCI (MOBILE CARDS INVECE DI TABELLA) */}
      {tab === 'merci' && !scanId && (
          <div className="no-print">
              <div style={{background:'white', padding:15, borderRadius:10, marginBottom:20, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                  <h3 style={{marginTop:0}}>{merciForm.id ? '✏️ Modifica' : '📥 Nuovo Arrivo'}</h3>
                  <form onSubmit={salvaMerci} style={{display:'flex', flexDirection:'column', gap:10}}>
                      <div style={{display:'flex', gap:10}}>
                        <input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{flex:1, padding:12, border:'1px solid #ddd', borderRadius:5}} required />
                        <input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} placeholder="Fornitore" style={{flex:2, padding:12, border:'1px solid #ddd', borderRadius:5}} required />
                      </div>
                      <input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} placeholder="Prodotto" style={{padding:12, border:'1px solid #ddd', borderRadius:5}} required />
                      
                      <div style={{display:'flex', gap:10}}>
                          <input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} placeholder="Lotto" style={{flex:1, padding:10, border:'1px solid #ddd', borderRadius:5}} />
                          <input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{flex:1, padding:10, border:'1px solid #ddd', borderRadius:5}} />
                      </div>
                      
                      <div style={{display:'flex', gap:10}}>
                        <input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} placeholder="Temp °C" style={{flex:1, padding:10, border:'1px solid #ddd', borderRadius:5}} />
                        <label style={{flex:1, cursor:'pointer', background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:5, fontSize:12, border:'1px solid #ccc'}}>
                            {uploadingMerci ? "..." : (merciForm.allegato_url ? "📎 Foto OK" : "📷 Bolla")}
                            <input type="file" accept="image/*" capture="environment" onChange={handleMerciPhoto} style={{display:'none'}} />
                        </label>
                      </div>

                      <div style={{display:'flex', gap:15, alignItems:'center', background:'#f9f9f9', padding:10, borderRadius:5}}>
                          <label style={{fontSize:14, display:'flex', alignItems:'center', gap:5}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} style={{transform:'scale(1.3)'}} /> Conforme</label>
                          <label style={{fontSize:14, display:'flex', alignItems:'center', gap:5}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} style={{transform:'scale(1.3)'}} /> Integro</label>
                      </div>

                      <button style={{background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', padding:15, borderRadius:8, fontSize:16, fontWeight:'bold', marginTop:5}}>
                          {merciForm.id ? 'AGGIORNA DATI' : 'REGISTRA ARRIVO'}
                      </button>
                      {merciForm.id && <button type="button" onClick={resetMerciForm} style={{padding:10, background:'#999', color:'white', border:'none', borderRadius:5}}>Annulla</button>}
                  </form>
              </div>

              {/* LISTA MERCI A CARD */}
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {merci.map(m => (
                      <div key={m.id} style={{background:'white', padding:15, borderRadius:10, borderLeft: m.conforme && m.integro ? '5px solid #27ae60' : '5px solid #e74c3c', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}>
                              <span style={{fontWeight:'bold', fontSize:15}}>{m.fornitore}</span>
                              <span style={{fontSize:12, color:'#666'}}>{new Date(m.data_ricezione).toLocaleDateString()}</span>
                          </div>
                          <div style={{fontSize:16, marginBottom:8, color:'#2c3e50'}}>{m.prodotto}</div>
                          <div style={{fontSize:12, color:'#555', background:'#f8f9fa', padding:8, borderRadius:5, lineHeight:1.5}}>
                              Qty: {m.quantita || '-'} | Lotto: {m.lotto} <br/>
                              Scad: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                          </div>
                          <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:10}}>
                              {m.allegato_url && <button onClick={()=>setPreviewImage(m.allegato_url)} style={{padding:'8px 12px', background:'#3498db', color:'white', border:'none', borderRadius:5}}>📎 Foto</button>}
                              <button onClick={()=>iniziaModificaMerci(m)} style={{padding:'8px 12px', background:'#f39c12', color:'white', border:'none', borderRadius:5}}>✏️ Edit</button>
                              <button onClick={()=>eliminaMerce(m.id)} style={{padding:'8px 12px', background:'#e74c3c', color:'white', border:'none', borderRadius:5}}>🗑️</button>
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
          <div className="no-print" style={{display:'flex', flexDirection:'column', gap:20}}>
             <div style={{background:'white', padding:20, borderRadius:10}}>
                 <h3>Genera Etichetta</h3>
                 <form onSubmit={handlePrintLabel} style={{display:'flex', flexDirection:'column', gap:12}}>
                    <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:15, border:'1px solid #ccc', borderRadius:5, fontSize:16}} />
                    <select value={labelData.tipo} onChange={handleLabelTypeChange} style={{padding:15, border:'1px solid #ccc', borderRadius:5, background:'white'}}>
                        <option value="positivo">Positivo (+3°C) - 3gg</option>
                        <option value="negativo">Negativo (-18°C) - 180gg</option>
                        <option value="sottovuoto">Sottovuoto - 10gg</option>
                    </select>
                    <button style={{background:'#2980b9', color:'white', border:'none', padding:15, marginTop:10, borderRadius:8, fontSize:16, fontWeight:'bold'}}>STAMPA</button>
                 </form>
             </div>
          </div>
      )}

      {/* 5. SETUP (ASSET) */}
      {tab === 'setup' && !scanId && (
          <div className="no-print">
              <button onClick={()=>apriModaleAsset()} style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:8, fontWeight:'bold', marginBottom:15}}>+ NUOVA MACCHINA</button>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100%, 1fr))', gap:15}}> 
                  {assets.map(a => (
                      <div key={a.id} style={{background: 'white', padding:15, borderRadius:10, borderLeft: '4px solid #34495e', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                          <div style={{display:'flex', justifyContent:'space-between'}}>
                              <strong style={{fontSize:16}}>{a.nome}</strong> 
                              <span style={{fontSize:12, background:'#eee', padding:'2px 8px', borderRadius:10}}>{a.tipo}</span>
                          </div>
                          
                          <div style={{marginTop:15, display:'flex', gap:10}}>
                              <button onClick={()=>setShowQRModal(a)} style={{background:'#34495e', color:'white', border:'none', padding:'10px', borderRadius:5, flex:1}}>QR Code</button>
                              <button onClick={()=>apriModaleAsset(a)} style={{background:'#f39c12', color:'white', border:'none', padding:'10px', borderRadius:5, flex:1}}>Modifica</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- MODALI (DOWNLOAD, PREVIEW, QR, EDIT) --- */}
      {showDownloadModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20}}>
              <div style={{background:'white', padding:25, borderRadius:15, textAlign:'center', width:'100%', maxWidth:350}}>
                  <h3>Scarica Report</h3>
                  <div style={{display:'flex', gap:10, marginBottom:20, justifyContent:'center'}}>
                      <button onClick={()=>setDownloadFormat('excel')} style={{background:downloadFormat==='excel'?'#27ae60':'#eee', color:downloadFormat==='excel'?'white':'black', padding:'8px 20px', borderRadius:20, border:'none'}}>Excel</button>
                      <button onClick={()=>setDownloadFormat('pdf')} style={{background:downloadFormat==='pdf'?'#e74c3c':'#eee', color:downloadFormat==='pdf'?'white':'black', padding:'8px 20px', borderRadius:20, border:'none'}}>PDF</button>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                      <div style={{display:'flex', gap:5}}><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} /><button onClick={()=>executeDownload('custom-month')} style={{padding:'0 15px', background:'#8e44ad', color:'white', border:'none', borderRadius:5}}>OK</button></div>
                      <button onClick={()=>executeDownload('week')} style={{padding:12, background:'#3498db', color:'white', border:'none', borderRadius:5}}>Settimana</button>
                      <button onClick={()=>executeDownload('month')} style={{padding:12, background:'#2980b9', color:'white', border:'none', borderRadius:5}}>Mese</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} style={{marginTop:20, background:'transparent', border:'none', color:'#666'}}>Chiudi</button>
              </div>
          </div>
      )}

      {showAssetModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:15}}>
             <div style={{background:'white', padding:20, width:'100%', maxWidth:400, borderRadius:10, maxHeight:'90vh', overflowY:'auto'}}>
                <h3>{editingAsset ? 'Modifica' : 'Nuovo'} Asset</h3>
                <form onSubmit={salvaAsset} style={{display:'flex', flexDirection:'column', gap:12}}>
                   <input value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo 1)" style={{padding:12, border:'1px solid #ccc', borderRadius:5}} required />
                   <div style={{display:'flex', gap:10}}>
                       <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" style={{flex:1, padding:12, border:'1px solid #ccc', borderRadius:5}} />
                       <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" style={{flex:1, padding:12, border:'1px solid #ccc', borderRadius:5}} />
                   </div>
                   <button style={{background:'#27ae60', color:'white', border:'none', padding:15, borderRadius:5, fontSize:16}}>SALVA</button>
                   <button type="button" onClick={()=>setShowAssetModal(false)} style={{background:'#95a5a6', color:'white', border:'none', padding:15, borderRadius:5}}>Annulla</button>
                </form>
             </div>
          </div>
      )}

      {previewImage && (
          <div onClick={() => setPreviewImage(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <img src={previewImage} style={{maxWidth:'100%', maxHeight:'80vh', borderRadius:5}} />
              <button style={{position:'absolute', bottom:30, background:'white', border:'none', padding:'10px 30px', borderRadius:20, fontWeight:'bold'}}>CHIUDI</button>
          </div>
      )}

      {/* PRINT AREA (Hidden on Screen) */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'58mm', height:'40mm', background:'white', color:'black', display:'flex', flexDirection:'column', padding:'3mm', border:'1px solid black'}}>
            <div style={{fontWeight:'900', fontSize:'14px', textAlign:'center', borderBottom:'2px solid black', paddingBottom:'2px', textTransform:'uppercase'}}>{lastLabel.prodotto}</div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px', fontSize:'10px'}}><span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span><span>OP: {lastLabel.operatore}</span></div>
            <div style={{marginTop:'5px', textAlign:'center'}}><div style={{fontSize:'10px'}}>SCADENZA</div><div style={{fontWeight:'900', fontSize:'16px'}}>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</div></div>
            <div style={{marginTop:'auto', fontSize:'9px', textAlign:'center', borderTop:'1px solid black', paddingTop:'2px'}}>Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h1 style={{fontSize:'40px', marginBottom:20}}>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
        </div>
      )}

      <style>{`
          @media print { .no-print { display: none !important; } .print-area { z-index: 9999; display: flex !important; } }
          @media (max-width: 600px) {
            .haccp-container { padding: 8px !important; padding-bottom: 80px !important; }
          }
      `}</style>
    </div>
  );
}

export default Haccp;