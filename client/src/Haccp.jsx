import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

// Import Componenti
import TempControl from './components/haccp/TempControl';
import MerciManager from './components/haccp/MerciManager';
import HaccpCalendar from './components/haccp/HaccpCalendar';
import AssetSetup from './components/haccp/AssetSetup';
import StaffManager from './components/haccp/StaffManager';
import LabelGenerator from './components/haccp/LabelGenerator';
import CleaningManager from './components/haccp/CleaningManager';

function Haccp() {
  const { slug, scanId } = useParams();
  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- STATO GLOBALE ---
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // Dati
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [merci, setMerci] = useState([]); 
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  const [staffList, setStaffList] = useState([]);

  // Stati Staff
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDocs, setStaffDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ tipo: 'Contratto', url: '' });

  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Merci
  const [merciForm, setMerciForm] = useState({
      id: null,
      data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '',
      temperatura: '', conforme: true, integro: true, note: '',
      quantita: '', allegato_url: '', destinazione: ''
  });
  const [uploadingMerci, setUploadingMerci] = useState(false);

  // Stati Asset / Modali
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', 
      foto_url:'', etichetta_url:'', stato: 'attivo' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false); 
  const [uploadingLabel, setUploadingLabel] = useState(false); 
  const [showQRModal, setShowQRModal] = useState(null);

  // Stati UI Extra
  const [previewImage, setPreviewImage] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null); 
  const [downloadFormat, setDownloadFormat] = useState('excel'); 
  const [selectedMonth, setSelectedMonth] = useState('');

  // Stati Etichette (Produzione)
  const today = new Date();
  today.setDate(today.getDate() + 3);
  const [labelData, setLabelData] = useState({ 
      prodotto: '', 
      giorni_scadenza: 3, 
      scadenza_manuale: today.toISOString().split('T')[0], 
      operatore: '', 
      tipo: 'positivo' 
  });
  const [lastLabel, setLastLabel] = useState(null);
  const [printMode, setPrintMode] = useState(null);

  // Stati Calendario
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); 

  // --- EFFETTI ---
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
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
      fetch(`${API_URL}/api/haccp/merci/${info.id}`).then(r=>r.json()).then(setMerci);
      fetch(`${API_URL}/api/utenti?mode=staff&ristorante_id=${info.id}&t=${new Date().getTime()}`)
        .then(r=>r.json())
        .then(data => setStaffList(Array.isArray(data) ? data : []));
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario') return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${start}&end=${end}`)
        .then(r=>r.json())
        .then(setCalendarLogs)
        .catch(e => console.error("Err Cal", e));
  };

  // --- GESTIONE FILE ---
  const handleFileAction = (url) => {
    if (!url) return;
    const isPdf = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
    if (isPdf) {
        window.open(url, '_blank');
    } else {
        setPreviewImage(url);
    }
  };

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

  const openStaffDocs = async (user) => {
      setSelectedStaff(user);
      const r = await fetch(`${API_URL}/api/staff/docs/${user.id}`);
      setStaffDocs(await r.json());
  };
  const uploadStaffDoc = async (e) => {
      const f = e.target.files[0]; if(!f) return;
      const url = await uploadFile(f);
      await fetch(`${API_URL}/api/staff/docs`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ utente_id: selectedStaff.id, tipo_doc: newDoc.tipo, nome_file: f.name, url })
      });
      const r = await fetch(`${API_URL}/api/staff/docs/${selectedStaff.id}`);
      setStaffDocs(await r.json());
      setNewDoc({...newDoc, url: ''});
  };
  const deleteDoc = async (id) => {
      if(!confirm("Eliminare documento?")) return;
      await fetch(`${API_URL}/api/staff/docs/${id}`, {method:'DELETE'});
      const r = await fetch(`${API_URL}/api/staff/docs/${selectedStaff.id}`);
      setStaffDocs(await r.json());
  };

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
          val = "OFF"; conforme = true; azione = "Macchinario spento/inutilizzato in data odierna";
      }

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val, 
              conformita: conforme, azione_correttiva: azione, foto_prova_url: (tempInput[asset.id] || {}).photo || ''
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
        if (data.success) { resetMerciForm(); ricaricaDati(); alert("✅ Salvataggio riuscito!"); } 
        else alert("❌ Errore Server: " + data.error);
      } catch (err) { alert("❌ Errore Connessione"); }
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

  const openDownloadModal = (type) => { setDownloadType(type); setShowDownloadModal(true); setSelectedMonth(''); };
  const executeDownload = (range) => {
      let start = new Date(), end = new Date(), rangeName = "Tutto";
      if(range === 'week') { start.setDate(end.getDate() - 7); rangeName="Ultima Settimana"; }
      else if(range === 'month') { start.setMonth(end.getMonth() - 1); rangeName="Ultimo Mese"; }
      else if (range === 'custom-month') {
          if(!selectedMonth) return alert("Seleziona un mese!");
          const [y, m] = selectedMonth.split('-'); start = new Date(y, m - 1, 1); end = new Date(y, m, 0, 23, 59, 59);
          rangeName = `Mese di ${start.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`;
      } else if(range === 'all') { start = new Date('2020-01-01'); rangeName="Storico Completo"; }
      
      const query = `?start=${start.toISOString()}&end=${end.toISOString()}&rangeName=${rangeName}&format=${downloadFormat}`;
      let endpointType = downloadType;
      window.open(`${API_URL}/api/haccp/export/${endpointType}/${info.id}${query}`, '_blank');
      setShowDownloadModal(false);
  };

  const handleLabelTypeChange = (e) => {
      const type = e.target.value; 
      let days = 3;
      if (type === 'negativo') days = 180; 
      if (type === 'sottovuoto') days = 10;
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      setLabelData({
          ...labelData, 
          tipo: type, 
          giorni_scadenza: days,
          scadenza_manuale: newDate.toISOString().split('T')[0]
      });
  };

  const handlePrintLabel = async (e) => {
      e.preventDefault();
      const scadenza = labelData.scadenza_manuale ? new Date(labelData.scadenza_manuale) : new Date();
      if(!labelData.scadenza_manuale) scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));

      const res = await fetch(`${API_URL}/api/haccp/labels`, { 
          method:'POST', headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) 
      });
      const data = await res.json(); 
      if(data.success) { setLastLabel(data.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); }
  };
  
  const handleReprint = (label) => {
      setLastLabel(label);
      setPrintMode('label');
      setTimeout(() => { window.print(); setPrintMode(null); }, 500);
  };

  // NUOVA FUNZIONE PER GESTIONE QR CODE E STAMPA IMMEDIATA
const handlePrintQR = (asset) => {
    // Apre solo il modale, NON stampa subito
    setShowQRModal(asset);
};

// 2. Aggiungi questa funzione per stampare dal modale
const printOnlyQR = () => {
    setPrintMode('qr');
    setTimeout(() => {
        window.print();
        setPrintMode(null);
        // Non chiudiamo il modale automaticamente, lascia decidere all'utente
    }, 500);
};

  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:50, textAlign:'center'}}><h1>🔒 Password Required</h1><form onSubmit={handleLogin}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /><button>Login</button></form></div>;
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20, fontFamily:'sans-serif'}}>
      
      {!scanId && (
          <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
              <div><h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Control</h1></div>
              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                  {['temperature', 'merci', 'pulizie', 'calendario', 'etichette', 'staff', 'setup'].map(t => (
                    <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase', background: tab===t ? '#2c3e50' : 'white', color: tab===t ? 'white' : '#333'}}>
                    {t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Macchine' : (t==='staff' ? '👥 Staff' : (t==='pulizie' ? '🧼 Pulizia' : (t==='etichette' ? '🏭 Produzione' : t))))}
                    </button>
                  ))}
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:5}}>ESCI</button>
              </div>
          </div>
      )}

      {tab === 'temperature' && (
          <TempControl 
            assetsToDisplay={assetsToDisplay}
            getTodayLog={getTodayLog}
            tempInput={tempInput}
            setTempInput={setTempInput}
            registraTemperatura={registraTemperatura}
            handleLogPhoto={handleLogPhoto}
            abilitaNuovaMisurazione={abilitaNuovaMisurazione}
            logs={logs}
            openDownloadModal={openDownloadModal}
          />
      )}

      {tab === 'merci' && !scanId && (
          <MerciManager 
             merci={merci}
             merciForm={merciForm}
             setMerciForm={setMerciForm}
             salvaMerci={salvaMerci}
             handleMerciPhoto={handleMerciPhoto}
             uploadingMerci={uploadingMerci}
             iniziaModificaMerci={iniziaModificaMerci}
             eliminaMerce={eliminaMerce}
             assets={assets}
             resetMerciForm={resetMerciForm}
             handleFileAction={handleFileAction} 
             openDownloadModal={openDownloadModal}
          />
      )}
      
      {tab === 'pulizie' && !scanId && (
          <CleaningManager 
            info={info} 
            API_URL={API_URL} 
            staffList={staffList} 
            openDownloadModal={openDownloadModal}
          />
      )}

      {tab === 'calendario' && !scanId && (
          <HaccpCalendar 
            currentDate={currentDate}
            cambiaMese={(d) => { const n = new Date(currentDate); n.setMonth(n.getMonth() + d); setCurrentDate(n); setSelectedDayLogs(null); }}
            calendarLogs={calendarLogs}
            merci={merci}
            selectedDayLogs={selectedDayLogs}
            setSelectedDayLogs={setSelectedDayLogs}
          />
      )}

      {tab === 'staff' && !scanId && (
          <StaffManager 
             staffList={staffList}
             selectedStaff={selectedStaff}
             openStaffDocs={openStaffDocs}
             setSelectedStaff={setSelectedStaff}
             newDoc={newDoc}
             setNewDoc={setNewDoc}
             uploadStaffDoc={uploadStaffDoc}
             uploadFile={uploadFile}
             staffDocs={staffDocs}
             deleteDoc={deleteDoc}
             handleFileAction={handleFileAction} 
             API_URL={API_URL}
          />
      )}

      {tab === 'setup' && !scanId && (
          <AssetSetup 
             assets={assets}
             apriModaleAsset={apriModaleAsset}
             setShowQRModal={setShowQRModal}
             setPreviewImage={setPreviewImage}
             handleFileAction={handleFileAction}
             openDownloadModal={openDownloadModal}
             handlePrintQR={handlePrintQR} // PASSAGGIO NUOVA FUNZIONE
          />
      )}

      {tab === 'etichette' && !scanId && (
    <LabelGenerator 
       labelData={labelData}
       setLabelData={setLabelData}
       handleLabelTypeChange={handleLabelTypeChange}
       handlePrintLabel={handlePrintLabel}
       lastLabel={lastLabel}
       info={info}
       API_URL={API_URL}
       staffList={staffList}
       handleReprint={handleReprint}
       openDownloadModal={openDownloadModal}
       merciList={merci} // <--- NUOVA PROP AGGIUNTA
    />
)}

      {showDownloadModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}>
              <div style={{background:'white', padding:30, borderRadius:10, textAlign:'center', width:350}}>
                  <h3 style={{marginTop:0}}>Scarica Report</h3>
                  <div style={{marginBottom:20, background:'#f9f9f9', padding:10, borderRadius:5}}>
                       <p style={{margin:'0 0 10px 0', fontSize:14, fontWeight:'bold'}}>Formato:</p>
                       <div style={{display:'flex', justifyContent:'center', gap:10}}>
                           <button onClick={()=>setDownloadFormat('excel')} style={{background: downloadFormat==='excel'?'#27ae60':'#eee', color:downloadFormat==='excel'?'white':'black', padding:'5px 15px', border:'none', borderRadius:20, cursor:'pointer'}}>Excel</button>
                           <button onClick={()=>setDownloadFormat('pdf')} style={{background: downloadFormat==='pdf'?'#e74c3c':'#eee', color:downloadFormat==='pdf'?'white':'black', padding:'5px 15px', border:'none', borderRadius:20, cursor:'pointer'}}>PDF</button>
                       </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:10}}>
                      <div style={{display:'flex', gap:5}}>
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} />
                          <button onClick={()=>executeDownload('custom-month')} style={{padding:'0 15px', background:'#8e44ad', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SCARICA</button>
                      </div>
                      <button onClick={()=>executeDownload('week')} style={{padding:12, background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')} style={{padding:12, background:'#2980b9', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Ultimi 30 Giorni</button>
                      <button onClick={()=>executeDownload('all')} style={{padding:12, background:'#2c3e50', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Tutto lo storico</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} style={{marginTop:20, background:'transparent', border:'none', color:'#999', cursor:'pointer', textDecoration:'underline'}}>Annulla</button>
              </div>
          </div>
      )}

      {previewImage && (
          <div onClick={() => setPreviewImage(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out'}}>
              <img src={previewImage} alt="Anteprima" style={{maxWidth:'90%', maxHeight:'90%', borderRadius:10, border:'2px solid white'}} />
              <button style={{position:'absolute', top:20, right:20, background:'white', border:'none', borderRadius:'50%', width:40, height:40, fontWeight:'bold', cursor:'pointer'}}>X</button>
          </div>
      )}

      {printMode === 'label' && lastLabel && (
        <div className="print-area" style={{
            position:'fixed', top:0, left:0, 
            width:'58mm', height:'40mm', 
            background:'white', color:'black', 
            display:'flex', flexDirection:'column', 
            padding:'2mm', boxSizing:'border-box', 
            fontFamily:'Arial, sans-serif', 
            border:'1px solid black' // Bordo solo per debug a video, in stampa scompare solitamente
        }}>
            {/* 1. NOME PRODOTTO (Titolo) */}
            <div style={{
                fontWeight:'900', fontSize:'12px', textAlign:'center', 
                borderBottom:'1px solid black', paddingBottom:'2px', 
                textTransform:'uppercase', lineHeight:'1em', marginBottom:'2px'
            }}>
                {lastLabel.prodotto}
            </div>
            
            {/* 2. LISTA INGREDIENTI CON PRODUTTORE E LOTTO (Nuova Parte) */}
            {/* Usiamo un font piccolo (7px) e limitiamo l'altezza per non uscire dall'etichetta */}
            {lastLabel.ingredienti && (
                <div style={{
                    fontSize:'7px', textAlign:'left', marginBottom:'2px', 
                    lineHeight:'8px', overflow:'hidden', 
                    whiteSpace: 'pre-wrap', // Permette al testo di andare a capo
                    maxHeight: '12mm' // Massima altezza dedicata agli ingredienti
                }}>
                    <span style={{fontWeight:'bold'}}>Ingr:</span> {lastLabel.ingredienti}
                </div>
            )}

            {/* 3. INFO OPERATORE E DATA PRODUZIONE */}
            <div style={{
                display:'flex', justifyContent:'space-between', 
                marginTop:'auto', fontSize:'8px', 
                borderTop: '1px solid #ccc', paddingTop:'2px'
            }}>
                <span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span>
                <span>OP: {lastLabel.operatore.substring(0,8)}</span>
            </div>
            
            {/* 4. DATA SCADENZA (Grande) */}
            <div style={{textAlign:'center', marginTop:'1px'}}>
                <div style={{fontSize:'7px', textTransform:'uppercase'}}>Scadenza</div>
                <div style={{fontWeight:'900', fontSize:'14px'}}>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
            </div>
            
            {/* 5. LOTTO PRODUZIONE (In fondo) */}
            <div style={{
                fontSize:'7px', textAlign:'center', 
                borderTop:'1px solid black', paddingTop:'1px', marginTop:'1px'
            }}>
                Lotto: {lastLabel.lotto}
            </div>
        </div>
      )}
      
{showQRModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{background:'white', padding:40, borderRadius:20, textAlign:'center', maxWidth:500, width:'90%'}}>
                  <h2 style={{margin:'0 0 20px 0', color:'#2c3e50'}}>{showQRModal.nome}</h2>
                  <div style={{background:'white', padding:20, display:'inline-block'}}>
                      <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={250} />
                  </div>
                  <p style={{marginTop:20, color:'#7f8c8d'}}>Scansiona per registrare le temperature</p>
                  
                  <div style={{marginTop:30, display:'flex', gap:10, justifyContent:'center'}}>
                      <button onClick={printOnlyQR} style={{background:'#2c3e50', color:'white', border:'none', padding:'12px 25px', borderRadius:8, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', gap:5}}>
                          🖨️ Stampa QR
                      </button>
                      <button onClick={()=>setShowQRModal(null)} style={{background:'#e74c3c', color:'white', border:'none', padding:'12px 25px', borderRadius:8, fontSize:16, cursor:'pointer'}}>
                          Chiudi
                      </button>
                  </div>
              </div>
          </div>
      )}

{/* --- MODALE CREAZIONE/MODIFICA MACCHINA --- */}
{showAssetModal && (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{background:'white', padding:30, borderRadius:10, width:600, maxWidth:'90%', maxHeight:'90vh', overflowY:'auto'}}>
            <h2 style={{marginTop:0}}>{editingAsset ? '✏️ Modifica Macchina' : '✨ Nuova Macchina'}</h2>
            
            <form onSubmit={salvaAsset} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                
                {/* Nome e Tipo */}
                <div style={{gridColumn:'span 2'}}>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Nome Identificativo</label>
                    <input required value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Es. Frigo Cucina 1" style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
                
                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Tipo Asset</label>
                    <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}>
                        <option value="frigo">Frigorifero</option>
                        <option value="cella">Cella Frigo</option>
                        <option value="vetrina">Vetrina</option>
                        <option value="congelatore">Congelatore</option>
                        <option value="abbattitore">Abbattitore</option>
                        <option value="altro">Altro</option>
                    </select>
                </div>

                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Stato</label>
                    <select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}}>
                        <option value="attivo">✅ Attivo</option>
                        <option value="manutenzione">🛠️ In Manutenzione</option>
                        <option value="spento">🛑 Spento</option>
                        <option value="dismissed">🗑️ Dismesso</option>
                    </select>
                </div>

                {/* Range Temperature */}
                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Range Min (°C)</label>
                    <input type="number" step="0.1" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Range Max (°C)</label>
                    <input type="number" step="0.1" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>

                {/* Dettagli Tecnici */}
                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Marca</label>
                    <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
                <div>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Modello</label>
                    <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
                <div style={{gridColumn:'span 2'}}>
                    <label style={{fontSize:12, fontWeight:'bold'}}>Serial Number / Matricola</label>
                    <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                </div>

                {/* Upload Foto */}
                <div style={{gridColumn:'span 2', display:'flex', gap:10}}>
                    <div style={{flex:1}}>
                        <label style={{fontSize:12, fontWeight:'bold', display:'block', marginBottom:5}}>Foto Macchina</label>
                        <div style={{display:'flex', gap:5}}>
                            <input type="file" accept="image/*" onChange={handleAssetPhoto} style={{fontSize:11}} />
                            {uploadingAsset && <span style={{fontSize:10}}>Caricamento...</span>}
                        </div>
                        {assetForm.foto_url && <div style={{fontSize:10, color:'green', marginTop:2}}>✅ Foto caricata</div>}
                    </div>
                    <div style={{flex:1}}>
                        <label style={{fontSize:12, fontWeight:'bold', display:'block', marginBottom:5}}>Etichetta Energetica / Manuale</label>
                        <div style={{display:'flex', gap:5}}>
                            <input type="file" accept="image/*,.pdf" onChange={handleAssetLabel} style={{fontSize:11}} />
                            {uploadingLabel && <span style={{fontSize:10}}>Caricamento...</span>}
                        </div>
                        {assetForm.etichetta_url && <div style={{fontSize:10, color:'green', marginTop:2}}>✅ File caricato</div>}
                    </div>
                </div>

                {/* Pulsanti Azione */}
                <div style={{gridColumn:'span 2', display:'flex', gap:10, marginTop:10}}>
                    <button type="button" onClick={()=>setShowAssetModal(false)} style={{flex:1, padding:12, background:'#ccc', border:'none', borderRadius:5, cursor:'pointer'}}>Annulla</button>
                    <button type="submit" style={{flex:1, padding:12, background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>
                        {editingAsset ? 'AGGIORNA MACCHINA' : 'CREA MACCHINA'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}


      {/* 2. LA VERSIONE PER LA STAMPA (Invisibile finché non stampi) */}
      {printMode === 'qr' && showQRModal && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <h1 style={{fontSize:'40px', marginBottom:20}}>{showQRModal.nome}</h1>
             <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} />
             <p style={{marginTop:20, fontSize:'20px'}}>Scansiona per registrare la temperatura</p>
        </div>
      )}
      <style>{`@media print { .no-print { display: none !important; } .print-area { z-index: 9999; display: flex !important; } body { margin: 0; padding: 0; } @page { margin: 0; size: auto; } }`}</style>
    </div>
  );
}
export default Haccp;