import React, { useState } from 'react';

const CleaningManager = ({ logs, salvaPulizia, staffList }) => {
    const [form, setForm] = useState({ 
        area: '', prodotto: '', operatore: '', data: new Date().toISOString().split('T')[0] 
    });

    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #9b59b6'}}>
                <h3>🧼 Registro Sanificazioni</h3>
                <form onSubmit={(e) => { e.preventDefault(); salvaPulizia(form); }} style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end'}}>
                    <div style={{flex:1}}><label>Data</label><input type="date" value={form.data} onChange={e=>setForm({...form, data:e.target.value})} style={{width:'100%', padding:8}} required/></div>
                    <div style={{flex:1}}><label>Area/Attrezzatura</label><input placeholder="Es. Affettatrice" value={form.area} onChange={e=>setForm({...form, area:e.target.value})} style={{width:'100%', padding:8}} required/></div>
                    <div style={{flex:1}}><label>Detergente</label><input placeholder="Es. Sgrassatore cloroattivo" value={form.prodotto} onChange={e=>setForm({...form, prodotto:e.target.value})} style={{width:'100%', padding:8}}/></div>
                    <div style={{flex:1}}><label>Operatore</label>
                        <select value={form.operatore} onChange={e=>setForm({...form, operatore:e.target.value})} style={{width:'100%', padding:8}}>
                            <option value="">-- Chi ha pulito? --</option>
                            {staffList.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                    </div>
                    <button style={{background:'#9b59b6', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>REGISTRA</button>
                </form>
            </div>
            {/* Qui andrà la tabella dello storico simile alle merci */}
        </div>
    );
};

export default CleaningManager;