import React from 'react';

const StaffManager = ({ 
    staffList, 
    selectedStaff, 
    openStaffDocs, 
    setSelectedStaff, 
    newDoc, 
    setNewDoc, 
    uploadStaffDoc, 
    staffDocs, 
    deleteDoc,
    handleFileView 
}) => {
    return (
        <div className="no-print">
            <h3>Gestione Personale & Documenti</h3>
            <p style={{fontSize:12, color:'#666'}}>Seleziona un membro dello staff per gestire i suoi documenti.</p>
            
            <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
                {/* LISTA STAFF */}
                <div style={{flex:1, minWidth:300, background:'white', padding:20, borderRadius:10}}>
                    <h4>Staff Attivo</h4>
                    {staffList.length === 0 && <p>Nessun dipendente trovato.</p>}
                    {staffList.map(u => (
                        <div key={u.id} onClick={()=>openStaffDocs(u)} 
                             style={{
                                 padding:10, 
                                 borderBottom:'1px solid #eee', 
                                 cursor:'pointer', 
                                 background: selectedStaff?.id===u.id ? '#eafaf1' : 'white', 
                                 display:'flex', 
                                 justifyContent:'space-between',
                                 borderRadius: 5
                             }}>
                            <span style={{fontWeight:'bold'}}>{u.nome}</span>
                            <span style={{fontSize:12, background:'#eee', padding:'2px 6px', borderRadius:4}}>{u.ruolo}</span>
                        </div>
                    ))}
                </div>

                {/* DETTAGLIO DOCUMENTI */}
                {selectedStaff && (
                    <div style={{flex:2, minWidth:300, background:'white', padding:20, borderRadius:10, borderLeft:'4px solid #3498db'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3 style={{margin:0}}>📂 Documenti: {selectedStaff.nome}</h3>
                            <button onClick={()=>setSelectedStaff(null)} style={{background:'#ccc', border:'none', padding:'2px 8px', borderRadius:4, cursor:'pointer'}}>X</button>
                        </div>

                        {/* FORM CARICAMENTO */}
                        <div style={{marginTop:20, background:'#f9f9f9', padding:15, borderRadius:5, display:'flex', gap:10, alignItems:'center'}}>
                            <select 
                                value={newDoc.tipo} 
                                onChange={e=>setNewDoc({...newDoc, tipo:e.target.value})} 
                                style={{padding:8, borderRadius:4, border:'1px solid #ddd'}}
                            >
                                <option value="Contratto">Contratto</option>
                                <option value="Busta Paga">Busta Paga</option>
                                <option value="Identità">Doc. Identità</option>
                                <option value="Attestato HACCP">Attestato HACCP</option>
                                <option value="Altro">Altro</option>
                            </select>
                            <label style={{background:'#3498db', color:'white', padding:'8px 15px', borderRadius:4, cursor:'pointer', fontSize:13}}>
                                ⬆ Carica File
                                <input type="file" onChange={uploadStaffDoc} style={{display:'none'}} />
                            </label>
                        </div>

                        {/* TABELLA DOCUMENTI */}
                        <table style={{width:'100%', marginTop:20, fontSize:13, borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{textAlign:'left', borderBottom:'2px solid #ddd'}}>
                                    <th style={{padding:8}}>Data</th>
                                    <th style={{padding:8}}>Tipo</th>
                                    <th style={{padding:8}}>Nome File</th>
                                    <th style={{padding:8}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffDocs.map(d => (
                                    <tr key={d.id} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={{padding:8}}>{new Date(d.data_caricamento).toLocaleDateString()}</td>
                                        <td style={{padding:8}}><span style={{background:'#eee', padding:'2px 5px', borderRadius:3, fontSize:11}}>{d.tipo_doc}</span></td>
                                        <td style={{padding:8}}>{d.nome_file}</td>
                                        <td style={{padding:8, display:'flex', gap:5}}>
                                            <button 
                                                onClick={() => handleFileView(d.url)} 
                                                style={{background:'#27ae60', color:'white', border:'none', padding:'3px 8px', borderRadius:3, fontSize:12, cursor:'pointer'}}
                                            >
                                                Vedi
                                            </button>
                                            <button 
                                                onClick={()=>deleteDoc(d.id)} 
                                                style={{background:'#e74c3c', color:'white', border:'none', padding:'3px 8px', borderRadius:3, cursor:'pointer', fontSize:12}}
                                            >
                                                X
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffManager;