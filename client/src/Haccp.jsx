// client/src/Haccp.jsx - VERSIONE PRO CON FOTO E DETTAGLI
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

function Haccp() {
  const { slug } = useParams();
  const [info, setInfo] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  
  // Dati
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('temperature'); // temperature, etichette, setup
  
  // Stati Moduli
  const [tempInput, setTempInput] = useState({}); // { assetId: {val: '', photo: ''} }
  const [uploadingLog, setUploadingLog] = useState(null); // ID asset in upload
  
  // Stati Asset Edit/Create
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); // Se null = Nuovo
  const [assetForm, setAssetForm] = useState({ 
      nome:'', tipo:'frigo', range_min:0, range_max:4, 
      marca:'', modello:'', serial_number:'', foto_url:'' 
  });
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Stati Etichette
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);

  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
  }, [slug]);

  useEffect(() => {
      if(isAuthorized && info) ricaricaDati();
  }, [isAuthorized, info, tab]);

  const ricaricaDati = () => {
      fetch(`${API_URL}/api/haccp/assets/${info.id}`).then(r=>r.json()).then(setAssets);
      fetch(`${API_URL}/api/haccp/logs/${info.id}`).then(r=>r.json()).then(setLogs);
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

  // --- UPLOAD HELPER ---
  const uploadFile = async (file) => {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
      const data = await res.json();
      return data.url;
  };

  // ==========================
  // 1. LOGICA ASSET (CRUD)
  // ==========================
  const apriModaleAsset = (asset = null) => {
      if(asset) {
          setEditingAsset(asset);
          setAssetForm({ ...asset });
      } else {
          setEditingAsset(null);
          setAssetForm({ nome:'', tipo:'frigo', range_min:0, range_max:4, marca:'', modello:'', serial_number:'', foto_url:'' });
      }
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
          setShowAssetModal(false);
          ricaricaDati();
      } catch(e) { alert("Errore salvataggio"); }
  };

  const eliminaAsset = async (id) => {
      if(confirm("Eliminare definitivamente questo macchinario?")) {
          await fetch(`${API_URL}/api/haccp/assets/${id}`, {method:'DELETE'});
          ricaricaDati();
      }
  };

  const handleAssetPhoto = async (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingAsset(true);
      try {
          const url = await uploadFile(f);
          setAssetForm(prev => ({...prev, foto_url: url}));
      } catch(e) { alert("Errore upload"); }
      finally { setUploadingAsset(false); }
  };

  // ==========================
  // 2. LOGICA TEMPERATURE
  // ==========================
  const handleLogPhoto = async (e, assetId) => {
      const f = e.target.files[0]; if(!f) return;
      setUploadingLog(assetId);
      try {
          const url = await uploadFile(f);
          setTempInput(prev => ({
              ...prev, 
              [assetId]: { ...(prev[assetId] || {}), photo: url }
          }));
      } catch(e) { alert("Errore upload"); }
      finally { setUploadingLog(null); }
  };

  const registraTemperatura = async (asset) => {
      const currentInput = tempInput[asset.id] || {};
      const val = parseFloat(currentInput.val);
      
      if(isNaN(val)) return alert("Inserisci un numero valido");
      
      const conforme = val >= asset.range_min && val <= asset.range_max;
      let azione = "";
      if(!conforme) {
          azione = prompt(`⚠️ ATTENZIONE: Temperatura ${val}°C fuori range (${asset.range_min}-${asset.range_max}).\nDescrivi azione correttiva (es. porta chiusa male):`);
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
      setTempInput(prev => ({ ...prev, [asset.id]: { val: '', photo: '' } })); // Reset
      ricaricaDati();
  };

  // ==========================
  // 3. LOGICA ETICHETTE
  // ==========================
  const generaEtichetta = async (e) => {
      e.preventDefault();
      const scadenza = new Date();
      scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));
      
      const res = await fetch(`${API_URL}/api/haccp/labels`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              ristorante_id: info.id,
              prodotto: labelData.prodotto,
              data_scadenza: scadenza,
              operatore: labelData.operatore || 'Chef',
              tipo_conservazione: labelData.tipo
          })
      });
      const data = await res.json();
      if(data.success) {
          setLastLabel(data.label);
          setTimeout(() => window.print(), 500); 
      }
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
              {['temperature', 'etichette', 'setup'].map(t => (
                  <button key={t} onClick={()=>setTab(t)} style={{
                      padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase',
                      background: tab===t ? '#2c3e50' : 'white', color: tab===t ? 'white' : '#333', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'
                  }}>{t === 'setup' ? '⚙️ Registro Macchine' : (t === 'temperature' ? '🌡️ Controlli' : '🏷️ Etichette')}</button>
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
                  <div key={asset.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:`5px solid ${currentData.val ? (parseFloat(currentData.val) >= asset.range_min && parseFloat(currentData.val) <= asset.range_max ? '#27ae60' : '#e74c3c') : '#bdc3c7'}`}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                          <div>
                              <h3 style={{margin:0, fontSize:'18px'}}>{asset.nome}</h3>
                              <div style={{fontSize:'12px', color:'#7f8c8d'}}>{asset.marca} {asset.modello}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                              <span style={{background:'#f0f0f0', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:'bold', display:'block'}}>Range: {asset.range_min}° / {asset.range_max}°</span>
                              <span style={{fontSize:'10px', color:'#999'}}>ID: {asset.id}</span>
                          </div>
                      </div>
                      
                      <div style={{display:'flex', gap:10, alignItems:'center'}}>
                          <input 
                              type="number" step="0.1" placeholder="°C" 
                              value={currentData.val} 
                              onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})}
                              style={{flex:1, padding:12, borderRadius:5, border:'1px solid #ddd', fontSize:20, textAlign:'center', fontWeight:'bold', color:'#2c3e50'}} 
                          />
                          
                          {/* Pulsante Foto Prova */}
                          <label style={{cursor:'pointer', background: currentData.photo ? '#2ecc71' : '#eee', padding:10, borderRadius:5, fontSize:'20px', position:'relative'}}>
                              📷
                              <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                              {uploadingLog === asset.id && <div style={{position:'absolute', inset:0, background:'rgba(255,255,255,0.8)', fontSize:'8px', display:'flex', alignItems:'center'}}>...</div>}
                          </label>

                          <button onClick={()=>registraTemperatura(asset)} style={{background:'#2c3e50', color:'white', border:'none', padding:'0 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold', height:'48px'}}>SALVA</button>
                      </div>
                      
                      {currentData.photo && <div style={{fontSize:'11px', color:'#27ae60', marginTop:5}}>✅ Foto allegata!</div>}
                  </div>
              )})}
              
              {/* LOGS TABLE */}
              <div style={{gridColumn:'1/-1', marginTop:30, background:'white', padding:20, borderRadius:10}}>
                  <h3>📋 Ultime Registrazioni</h3>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
                      <thead>
                          <tr style={{background:'#f8f9fa', textAlign:'left', color:'#7f8c8d'}}>
                              <th style={{padding:10}}>Data/Ora</th>
                              <th style={{padding:10}}>Asset</th>
                              <th style={{padding:10}}>Valore</th>
                              <th style={{padding:10}}>Esito</th>
                              <th style={{padding:10}}>Foto</th>
                          </tr>
                      </thead>
                      <tbody>
                          {logs.filter(l=>l.tipo_log==='temperatura').map(l => (
                              <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:10}}>{new Date(l.data_ora).toLocaleString()}</td>
                                  <td style={{padding:10}}><strong>{l.nome_asset}</strong></td>
                                  <td style={{padding:10, fontSize:'16px', fontWeight:'bold'}}>{l.valore}°C</td>
                                  <td style={{padding:10}}>
                                      {l.conformita 
                                          ? <span style={{color:'#27ae60', background:'#eafaf1', padding:'3px 8px', borderRadius:10, fontSize:'11px', fontWeight:'bold'}}>CONFORME</span> 
                                          : <div style={{color:'#c0392b'}}><span style={{fontWeight:'bold'}}>NON CONFORME</span><br/><span style={{fontSize:'11px'}}>{l.azione_correttiva}</span></div>
                                      }
                                  </td>
                                  <td style={{padding:10}}>
                                      {l.foto_prova_url ? <a href={l.foto_prova_url} target="_blank" style={{textDecoration:'none'}}>📷 Vedi</a> : '-'}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 2. SETUP ASSET (GESTIONE MACCHINARI) */}
      {tab === 'setup' && (
          <div className="no-print">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                  <h2 style={{margin:0}}>⚙️ Registro Macchinari & Attrezzature</h2>
                  <button onClick={() => apriModaleAsset()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>➕ NUOVA MACCHINA</button>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
                  {assets.map(a => (
                      <div key={a.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', gap:10}}>
                          <div style={{display:'flex', gap:15}}>
                              <div style={{width:80, height:80, background:'#eee', borderRadius:8, overflow:'hidden', flexShrink:0}}>
                                  {a.foto_url ? <img src={a.foto_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'30px'}}>🧊</div>}
                              </div>
                              <div style={{flex:1}}>
                                  <h3 style={{margin:0, color:'#2c3e50'}}>{a.nome}</h3>
                                  <div style={{color:'#7f8c8d', fontSize:'13px', marginTop:2}}>{a.tipo.toUpperCase()} • {a.marca} {a.modello}</div>
                                  <div style={{fontSize:'12px', color:'#999', marginTop:2}}>S/N: {a.serial_number || 'N/A'}</div>
                              </div>
                          </div>
                          <div style={{background:'#f8f9fa', padding:10, borderRadius:5, fontSize:'13px', display:'flex', justifyContent:'space-between'}}>
                              <span>🌡️ Range: <strong>{a.range_min}° / {a.range_max}°</strong></span>
                          </div>
                          <div style={{display:'flex', gap:10, marginTop:'auto'}}>
                              <button onClick={()=>apriModaleAsset(a)} style={{flex:1, background:'#f39c12', color:'white', border:'none', padding:8, borderRadius:5, cursor:'pointer'}}>✏️ MODIFICA</button>
                              <button onClick={()=>eliminaAsset(a.id)} style={{flex:1, background:'#e74c3c', color:'white', border:'none', padding:8, borderRadius:5, cursor:'pointer'}}>🗑️ ELIMINA</button>
                          </div>
                      </div>
                  ))}
              </div>

              {/* MODALE ASSET */}
              {showAssetModal && (
                  <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
                      <div style={{background:'white', width:'100%', maxWidth:'500px', borderRadius:10, padding:25, maxHeight:'90vh', overflowY:'auto'}}>
                          <h2 style={{marginTop:0}}>{editingAsset ? "✏️ Modifica Asset" : "➕ Nuovo Asset"}</h2>
                          <form onSubmit={salvaAsset} style={{display:'flex', flexDirection:'column', gap:15}}>
                              
                              <div style={{display:'flex', gap:10}}>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Nome (es. Frigo Carni)</label>
                                      <input required value={assetForm.nome} onChange={e=>setAssetForm({...assetForm, nome:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  </div>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Tipo</label>
                                      <select value={assetForm.tipo} onChange={e=>setAssetForm({...assetForm, tipo:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}}>
                                          <option value="frigo">Frigorifero</option>
                                          <option value="cella">Cella Frigo</option>
                                          <option value="vetrina">Vetrina</option>
                                          <option value="zona">Zona Pulizia</option>
                                          <option value="altro">Altro</option>
                                      </select>
                                  </div>
                              </div>

                              <div style={{display:'flex', gap:10}}>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Marca</label>
                                      <input value={assetForm.marca} onChange={e=>setAssetForm({...assetForm, marca:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  </div>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Modello</label>
                                      <input value={assetForm.modello} onChange={e=>setAssetForm({...assetForm, modello:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  </div>
                              </div>

                              <div>
                                  <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Serial Number (S/N)</label>
                                  <input value={assetForm.serial_number} onChange={e=>setAssetForm({...assetForm, serial_number:e.target.value})} placeholder="Vedi targhetta..." style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                              </div>

                              <div style={{display:'flex', gap:10, background:'#f9f9f9', padding:10, borderRadius:5}}>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Min Temp (°C)</label>
                                      <input type="number" value={assetForm.range_min} onChange={e=>setAssetForm({...assetForm, range_min:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  </div>
                                  <div style={{flex:1}}>
                                      <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Max Temp (°C)</label>
                                      <input type="number" value={assetForm.range_max} onChange={e=>setAssetForm({...assetForm, range_max:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:5}} />
                                  </div>
                              </div>

                              <div>
                                  <label style={{fontSize:12, fontWeight:'bold', color:'#555'}}>Foto Targhetta / Macchina</label>
                                  <div style={{border:'2px dashed #ccc', padding:15, textAlign:'center', borderRadius:5, cursor:'pointer', position:'relative'}}>
                                      {uploadingAsset ? "Caricamento..." : (assetForm.foto_url ? <div style={{color:'green'}}>✅ Foto Caricata!</div> : "Clicca per caricare foto")}
                                      <input type="file" onChange={handleAssetPhoto} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                                  </div>
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

      {/* 3. ETICHETTE (INVARIATO MA STILIZZATO MEGLIO) */}
      {tab === 'etichette' && (
          <div className="no-print" style={{display:'flex', gap:30, flexWrap:'wrap'}}>
              <div style={{flex:1, background:'white', padding:30, borderRadius:10, minWidth:'300px'}}>
                  <h2>🏷️ Genera Etichetta</h2>
                  <form onSubmit={generaEtichetta} style={{display:'flex', flexDirection:'column', gap:15}}>
                      <label style={{fontWeight:'bold'}}>Prodotto</label>
                      <input required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ccc'}} />
                      
                      <div style={{display:'flex', gap:15}}>
                        <div style={{flex:1}}>
                            <label style={{fontWeight:'bold'}}>Scadenza (giorni)</label>
                            <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{width:'100%', padding:12, borderRadius:5, border:'1px solid #ccc'}} />
                        </div>
                        <div style={{flex:1}}>
                            <label style={{fontWeight:'bold'}}>Tipo</label>
                            <select value={labelData.tipo} onChange={e=>setLabelData({...labelData, tipo:e.target.value})} style={{width:'100%', padding:12, borderRadius:5, border:'1px solid #ccc'}}>
                                <option value="positivo">Positivo (+3°C)</option>
                                <option value="negativo">Negativo (-18°C)</option>
                                <option value="sottovuoto">Sottovuoto</option>
                            </select>
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
                           <h3>Anteprima Ultima Stampa:</h3>
                           <div style={{background:'white', width:'300px', padding:20, margin:'0 auto', border:'1px solid black', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                               <h4 style={{margin:'0 0 10px 0', borderBottom:'1px solid black', paddingBottom:5}}>{lastLabel.prodotto}</h4>
                               <p style={{margin:5}}>Prod: {new Date(lastLabel.data_produzione).toLocaleDateString()}</p>
                               <p style={{margin:5}}>Scad: <strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></p>
                               <p style={{margin:5, fontSize:12}}>Lotto: {lastLabel.lotto}</p>
                               <p style={{margin:5, fontSize:12}}>Op: {lastLabel.operatore}</p>
                           </div>
                       </div>
                   ) : <p style={{color:'#666'}}>Nessuna etichetta generata.</p>}
              </div>
          </div>
      )}

      {/* 4. TEMPLATE STAMPA (INVISIBILE) */}
      {lastLabel && (
        <div className="print-only" style={{
            position: 'fixed', top: 0, left: 0, 
            width: '58mm', height: '40mm', 
            background: 'white', color: 'black', 
            display: 'none', flexDirection: 'column', 
            padding: '2mm', boxSizing: 'border-box',
            fontSize: '10px', fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{fontWeight:'bold', fontSize:'12px', textAlign:'center', borderBottom:'1px solid black', paddingBottom:'2px', marginBottom:'2px'}}>
                {lastLabel.prodotto}
            </div>
            <div style={{display:'flex', justifyContent:'space-between'}}>
                <span>PROD: {new Date(lastLabel.data_produzione).toLocaleDateString()}</span>
                <span>OP: {lastLabel.operatore}</span>
            </div>
            <div style={{fontWeight:'bold', fontSize:'11px', marginTop:'2px'}}>
                SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}
            </div>
            <div style={{marginTop:'auto', fontSize:'9px', textAlign:'center'}}>
                Lotto: {lastLabel.lotto}
            </div>
             <div style={{fontSize:'8px', textAlign:'center', marginTop:'1px'}}>
                {labelData.tipo === 'negativo' ? '❄️ Conservare a -18°C' : '🌡️ Conservare a +4°C'}
            </div>
        </div>
      )}
      
      <style>{`
          @media print {
              .no-print { display: none !important; }
              .haccp-container { background: white !important; padding: 0 !important; }
              .print-only { display: flex !important; }
              @page { size: auto; margin: 0mm; }
              body { margin: 0; }
          }
      `}</style>
    </div>
  );
}

export default Haccp;