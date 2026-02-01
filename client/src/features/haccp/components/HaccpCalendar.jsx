import React from 'react';

const HaccpCalendar = ({ 
    currentDate, cambiaMese, 
    calendarLogs, merci, pulizie, labels, // Ora riceviamo tutti i dati
    selectedDayLogs, setSelectedDayLogs,
    openGlobalPreview // Callback per anteprima
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
        
        // Filtra i dati per il giorno specifico
        const logsDelGiorno = calendarLogs.filter(l => new Date(l.data_ora).toDateString() === currentDayStr);
        const merciDelGiorno = merci.filter(m => new Date(m.data_ricezione).toDateString() === currentDayStr);
        const pulizieDelGiorno = pulizie.filter(p => new Date(p.data_ora).toDateString() === currentDayStr);
        const labelsDelGiorno = labels.filter(l => new Date(l.data_produzione).toDateString() === currentDayStr);

        const hasActivity = logsDelGiorno.length > 0 || merciDelGiorno.length > 0 || pulizieDelGiorno.length > 0 || labelsDelGiorno.length > 0;
        
        // Logica Colore: Se c'è un errore (temp o merce), diventa rosso chiaro. Se c'è attività ma tutto ok, verde chiaro.
        const hasError = logsDelGiorno.some(l => !l.conformita) || merciDelGiorno.some(m => !m.conforme || !m.integro);
        let bgColor = hasActivity ? (hasError ? '#fadbd8' : '#eafaf1') : 'white'; 

        grid.push(
          <div key={d} onClick={() => setSelectedDayLogs({ day: d, logs: logsDelGiorno, merci: merciDelGiorno, pulizie: pulizieDelGiorno, labels: labelsDelGiorno })} 
               style={{background: bgColor, border:'1px solid #ddd', minHeight:'90px', padding:'5px', cursor:'pointer', position:'relative', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                <div style={{fontWeight:'bold', color: hasActivity ? '#2c3e50' : '#ccc'}}>{d}</div>
                <div style={{fontSize:'10px', display:'flex', flexWrap:'wrap', gap:2}}>
                    {logsDelGiorno.length > 0 && <span title="Temperature" style={{background:'#3498db', color:'white', padding:'1px 3px', borderRadius:3}}>🌡️ {logsDelGiorno.length}</span>}
                    {merciDelGiorno.length > 0 && <span title="Merci" style={{background:'#f39c12', color:'white', padding:'1px 3px', borderRadius:3}}>📦 {merciDelGiorno.length}</span>}
                    {pulizieDelGiorno.length > 0 && <span title="Pulizie" style={{background:'#9b59b6', color:'white', padding:'1px 3px', borderRadius:3}}>🧼 {pulizieDelGiorno.length}</span>}
                    {labelsDelGiorno.length > 0 && <span title="Produzione" style={{background:'#27ae60', color:'white', padding:'1px 3px', borderRadius:3}}>🏷️ {labelsDelGiorno.length}</span>}
                </div>
          </div>
        );
    }

    return (
        <div style={{background:'white', padding:20, borderRadius:10}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
              <button onClick={()=>cambiaMese(-1)} style={{cursor:'pointer', border:'none', background:'transparent', fontSize:20}}>◀</button>
              <h3 style={{margin:0}}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button onClick={()=>cambiaMese(1)} style={{cursor:'pointer', border:'none', background:'transparent', fontSize:20}}>▶</button>
           </div>
           <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:5}}>{grid}</div>
           
           {selectedDayLogs && (
               <div style={{marginTop:20, borderTop:'2px solid #333', paddingTop:20}}>
                   <h2 style={{marginTop:0}}>Dettagli {selectedDayLogs.day} {monthNames[currentDate.getMonth()]}</h2>
                   
                   <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:20}}>
                       
                       {/* 1. TEMPERATURE */}
                       <div style={{background:'#f9f9f9', padding:15, borderRadius:5, borderTop:'3px solid #3498db'}}>
                           <h4 style={{marginTop:0, color:'#3498db'}}>🌡️ Temperature</h4>
                           {selectedDayLogs.logs.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessuna reg.</p> : (
                               <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
                                   <tbody>
                                      {selectedDayLogs.logs.map(l => (
                                          <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                              <td style={{padding:4}}>{new Date(l.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</td>
                                              <td style={{padding:4}}><strong>{l.nome_asset}</strong>: {l.valore === 'OFF' ? 'OFF' : l.valore + '°'}</td>
                                              <td style={{padding:4}}>{l.conformita ? '✅' : '❌'}</td>
                                          </tr>
                                      ))}
                                   </tbody>
                               </table>
                           )}
                       </div>

                       {/* 2. MERCI */}
                       <div style={{background:'#f9f9f9', padding:15, borderRadius:5, borderTop:'3px solid #f39c12'}}>
                           <h4 style={{marginTop:0, color:'#f39c12'}}>📦 Arrivo Merci</h4>
                           {selectedDayLogs.merci.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessun arrivo.</p> : (
                               <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                   {selectedDayLogs.merci.map(m => (
                                       <div key={m.id} style={{background:'white', padding:8, border:'1px solid #ddd', borderRadius:3, fontSize:12}}>
                                           <div style={{fontWeight:'bold'}}>{m.prodotto}</div>
                                           <div style={{color:'#555'}}>{m.fornitore}</div>
                                           <div style={{marginTop:4, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                               {m.conforme ? <span style={{color:'green'}}>OK</span> : <span style={{color:'red'}}>KO</span>}
                                               {m.allegato_url && (
                                                   <button onClick={() => openGlobalPreview(m.allegato_url, `Bolla_${m.prodotto}`)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, padding:'2px 6px', cursor:'pointer', fontSize:10}}>
                                                       📎 Bolla
                                                   </button>
                                               )}
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </div>

                       {/* 3. PULIZIE */}
                       <div style={{background:'#f9f9f9', padding:15, borderRadius:5, borderTop:'3px solid #9b59b6'}}>
                           <h4 style={{marginTop:0, color:'#9b59b6'}}>🧼 Pulizie</h4>
                           {selectedDayLogs.pulizie.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessuna pulizia.</p> : (
                               <ul style={{paddingLeft:15, margin:0, fontSize:12}}>
                                   {selectedDayLogs.pulizie.map(p => (
                                       <li key={p.id} style={{marginBottom:5}}>
                                           <strong>{p.area}</strong> ({p.operatore})
                                       </li>
                                   ))}
                               </ul>
                           )}
                       </div>

                       {/* 4. PRODUZIONE */}
                       <div style={{background:'#f9f9f9', padding:15, borderRadius:5, borderTop:'3px solid #27ae60'}}>
                           <h4 style={{marginTop:0, color:'#27ae60'}}>🏷️ Produzione</h4>
                           {selectedDayLogs.labels.length === 0 ? <p style={{color:'#999', fontSize:12}}>Nessuna produzione.</p> : (
                               <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                   {selectedDayLogs.labels.map(l => (
                                       <div key={l.id} style={{background:'white', padding:8, border:'1px solid #ddd', borderRadius:3, fontSize:12}}>
                                            <div style={{fontWeight:'bold'}}>{l.prodotto}</div>
                                            <div style={{fontSize:10}}>Lotto: {l.lotto}</div>
                                            <div style={{fontSize:10, color:'#c0392b'}}>Scad: {new Date(l.data_scadenza).toLocaleDateString()}</div>
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