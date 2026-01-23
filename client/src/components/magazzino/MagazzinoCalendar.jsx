import React, { useState } from 'react';

const MagazzinoCalendar = ({ stats }) => {
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
            
            // Filtro sicuro
            const movimentiGiorno = storico.filter(r => {
                // Supporta sia data_ricezione che data_documento
                const dataRif = r.data_documento || r.data_ricezione;
                return dataRif && dataRif.startsWith(dateStr);
            });

            // Calcolo totale sicuro
            const totaleGiorno = movimentiGiorno.reduce((acc, curr) => {
                // Se abbiamo già il totale calcolato dal backend usiamo quello, altrimenti calcoliamo
                let importo = parseFloat(curr.totale_lordo);
                if (isNaN(importo)) {
                    // Fallback calcolo manuale
                    const qta = parseFloat(curr.quantita) || 0;
                    const prz = parseFloat(curr.prezzo_unitario) || 0;
                    const iva = parseFloat(curr.iva) || 0;
                    const netto = qta * prz;
                    importo = netto + (netto * (iva/100));
                }
                return acc + (importo || 0);
            }, 0);

            days.push(
                <div key={d} style={{height:100, background:'white', border:'1px solid #eee', padding:5, position:'relative'}}>
                    <div style={{fontWeight:'bold', marginBottom:5}}>{d}</div>
                    
                    {movimentiGiorno.length > 0 && (
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