import React, { useState, useEffect } from 'react';

const CleaningManager = ({ info, API_URL, staffList, openDownloadModal }) => {
    const [pulizie, setPulizie] = useState([]);
    const [form, setForm] = useState({ 
        area: '', prodotto: '', operatore: '', data: new Date().toISOString().split('T')[0] 
    });

    const caricaPulizie = async () => {
        try {
            const r = await fetch(`${API_URL}/api/haccp/pulizie/${info.id}`);
            const d = await r.json();
            setPulizie(d);
        } catch (e) { console.error("Err carica pulizie", e); }
    };

    useEffect(() => { caricaPulizie(); }, [info.id]);

    const salvaPulizia = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/api/haccp/pulizie`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, ristorante_id: info.id, conformita: true })
        });
        setForm({ ...form, area: '', prodotto: '' });
        caricaPulizie();
    };

    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #9b59b6'}}>
                <h3>🧼 Registro Sanificazioni</h3>
                <form onSubmit={salvaPulizia} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:1}}><label style={{fontSize:11}}>Data</label><input type="date" value={form.data} onChange={e=>setForm({...form, data:e.target.value})} style={{width:'100%', padding:8}} required/></div>
                    <div style={{flex:2}}><label style={{fontSize:11}}>Area / Attrezzatura</label><input placeholder="Es. Affettatrice" value={form.area} onChange={e=>setForm({...form, area:e.target.value})} style={{width:'100%', padding:8}} required/></div>
                    <div style={{flex:1}}><label style={{fontSize:11}}>Operatore</label>
                        <select value={form.operatore} onChange={e=>setForm({...form, operatore:e.target.value})} style={{width:'100%', padding:8}} required>
                            <option value="">-- Seleziona --</option>
                            {staffList.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                    </div>
                    <button style={{background:'#9b59b6', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:40}}>REGISTRA</button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                    <h3>📅 Storico Sanificazioni</h3>
                    <button onClick={() => openDownloadModal('pulizie')} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 15px', borderRadius:5, fontSize:13, cursor:'pointer', fontWeight:'bold'}}>⬇ Scarica Registro Pulizie</button>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Area</th>
                            <th style={{padding:8}}>Operatore</th>
                            <th style={{padding:8}}>Esito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pulizie.map(p => (
                            <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(p.data_ora).toLocaleDateString()}</td>
                                <td style={{padding:8}}>{p.area}</td>
                                <td style={{padding:8}}>{p.operatore}</td>
                                <td style={{padding:8}}><span style={{color:'green', fontWeight:'bold'}}>OK</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CleaningManager;