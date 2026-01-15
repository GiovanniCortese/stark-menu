// client/src/Haccp.jsx - VERSIONE V4 (QR CODE + EDIT + DAILY CHECK) 🚀
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; // <--- ASSICURATI DI AVERLO INSTALLATO

function Haccp() {
  const { slug, scanId } = useParams(); // scanId cattura l'ID se arriviamo da un QR
  const navigate = useNavigate();
  
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // Dati
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [calendarLogs, setCalendarLogs] = useState([]); 
  const [tab, setTab] = useState('temperature'); 
  
  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Edit Log (Nuovo)
  const [editingLogId, setEditingLogId] = useState(null); // ID del log che stiamo modificando

  // Stati Asset Edit
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', foto_url:'' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Stati QR
  const [showQRModal, setShowQRModal] = useState(null); // Asset di cui mostrare il QR

  // Stati Etichette
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);

  // Stati Calendario
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); 

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
      
      // Se arriviamo da un QR Code, andiamo dritti al sodo
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
      // Carichiamo abbastanza log per coprire gli ultimi giorni
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario') return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      try {
          const res = await fetch(`${API_URL}/api/haccp/logs/${info.id}?start=${start}&end=${end}`);
          const data = await res.json();
          setCalendarLogs(data);
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

  // ==========================
  // HELPER: LOG DI OGGI
  // ==========================
  const getTodayLog = (assetId) => {
      const today = new Date().toDateString();
      return logs.find(l => l.asset_id === assetId && new Date(l.data_ora).toDateString() === today);
  };

  // ==========================
  // LOGICA TEMPERATURE & EDIT
  // ==========================
  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try {
          const url = await uploadFile(f);
          setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }}));
      } finally { setUploadingLog(null); }
  };

  const registraOAggiornaTemperatura = async (asset, isEdit = false, logId = null) => {
      const currentInput = tempInput[asset.id] || {};
      const val = parseFloat(currentInput.val);
      
      if(isNaN(val)) return alert("Inserisci un numero valido");
      
      const realMin = Math.min(parseFloat(asset.range_min), parseFloat(asset.range_max));
      const realMax = Math.max(parseFloat(asset.range_min), parseFloat(asset.range_max));
      const conforme = val >= realMin && val <= realMax;
      
      let azione = "";
      if(!conforme) {
          azione = prompt(`⚠️ ATTENZIONE: Temperatura ${val}°C fuori range.\nDescrivi azione correttiva:`, isEdit ? (getTodayLog(asset.id)?.azione_correttiva || "") : "");
          if(!azione) return alert("Azione correttiva obbligatoria!");
      }

      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `${API_URL}/api/haccp/logs/${logId}` : `${API_URL}/api/haccp/logs`;

      await fetch(url, {
          method, headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val.toString(), 
              conformita: conforme, azione_correttiva: azione,
              foto_prova_url: currentInput.photo || (isEdit ? getTodayLog(asset.id)?.foto_prova_url : '')
          })
      });

      alert(isEdit ? "✅ Modifica Salvata!" : "✅ Registrato!");
      setTempInput(prev => ({ ...prev, [asset.id]: { val: '', photo: '' } })); 
      setEditingLogId(null);
      ricaricaDati();
      if(scanId) navigate(`/haccp/${slug}`); // Se eravamo in scan mode, torna alla home haccp
  };

  const eliminaLog = async (logId) => {
      if(confirm("Eliminare questa registrazione?")) {
          await fetch(`${API_URL}/api/haccp/logs/${logId}`, { method: 'DELETE' });
          ricaricaDati();
          setEditingLogId(null);
      }
  };

  // ==========================
  // ASSET CRUD
  // ==========================
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
  // (Eliminazione asset omessa per brevità, uguale a prima)

  // ==========================
  // CALENDARIO & ETICHETTE (Standard)
  // ==========================
  const getDaysInMonth = (date) => {
      const year = date.getFullYear(), month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); 
      const emptySlots = firstDay === 0 ? 6 : firstDay - 1; 
      return { days, emptySlots };
  };
  const cambiaMese = (d) => { const n=new Date(currentDate); n.setMonth(n.getMonth()+d); setCurrentDate(n); setSelectedDayLogs(null); };

  const generaEtichetta = async (e) => {
      e.preventDefault();
      const scadenza = new Date(); scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      const res = await fetch(`${API_URL}/api/haccp/labels`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ristorante_id: info.id, prodotto: labelData.prodotto, data_scadenza: scadenza, operatore: labelData.operatore || 'Chef', tipo_conservazione: labelData.tipo }) });
      const data = await res.json(); if(data.success) { setLastLabel(data.label); setTimeout(() => window.print(), 500); }
  };


  // --- UI RENDER ---
  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50', flexDirection:'column'}}>
          <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}>
              <h1>🛡️ HACCP Access</h1>
              <h3>{info.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password HACCP" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:10, width:'100%', marginBottom:10}} />
                  <button style={{width:'100%', padding:10, background:'#27ae60', color:'white', border:'none', cursor:'pointer'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  // FILTRO ASSET: Se c'è scanId mostriamo SOLO quell'asset, altrimenti tutti
  const assetsToDisplay = scanId ? assets.filter(a => a.id.toString() === scanId) : assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo));

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20, fontFamily:'sans-serif'}}>
      
      {/* HEADER NO-PRINT */}
      {!scanId && (
          <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
              <div><h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Control</h1></div>
              <div style={{display:'flex', gap:10}}>
                  {['temperature', 'calendario', 'etichette', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase', background: tab===t ? '#2c3e50' : 'white', color: tab===t ? 'white' : '#333'}}>{t}</button>
                  ))}
                  <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer'}}>ESCI</button>
              </div>
          </div>
      )}

      {scanId && <div style={{textAlign:'center', marginBottom:20}}><h2 style={{color:'#2c3e50'}}>📱 Modalità Scansione</h2><button onClick={()=>navigate(`/haccp/${slug}`)} style={{background:'#95a5a6', color:'white', border:'none', padding:10, borderRadius:5}}>Torna alla Lista Completa</button></div>}

      {/* 1. SEZIONE TEMPERATURE (LISTA + SCAN) */}
      {tab === 'temperature' && (
          <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20}}>
              {assetsToDisplay.map(asset => {
                  const todayLog = getTodayLog(asset.id);
                  const isEditing = editingLogId === asset.id;
                  const currentData = tempInput[asset.id] || { val: isEditing ? todayLog?.valore : '', photo: '' };
                  
                  // Se c'è un log di oggi e NON stiamo modificando, mostra card VERDE "Fatto"
                  if (todayLog && !isEditing) {
                      return (
                          <div key={asset.id} style={{background:'#eafaf1', padding:20, borderRadius:10, border:'2px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                  <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                                  <span style={{fontSize:'20px', fontWeight:'bold'}}>{todayLog.valore}°C</span>
                              </div>
                              <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                                  Registrato alle {new Date(todayLog.data_ora).toLocaleTimeString()}
                                  {todayLog.conformita ? '' : ' ⚠️ Anomalia segnalata'}
                              </div>
                              <button onClick={() => { setEditingLogId(asset.id); setTempInput(prev=>({...prev, [asset.id]:{val: todayLog.valore, photo:''}})) }} style={{marginTop:15, width:'100%', background:'#f39c12', color:'white', border:'none', padding:10, borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>
                                  ✏️ MODIFICA / CORREGGI
                              </button>
                          </div>
                      );
                  }

                  // Altrimenti mostra CARD INSERIMENTO (Grigia o Edit Mode)
                  return (
                      <div key={asset.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:`5px solid ${isEditing ? '#f39c12' : '#bdc3c7'}`}}>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                              <div>
                                  <h3 style={{margin:0, fontSize:'18px'}}>{asset.nome} {isEditing && <span style={{fontSize:'12px', color:'#f39c12'}}>(Modifica)</span>}</h3>
                                  <div style={{fontSize:'12px', color:'#7f8c8d'}}>{asset.marca} {asset.modello}</div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                  <span style={{background:'#f0f0f0', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:'bold', display:'block'}}>Range: {asset.range_min}° / {asset.range_max}°</span>
                              </div>
                          </div>
                          
                          <div style={{display:'flex', gap:10, alignItems:'center'}}>
                              <input 
                                  type="number" step="0.1" placeholder="°C" 
                                  value={currentData.val} 
                                  onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})}
                                  style={{flex:1, padding:12, borderRadius:5, border:'1px solid #ddd', fontSize:20, textAlign:'center', fontWeight:'bold', color:'#2c3e50'}} 
                              />
                              <label style={{cursor:'pointer', background: currentData.photo ? '#2ecc71' : '#eee', padding:10, borderRadius:5, fontSize:'20px'}}>
                                  📷<input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                              </label>
                              <button onClick={()=>registraOAggiornaTemperatura(asset, isEditing, todayLog?.id)} style={{background: isEditing ? '#f39c12' : '#2c3e50', color:'white', border:'none', padding:'0 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold', height:'48px'}}>
                                  {isEditing ? 'AGGIORNA' : 'SALVA'}
                              </button>
                          </div>
                          
                          {isEditing && (
                              <button onClick={()=>eliminaLog(todayLog.id)} style={{marginTop:10, width:'100%', background:'transparent', border:'1px solid #e74c3c', color:'#e74c3c', padding:5, borderRadius:5, cursor:'pointer', fontSize:'12px'}}>
                                  🗑️ Elimina Registrazione
                              </button>
                          )}
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. CALENDARIO (Solo lettura/Audit) */}
      {tab === 'calendario' && !scanId && (
          <div style={{background:'white', padding:20, borderRadius:10}}>
             {/* ... CODICE CALENDARIO UGUALE ALLA V3 (Omesso per brevità, non cambia logica) ... */}
             {/* Assicurati solo di usare la logica di renderizzazione della V3 qui */}
             <div style={{textAlign:'center', padding:20}}>Visualizzazione Storico Calendario Attiva</div>
             {/* (Copia qui il blocco renderCalendario() della risposta precedente se serve vederlo) */}
          </div>
      )}

      {/* 3. SETUP ASSET + QR CODE */}
      {tab === 'setup' && !scanId && (
          <div className="no-print">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                  <h2 style={{margin:0}}>⚙️ Registro Macchinari & QR</h2>
                  <button onClick={() => { setEditingAsset(null); setAssetForm({nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:''}); setShowAssetModal(true); }} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>➕ NUOVA MACCHINA</button>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
                  {assets.map(a => (
                      <div key={a.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                          <div style={{display:'flex', gap:15}}>
                              <div style={{width:80, height:80, background:'#eee', borderRadius:8, overflow:'hidden', flexShrink:0}}>
                                  {a.foto_url ? <img src={a.foto_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'30px'}}>🧊</div>}
                              </div>
                              <div style={{flex:1}}>
                                  <h3 style={{margin:0, color:'#2c3e50'}}>{a.nome}</h3>
                                  <div style={{color:'#7f8c8d', fontSize:'13px'}}>{a.tipo.toUpperCase()} • {a.marca}</div>
                              </div>
                          </div>
                          <div style={{display:'flex', gap:10, marginTop:15}}>
                              <button onClick={()=>setShowQRModal(a)} style={{flex:1, background:'#34495e', color:'white', padding:8, borderRadius:5, border:'none', cursor:'pointer'}}>🔳 QR CODE</button>
                              <button onClick={()=>{ setEditingAsset(a); setAssetForm({...a}); setShowAssetModal(true); }} style={{flex:1, background:'#f39c12', color:'white', padding:8, borderRadius:5, border:'none', cursor:'pointer'}}>✏️ MODIFICA</button>
                          </div>
                      </div>
                  ))}
              </div>

              {/* MODALE QR CODE */}
              {showQRModal && (
                  <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
                      <div style={{background:'white', padding:30, borderRadius:15, textAlign:'center', maxWidth:'300px'}}>
                          <h3>QR: {showQRModal.nome}</h3>
                          <div style={{background:'white', padding:10, display:'inline-block'}}>
                              <QRCode value={`${window.location.origin}/haccp/${slug}/scan/${showQRModal.id}`} size={200} />
                          </div>
                          <p style={{fontSize:'12px', color:'#666'}}>Stampa e attacca questo codice sul frigorifero.</p>
                          <button onClick={()=>window.print()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', marginRight:10}}>🖨️ STAMPA</button>
                          <button onClick={()=>setShowQRModal(null)} style={{background:'#95a5a6', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer'}}>CHIUDI</button>
                      </div>
                  </div>
              )}

              {/* MODALE ASSET (Stessa di prima) */}
              {showAssetModal && (
                  <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
                      <div style={{background:'white', width:'100%', maxWidth:'500px', borderRadius:10, padding:25, maxHeight:'90vh', overflowY:'auto'}}>
                          <h2 style={{marginTop:0}}>{editingAsset ? "✏️ Modifica Asset" : "➕ Nuovo Asset"}</h2>
                          <form onSubmit={salvaAsset} style={{display:'flex', flexDirection:'column', gap:15}}>
                              <input required value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo Carni)" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              <div style={{display:'flex', gap:10}}>
                                  <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min" style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max" style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              </div>
                              <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} placeholder="Marca" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} placeholder="Modello" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              <div style={{border:'2px dashed #ccc', padding:15, textAlign:'center', borderRadius:5, cursor:'pointer', position:'relative'}}>
                                  {uploadingAsset ? "Caricamento..." : (assetForm.foto_url ? "✅ Foto Caricata!" : "Clicca per caricare foto")}
                                  <input type="file" onChange={handleAssetPhoto} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                              </div>
                              <div style={{display:'flex', gap:10, marginTop:10}}>
                                  <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:5}}>SALVA</button>
                                  <button type="button" onClick={()=>setShowAssetModal(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:12, borderRadius:5}}>ANNULLA</button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 4. ETICHETTE (Standard - Omesso per brevità, usa codice V3) */}
      {tab === 'etichette' && !scanId && (
          <div className="no-print" style={{padding:20, background:'white', borderRadius:10}}>
              <h2>🏷️ Genera Etichetta</h2>
              <form onSubmit={generaEtichetta} style={{display:'flex', gap:10, alignItems:'flex-end'}}>
                  <div style={{flex:1}}><label>Prodotto</label><br/><input value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{width:'100%', padding:10}} /></div>
                  <div style={{width:80}}><label>Giorni</label><br/><input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{width:'100%', padding:10}} /></div>
                  <button style={{padding:10, background:'#3498db', color:'white', border:'none', cursor:'pointer'}}>STAMPA</button>
              </form>
          </div>
      )}

      {/* TEMPLATE STAMPA (Nascosto) */}
      {/* ... Copia il blocco .print-only e <style> dalla versione precedente ... */}
      {lastLabel && (
        <div className="print-only" style={{position:'fixed', top:0, left:0, width:'58mm', height:'40mm', background:'white', color:'black', display:'none', flexDirection:'column', padding:'2mm', boxSizing:'border-box', fontSize:'10px', fontFamily:'Arial'}}>
            <div style={{fontWeight:'bold', fontSize:'12px', textAlign:'center', borderBottom:'1px solid black', paddingBottom:'2px'}}>{lastLabel.prodotto}</div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'2px'}}><span>PROD: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span><span>OP: {lastLabel.operatore}</span></div>
            <div style={{fontWeight:'bold', fontSize:'11px', marginTop:'2px'}}>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
            <div style={{marginTop:'auto', fontSize:'9px', textAlign:'center'}}>Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      <style>{`@media print { .no-print { display: none !important; } .print-only { display: flex !important; } @page { size: auto; margin: 0mm; } body { margin: 0; } }`}</style>
    </div>
  );
}

export default Haccp;