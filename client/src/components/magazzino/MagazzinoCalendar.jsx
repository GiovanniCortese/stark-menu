// client/src/components_haccp/MagazzinoCalendar.jsx
import React, { useState } from 'react';

const MagazzinoCalendar = ({ stats, onDateClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Sicurezza: Se stats o stats.storico sono null, usiamo array vuoto
    const storico = stats?.storico || [];

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); 
        const startBlank = firstDay === 0 ? 6 : firstDay - 1; 

        const days = [];
        
        // Giorni vuoti inizio mese
        for (let i = 0; i < startBlank; i++) {
            days.push(<div key={`blank-${i}`} style={{height:100, background:'#f9f9f9', border:'1px solid #eee'}}></div>);
        }
        
        // Giorni del mese
        for (let d = 1; d <= daysInMonth; d++) {
            // Formato data YYYY-MM-DD per confronto
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            
            // Filtro sicuro (cerca per data documento o data ricezione)
            const movimentiGiorno = storico.filter(r => {
                const dataRif = r.data_documento || r.data_ricezione;
                return dataRif && dataRif.startsWith(dateStr);
            });

            // Calcolo totale sicuro (con gestione sconto)
            const totaleGiorno = movimentiGiorno.reduce((acc, curr) => {
                let importo = parseFloat(curr.totale_lordo);
                
                // Fallback se il totale lordo manca o è zero
                if (isNaN(importo) || importo === 0) {
                    const qta = parseFloat(curr.quantita) || 0;
                    const prz = parseFloat(curr.prezzo_unitario) || 0;
                    const iva = parseFloat(curr.iva) || 0;
                    const sc = parseFloat(curr.sconto) || 0; // Gestione sconto
                    
                    // Calcolo: (Prezzo - Sconto) * Qta * (1 + IVA)
                    const netto = qta * (prz * (1 - sc/100));
                    importo = netto * (1 + iva/100);
                }
                return acc + (importo || 0);
            }, 0);

            const hasData = movimentiGiorno.length > 0;

            days.push(
                <div 
                    key={d} 
                    onClick={() => hasData && onDateClick && onDateClick(dateStr)} // CLICK QUI
                    style={{
                        height:100, 
                        background: hasData ? '#f0faff' : 'white', // Colore diverso se ci sono dati
                        border:'1px solid #eee', 
                        padding:5, 
                        position:'relative',
                        cursor: hasData ? 'pointer' : 'default', // Cursore mano
                        transition: '0.2s'
                    }}
                    onMouseEnter={e => { if(hasData) e.currentTarget.style.background = '#e1f5fe'; }}
                    onMouseLeave={e => { if(hasData) e.currentTarget.style.background = '#f0faff'; }}
                >
                    <div style={{fontWeight:'bold', marginBottom:5, color: hasData ? '#2980b9' : '#333'}}>{d}</div>
                    
                    {hasData && (
                        <>
                            <div style={{fontSize:11, color:'#7f8c8d'}}>{movimentiGiorno.length} Movimenti</div>
                            <div style={{
                                position:'absolute', bottom:5, right:5, 
                                background:'#27ae60', color:'white', 
                                padding:'2px 6px', borderRadius:4, 
                                fontSize:11, fontWeight:'bold'
                            }}>
                                € {totaleGiorno.toFixed(2)}
                            </div>
                        </>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} style={{border:'none', background:'#eee', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>◀ Mese Prec.</button>
                <h3 style={{margin:0, textTransform:'uppercase', color:'#2c3e50'}}>{currentMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} style={{border:'none', background:'#eee', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>Mese Succ. ▶</button>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', textAlign:'center', fontWeight:'bold', marginBottom:5, fontSize:12, color:'#7f8c8d', padding:'10px 0', background:'#f8f9fa'}}>
                <div>LUN</div><div>MAR</div><div>MER</div><div>GIO</div><div>VEN</div><div>SAB</div><div>DOM</div>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderTop:'1px solid #eee', borderLeft:'1px solid #eee'}}>
                {renderCalendar()}
            </div>
        </div>
    );
};

export default MagazzinoCalendar;