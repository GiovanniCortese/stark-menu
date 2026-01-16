import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 

// IMPORTA I NUOVI COMPONENTI
import TempControl from './components/haccp/TempControl';
import MerciManager from './components/haccp/MerciManager';
import HaccpCalendar from './components/haccp/HaccpCalendar';
import LabelGenerator from './components/haccp/LabelGenerator';
import StaffManager from './components/haccp/StaffManager';
import AssetSetup from './components/haccp/AssetSetup';
import CleaningManager from './components/haccp/CleaningManager';

function Haccp() {
  const { slug, scanId } = useParams();
  const navigate = useNavigate();

  // STATI ESISTENTI
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [merci, setMerci] = useState([]); 
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDocs, setStaffDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ tipo: 'Contratto', url: '' });
  const [tempInput, setTempInput] = useState({}); 
  const [merciForm, setMerciForm] = useState({
      id: null, data_ricezione: new Date().toISOString().split('T')[0],
      fornitore: '', prodotto: '', lotto: '', scadenza: '', temperatura: '', 
      conforme: true, integro: true, note: '', quantita: '', allegato_url: '', destinazione: ''
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);
  const [printMode, setPrintMode] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(null);

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  // --- FUNZIONI DI LOGICA ---
  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(data => setInfo(data));
      if(localStorage.getItem(`haccp_session_${slug}`) === "true") setIsAuthorized(true);
  }, [slug]);

  useEffect(() => {
      if(isAuthorized && info) ricaricaDati();
  }, [isAuthorized, info, tab]);

  const ricaricaDati = () => {
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
      fetch(`${API_URL}/api/haccp/merci/${info.id}`).then(r=>r.json()).then(setMerci);
      fetch(`${API_URL}/api/utenti?mode=staff&ristorante_id=${info.id}`).then(r=>r.json()).then(setStaffList);
  };

  // --- NUOVA GESTIONE DOWNLOAD PDF / POPUP FOTO ---
  const handleFileView = (url) => {
    if (!url) return;
    const isPDF = url.toLowerCase().endsWith('.pdf');
    if (isPDF) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', url.split('/').pop());
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        setPreviewImage(url);
    }
  };

  // --- ALTRE FUNZIONI (Registra Temp, Salva Merci, etc. - Mantieni le tue implementazioni originali) ---
  const handlePrintLabel = async (e) => {
      e.preventDefault();
      const scadenza = new Date(); scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      const res = await fetch(`${API_URL}/api/haccp/labels`, { 
          method:'POST', headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore, tipo_conservazione: labelData.tipo }) 
      });
      const data = await res.json(); 
      if(data.success) { setLastLabel(data.label); setPrintMode('label'); setTimeout(() => { window.print(); setPrintMode(null); }, 500); }
  };

  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <div style={{padding:50, textAlign:'center'}}><h1>🔒 HACCP Access</h1><form onSubmit={(e)=>{e.preventDefault(); setIsAuthorized(true); localStorage.setItem(`haccp_session_${slug}`, "true");}}><input type="password" onChange={e=>setPassword(e.target.value)} /><button>Login</button></form></div>;

  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets;

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20}}>
      
      {!scanId && (
          <div className="no-print" style={{display:'flex', justifyContent:'space-between', marginBottom:20, alignItems:'center'}}>
              <h2 style={{margin:0}}>🛡️ HACCP {info.ristorante}</h2>
              <nav style={{display:'flex', gap:10}}>
                  {['temperature', 'merci', 'pulizia', 'etichette', 'calendario', 'staff', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} style={{
                        padding:'10px 15px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold',
                        background: tab === t ? '#2c3e50' : 'white', color: tab === t ? 'white' : '#333'
                      }}>
                          {t === 'merci' ? '📦 MERCI' : (t === 'pulizia' ? '🧼 PULIZIA' : t.toUpperCase())}
                      </button>
                  ))}
              </nav>
          </div>
      )}

      {/* COMPONENTI REFACTORIZZATI */}
      {tab === 'temperature' && (
          <TempControl 
            assetsToDisplay={assetsToDisplay} getTodayLog={(id)=>logs.find(l=>l.asset_id===id)}
            tempInput={tempInput} setTempInput={setTempInput}
            registraTemperatura={()=>{}} handleLogPhoto={()=>{}} 
            abilitaNuovaMisurazione={(a)=>setTempInput({...tempInput, [a.id]:{val:''}})}
          />
      )}

      {tab === 'merci' && (
          <MerciManager 
            merci={merci} merciForm={merciForm} setMerciForm={setMerciForm}
            salvaMerci={()=>{}} handleMerciPhoto={()=>{}}
            assets={assets} eliminaMerce={()=>{}} iniziaModificaMerci={(m)=>setMerciForm(m)}
            resetMerciForm={()=>setMerciForm({})} handleFileView={handleFileView}
          />
      )}

      {tab === 'pulizia' && (
          <CleaningManager 
            info={info} API_URL={API_URL} staffList={staffList}
          />
      )}

      {tab === 'calendario' && (
          <HappCalendar 
            currentDate={currentDate} cambiaMese={(d)=>{}}
            calendarLogs={calendarLogs} merci={merci}
            selectedDayLogs={selectedDayLogs} setSelectedDayLogs={setSelectedDayLogs}
          />
      )}

      {tab === 'etichette' && (
          <LabelGenerator 
            labelData={labelData} setLabelData={setLabelData}
            handleLabelTypeChange={(e)=>{}}
            handlePrintLabel={handlePrintLabel} lastLabel={lastLabel}
            setLastLabel={setLastLabel} info={info} API_URL={API_URL} 
            staffList={staffList} handleFileView={handleFileView}
          />
      )}

      {tab === 'staff' && (
          <StaffManager 
            staffList={staffList} selectedStaff={selectedStaff}
            openStaffDocs={(u)=>{setSelectedStaff(u);}} setSelectedStaff={setSelectedStaff}
            newDoc={newDoc} setNewDoc={setNewDoc} uploadStaffDoc={()=>{}}
            staffDocs={staffDocs} deleteDoc={()=>{}} handleFileView={handleFileView}
          />
      )}

      {tab === 'setup' && (
          <AssetSetup 
            assets={assets} apriModaleAsset={()=>{}}
            setShowQRModal={setShowQRModal} setPreviewImage={setPreviewImage}
          />
      )}

      {/* MODALI E POPUP */}
      {previewImage && (
          <div onClick={() => setPreviewImage(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <img src={previewImage} alt="Anteprima" style={{maxWidth:'90%', maxHeight:'90%', borderRadius:10}} />
          </div>
      )}

      {/* AREA DI STAMPA */}
      {printMode === 'label' && lastLabel && (
        <div className="print-area" style={{position:'fixed', top:0, left:0, width:'58mm', height:'40mm', background:'white', padding:'3mm', border:'1px solid black'}}>
            <h2 style={{textAlign:'center', borderBottom:'2px solid black'}}>{lastLabel.prodotto}</h2>
            <p>SCADENZA: <strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></p>
            <p style={{fontSize:'10px'}}>Lotto: {lastLabel.lotto}</p>
        </div>
      )}

      <style>{`@media print { .no-print { display: none !important; } .print-area { display: block !important; } }`}</style>
    </div>
  );
}

export default Haccp;