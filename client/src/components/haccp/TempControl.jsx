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
  
  // --- STATI LOCALI PER GESTIONE VISTA ---
  const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // --- HANDLER: DA TABELLA A CARD ---
  const handleEditFromTable = (asset, dateStr, existingLog) => {
      // 1. Prepariamo l'input temporaneo con i dati cliccati
      setTempInput(prev => ({
          ...prev,
          [asset.id]: {
              val: existingLog ? existingLog.valore : '',
              // Se è un inserimento retroattivo, salviamo la data specifica nello stato temporaneo
              customDate: dateStr, 
              photo: existingLog ? existingLog.foto_prova_url : ''
          }
      }));

      // 2. Switchiamo alla vista 'cards' per far vedere il form
      setViewMode('cards');

      // 3. Scrolliamo all'elemento specifico dopo il render
      setTimeout(() => {
           const el = document.getElementById(`asset-card-${asset.id}`);
           if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  return (
    <div className="no-print">
      
      {/* --- TOOLBAR SUPERIORE --- */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems:'center', flexWrap: 'wrap', gap: 10 }}>
          
          {/* Switch Vista */}
          <div style={{display:'flex', gap:10, background: '#fff', padding: 5, borderRadius: 25, boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
               <button 
                  onClick={() => setViewMode('cards')} 
                  style={{
                      padding:'8px 20px', borderRadius:20, border:'none', cursor:'pointer', 
                      background: viewMode==='cards' ? '#2c3e50' : 'transparent', 
                      color: viewMode==='cards' ? 'white' : '#7f8c8d', 
                      fontWeight:'bold', transition: 'all 0.2s'
                  }}
               >
                  📱 Vista Rapida
               </button>
               <button 
                  onClick={() => setViewMode('table')} 
                  style={{
                      padding:'8px 20px', borderRadius:20, border:'none', cursor:'pointer', 
                      background: viewMode==='table' ? '#2c3e50' : 'transparent', 
                      color: viewMode==='table' ? 'white' : '#7f8c8d', 
                      fontWeight:'bold', transition: 'all 0.2s'
                  }}
               >
                  📅 Registro Mensile
               </button>
          </div>

          <button onClick={()=>openDownloadModal('temperature_matrix')} className="btn-download-report">
              ⬇ Scarica Report Temperature
          </button>
      </div>

      {/* --- CONTENUTO CONDIZIONALE --- */}
      {viewMode === 'table' ? (
          /* VISTA TABELLA (Nuovo Componente) */
          <TempRegisterTable 
              assets={assetsToDisplay}
              logs={logs}
              currentDate={currentMonthDate}
              setCurrentDate={setCurrentMonthDate}
              onEditLog={handleEditFromTable}
              openDownloadModal={openDownloadModal}
          />
      ) : (
          /* VISTA CARDS (Codice Originale Potenziato) */
          <div className="temp-grid">
            {assetsToDisplay.map(asset => {
                const todayLog = getTodayLog(asset.id);
                const isInputActive = !!tempInput[asset.id];
                const currentData = tempInput[asset.id] || {};
                
                // Controllo se stiamo modificando una data passata
                const isRetroactiveEdit = !!currentData.customDate; 
                
                // CASO 1: MACCHINA SPENTA
                if(asset.stato === 'spento') {
                    return (
                        <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card spento">
                            <div className="badge-off">OFF</div>
                            <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                            <div className="status-box-off">NESSUNA RILEVAZIONE</div>
                        </div>
                    );
                }

                // CASO 2: GIÀ REGISTRATO (MOSTRA RIEPILOGO VERDE)
                // Nota: Se stiamo facendo una modifica retroattiva, forziamo la visualizzazione della card attiva
                if (todayLog && !isInputActive && !isRetroactiveEdit) {
                    const timeStr = new Date(todayLog.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                    const logsDiOggi = logs.filter(l => l.asset_id === asset.id && new Date(l.data_ora).toDateString() === new Date().toDateString());
                    const isModificato = logsDiOggi.length > 1;

                    return (
                        <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card done">
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
                    <div key={asset.id} id={`asset-card-${asset.id}`} className="temp-card active" style={isRetroactiveEdit ? {border: '2px solid #f39c12', background: '#fffcf5'} : {}}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15}}>
                              <div>
                                  <h3 style={{margin:0, fontSize:'16px'}}>{asset.nome}</h3>
                                  <span style={{fontSize:'11px', color:'#999'}}>{asset.marca}</span>
                              </div>
                              <span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:10, whiteSpace:'nowrap'}}>
                                  Min {asset.range_min}° / Max {asset.range_max}°
                              </span>
                         </div>

                         {/* Avviso se modifica retroattiva */}
                         {isRetroactiveEdit && (
                            <div style={{marginBottom: 10, padding: 5, background: '#f39c12', color: 'white', fontSize: 12, borderRadius: 4, textAlign: 'center', fontWeight: 'bold'}}>
                                📅 Modifica del: {new Date(currentData.customDate).toLocaleDateString('it-IT')}
                            </div>
                         )}
                         
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

                         {isInputActive && (getTodayLog(asset.id) || isRetroactiveEdit) && (
                             <button onClick={()=>{const n={...tempInput}; delete n[asset.id]; setTempInput(n);}} className="btn-cancel-edit">
                                 Annulla Modifica
                             </button>
                         )}
                    </div>
                );
            })}
          </div>
      )}
    </div>
  );
};

export default TempControl;