import React, { useState } from 'react';
import TempRegisterTable from './TempRegisterTable';

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
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Gestione Input Manuale (Permette virgola)
  const handleInputChange = (text, assetId, currentData) => {
      // Manteniamo la virgola visiva, ma prepariamo il valore
      setTempInput({...tempInput, [assetId]: {...currentData, val: text}});
  };

  // Tasti SU / GIU (0.1 alla volta)
  const adjustTemp = (assetId, delta, currentData) => {
      // Sostituisce eventuale virgola con punto per calcolare
      let rawVal = currentData.val ? String(currentData.val).replace(',', '.') : '0';
      let currentVal = parseFloat(rawVal);
      if (isNaN(currentVal)) currentVal = 0;
      
      // Calcolo preciso per evitare 3.300000004
      const newVal = (currentVal + delta).toFixed(1);
      
      // Riconverte punto in virgola per la visualizzazione
      const displayVal = String(newVal).replace('.', ',');

      setTempInput({
          ...tempInput, 
          [assetId]: {
              ...currentData, 
              val: displayVal
          }
      });
  };

  const handleEditFromTable = (asset, dateStr, existingLog) => {
      const targetDate = new Date(dateStr);
      targetDate.setHours(12, 0, 0, 0); 
      
      setTempInput(prev => ({
          ...prev,
          [asset.id]: {
              val: existingLog ? String(existingLog.valore).replace('.', ',') : '',
              customDate: targetDate.toISOString(), 
              photo: existingLog ? existingLog.foto_prova_url : ''
          }
      }));

      setTimeout(() => {
           const el = document.getElementById(`asset-card-${asset.id}`);
           if(el) {
               el.scrollIntoView({ behavior: 'smooth', block: 'center' });
               el.style.transition = "box-shadow 0.3s";
               el.style.boxShadow = "0 0 20px #f1c40f";
               setTimeout(() => el.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)", 1500);
           }
      }, 100);
  };

  return (
    <div className="no-print">
      
      {/* SEZIONE 1: OGGI */}
      <div style={{ marginBottom: 40 }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #ddd', paddingBottom:10, marginBottom:20}}>
            <h3 style={{color:'#2c3e50', margin:0}}>
                🌡️ Rilevazione Odierna <span style={{fontWeight:'normal', fontSize:'0.8em'}}>({new Date().toLocaleDateString()})</span>
            </h3>
            <button onClick={()=>openDownloadModal('temperature_matrix')} className="btn-download-report">
                ⬇ Scarica Registro PDF
            </button>
          </div>
          
          <div className="temp-grid">
            {assetsToDisplay.map(asset => {
                const todayLog = getTodayLog(asset.id);
                const isInputActive = !!tempInput[asset.id];
                const currentData = tempInput[asset.id] || {};
                const isRetroactiveEdit = !!currentData.customDate; 
                
                const displayDateLabel = isRetroactiveEdit 
                    ? new Date(currentData.customDate).toLocaleDateString('it-IT')
                    : new Date().toLocaleDateString('it-IT');

                if(asset.stato === 'spento') {
                    return (
                        <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card spento">
                            <div className="badge-off">OFF</div>
                            <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                            <div className="status-box-off">NESSUNA RILEVAZIONE</div>
                        </div>
                    );
                }

                if (todayLog && !isInputActive && !isRetroactiveEdit) {
                    const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {
                        hour:'2-digit', minute:'2-digit', 
                        timeZone: 'Europe/Rome'
                    });
                    
                    // Mostra virgola invece di punto nel log salvato
                    const valMostrato = todayLog.valore === 'OFF' ? 'SPENTO' : String(todayLog.valore).replace('.', ',') + '°C';

                    return (
                        <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card done">
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                                    <div style={{fontSize:11, color:'#666'}}>{asset.locale || ''}</div>
                                </div>
                                <span style={{fontSize:'24px', fontWeight:'bold'}}>{valMostrato}</span>
                            </div>
                            <div style={{fontSize:'12px', color:'#555', marginTop:5}}>
                                Registrato alle {timeStr}
                            </div>
                            <button onClick={() => abilitaNuovaMisurazione(asset)} className="btn-modify">✏️ MODIFICA</button>
                        </div>
                    );
                }
                
                return (
                    <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card active" 
                         style={isRetroactiveEdit ? {border: '2px solid #f39c12', background: '#fffcf5', transform: 'scale(1.02)'} : {}}>
                         
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                              <div>
                                  <h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3>
                                  <div style={{fontSize:12, color:'#2980b9', fontWeight:'bold'}}>📍 {asset.locale || 'N/D'}</div>
                              </div>
                              <span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:10, whiteSpace:'nowrap'}}>
                                  {asset.range_min}° / {asset.range_max}°
                              </span>
                         </div>

                         {isRetroactiveEdit && (
                            <div style={{marginBottom: 10, padding: 5, background: '#f39c12', color: 'white', fontSize: 13, borderRadius: 4, textAlign: 'center', fontWeight: 'bold', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                                📅 STAI MODIFICANDO IL: {displayDateLabel}
                            </div>
                         )}
                         
                         {/* ZONA INPUT CON BOTTONI + E - */}
                         <div className="temp-card-input-area" style={{display:'flex', gap:5, alignItems:'center'}}>
                            
                            {/* BOTTONE MENO (DECIMALE) */}
                            <button 
                                onClick={() => adjustTemp(asset.id, -0.1, currentData)} 
                                style={{
                                    background:'#e74c3c', color:'white', border:'none', 
                                    borderRadius:5, width:50, height:45, fontSize:20, cursor:'pointer'
                                }}
                            >
                                -
                            </button>

                            <input 
                                type="text" 
                                inputMode="decimal" 
                                placeholder="°C" 
                                value={currentData.val || ''} 
                                onChange={e => handleInputChange(e.target.value, asset.id, currentData)} 
                                className="temp-input"
                                autoFocus={isRetroactiveEdit}
                                style={{textAlign:'center', fontSize:22, fontWeight:'bold', flex:1}}
                            />

                            {/* BOTTONE PIU (DECIMALE) */}
                            <button 
                                onClick={() => adjustTemp(asset.id, +0.1, currentData)} 
                                style={{
                                    background:'#27ae60', color:'white', border:'none', 
                                    borderRadius:5, width:50, height:45, fontSize:20, cursor:'pointer'
                                }}
                            >
                                +
                            </button>

                         </div>
                         
                         <div className="temp-actions" style={{marginTop:10}}>
                                <button onClick={()=>registraTemperatura(asset, true)} className="btn-action off">OFF</button>
                                <label className={`btn-action photo ${currentData.photo ? 'has-photo' : ''}`}>
                                    <span>📷</span>
                                    <input type="file" accept="image/*" onChange={(e)=>handleLogPhoto(e, asset.id)} style={{display:'none'}} />
                                </label>
                                <button onClick={()=>registraTemperatura(asset, false)} className="btn-action save" style={{flex:2}}>SALVA</button>
                         </div>

                         {isInputActive && <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel-edit">ANNULLA</button>}
                    </div>
                );
            })}
          </div>
      </div>

      {/* SEZIONE 2: TABELLA MENSILE */}
      <div style={{marginTop: 50, paddingTop: 30, borderTop: '4px solid #34495e'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
              <div>
                  <h3 style={{margin:0, color:'#34495e'}}>📅 Registro Mensile</h3>
                  <p style={{margin:0, fontSize:13, color:'#7f8c8d'}}>Clicca sulla matita ✏️ nella tabella per inserire o correggere.</p>
              </div>
          </div>
          <TempRegisterTable 
              assets={assetsToDisplay}
              logs={logs}
              currentDate={currentMonthDate}
              setCurrentDate={setCurrentMonthDate}
              onEditLog={handleEditFromTable}
              openDownloadModal={openDownloadModal}
          />
      </div>

    </div>
  );
};

export default TempControl;