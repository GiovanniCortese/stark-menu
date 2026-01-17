import React from 'react';

const TempControl = ({ 
  assetsToDisplay, 
  getTodayLog, 
  tempInput, 
  setTempInput, 
  registraTemperatura, 
  handleLogPhoto, 
  abilitaNuovaMisurazione,
  logs,
  openDownloadModal 
}) => {
  return (
    <div className="no-print">
      <div style={{marginBottom:20, display:'flex', justifyContent:'flex-end'}}>
          <button onClick={()=>openDownloadModal('temperature')} className="btn-download-report">
              ⬇ Scarica Report Temperature
          </button>
      </div>

      {/* USA LA CLASSE "temp-grid" PER GESTIRE IL LAYOUT RESPONSIVE */}
      <div className="temp-grid">
        {assetsToDisplay.map(asset => {
            const todayLog = getTodayLog(asset.id);
            const isInputActive = !!tempInput[asset.id];
            const currentData = tempInput[asset.id] || {};
            
            // CASO 1: MACCHINA SPENTA
            if(asset.stato === 'spento') {
                return (
                    <div key={asset.id} className="temp-card spento">
                        <div className="badge-off">OFF</div>
                        <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                        <div className="status-box-off">NESSUNA RILEVAZIONE</div>
                    </div>
                );
            }

            // CASO 2: GIÀ REGISTRATO (MOSTRA RIEPILOGO VERDE)
            if (todayLog && !isInputActive) {
                const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                const logsDiOggi = logs.filter(l => l.asset_id === asset.id && new Date(l.data_ora).toDateString() === new Date().toDateString());
                const isModificato = logsDiOggi.length > 1;

                return (
                    <div key={asset.id} className="temp-card done">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                            <span style={{fontSize:'24px', fontWeight:'bold'}}>{todayLog.valore === 'OFF' ? 'SPENTO' : todayLog.valore + '°C'}</span>
                        </div>
                        <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                            {todayLog.conformita ? (isModificato ? `📝 Modificato alle ${timeStr}` : `Registrato alle ${timeStr}`) : `⚠️ ANOMALIA - ${todayLog.azione_correttiva}`}
                        </div>
                        <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-modify">✏️ MODIFICA</button>
                    </div>
                );
            }
            
            // CASO 3: DA REGISTRARE (CARD BIANCA CON INPUT)
            return (
                <div key={asset.id} className="temp-card active">
                     <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                          <div>
                              <h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3>
                              <span style={{fontSize:'11px', color:'#999'}}>{asset.marca}</span>
                          </div>
                          <span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:10, whiteSpace:'nowrap'}}>
                              Min {asset.range_min}° / Max {asset.range_max}°
                          </span>
                     </div>
                     
                     {/* AREA INPUT + BOTTONI (Responsive) */}
                     <div className="temp-card-input-area">
                        <input 
                            type="number" 
                            step="0.1" 
                            placeholder="°C" 
                            value={currentData.val || ''} 
                            onChange={e=>setTempInput({...tempInput, [asset.id]: {...currentData, val: e.target.value}})} 
                            className="temp-input"
                        />
                        
                        <div className="temp-actions">
                            <button onClick={()=>registraTemperatura(asset, true)} className="btn-action off">OFF</button>
                            
                            <label className={`btn-action photo ${currentData.photo ? 'has-photo' : ''}`}>
                                <span>📷</span>
                                <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                            </label>
                            
                            <button onClick={()=>registraTemperatura(asset, false)} className="btn-action save">SALVA</button>
                        </div>
                     </div>

                     {isInputActive && getTodayLog(asset.id) && (
                         <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel-edit">
                             Annulla Modifica
                         </button>
                     )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default TempControl;