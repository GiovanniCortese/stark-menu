import React, { useState, useEffect } from 'react';

const LabelGenerator = ({ 
    labelData, setLabelData, handleLabelTypeChange, handlePrintLabel, 
    lastLabel, info, API_URL, staffList
}) => {
    const [storicoLabels, setStoricoLabels] = useState([]);

    const caricaStorico = async () => {
        try {
            const r = await fetch(`${API_URL}/api/haccp/labels/storico/${info.id}`);
            const d = await r.json();
            setStoricoLabels(d);
        } catch (e) { console.error("Err storico labels", e); }
    };

    useEffect(() => { caricaStorico(); }, [lastLabel, info.id]);

    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #2980b9'}}>
                <h3>❄️ Registrazione Abbattimento / Produzione</h3>
                <form onSubmit={handlePrintLabel} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Prodotto / Piatto</label>
                        <input value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required />
                    </div>
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Conservazione</label>
                        <select value={labelData.tipo} onChange={handleLabelTypeChange} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                            <option value="positivo">Positivo (+3°C)</option>
                            <option value="negativo">Negativo (-18°C)</option>
                            <option value="sottovuoto">Sottovuoto</option>
                        </select>
                    </div>
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Operatore</label>
                        <select value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}} required>
                            <option value="">-- Seleziona --</option>
                            {staffList.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                    </div>
                    <button style={{background:'#2980b9', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold'}}>
                        CREA E STAMPA
                    </button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                    <h3>📑 Registro Storico Abbattimenti</h3>
                    <div style={{display:'flex', gap:5}}>
                        <button onClick={() => window.open(`${API_URL}/api/haccp/export/labels/${info.id}?format=excel`, '_blank')} style={{background:'#27ae60', color:'white', border:'none', padding:'5px 10px', borderRadius:3, fontSize:12, cursor:'pointer'}}>⬇ Excel</button>
                        <button onClick={() => window.open(`${API_URL}/api/haccp/export/labels/${info.id}?format=pdf`, '_blank')} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:3, fontSize:12, cursor:'pointer'}}>⬇ PDF</button>
                    </div>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Prodotto</th>
                            <th style={{padding:8}}>Lotto</th>
                            <th style={{padding:8}}>Scadenza</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {storicoLabels.map(l => (
                            <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(l.data_produzione).toLocaleDateString()}</td>
                                <td style={{padding:8}}><strong>{l.prodotto}</strong></td>
                                <td style={{padding:8}}><code>{l.lotto}</code></td>
                                <td style={{padding:8}}>{new Date(l.data_scadenza).toLocaleDateString()}</td>
                                <td style={{padding:8}}>
                                    <button onClick={() => window.print()} style={{background:'#34495e', color:'white', border:'none', borderRadius:3, padding:'4px 8px', cursor:'pointer'}}>Ristampa 🖨️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LabelGenerator;