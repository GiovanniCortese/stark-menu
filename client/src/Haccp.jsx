// client/src/Haccp.jsx - VERSIONE V3 (CALENDARIO + FIX LOGICA)
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Haccp() {
  const { slug } = useParams();
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // Dati
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]); // Ultimi logs (lista)
  const [calendarLogs, setCalendarLogs] = useState([]); // Logs per il calendario
  const [tab, setTab] = useState('temperature'); // temperature, calendario, etichette, setup
  
  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); 
  const [uploadingLog, setUploadingLog] = useState(null); 
  
  // Stati Asset Edit
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); 
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', foto_url:'' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Stati Etichette
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);

  // Stati Calendario
  const [currentDate, setCurrentDate] = useState(new Date()); // Mese visualizzato
  const [selectedDayLogs, setSelectedDayLogs] = useState(null); // Giorno cliccato

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
  }, [slug]);

  useEffect(() => {
      if(isAuthorized && info) {
          ricaricaDati();
          ricaricaCalendario(); // Carica dati mese corrente
      }
  }, [isAuthorized, info, tab, currentDate]);

  const ricaricaDati = () => {
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      // Carica ultimi 100 per la vista temperature
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
  };

  const ricaricaCalendario = async () => {
      if(tab !== 'calendario') return;
      // Calcola primo e ultimo giorno del mese visualizzato
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
  // LOGICA ASSET (CRUD)
  // ==========================
  const apriModaleAsset = (asset = null) => {
      if(asset) { setEditingAsset(asset); setAssetForm({ ...asset }); } 
      else { setEditingAsset(null); setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'' }); }
      setShowAssetModal(true);
  };

  const salvaAsset = async (e) => {
      e.preventDefault();
      const endpoint = editingAsset ? `${API_URL}/api/haccp/assets/${editingAsset.id}` : `${API_URL}/api/haccp/assets`;
      const method = editingAsset ? 'PUT' : 'POST';
      try {
          await fetch(endpoint, {
              method, headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ ...assetForm, ristorante_id: info.id })
          });
          setShowAssetModal(false); ricaricaDati();
      } catch(e) { alert("Errore salvataggio"); }
  };

  const eliminaAsset = async (id) => {
      if(confirm("Eliminare definitivamente?")) { await fetch(`${API_URL}/api/haccp/assets/${id}`, {method:'DELETE'}); ricaricaDati(); }
  };

  const handleAssetPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingAsset(true);
      try { const url = await uploadFile(f); setAssetForm(prev => ({...prev, foto_url: url})); } 
      finally { setUploadingAsset(false); }
  };

  // ==========================
  // LOGICA TEMPERATURE (FIX NEGATIVI)
  // ==========================
  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try {
          const url = await uploadFile(f);
          setTempInput(prev => ({...prev, [assetId]: { ...(prev[assetId] || {}), photo: url }}));
      } finally { setUploadingLog(null); }
  };

  const registraTemperatura = async (asset) => {
      const currentInput = tempInput[asset.id] || {};
      const val = parseFloat(currentInput.val);
      
      if(isNaN(val)) return alert("Inserisci un numero valido");
      
      // FIX INTELLIGENTE: Calcoliamo Min e Max reali indipendentemente da come sono stati scritti
      const realMin = Math.min(parseFloat(asset.range_min), parseFloat(asset.range_max));
      const realMax = Math.max(parseFloat(asset.range_min), parseFloat(asset.range_max));

      // Controllo matematico corretto (funziona anche con -4 tra -18 e 0)
      const conforme = val >= realMin && val <= realMax;
      
      let azione = "";
      if(!conforme) {
          azione = prompt(`⚠️ ATTENZIONE: Temperatura ${val}°C fuori range (${realMin}° / ${realMax}°).\nDescrivi azione correttiva:`);
          if(!azione) return alert("Azione correttiva obbligatoria!");
      }

      await fetch(`${API_URL}/api/haccp/logs`, {
          method: 'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, asset_id: asset.id, operatore: 'Staff', 
              tipo_log: 'temperatura', valore: val.toString(), 
              conformita: conforme, azione_correttiva: azione,
              foto_prova_url: currentInput.photo || ''
          })
      });
      alert("✅ Registrato");
      setTempInput(prev => ({ ...prev, [asset.id]: { val: '', photo: '' } })); 
      ricaricaDati();
  };

  // ==========================
  // LOGICA ETICHETTE (AUTO SCADENZA)
  // ==========================
  const handleLabelTypeChange = (e) => {
      const newType = e.target.value;
      let nuoviGiorni = 3;
      if (newType === 'negativo') nuoviGiorni = 180; // 6 Mesi
      if (newType === 'sottovuoto') nuoviGiorni = 10;
      
      setLabelData(prev => ({
          ...prev, 
          tipo: newType,
          giorni_scadenza: nuoviGiorni
      }));
  };

  const generaEtichetta = async (e) => {
      e.preventDefault();
      const scadenza = new Date();
      scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      
      const res = await fetch(`${API_URL}/api/haccp/labels`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id, prodotto: labelData.prodotto,
              data_scadenza: scadenza, operatore: labelData.operatore || 'Chef',
              tipo_conservazione: labelData.tipo
          })
      });
      const data = await res.json();
      if(data.success) { setLastLabel(data.label); setTimeout(() => window.print(), 500); }
  };

  // ==========================
  // LOGICA CALENDARIO (Nuova)
  // ==========================
  const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Lun
      // Aggiustiamo per far partire Lunedi (Italia)
      const emptySlots = firstDay === 0 ? 6 : firstDay - 1; 
      return { days, emptySlots };
  };

  const cambiaMese = (delta) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setCurrentDate(newDate);
      setSelectedDayLogs(null);
  };

  const renderCalendario = () => {
      const { days, emptySlots } = getDaysInMonth(currentDate);
      const grid = [];
      const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
      
      // Header Giorni
      const weekDays = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

      for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} style={{background:'#f0f0f0'}}></div>);
      
      for (let d = 1; d <= days; d++) {
          const currentDayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toLocaleDateString('it-IT');
          
          // Troviamo log di questo giorno
          const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).getDate() === d);
          const hasError = logsDelGiorno.some(l => !l.conformita);
          const hasLogs = logsDelGiorno.length > 0;
          
          let bgColor = 'white';
          if (hasLogs) bgColor = hasError ? '#ffcccc' : '#ccffcc'; // Rosso chiaro o Verde chiaro

          grid.push(
              <div key={d} 
                   onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno })}
                   style={{
                       background: bgColor, border:'1px solid #ddd', minHeight:'80px', padding:'5px', cursor:'pointer',
                       position:'relative', transition:'0.2s'
                   }}
                   className="calendar-day"
              >
                  <div style={{fontWeight:'bold', fontSize:'14px', marginBottom:'5px'}}>{d}</div>
                  {hasLogs && (
                      <div style={{fontSize:'10px', color:'#555'}}>
                          {hasError ? '⚠️ ANOMALIA' : '✅ OK'} ({logsDelGiorno.length})
                      </div>
                  )}
              </div>
          );
      }

      return (
          <div style={{background:'white', padding:20, borderRadius:10}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                  <button onClick={()=>cambiaMese(-1)} style={{padding:'5px 15px', cursor:'pointer'}}>◀ Prev</button>
                  <h2 style={{margin:0}}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                  <button onClick={()=>cambiaMese(1)} style={{padding:'5px 15px', cursor:'pointer'}}>Next ▶</button>
              </div>

              {/* Grid Settimanale */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5, marginBottom:5}}>
                  {weekDays.map(wd => <div key={wd} style={{textAlign:'center', fontWeight:'bold', background:'#2c3e50', color:'white', padding:5, borderRadius:4}}>{wd}</div>)}
              </div>

              {/* Grid Giorni */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5}}>
                  {grid}
              </div>

              {/* Dettaglio Giorno Cliccato */}
              {selectedDayLogs && (
                  <div style={{marginTop:20, borderTop:'2px solid #ddd', paddingTop:20}}>
                      <h3>📅 Dettaglio del {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h3>
                      {selectedDayLogs.logs.length === 0 ? <p>Nessuna registrazione.</p> : (
                          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                              <thead>
                                  <tr style={{background:'#eee'}}><th style={{padding:8}}>Ora</th><th style={{padding:8}}>Asset</th><th style={{padding:8}}>Temp</th><th style={{padding:8}}>Stato</th></tr>
                              </thead>
                              <tbody>
                                  {selectedDayLogs.logs.map(l => (
                                      <tr key={l.id} style={{borderBottom:'1px solid #eee', textAlign:'center'}}>
                                          <td style={{padding:8}}>{new Date(l.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                          <td style={{padding:8}}><strong>{l.nome_asset}</strong></td>
                                          <td style={{padding:8}}>{l.valore}°C</td>
                                          <td style={{padding:8}}>{l.conformita ? <span style={{color:'green', fontWeight:'bold'}}>OK</span> : <span style={{color:'red', fontWeight:'bold'}}>ERR</span>}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                      <button onClick={()=>setSelectedDayLogs(null)} style={{marginTop:10, padding:'5px 10px', cursor:'pointer'}}>Chiudi Dettaglio</button>
                  </div>
              )}
          </div>
      );
  };

  // --- UI RENDER ---
  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50', flexDirection:'column'}}>
          <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}>
              <h1>🛡️ HACCP Pro</h1>
              <h3>{info.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password HACCP" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:10, width:'100%', marginBottom:10}} />
                  <button style={{width:'100%', padding:10, background:'#27ae60', color:'white', border:'none', cursor:'pointer'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20, fontFamily:'sans-serif'}}>
      
      {/* HEADER NO-PRINT */}
      <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
          <div>
            <h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Control</h1>
            <p style={{margin:0, color:'#7f8c8d', fontSize:'14px'}}>Sistema di autocontrollo digitale</p>
          </div>
          <div style={{display:'flex', gap:10}}>
              {['temperature', 'calendario', 'etichette', 'setup'].map(t => (
                  <button key={t} onClick={()=>setTab(t)} style={{
                      padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase',
                      background: tab===t ? '#2c3e50' : 'white', color: tab===t ? 'white' : '#333', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'
                  }}>{t === 'setup' ? '⚙️ Registro' : (t === 'temperature' ? '🌡️ Controlli' : (t === 'calendario' ? '📅 Storico' : '🏷️ Etichette'))}</button>
              ))}
              <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer'}}>ESCI</button>
          </div>
      </div>

      {/* 1. SEZIONE TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20}}>
              {assets.filter(a=>['frigo','cella','vetrina'].includes(a.tipo)).map(asset => {
                  const currentData = tempInput[asset.id] || { val: '', photo: '' };
                  return (
                  <div key={asset.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:'5px solid #bdc3c7'}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                          <div>
                              <h3 style={{margin:0, fontSize:'18px'}}>{asset.nome}</h3>
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
                          <button onClick={()=>registraTemperatura(asset)} style={{background:'#2c3e50', color:'white', border:'none', padding:'0 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold', height:'48px'}}>SALVA</button>
                      </div>
                  </div>
              )})}
          </div>
      )}

      {/* 2. CALENDARIO */}
      {tab === 'calendario' && renderCalendario()}

      {/* 3. SETUP ASSET */}
      {tab === 'setup' && (
          <div className="no-print">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                  <h2 style={{margin:0}}>⚙️ Registro Macchinari</h2>
                  <button onClick={() => apriModaleAsset()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>➕ NUOVA MACCHINA</button>
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
                                  <div style={{color:'#7f8c8d', fontSize:'13px'}}>{a.tipo.toUpperCase()}</div>
                                  <div style={{fontSize:'12px', color:'#999', marginTop:5}}>S/N: {a.serial_number || 'N/A'}</div>
                              </div>
                          </div>
                          <div style={{display:'flex', gap:10, marginTop:15}}>
                              <button onClick={()=>apriModaleAsset(a)} style={{flex:1, background:'#f39c12', color:'white', padding:8, borderRadius:5, border:'none', cursor:'pointer'}}>✏️ MODIFICA</button>
                              <button onClick={()=>eliminaAsset(a.id)} style={{flex:1, background:'#e74c3c', color:'white', padding:8, borderRadius:5, border:'none', cursor:'pointer'}}>🗑️ ELIMINA</button>
                          </div>
                      </div>
                  ))}
              </div>
              {/* MODALE SETUP OMESSA PER BREVITÀ MA DEVI MANTENERE QUELLA DI PRIMA (O COPIARLA DAL CODICE PRECEDENTE) */}
              {showAssetModal && (
                  <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
                      <div style={{background:'white', width:'100%', maxWidth:'500px', borderRadius:10, padding:25, maxHeight:'90vh', overflowY:'auto'}}>
                          <h2 style={{marginTop:0}}>{editingAsset ? "✏️ Modifica Asset" : "➕ Nuovo Asset"}</h2>
                          <form onSubmit={salvaAsset} style={{display:'flex', flexDirection:'column', gap:15}}>
                              <input required value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} placeholder="Nome (es. Frigo Carni)" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              
                              <div style={{display:'flex', gap:10}}>
                                  <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} placeholder="Min °C" style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} placeholder="Max °C" style={{flex:1, padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              </div>
                              <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} placeholder="Marca" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} placeholder="Modello" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} placeholder="Serial Number" style={{padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              
                              <div style={{border:'2px dashed #ccc', padding:15, textAlign:'center', borderRadius:5, cursor:'pointer', position:'relative'}}>
                                  {uploadingAsset ? "Caricamento..." : (assetForm.foto_url ? "✅ Foto Caricata!" : "Clicca per caricare foto targhetta")}
                                  <input type="file" onChange={handleAssetPhoto} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                              </div>

                              <div style={{display:'flex', gap:10, marginTop:10}}>
                                  <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>SALVA</button>
                                  <button type="button" onClick={()=>setShowAssetModal(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:12, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>ANNULLA</button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 4. ETICHETTE (AGGIORNATO CON AUTOMAZIONE) */}
      {tab === 'etichette' && (
          <div className="no-print" style={{display:'flex', gap:30, flexWrap:'wrap'}}>
              <div style={{flex:1, background:'white', padding:30, borderRadius:10, minWidth:'300px'}}>
                  <h2>🏷️ Genera Etichetta</h2>
                  <form onSubmit={generaEtichetta} style={{display:'flex', flexDirection:'column', gap:15}}>
                      <label style={{fontWeight:'bold'}}>Prodotto</label>
                      <input required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ccc'}} />
                      
                      <div style={{display:'flex', gap:15}}>
                        <div style={{flex:1}}>
                            <label style={{fontWeight:'bold'}}>Tipo</label>
                            <select value={labelData.tipo} onChange={handleLabelTypeChange} style={{width:'100%', padding:12, borderRadius:5, border:'1px solid #ccc'}}>
                                <option value="positivo">Positivo (+3°C)</option>
                                <option value="negativo">Negativo (-18°C)</option>
                                <option value="sottovuoto">Sottovuoto</option>
                            </select>
                        </div>
                        <div style={{flex:1}}>
                            <label style={{fontWeight:'bold'}}>Scadenza (giorni)</label>
                            <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{width:'100%', padding:12, borderRadius:5, border:'1px solid #ccc'}} />
                        </div>
                      </div>

                      <label style={{fontWeight:'bold'}}>Operatore</label>
                      <input required value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ccc'}} />
                      
                      <button style={{padding:15, background:'#3498db', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:16, marginTop:10}}>🖨️ STAMPA ETICHETTA</button>
                  </form>
              </div>
              <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#bdc3c7', borderRadius:10, minHeight:'300px'}}>
                   {lastLabel ? (
                       <div style={{textAlign:'center'}}>
                           <h3>Anteprima:</h3>
                           <div style={{background:'white', width:'300px', padding:20, margin:'0 auto', border:'1px solid black'}}>
                               <h4>{lastLabel.prodotto}</h4>
                               <p>Prod: {new Date(lastLabel.data_produzione).toLocaleDateString()}</p>
                               <p>Scad: <strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></p>
                           </div>
                       </div>
                   ) : <p style={{color:'#666'}}>Nessuna etichetta generata.</p>}
              </div>
          </div>
      )}

      {/* TEMPLATE STAMPA (NASCOSTO) */}
      {lastLabel && (
        <div className="print-only" style={{position:'fixed', top:0, left:0, width:'58mm', height:'40mm', background:'white', color:'black', display:'none', flexDirection:'column', padding:'2mm', boxSizing:'border-box', fontSize:'10px', fontFamily:'Arial'}}>
            <div style={{fontWeight:'bold', fontSize:'12px', textAlign:'center', borderBottom:'1px solid black', paddingBottom:'2px'}}>{lastLabel.prodotto}</div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'2px'}}><span>PROD: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span><span>OP: {lastLabel.operatore}</span></div>
            <div style={{fontWeight:'bold', fontSize:'11px', marginTop:'2px'}}>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
            <div style={{marginTop:'auto', fontSize:'9px', textAlign:'center'}}>Lotto: {lastLabel.lotto}</div>
        </div>
      )}
      
      <style>{`
          @media print { .no-print { display: none !important; } .haccp-container { background: white !important; padding: 0 !important; } .print-only { display: flex !important; } @page { size: auto; margin: 0mm; } body { margin: 0; } }
          .calendar-day:hover { transform: scale(1.05); z-index: 10; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}

export default Haccp;