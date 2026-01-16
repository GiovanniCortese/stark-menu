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
  uploadingLog 
}) => {
  return (
    <div className="no-print" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:20}}>
      {assetsToDisplay.map(asset => {
          const todayLog = getTodayLog(asset.id);
          
          // Logica per macchinario spento
          if(asset.stato === 'spento') {
              return (
                  <div key={asset.id} style={{background:'#e0e0e0', padding:20, borderRadius:10, border:'2px solid #999', opacity:0.7, position:'relative'}}>
                      <div style={{position:'absolute', top:10, right:10, background:'#555', color:'white', padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:'bold'}}>OFF</div>
                      <h3 style={{margin:0, color:'#555'}}>🚫 {asset.nome}</h3>
                      <div style={{height:40, background:'#ccc', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', color:'#777', fontWeight:'bold', fontSize:12}}>
                          NESSUNA RILEVAZIONE
                      </div>
                  </div>
              );
          }

          const isInputActive = !!tempInput[asset.id];
          const currentData = tempInput[asset.id] || {};
          
          // Visualizzazione log già esistente
          if (todayLog && !isInputActive) {
              return (
                  <div key={asset.id} style={{background:'#eafaf1', padding:20, borderRadius:10, border:'2px solid #27ae60'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <h3 style={{margin:0, color:'#27ae60'}}>✅ {asset.nome}</h3>
                          <span style={{fontSize:'24px', fontWeight:'bold'}}>{todayLog.valore === 'OFF' ? 'SPENTO' : todayLog.valore + '°C'}</span>
                      </div>
                      <button onClick={() => abilitaNuovaMisurazione(asset)} style={{marginTop:15, width:'100%', background:'#f39c12', color:'white', border:'none', padding:10, borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>✏️ MODIFICA</button>
                  </div>
              );
          }
          
          // Form di inserimento temperatura
          return (
              <div key={asset.id} style={{background:'white', padding:15, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', borderTop:'5px solid #bdc3c7'}}>
                   {/* ... resto della UI di input già presente nel tuo Haccp.jsx ... */}
              </div>
          );
      })}
    </div>
  );
};

export default TempControl;