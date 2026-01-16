// components/haccp/TempControl.jsx
import React from 'react';

const TempControl = ({ 
  assetsToDisplay, 
  getTodayLog, 
  tempInput, 
  setTempInput, 
  registraTemperatura, 
  handleLogPhoto, 
  abilitaNuovaMisurazione,
  logs // Prop necessaria per il controllo modifiche
}) => {
  return (
    <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
      {assetsToDisplay.map(asset => {
          const todayLog = getTodayLog(asset.id);
          
          if(asset.stato === 'spento') {
              return (
                  <div key={asset.id} style={{background:'#e0e0e0', padding:20, borderRadius:10, border:'2px solid #999', opacity:0.7, position:'relative'}}>
                      <div style={{position:'absolute', top:10, right:10, background:'#555', color:'white', padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:'bold'}}>OFF</div>
                      <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                      <p style={{margin:'5px 0', fontSize:12}}>Macchinario Spento</p>
                      <div style={{height:40, background:'#ccc', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', color:'#777', fontWeight:'bold', fontSize:12}}>
                          NESSUNA RILEVAZIONE
                      </div>
                  </div>
              );
          }

          const isInputActive = !!tempInput[asset.id];
          const currentData = tempInput[asset.id] || {};
          
          if (todayLog && !isInputActive) {
            const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
            // Check modifiche
            const logsDiOggi = logs.filter(l => l.asset_id === asset.id && new Date(l.data_ora).toDateString() === new Date().toDateString());
            const isModificato = logsDiOggi.length > 1;

            return (
                <div key={asset.id} style={{background:'#eafaf1', padding:20, borderRadius:10, border:'2px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                        <span style={{fontSize:'24px', fontWeight:'bold'}}>{todayLog.valore === 'OFF' ? 'SPENTO' : todayLog.valore + '°C'}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                        {todayLog.conformita 
                            ? (isModificato ? `📝 Modificato alle ${timeStr}` : `Registrato alle ${timeStr}`) 
                            : `⚠️ ANOMALIA - ${todayLog.azione_correttiva}`}
                    </div>
                    <button onClick={() => abilitaNuovaMisurazione(asset)} style={{marginTop:15, width:'100%', background:'#f39c12', color:'white', border:'none', padding:10, borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>✏️ MODIFICA</button>
                </div>
            );
          }
          
          return (
              <div key={asset.id} style={{background:'white', padding:15, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:'5px solid #bdc3c7'}}>
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                        <div><h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3><span style={{fontSize:'11px', color:'#999'}}>{asset.marca}</span></div>
                        <span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:10}}>Range: {asset.range_min}°/{asset.range_max}°</span>
                   </div>
                   
                   <div style={{display:'flex', fontSize:'11px', fontWeight:'bold', color:'#7f8c8d', marginBottom:5}}>
                        <div style={{flex:1}}>TEMPERATURA</div>
                        <div style={{width:160, display:'flex', justifyContent:'space-between'}}>
                            <span style={{width:50, textAlign:'center'}}>FOTO</span>
                            <span style={{width:100, textAlign:'center'}}>AZIONE</span>
                        </div>
                   </div>

                   <div style={{display:'flex', alignItems:'stretch', gap:10, height:45}}>
                      <input type="number" step="0.1" placeholder="°C" 
                           value={currentData.val || ''} 
                           onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                           style={{flex:1, borderRadius:5, border:'1px solid #ddd', fontSize:18, textAlign:'center', fontWeight:'bold'}} 
                      />
                      
                      <div style={{display:'flex', gap:5}}>
                          <button onClick={()=>registraTemperatura(asset, true)} title="Segna come SPENTO"
                                  style={{width:50, background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold', fontSize:'11px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                              <span>OFF</span>
                          </button>

                          <label style={{width:50, cursor:'pointer', background: currentData.photo ? '#2ecc71' : '#f1f2f6', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #ddd'}}>
                              <span style={{fontSize:'20px'}}>📷</span>
                              <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                          </label>
                          
                          <button onClick={()=>registraTemperatura(asset, false)} 
                                  style={{width:60, background:'#2c3e50', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold', fontSize:'12px'}}>
                              SALVA
                          </button>
                      </div>
                   </div>

                   {isInputActive && getTodayLog(asset.id) && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} style={{marginTop:5, width:'100%', fontSize:10, background:'transparent', border:'none', color:'#999', cursor:'pointer'}}>Annulla Modifica</button>}
              </div>
          );
      })}
    </div>
  );
};

export default TempControl;