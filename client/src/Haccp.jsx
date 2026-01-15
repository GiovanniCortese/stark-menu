// client/src/Haccp.jsx
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
  const [tab, setTab] = useState('temperature'); // temperature, etichette, pulizie, setup
  
  // Form States
  const [tempInput, setTempInput] = useState({}); // { assetId: valore }
  const [labelData, setLabelData] = useState({ prodotto: '', giorni_scadenza: 3, operatore: '', tipo: 'positivo' });
  const [lastLabel, setLastLabel] = useState(null);

  const API_URL = "https://stark-backend-gg17.onrender.com"; // Usa config.js se preferisci

  useEffect(() => {
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfo);
      const sess = localStorage.getItem(`haccp_session_${slug}`);
      if(sess === "true") setIsAuthorized(true);
  }, [slug]);

  useEffect(() => {
      if(isAuthorized && info) {
          ricaricaDati();
      }
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

  // --- LOGICA TEMPERATURE ---
  const registraTemperatura = async (asset) => {
      const val = parseFloat(tempInput[asset.id]);
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
              tipo_log: 'temperatura', valore: val.toString(), conformita: conforme, azione_correttiva: azione
          })
      });
      alert("✅ Registrato");
      setTempInput({...tempInput, [asset.id]: ''});
      ricaricaDati();
  };

  // --- LOGICA ETICHETTE ---
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
              tipo_conservazione: labelData.tipo,
              ingredienti: ''
          })
      });
      const data = await res.json();
      if(data.success) {
          setLastLabel(data.label);
          setTimeout(() => window.print(), 500); // Avvia stampa automatica
      }
  };

  // --- LOGICA SETUP (Creazione Frighi) ---
  const [newAsset, setNewAsset] = useState({ nome:'', tipo:'frigo', min:0, max:4 });
  const creaAsset = async () => {
      await fetch(`${API_URL}/api/haccp/assets`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ ristorante_id: info.id, nome: newAsset.nome, tipo: newAsset.tipo, range_min: newAsset.min, range_max: newAsset.max })
      });
      ricaricaDati();
      setNewAsset({ nome:'', tipo:'frigo', min:0, max:4 });
  };

  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50', flexDirection:'column'}}>
          <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}>
              <h1>🛡️ HACCP Control</h1>
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
      <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h1 style={{margin:0, color:'#2c3e50'}}>🛡️ HACCP Digitale</h1>
          <div style={{display:'flex', gap:10}}>
              {['temperature', 'etichette', 'pulizie', 'setup'].map(t => (
                  <button key={t} onClick={()=>setTab(t)} style={{
                      padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold', textTransform:'uppercase',
                      background: tab===t ? '#3498db' : 'white', color: tab===t ? 'white' : '#333'
                  }}>{t}</button>
              ))}
              <button onClick={()=>{localStorage.removeItem(`haccp_session_${slug}`); setIsAuthorized(false)}} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer'}}>ESCI</button>
          </div>
      </div>

      {/* 1. SEZIONE TEMPERATURE */}
      {tab === 'temperature' && (
          <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
              {assets.filter(a=>a.tipo==='frigo'||a.tipo==='cella').map(asset => (
                  <div key={asset.id} style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                          <h3 style={{margin:0}}>{asset.nome}</h3>
                          <span style={{background:'#eee', padding:'2px 8px', borderRadius:4, fontSize:12}}>Range: {asset.range_min}° / {asset.range_max}°</span>
                      </div>
                      <div style={{marginTop:15, display:'flex', gap:10}}>
                          <input 
                              type="number" 
                              step="0.1" 
                              placeholder="Temp °C" 
                              value={tempInput[asset.id] || ''} 
                              onChange={e=>setTempInput({...tempInput, [asset.id]: e.target.value})}
                              style={{flex:1, padding:10, borderRadius:5, border:'1px solid #ccc', fontSize:18, textAlign:'center'}} 
                          />
                          <button onClick={()=>registraTemperatura(asset)} style={{background:'#27ae60', color:'white', border:'none', padding:'0 20px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SALVA</button>
                      </div>
                  </div>
              ))}
              
              {/* LOGS RECENTI */}
              <div style={{gridColumn:'1/-1', marginTop:30}}>
                  <h3>📋 Ultime Registrazioni</h3>
                  <table style={{width:'100%', background:'white', borderRadius:10, overflow:'hidden', borderCollapse:'collapse'}}>
                      <thead>
                          <tr style={{background:'#bdc3c7', textAlign:'left'}}><th style={{padding:10}}>Asset</th><th style={{padding:10}}>Valore</th><th style={{padding:10}}>Data</th><th style={{padding:10}}>Stato</th></tr>
                      </thead>
                      <tbody>
                          {logs.filter(l=>l.tipo_log==='temperatura').map(l => (
                              <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:10}}>{l.nome_asset}</td>
                                  <td style={{padding:10, fontWeight:'bold'}}>{l.valore}°C</td>
                                  <td style={{padding:10}}>{new Date(l.data_ora).toLocaleString()}</td>
                                  <td style={{padding:10}}>
                                      {l.conformita ? <span style={{color:'green'}}>OK</span> : <span style={{color:'red', fontWeight:'bold'}}>NON CONFORME<br/><small>{l.azione_correttiva}</small></span>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 2. SEZIONE ETICHETTE (CON LOGICA STAMPA) */}
      {tab === 'etichette' && (
          <div className="no-print" style={{display:'flex', gap:30}}>
              <div style={{flex:1, background:'white', padding:30, borderRadius:10}}>
                  <h2>🏷️ Genera Etichetta</h2>
                  <form onSubmit={generaEtichetta} style={{display:'flex', flexDirection:'column', gap:15}}>
                      <label>Prodotto</label>
                      <input required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:10, borderRadius:5, border:'1px solid #ccc'}} />
                      
                      <div style={{display:'flex', gap:15}}>
                        <div style={{flex:1}}>
                            <label>Scadenza (giorni)</label>
                            <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{width:'100%', padding:10, borderRadius:5, border:'1px solid #ccc'}} />
                        </div>
                        <div style={{flex:1}}>
                            <label>Tipo</label>
                            <select value={labelData.tipo} onChange={e=>setLabelData({...labelData, tipo:e.target.value})} style={{width:'100%', padding:10, borderRadius:5, border:'1px solid #ccc'}}>
                                <option value="positivo">Positivo (+3°C)</option>
                                <option value="negativo">Negativo (-18°C)</option>
                                <option value="sottovuoto">Sottovuoto</option>
                            </select>
                        </div>
                      </div>

                      <label>Operatore</label>
                      <input required value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{padding:10, borderRadius:5, border:'1px solid #ccc'}} />
                      
                      <button style={{padding:15, background:'#3498db', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:16}}>🖨️ STAMPA ETICHETTA</button>
                  </form>
              </div>

              <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#bdc3c7', borderRadius:10}}>
                   {lastLabel ? (
                       <div style={{textAlign:'center'}}>
                           <h3>Anteprima Ultima Stampa:</h3>
                           <div style={{background:'white', width:'300px', padding:20, margin:'0 auto', border:'1px solid black'}}>
                               <h4>{lastLabel.prodotto}</h4>
                               <p>Prod: {new Date(lastLabel.data_produzione).toLocaleDateString()}</p>
                               <p>Scad: <strong>{new Date(lastLabel.data_scadenza).toLocaleDateString()}</strong></p>
                               <p>Lotto: {lastLabel.lotto}</p>
                           </div>
                       </div>
                   ) : <p>Nessuna etichetta generata.</p>}
              </div>
          </div>
      )}

      {/* 3. SETUP (ADMIN LIKE) */}
      {tab === 'setup' && (
          <div className="no-print" style={{background:'white', padding:30, borderRadius:10}}>
              <h2>⚙️ Configurazione Asset</h2>
              <div style={{display:'flex', gap:10, alignItems:'flex-end', marginBottom:20}}>
                  <div><label>Nome (es. Frigo Carni)</label><br/><input value={newAsset.nome} onChange={e=>setNewAsset({...newAsset, nome:e.target.value})} style={{padding:10}} /></div>
                  <div><label>Tipo</label><br/><select value={newAsset.tipo} onChange={e=>setNewAsset({...newAsset, tipo:e.target.value})} style={{padding:10}}><option value="frigo">Frigo</option><option value="cella">Cella</option><option value="zona">Zona Pulizia</option></select></div>
                  <div><label>Min °C</label><br/><input type="number" value={newAsset.min} onChange={e=>setNewAsset({...newAsset, min:e.target.value})} style={{padding:10, width:60}} /></div>
                  <div><label>Max °C</label><br/><input type="number" value={newAsset.max} onChange={e=>setNewAsset({...newAsset, max:e.target.value})} style={{padding:10, width:60}} /></div>
                  <button onClick={creaAsset} style={{padding:10, background:'#27ae60', color:'white', border:'none', cursor:'pointer'}}>AGGIUNGI</button>
              </div>
              <hr/>
              {assets.map(a => (
                  <div key={a.id} style={{display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid #eee'}}>
                      <span><strong>{a.nome}</strong> ({a.tipo}) - Range: {a.range_min}° / {a.range_max}°</span>
                      <button onClick={async ()=>{if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/haccp/assets/${a.id}`, {method:'DELETE'}); ricaricaDati(); }}} style={{background:'red', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>🗑️</button>
                  </div>
              ))}
          </div>
      )}

      {/* 4. TEMPLATE DI STAMPA NASCOSTO (VISIBILE SOLO IN PRINT) */}
      {lastLabel && (
        <div className="print-only" style={{
            position: 'fixed', top: 0, left: 0, 
            width: '58mm', height: '40mm', // DIMENSIONI STANDARD ETICHETTA ADESIVA
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
      
      {/* CSS PER LA STAMPA */}
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