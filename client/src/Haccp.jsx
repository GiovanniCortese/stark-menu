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
  // const API_URL = "http://localhost:3000"; // Scommenta per locale
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- STATO GLOBALE ---
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Login State
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  // Dati Applicativi
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [merci, setMerci] = useState([]); 
  
  // Dati Calendario
  const [calendarData, setCalendarData] = useState({ logs: [], merci: [], pulizie: [], labels: [] });
  
  const [tab, setTab] = useState('temperature'); 
  const [staffList, setStaffList] = useState([]);

  // Stati Staff
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDocs, setStaffDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ tipo: 'Contratto', url: '' });

  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Asset / Modali
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
const [assetForm, setAssetForm] = useState({ 
    nome:'', tipo:'frigo', locale: 'Cucina', // <--- AGGIUNTO DEFAULT
    range_min:0, range_max:4, marca:'', modello:'', serial_number:'', 
    foto_url:'', etichetta_url:'', stato: 'attivo' 
});
  const [uploadingAsset, setUploadingAsset] = useState(false); 
  const [uploadingLabel, setUploadingLabel] = useState(false); 
  const [showQRModal, setShowQRModal] = useState(null);

  // Stati UI Extra & Download
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState(null); 
  const [downloadFormat, setDownloadFormat] = useState('excel'); 
  const [selectedMonth, setSelectedMonth] = useState('');

  // NUOVO STATO ANTEPRIMA GLOBALE
  const [globalPreview, setGlobalPreview] = useState(null); 
  const [isDownloading, setIsDownloading] = useState(false);

  // Stati Etichette
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
      if(!info?.id) return;
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      
      // --- MODIFICA QUI ---
      // Scarichiamo 45 giorni invece di 7 per coprire tutto il mese corrente e parte del precedente
      // Questo risolve il problema che "non vedevi" il dato salvato il 7 Gennaio
      const start = new Date(); 
      start.setDate(start.getDate() - 45); 
      const startIso = start.toISOString();
      const endIso = new Date().toISOString();

      fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${startIso}&end=${endIso}`)
        .then(r=>r.json())
        .then(setLogs);
      
      fetch(`${API_URL}/api/haccp/merci/${info.id}?mode=haccp`).then(r=>r.json()).then(setMerci);
      fetch(`${API_URL}/api/utenti?mode=staff&ristorante_id=${info.id}&t=${new Date().getTime()}`)
        .then(r=>r.json())
        .then(data => setStaffList(Array.isArray(data) ? data : []));
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario' || !info?.id) return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      try {
          const [resLogs, resMerci, resPulizie, resLabels] = await Promise.all([
             fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${start}&end=${end}`),
             fetch(`${API_URL}/api/haccp/merci/${info.id}?start=${start}&end=${end}`),
             fetch(`${API_URL}/api/haccp/pulizie/${info.id}?start=${start}&end=${end}`),
             fetch(`${API_URL}/api/haccp/labels/storico/${info.id}?start=${start}&end=${end}`)
          ]);

          setCalendarData({
              logs: await resLogs.json(),
              merci: await resMerci.json(),
              pulizie: await resPulizie.json(),
              labels: await resLabels.json()
          });

      } catch (e) { console.error("Err Cal", e); }
  };

  // --- GESTIONE FILE (Anteprima e Download) ---
  const openGlobalPreview = (url, name = "Documento") => {
      if(!url) return;
      const isPdf = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
      let previewUrl = url;
      if (isPdf) {
          previewUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
      }
      setGlobalPreview({
          url: url, 
          previewUrl: previewUrl, 
          name: name,
          type: isPdf ? 'pdf' : 'image'
      });
  };

  const handleForceDownload = async () => {
      if (!globalPreview) return;
      setIsDownloading(true);
      try {
          const proxyDownloadUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(globalPreview.url)}&name=${encodeURIComponent(globalPreview.name)}`;
          const response = await fetch(proxyDownloadUrl);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = globalPreview.name; 
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
      } catch (error) { alert("Errore durante il download."); } 
      finally { setIsDownloading(false); }
  };

  // --- LOGICA LOGIN ---
  const handleLogin = async (e) => { 
      e.preventDefault(); 
      setLoadingLogin(true);
      setLoginError("");
      try { 
          const r = await fetch(`${API_URL}/api/auth/station`, { 
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              body: JSON.stringify({ ristorante_id: info.id, role: 'haccp', password }) 
          }); 
          const d = await r.json(); 
          if(d.success) { 
              setIsAuthorized(true); 
              localStorage.setItem(`haccp_session_${slug}`, "true"); 
          } else {
              setLoginError("Password Errata");
          }
      } catch(e) { 
          setLoginError("Errore connessione"); 
      } finally {
          setLoadingLogin(false);
      }
  };

  // --- LOGICA UTILS ---
  const uploadFile = async (file) => { const fd = new FormData(); fd.append('photo', file); const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd }); const data = await res.json(); return data.url; };
  const getTodayLog = (assetId) => { const today = new Date().toDateString(); return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today); };
  
  const handleLogPhoto = async (e, assetId) => { const f = e.target.files[0]; if(!f) return; setUploadingLog(assetId); try { const url = await uploadFile(f); setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }})); } finally { setUploadingLog(null); } };
  
// --- FIX 1: REGISTRAZIONE TEMPERATURA (AGGIORNATA PER TABELLA) ---
 const registraTemperatura = async (asset, isSpento = false) => { 
      let val = 'OFF', conforme = true, azione = ""; 
      
      const currentInput = tempInput[asset.id] || {};
      const dataOraEffettiva = currentInput.customDate || null;

      // Cerchiamo se esiste GIÀ un log per oggi (per decidere se fare AGGIORNA o CREA)
      const logEsistente = getTodayLog(asset.id);

      if (!isSpento) { 
          // Sostituiamo la virgola con il punto per i calcoli
          let cleanVal = currentInput.val ? currentInput.val.toString().replace(',', '.') : '';
          val = parseFloat(cleanVal); 
          
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
      
      try {
          // LOGICA INTELLIGENTE: SE ESISTE GIÀ, FACCIAMO PUT (MODIFICA), ALTRIMENTI POST (CREA)
          // Se stiamo facendo una modifica retroattiva (dal calendario/tabella), usiamo sempre POST o PUT specifico se avevamo l'ID,
          // ma per la gestione odierna semplice:
          
          let url = `${API_URL}/api/haccp/logs`;
          let method = 'POST';

          // Se c'è già un log per oggi E non stiamo forzando una data vecchia specifica diversa da oggi
          if (logEsistente && !dataOraEffettiva) {
              url = `${API_URL}/api/haccp/logs/${logEsistente.id}`;
              method = 'PUT';
          }

          await fetch(url, { 
              method: method, 
              headers:{'Content-Type':'application/json'}, 
              body: JSON.stringify({ 
                  ristorante_id: info.id, 
                  asset_id: asset.id, 
                  operatore: 'Staff', 
                  tipo_log: 'temperatura', 
                  valore: val, 
                  conformita: conforme, 
                  azione_correttiva: azione, 
                  foto_prova_url: currentInput.photo || '',
                  data_ora: dataOraEffettiva // Se null, il backend mette NOW()
              }) 
          }); 

          setTempInput(prev => { const n = {...prev}; delete n[asset.id]; return n; }); 
          await ricaricaDati(); 
          
      } catch (error) {
          alert("Errore di connessione: " + error.message);
      }
  };


  const abilitaNuovaMisurazione = (asset) => { const logEsistente = getTodayLog(asset.id); setTempInput(prev => ({ ...prev, [asset.id]: { val: logEsistente ? logEsistente.valore : '', photo: '' } })); };

  // --- ASSETS (CRUD + FIX DELETE) ---
  const apriModaleAsset = (asset = null) => { if(asset) { setEditingAsset(asset); setAssetForm({ ...asset }); } else { setEditingAsset(null); setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'', etichetta_url:'', stato:'attivo' }); } setShowAssetModal(true); };
  
  const salvaAsset = async (e) => { e.preventDefault(); const endpoint = editingAsset ? `${API_URL}/api/haccp/assets/${editingAsset.id}` : `${API_URL}/api/haccp/assets`; const method = editingAsset ? 'PUT' : 'POST'; await fetch(endpoint, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...assetForm, ristorante_id: info.id }) }); setShowAssetModal(false); ricaricaDati(); };
  
  // FIX 2: FUNZIONE ELIMINA ASSET
  const handleDeleteAsset = async (id) => {
    if(!window.confirm("Sei sicuro di voler eliminare questa macchina? Verrà eliminato anche lo storico.")) return;
    try {
        await fetch(`${API_URL}/api/haccp/assets/${id}`, { method: 'DELETE' });
        ricaricaDati();
    } catch (e) { console.error("Errore delete asset", e); alert("Errore durante l'eliminazione"); }
  };

  const handleAssetPhoto = async (e) => { const f = e.target.files[0]; if(!f) return; setUploadingAsset(true); try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, foto_url: url})); } finally { setUploadingAsset(false); } };
  const handleAssetLabel = async (e) => { const f = e.target.files[0]; if(!f) return; setUploadingLabel(true); try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, etichetta_url: url})); } finally { setUploadingLabel(false); } };
  
  // --- STAFF ---
  const openStaffDocs = async (user) => { setSelectedStaff(user); const r = await fetch(`${API_URL}/api/staff/docs/${user.id}`); setStaffDocs(await r.json()); };
  const uploadStaffDoc = async (e) => { const f = e.target.files[0]; if(!f) return; const url = await uploadFile(f); await fetch(`${API_URL}/api/staff/docs`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ utente_id: selectedStaff.id, tipo_doc: newDoc.tipo, nome_file: f.name, url }) }); const r = await fetch(`${API_URL}/api/staff/docs/${selectedStaff.id}`); setStaffDocs(await r.json()); setNewDoc({...newDoc, url: ''}); };
  const deleteDoc = async (id) => { if(!confirm("Eliminare documento?")) return; await fetch(`${API_URL}/api/staff/docs/${id}`, {method:'DELETE'}); const r = await fetch(`${API_URL}/api/staff/docs/${selectedStaff.id}`); setStaffDocs(await r.json()); };

  // --- DOWNLOAD & PRINT (FIX EXPORT MATRICE) ---
  const openDownloadModal = (type) => { setDownloadType(type); setShowDownloadModal(true); setSelectedMonth(''); };
  
const executeDownload = (range) => { 
      let start = new Date();
      let end = new Date();
      let rangeName = "Tutto"; 
      
      // Funzione Helper per ottenere YYYY-MM-DD locale (evita problemi di fuso orario)
      const toLocalISO = (d) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };

      if(range === 'week') { 
          // Ultima settimana
          start.setDate(end.getDate() - 7); 
          rangeName="Ultima Settimana"; 
      } else if(range === 'month') { 
          // Ultimo mese solare (30 giorni fa)
          start.setMonth(end.getMonth() - 1); 
          rangeName="Ultimo Mese"; 
      } else if (range === 'custom-month') { 
          // Mese specifico selezionato dal calendario
          if(!selectedMonth) return alert("Seleziona un mese!"); 
          const [y, m] = selectedMonth.split('-'); 
          start = new Date(y, m - 1, 1);     // Primo del mese
          end = new Date(y, m, 0);           // Ultimo del mese (giorno 0 del mese successivo)
          rangeName = `Mese di ${start.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`; 
      } else if(range === 'all') { 
          start = new Date('2020-01-01'); 
          rangeName="Storico Completo"; 
      } 
      
      // Assicuriamoci che end sia oggi a fine giornata se non specificato diversamente
      if (range !== 'custom-month') {
          end = new Date();
      }

      // Costruiamo la query string con date PULITE (YYYY-MM-DD)
      const sDate = toLocalISO(start);
      const eDate = toLocalISO(end);

      // Debug (opzionale): console.log("Scaricando:", sDate, eDate);

      const query = `?start=${sDate}&end=${eDate}&rangeName=${rangeName}&format=${downloadFormat}`;
      
      // Apre in una nuova scheda
      window.open(`${API_URL}/api/haccp/export/${downloadType}/${info.id}${query}`, '_blank'); 
      
      setShowDownloadModal(false); 
  };
  
  const handleLabelTypeChange = (e) => { const type = e.target.value; let days = 3; if (type === 'negativo') days = 180; if (type === 'sottovuoto') days = 10; const newDate = new Date(); newDate.setDate(newDate.getDate() + days); setLabelData({ ...labelData, tipo: type, giorni_scadenza: days, scadenza_manuale: newDate.toISOString().split('T')[0] }); };
  const handlePrintLabel = async (e) => { e.preventDefault(); const scadenza = labelData.scadenza_manuale ? new Date(labelData.scadenza_manuale) : new Date(); if(!labelData.scadenza_manuale) scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza)); const res = await fetch(`${API_URL}/api/haccp/labels`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) }); const data = await res.json(); if(data.success) { setLastLabel(data.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); } };
  const handleReprint = (label) => { setLastLabel(label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); };
  const handlePrintQR = (asset) => { setShowQRModal(asset); };
  const printOnlyQR = () => { setPrintMode('qr'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); };

// --- RENDER 1: CARICAMENTO (CENTRATO) ---
  if(!info) return (
      <div style={{
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          width: '100vw',
          background: '#ecf0f1', // Stesso colore di sfondo dell'app
          color: '#7f8c8d',
          fontSize: '1.2rem',
          fontWeight: 'bold'
      }}>
          ⏳ Caricamento...
      </div>
  );

// --- RENDER 2: LOGIN (CON CSS INCLUSO) ---
  if(!isAuthorized) {
      return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-icon-circle">
                    🛡️
                </div>
                <h2 className="login-title">Accesso HACCP</h2>
                <p className="login-subtitle">{info.ristorante}</p>
                
                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <input 
                            type="password" 
                            className="login-input"
                            placeholder="Inserisci Password..." 
                            value={password} 
                            onChange={e=>setPassword(e.target.value)} 
                            autoFocus
                        />
                    </div>
                    
                    {loginError && <div className="login-error">⚠️ {loginError}</div>}
                    
                    <button className="login-btn" disabled={loadingLogin}>
                        {loadingLogin ? "Verifica in corso..." : "ENTRA"}
                    </button>
                </form>
                <div className="login-footer">Sistema Jarvis</div>
            </div>

            {/* --- IMPORTANTE: IL CSS DEVE ESSERE ANCHE QUI PER ESSERE VISTO --- */}
            <style>{`
                /* RESET & BASE */
                .haccp-container { min-height: 100vh; background: #ecf0f1; padding: 20px; font-family: sans-serif; box-sizing: border-box; }
                .main-wrapper { max-width: 100%; overflow-x: hidden; }
                
                /* HEADER */
                .header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
                .app-title { margin: 0; color: #2c3e50; font-size: 24px; }
                
                /* NAVIGATION */
                .nav-buttons { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
                .nav-btn { padding: 10px 15px; border-radius: 5px; border: none; cursor: pointer; font-weight: bold; text-transform: uppercase; background: white; color: #333; font-size: 13px; }
                .nav-btn.active { background: #2c3e50; color: white; }
                .nav-btn.logout { background: #e74c3c; color: white; }

                /* --- LOGIN STYLES --- */
                .login-wrapper {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    /* Assicuriamoci che occupi tutto lo schermo */
                    position: fixed; 
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 9999;
                }
                .login-card {
                    background: white;
                    padding: 40px 30px;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 380px;
                    text-align: center;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
                    animation: fadeIn 0.5s ease-out;
                }
                .login-icon-circle {
                    width: 60px;
                    height: 60px;
                    background: #ecf0f1;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    margin: 0 auto 15px auto;
                }
                .login-title {
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                    font-size: 22px;
                    font-weight: 800;
                }
                .login-subtitle {
                    margin: 0 0 25px 0;
                    color: #7f8c8d;
                    font-size: 14px;
                }
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .login-input {
                    width: 100%;
                    padding: 14px;
                    border-radius: 8px;
                    border: 2px solid #ecf0f1;
                    font-size: 16px;
                    outline: none;
                    transition: border-color 0.3s;
                    text-align: center;
                    box-sizing: border-box;
                }
                .login-input:focus {
                    border-color: #3498db;
                }
                .login-btn {
                    padding: 14px;
                    background: #27ae60;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 16px;
                    cursor: pointer;
                    transition: transform 0.1s, background 0.3s;
                }
                .login-btn:hover {
                    background: #219150;
                }
                .login-btn:active {
                    transform: scale(0.98);
                }
                .login-btn:disabled {
                    background: #95a5a6;
                    cursor: not-allowed;
                }
                .login-error {
                    color: #e74c3c;
                    font-size: 13px;
                    background: #fadbd8;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: bold;
                }
                .login-footer {
                    margin-top: 25px;
                    font-size: 10px;
                    color: #bdc3c7;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
      );
  }

  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina','congelatore','abbattitore'].includes(a.tipo));

  // --- RENDER 3: APPLICAZIONE ---
  return (
    <div className="haccp-container main-wrapper">
      
      {!scanId && (
          <div className="no-print header-nav">
              <div style={{flex:1, display:'flex', alignItems:'center', gap:10}}>
                  <div style={{fontSize:'2rem'}}>🛡️</div>
                  <div>
                    <h1 className="app-title">HACCP Control</h1>
                    <div style={{fontSize:'0.8rem', opacity:0.7}}>{info.ristorante}</div>
                  </div>
              </div>
              <div className="nav-buttons">
                  {['temperature', 'merci', 'pulizie', 'calendario', 'etichette', 'staff', 'setup'].map(t => (
                    <button key={t} onClick={()=>setTab(t)} className={`nav-btn ${tab===t ? 'active' : ''}`}>
                      {t==='merci' ? '📦 Merci' : (t==='setup' ? '⚙️ Macchine' : (t==='staff' ? '👥 Staff' : (t==='pulizie' ? '🧼 Pulizia' : (t==='etichette' ? '🏭 Prod.' : t))))}
                    </button>
                  ))}
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} className="nav-btn logout">Esci</button>
              </div>
          </div>
      )}

      {/* --- CONTENUTI TAB --- */}
      <div className="tab-content">
          {tab === 'temperature' && (
              <TempControl 
                assetsToDisplay={assetsToDisplay} getTodayLog={getTodayLog} tempInput={tempInput} setTempInput={setTempInput}
                registraTemperatura={registraTemperatura} handleLogPhoto={handleLogPhoto} abilitaNuovaMisurazione={abilitaNuovaMisurazione} 
                logs={logs} // Importante: passiamo logs completo per la tabella
                openDownloadModal={openDownloadModal}
              />
          )}

          {tab === 'merci' && !scanId && (
            <MerciManager 
               ristoranteId={info.id} mode="haccp" title="Ricevimento Materie Prime" API_URL={API_URL} openDownloadModal={openDownloadModal}
            />
          )}
          
          {tab === 'pulizie' && !scanId && (
              <CleaningManager info={info} API_URL={API_URL} staffList={staffList} openDownloadModal={openDownloadModal} />
          )}

          {tab === 'calendario' && !scanId && (
              <HaccpCalendar 
                currentDate={currentDate}
                cambiaMese={(d) => { const n = new Date(currentDate); n.setMonth(n.getMonth() + d); setCurrentDate(n); setSelectedDayLogs(null); }}
                calendarLogs={calendarData.logs}
                merci={calendarData.merci}
                pulizie={calendarData.pulizie}
                labels={calendarData.labels}
                selectedDayLogs={selectedDayLogs}
                setSelectedDayLogs={setSelectedDayLogs}
                openGlobalPreview={openGlobalPreview}
              />
          )}
          
          {tab === 'staff' && !scanId && (<StaffManager staffList={staffList} selectedStaff={selectedStaff} openStaffDocs={openStaffDocs} setSelectedStaff={setSelectedStaff} newDoc={newDoc} setNewDoc={setNewDoc} uploadStaffDoc={uploadStaffDoc} uploadFile={uploadFile} staffDocs={staffDocs} deleteDoc={deleteDoc} API_URL={API_URL} handleFileAction={(url)=>openGlobalPreview(url,"Doc_Staff")} />)}
          
          {/* FIX: PASSATA LA PROP onDeleteAsset */}
          {tab === 'setup' && !scanId && (
            <AssetSetup 
                assets={assets} apriModaleAsset={apriModaleAsset} setShowQRModal={setShowQRModal} 
                handleFileAction={(url)=>openGlobalPreview(url, "Foto_Asset")} openDownloadModal={openDownloadModal} 
                handlePrintQR={handlePrintQR} 
                onDeleteAsset={handleDeleteAsset} 
            />
          )}
          
          {tab === 'etichette' && !scanId && (<LabelGenerator labelData={labelData} setLabelData={setLabelData} handleLabelTypeChange={handleLabelTypeChange} handlePrintLabel={handlePrintLabel} lastLabel={lastLabel} info={info} API_URL={API_URL} staffList={staffList} handleReprint={handleReprint} openDownloadModal={openDownloadModal} merciList={merci} />)}
      </div>

      {/* --- MODALE DOWNLOAD --- */}
      {showDownloadModal && (
          <div className="modal-overlay">
              <div className="modal-content small-modal">
                  <h3>Scarica Report</h3>
                  <div className="modal-section bg-light">
                       <p className="bold-label">Formato:</p>
                       <div className="flex-center gap-10">
                           <button onClick={()=>setDownloadFormat('excel')} className={`pill-btn ${downloadFormat==='excel'?'green':'gray'}`}>Excel</button>
                           <button onClick={()=>setDownloadFormat('pdf')} className={`pill-btn ${downloadFormat==='pdf'?'red':'gray'}`}>PDF</button>
                       </div>
                  </div>
                  <div className="flex-col gap-10">
                      <div className="flex-row gap-5">
                          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="input-std flex-1" />
                          <button onClick={()=>executeDownload('custom-month')} className="btn-primary purple">SCARICA</button>
                      </div>
                      <button onClick={()=>executeDownload('week')} className="btn-primary blue">Ultima Settimana</button>
                      <button onClick={()=>executeDownload('month')} className="btn-primary dark-blue">Ultimi 30 Giorni</button>
                      <button onClick={()=>executeDownload('all')} className="btn-primary dark">Tutto lo storico</button>
                  </div>
                  <button onClick={()=>setShowDownloadModal(false)} className="btn-text">Annulla</button>
              </div>
          </div>
      )}

      {/* --- MODALE ASSET --- */}
      {showAssetModal && (
        <div className="modal-overlay">
            <div className="modal-content medium-modal">
                <h2 className="modal-title">{editingAsset ? '✏️ Modifica Macchina' : '✨ Nuova Macchina'}</h2>
                <form onSubmit={salvaAsset} className="grid-form">
                    <div className="span-2"><label className="lbl">Nome Identificativo</label><input required value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} className="input-std" placeholder="Es. Frigo Cucina" /></div>
                    <div>
    <label className="lbl">Ubicazione (Locale)</label>
    <select value={assetForm.locale || ''} onChange={e=>setAssetForm({...assetForm, locale:e.target.value})} className="input-std">
        <option value="Cucina">Cucina</option>
        <option value="Bar">Bar</option>
        <option value="Pizzeria">Pizzeria</option>
        <option value="Magazzino">Magazzino</option>
        <option value="Sala">Sala</option>
    </select>
</div>
                    <div><label className="lbl">Tipo</label><select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})} className="input-std"><option value="frigo">Frigorifero</option><option value="cella">Cella</option><option value="vetrina">Vetrina</option><option value="congelatore">Congelatore</option><option value="abbattitore">Abbattitore</option><option value="altro">Altro</option></select></div>
                    <div><label className="lbl">Stato</label><select value={assetForm.stato} onChange={e=>setAssetForm({...assetForm, stato:e.target.value})} className="input-std"><option value="attivo">Attivo</option><option value="manutenzione">Manutenzione</option><option value="spento">Spento</option></select></div>
                    <div><label className="lbl">Min °C</label><input type="number" step="0.1" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} className="input-std" /></div>
                    <div><label className="lbl">Max °C</label><input type="number" step="0.1" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} className="input-std" /></div>
                    <div><label className="lbl">Marca</label><input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} className="input-std" /></div>
                    <div><label className="lbl">Modello</label><input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} className="input-std" /></div>
                    <div className="span-2"><label className="lbl">Serial Number</label><input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} className="input-std" /></div>
                    
                    <div className="span-2 flex-row gap-10 stack-mobile">
                        <div className="flex-1"><label className="lbl">Foto</label><input type="file" onChange={handleAssetPhoto} className="input-file" />{assetForm.foto_url && <span className="success-text">✅ OK</span>}</div>
                        <div className="flex-1"><label className="lbl">Etichetta</label><input type="file" onChange={handleAssetLabel} className="input-file" />{assetForm.etichetta_url && <span className="success-text">✅ OK</span>}</div>
                    </div>
                    
                    <div className="span-2 flex-row gap-10 mt-10">
                        <button type="button" onClick={()=>setShowAssetModal(false)} className="btn-cancel flex-1">Annulla</button>
                        <button type="submit" className="btn-confirm flex-1">{editingAsset ? 'AGGIORNA' : 'CREA'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- SUPER MODALE ANTEPRIMA --- */}
      {globalPreview && (
          <div className="modal-overlay z-high">
              <div className="modal-content large-preview">
                  <div className="preview-header">
                      <span className="preview-title">📄 {globalPreview.name}</span>
                      <div className="flex-row gap-10">
                          <button onClick={handleForceDownload} disabled={isDownloading} className={`btn-icon ${isDownloading ? 'gray' : 'green'}`}>
                              {isDownloading ? '⏳' : '⬇️'}
                          </button>
                          <button onClick={() => setGlobalPreview(null)} className="btn-icon red">X</button>
                      </div>
                  </div>
                  <div className="preview-body">
                      {globalPreview.type === 'pdf' ? (
                          <iframe src={globalPreview.previewUrl} className="preview-frame" title="Anteprima" />
                      ) : (
                          <img src={globalPreview.previewUrl} alt="Anteprima" className="preview-img" />
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {/* --- QR Code & Print --- */}
      {showQRModal && (<div className="modal-overlay z-max"><div className="modal-content small-modal center-text"><h2 className="mb-20 dark-text">{showQRModal.nome}</h2><div className="qr-box"><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={250} /></div><div className="mt-30 flex-center gap-10"><button onClick={printOnlyQR} className="btn-primary dark">🖨️ Stampa QR</button><button onClick={()=>setShowQRModal(null)} className="btn-primary red">Chiudi</button></div></div></div>)}
      {printMode === 'qr' && showQRModal && (<div className="print-area qr-print"><h1 className="big-text">{showQRModal.nome}</h1><QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={400} /><p className="mt-20">Scansiona per registrare la temperatura</p></div>)}
      {printMode === 'label' && lastLabel && (
        <div className="print-area label-print">
            <div className="lbl-title">{lastLabel.prodotto}</div>
            {lastLabel.ingredienti && (<div className="lbl-ingr"><span className="bold">Ingr:</span> {lastLabel.ingredienti}</div>)}
            <div className="lbl-footer"><span>PROD: <strong>{new Date(lastLabel.data_produzione).toLocaleDateString()}</strong></span><span>OP: {lastLabel.operatore.substring(0,8)}</span></div>
            <div className="lbl-center"><div className="lbl-small">Scadenza</div><div className="lbl-big">{new Date(lastLabel.data_scadenza).toLocaleDateString()}</div></div>
            <div className="lbl-bottom">Lotto: {lastLabel.lotto}</div>
        </div>
      )}

      {/* --- CSS RESPONSIVE & MOBILE --- */}
      <style>{`
        /* RESET & BASE */
        .haccp-container { min-height: 100vh; background: #ecf0f1; padding: 20px; font-family: sans-serif; box-sizing: border-box; }
        .main-wrapper { max-width: 100%; overflow-x: hidden; }
        
        /* HEADER */
        .header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .app-title { margin: 0; color: #2c3e50; font-size: 24px; }
        
        /* NAVIGATION */
        .nav-buttons { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
        .nav-btn { padding: 10px 15px; border-radius: 5px; border: none; cursor: pointer; font-weight: bold; text-transform: uppercase; background: white; color: #333; font-size: 13px; }
        .nav-btn.active { background: #2c3e50; color: white; }
        .nav-btn.logout { background: #e74c3c; color: white; }

        /* MODALS (RESPONSIVE) */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 10px; }
        .modal-content { background: white; padding: 20px; border-radius: 10px; width: 100%; max-height: 90vh; overflow-y: auto; box-sizing: border-box; }
        .small-modal { max-width: 350px; }
        .medium-modal { max-width: 600px; }
        .large-preview { width: 95%; max-width: 1000px; height: 90%; display: flex; flex-direction: column; padding: 0; overflow: hidden; }
        .z-high { z-index: 9999; }
        .z-max { z-index: 3000; }
        
        /* PREVIEW MODAL */
        .preview-header { padding: 10px 15px; background: #ecf0f1; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
        .preview-title { font-weight: bold; color: #2c3e50; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
        .preview-body { flex: 1; background: #555; overflow: hidden; display: flex; justify-content: center; align-items: center; }
        .preview-frame { width: 100%; height: 100%; border: none; }
        .preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }

        /* --- STILI TEMPERATURE (MOBILE OPTIMIZED) --- */
        .temp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .temp-card { padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: relative; }
        .temp-card.active { background: white; border-top: 5px solid #bdc3c7; }
        .temp-card.done { background: #eafaf1; border: 2px solid #27ae60; }
        .temp-card.spento { background: #e0e0e0; border: 2px solid #999; opacity: 0.8; }
        .btn-download-report { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px; }
        .temp-card-input-area { display: flex; gap: 10px; align-items: stretch; height: 45px; }
        .temp-input { flex: 1; border-radius: 5px; border: 1px solid #ddd; font-size: 18px; text-align: center; font-weight: bold; min-width: 0; }
        .temp-actions { display: flex; gap: 5px; }
        .btn-action { border: none; border-radius: 5px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 12px; height: 100%; }
        .btn-action.off { width: 45px; background: #95a5a6; color: white; font-size: 10px; }
        .btn-action.photo { width: 45px; background: #f1f2f6; border: 1px solid #ddd; cursor: pointer; font-size: 18px; }
        .btn-action.photo.has-photo { background: #2ecc71; border-color: #27ae60; color: white; }
        .btn-action.save { width: 60px; background: #2c3e50; color: white; }
        .btn-modify { margin-top: 15px; width: 100%; background: #f39c12; color: white; border: none; padding: 10px; borderRadius: 5px; font-weight: bold; cursor: pointer; }
        .btn-cancel-edit { margin-top: 5px; width: 100%; font-size: 10px; background: transparent; border: none; color: #999; cursor: pointer; text-decoration: underline; }
        .badge-off { position: absolute; top: 10px; right: 10px; background: #555; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .status-box-off { height: 40px; background: #ccc; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #777; font-weight: bold; font-size: 12px; margin-top: 10px; }

        /* FORM GRIDS */
        .grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .span-2 { grid-column: span 2; }
        .input-std { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .lbl { font-size: 12px; font-weight: bold; display: block; margin-bottom: 3px; }
        .flex-row { display: flex; }
        .flex-col { display: flex; flex-direction: column; }
        .flex-center { display: flex; justify-content: center; align-items: center; }
        .gap-10 { gap: 10px; } .gap-5 { gap: 5px; }
        .flex-1 { flex: 1; }
        
        /* BUTTONS */
        .btn-primary { padding: 12px; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-cancel { background: #ccc; border: none; padding: 10px; border-radius: 5px; cursor: pointer; }
        .btn-confirm { background: #27ae60; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .btn-icon { padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; color: white; }
        .btn-text { margin-top: 20px; background: transparent; border: none; color: #999; cursor: pointer; text-decoration: underline; }
        .pill-btn { padding: 5px 15px; border: none; border-radius: 20px; cursor: pointer; }
        
        /* COLORS */
        .green { background: #27ae60; } .red { background: #e74c3c; } .gray { background: #eee; color: black; }
        .blue { background: #3498db; } .dark-blue { background: #2980b9; } .purple { background: #8e44ad; } .dark { background: #2c3e50; }
        .bg-light { background: #f9f9f9; }
        
        /* PRINT STYLES */
        .print-area { position: fixed; top: 0; left: 0; background: white; z-index: 9999; display: flex; flex-direction: column; }
        .qr-print { width: 100%; height: 100%; align-items: center; justify-content: center; }
        .label-print { width: 58mm; height: 40mm; color: black; padding: 2mm; box-sizing: border-box; font-family: Arial, sans-serif; border: 1px solid black; }
        .lbl-title { font-weight: 900; font-size: 12px; text-align: center; border-bottom: 1px solid black; padding-bottom: 2px; text-transform: uppercase; line-height: 1em; margin-bottom: 2px; }
        .lbl-ingr { font-size: 7px; text-align: left; margin-bottom: 2px; line-height: 8px; overflow: hidden; white-space: pre-wrap; max-height: 12mm; }
        .lbl-footer { display: flex; justify-content: space-between; margin-top: auto; font-size: 8px; border-top: 1px solid #ccc; padding-top: 2px; }
        .lbl-center { text-align: center; margin-top: 1px; }
        .lbl-small { font-size: 7px; text-transform: uppercase; }
        .lbl-big { font-weight: 900; font-size: 14px; }
        .lbl-bottom { font-size: 7px; text-align: center; border-top: 1px solid black; padding-top: 1px; margin-top: 1px; }

        /* --- MOBILE OVERRIDES --- */
        @media (max-width: 768px) {
            .haccp-container { padding: 10px; }
            .header-nav { flex-direction: column; align-items: stretch; text-align: center; }
            .nav-buttons { justify-content: center; overflow-x: auto; white-space: nowrap; padding-bottom: 5px; }
            .nav-btn { flex: 0 0 auto; font-size: 12px; padding: 8px 12px; }
            
            /* Grids become 1 column */
            .grid-form { grid-template-columns: 1fr; }
            .span-2 { grid-column: span 1; }
            
            /* Stack elements */
            .stack-mobile { flex-direction: column; }
            
            /* Tables need horizontal scroll */
            table { display: block; overflow-x: auto; white-space: nowrap; }
            
            /* Calendar adjustments */
            .calendar-grid { grid-template-columns: repeat(7, 1fr); font-size: 10px; }
            
            /* Modals full width */
            .modal-content { width: 100%; max-width: 100%; border-radius: 0; height: 100%; max-height: 100%; }
            .small-modal, .medium-modal { border-radius: 10px; height: auto; }
        }

        /* --- MOBILE TWEAKS PER TEMPERATURE (< 480px) --- */
        @media (max-width: 480px) {
            /* Forza 1 colonna per le card */
            .temp-grid { grid-template-columns: 1fr; gap: 15px; } 

            /* Se lo schermo è MOLTO piccolo, metti i bottoni SOTTO l'input */
            .temp-card-input-area { flex-wrap: wrap; height: auto; }
            .temp-input { width: 100%; height: 45px; margin-bottom: 5px; }
            .temp-actions { width: 100%; display: flex; justify-content: space-between; height: 40px; }
            .btn-action { flex: 1; } /* Bottoni larghi uguali */
        }

        @media print { 
            .no-print { display: none !important; } 
            .print-area { display: flex !important; } 
            body { margin: 0; padding: 0; } 
            @page { margin: 0; size: auto; } 
        }
      `}</style>
    </div>
  );
}

export default Haccp;