import React, { useState } from 'react';

const MagazzinoCalendar = ({ stats, setTab, setFiltro }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); 
        const startBlank = firstDay === 0 ? 6 : firstDay - 1; 

        const days = [];
        for (let i = 0; i < startBlank; i++) days.push(<div key={`blank-${i}`} style={{height:80, background:'#f9f9f9', border:'1px solid #eee'}}></div>);
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const speseGiorno = stats.storico.filter(r => r.data_ricezione.startsWith(dateStr));
            const totaleGiorno = speseGiorno.reduce((acc, curr) => {
                const qta = parseFloat(curr.quantita) || 0;
                const unit = parseFloat(curr.prezzo_unitario) || 0;
                const imp = parseFloat(curr.prezzo) || (qta * unit);
                const iva = parseFloat(curr.iva) || 0;
                return acc + imp + (imp * iva / 100);
            }, 0);

            days.push(
                <div key={d} style={{height:80, background:'white', border:'1px solid #eee', padding:5, position:'relative', cursor:'pointer'}} 
                     onClick={() => { setFiltro(dateStr); setTab('lista'); }}>
                    <div style={{fontWeight:'bold', color:'#7f8c8d'}}>{d}</div>
                    {totaleGiorno > 0 && (
                        <div style={{position:'absolute', bottom:5, right:5, background:'#e74c3c', color:'white', fontSize:11, padding:'2px 6px', borderRadius:4, fontWeight:'bold'}}>
                            € {totaleGiorno.toFixed(2)}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} style={{border:'none', background:'#eee', padding:'5px 15px', borderRadius:5, cursor:'pointer'}}>◀ Prec.</button>
                <h3 style={{margin:0}}>{currentMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} style={{border:'none', background:'#eee', padding:'5px 15px', borderRadius:5, cursor:'pointer'}}>Succ. ▶</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', textAlign:'center', fontWeight:'bold', marginBottom:5, fontSize:12, color:'#7f8c8d'}}>
                <div>LUN</div><div>MAR</div><div>MER</div><div>GIO</div><div>VEN</div><div>SAB</div><div>DOM</div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)'}}>{renderCalendar()}</div>
        </div>
    );
};

export default MagazzinoCalendar;