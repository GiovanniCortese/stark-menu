import React from 'react';

const MerciManager = ({ 
    merci, merciForm, setMerciForm, salvaMerci, handleMerciPhoto, 
    uploadingMerci, iniziaModificaMerci, eliminaMerce, assets, resetMerciForm 
}) => {
    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: merciForm.id ? '5px solid #f39c12' : '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h3>{merciForm.id ? '✏️ Modifica Arrivo Merce' : '📥 Nuovo Arrivo'}</h3>
                    {merciForm.id && <button onClick={resetMerciForm} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:5, padding:'5px 10px'}}>Annulla</button>}
                </div>
                <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data Arrivo</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Es. 10kg" style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Destinazione</label>
                        <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                            <option value="">-- Seleziona --</option>
                            {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                        </select>
                    </div>

                    <label style={{cursor:'pointer', background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, border:'1px solid #ccc', fontSize:12}}>
                        {uploadingMerci ? "Caricamento..." : (merciForm.allegato_url ? "📎 Bolla Allegata" : "📎 Allega Bolla")}
                        <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                    </label>

                    <button style={{background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold'}}>
                        {merciForm.id ? 'AGGIORNA' : 'REGISTRA'}
                    </button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <h3>📦 Storico Arrivi</h3>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Fornitore / Prodotto</th>
                            <th style={{padding:8}}>Stato</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merci.map(m => (
                            <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                <td style={{padding:8}}><strong>{m.fornitore}</strong><br/>{m.prodotto}</td>
                                <td style={{padding:8}}>{m.conforme && m.integro ? '✅ OK' : '⚠️ KO'}</td>
                                <td style={{padding:8, display:'flex', gap:5}}>
                                    <button onClick={()=>iniziaModificaMerci(m)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, padding:'2px 5px'}}>✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:3, padding:'2px 5px'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MerciManager;