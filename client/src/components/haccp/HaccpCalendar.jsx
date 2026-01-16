import React from 'react';

const HaccpCalendar = ({ 
    currentDate, cambiaMese, calendarLogs, merci, 
    selectedDayLogs, setSelectedDayLogs 
}) => {
    const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    
    const getDaysInMonth = (date) => { 
        const year = date.getFullYear(), month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); 
        const emptySlots = firstDay === 0 ? 6 : firstDay - 1; 
        return { days, emptySlots };
    };

    const { days, emptySlots } = getDaysInMonth(currentDate);
    const grid = [];
    
    for (let i = 0; i < emptySlots; i++) grid.push(<div key={`empty-${i}`} style={{background:'#f0f0f0'}}></div>);
    
    for (let d = 1; d <= days; d++) {
        const currentDayStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toDateString();
        const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === currentDayStr);
        const merciDelGiorno = merci.filter(m => new Date(m.data_ricezione).toDateString() === currentDayStr);

        const hasLogs = logsDelGiorno.length > 0;
        const hasMerci = merciDelGiorno.length > 0;
        const hasError = logsDelGiorno.some(l => !l.conformita) || merciDelGiorno.some(m => !m.conforme || !m.integro);
        
        let bgColor = 'white'; 
        if (hasLogs || hasMerci) bgColor = hasError ? '#ffcccc' : '#ccffcc'; 

        grid.push(
          <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno })} 
               style={{background: bgColor, border:'1px solid #ddd', minHeight:'80px', padding:'5px', cursor:'pointer', position:'relative'}}>
                <div style={{fontWeight:'bold'}}>{d}</div>
                <div style={{fontSize:'10px', marginTop:5}}>
                    {hasLogs && <div>🌡️ {logsDelGiorno.length}</div>}
                    {hasMerci && <div>📦 {merciDelGiorno.length}</div>}
                </div>
          </div>
        );
    }

    return (
        <div style={{background:'white', padding:20, borderRadius:10}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
              <button onClick={()=>cambiaMese(-1)}>◀</button>
              <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button onClick={()=>cambiaMese(1)}>▶</button>
           </div>
           <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5}}>{grid}</div>
           
           {selectedDayLogs && (
               <div style={{marginTop:20, borderTop:'2px solid #333', paddingTop:20}}>
                   <h2 style={{marginTop:0}}>Dettagli {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h2>
                   
                   <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
                       {/* COLONNA TEMPERATURE */}
                       <div style={{flex:1, minWidth:300, background:'#f9f9f9', padding:15, borderRadius:5}}>
                           <h4 style={{marginTop:0, borderBottom:'2px solid #27ae60', color:'#27ae60'}}>🌡️ Temperature</h4>
                           {selectedDayLogs.logs.length === 0 ? <p style={{color:'#999'}}>Nessuna registrazione.</p> : (
                               <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
                                   <thead><tr style={{textAlign:'left'}}><th>Ora</th><th>Macchina</th><th>°C</th><th>Stato</th></tr></thead>
                                   <tbody>
                                      {selectedDayLogs.logs.map(l => (
                                          <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                              <td style={{padding:5}}>{new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</td>
                                              <td style={{padding:5}}><strong>{l.nome_asset}</strong></td>
                                              <td style={{padding:5}}>{l.valore}</td>
                                              <td style={{padding:5}}>
                                                  {l.conformita 
                                                      ? <span style={{color:'green', fontWeight:'bold'}}>OK</span> 
                                                      : <span style={{color:'red', fontWeight:'bold'}}>❌ ERR - {l.azione_correttiva}</span>}
                                              </td>
                                          </tr>
                                      ))}
                                   </tbody>
                               </table>
                           )}
                       </div>

                       {/* COLONNA MERCI */}
                       <div style={{flex:1, minWidth:300, background:'#f9f9f9', padding:15, borderRadius:5}}>
                           <h4 style={{marginTop:0, borderBottom:'2px solid #f39c12', color:'#f39c12'}}>📦 Arrivo Merci</h4>
                           {selectedDayLogs.merci.length === 0 ? <p style={{color:'#999'}}>Nessun arrivo.</p> : (
                               <div style={{display:'flex', flexDirection:'column', gap:10}}>
                                   {selectedDayLogs.merci.map(m => (
                                       <div key={m.id} style={{background:'white', padding:10, border:'1px solid #ddd', borderRadius:5}}>
                                           <div style={{fontWeight:'bold'}}>{m.prodotto}</div>
                                           <div style={{fontSize:12, color:'#555'}}>{m.fornitore} | Qty: {m.quantita}</div>
                                           <div style={{fontSize:12}}>Lotto: {m.lotto} | Scad: {new Date(m.scadenza).toLocaleDateString()}</div>
                                           <div style={{marginTop:5}}>
                                               {m.conforme ? <span style={{background:'#eafaf1', color:'green', padding:'2px 5px', borderRadius:3, fontSize:10}}>OK</span> : <span style={{background:'#fadbd8', color:'red', padding:'2px 5px', borderRadius:3, fontSize:10}}>NO</span>}
                                               {m.allegato_url && <a href={m.allegato_url} target="_blank" style={{marginLeft:10, fontSize:12}}>📎 Bolla</a>}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>
                   </div>
               </div>
           )}
        </div>
    );
};

export default HaccpCalendar;