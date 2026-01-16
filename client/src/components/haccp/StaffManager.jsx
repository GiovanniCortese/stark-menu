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
    handleFileView // Prop aggiunta per la gestione intelligente dei file
}) => {
    return (
        <div className="no-print">
            <h3>Gestione Personale & Documenti</h3>
            <p style={{fontSize:12, color:'#666'}}>Seleziona un membro dello staff per gestire i suoi documenti.</p>
            
            <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
                {/* LISTA STAFF */}
                <div style={{flex:1, minWidth:300, background:'white', padding:20, borderRadius:10}}>
                    <h4>Staff Attivo</h4>
                    {staffList.length === 0 && <p style={{fontSize:13, color:'#999'}}>Nessun dipendente trovato.</p>}
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
                            <span style={{fontSize:11, background:'#eee', padding:'2px 6px', borderRadius:4}}>{u.ruolo}</span>
                        </div>
                    ))}
                </div>

                {/* DETTAGLIO DOCUMENTI */}
                {selectedStaff && (
                    <div style={{flex:2, minWidth:300, background:'white', padding:20, borderRadius:10, borderLeft:'4px solid #3498db', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{margin:0}}>📂 Documenti: {selectedStaff.nome}</h3>
                            <button 
                                onClick={()=>setSelectedStaff(null)} 
                                style={{background:'#f1f2f6', border:'none', borderRadius:'50%', width:25, height:25, cursor:'pointer'}}
                            >
                                X
                            </button>
                        </div>

                        {/* FORM CARICAMENTO */}
                        <div style={{marginTop:20, background:'#f9f9f9', padding:15, borderRadius:5, display:'flex', gap:10, alignItems:'center'}}>
                            <select 
                                value={newDoc.tipo} 
                                onChange={e=>setNewDoc({...newDoc, tipo:e.target.value})} 
                                style={{padding:8, borderRadius:4, border:'1px solid #ddd', flex:1}}
                            >
                                <option value="Contratto">Contratto</option>
                                <option value="Busta Paga">Busta Paga</option>
                                <option value="Identità">Doc. Identità</option>
                                <option value="Attestato HACCP">Attestato HACCP</option>
                                <option value="Altro">Altro</option>
                            </select>
                            <label style={{background:'#3498db', color:'white', padding:'8px 15px', borderRadius:4, cursor:'pointer', fontSize:13, fontWeight:'bold'}}>
                                ⬆ Carica File
                                <input type="file" onChange={uploadStaffDoc} style={{display:'none'}} />
                            </label>
                        </div>

                        {/* TABELLA DOCUMENTI */}
                        <table style={{width:'100%', marginTop:20, fontSize:13, borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{textAlign:'left', borderBottom:'2px solid #eee'}}>
                                    <th style={{padding:8}}>Tipo</th>
                                    <th style={{padding:8}}>Nome File</th>
                                    <th style={{padding:8, textAlign:'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffDocs.length === 0 ? (
                                    <tr><td colSpan="3" style={{padding:20, textAlign:'center', color:'#999'}}>Nessun documento caricato.</td></tr>
                                ) : (
                                    staffDocs.map(d => (
                                        <tr key={d.id} style={{borderBottom:'1px solid #f9f9f9'}}>
                                            <td style={{padding:8}}>
                                                <span style={{background:'#eee', padding:'2px 5px', borderRadius:3, fontSize:11}}>{d.tipo_doc}</span>
                                            </td>
                                            <td style={{padding:8}}>{d.nome_file}</td>
                                            <td style={{padding:8, textAlign:'right', display:'flex', gap:5, justifyContent:'flex-end'}}>
                                                <button 
                                                    onClick={() => handleFileView(d.url)} 
                                                    style={{background:'#27ae60', color:'white', border:'none', padding:'4px 10px', borderRadius:3, cursor:'pointer', fontSize:12}}
                                                >
                                                    Vedi
                                                </button>
                                                <button 
                                                    onClick={()=>deleteDoc(d.id)} 
                                                    style={{background:'#e74c3c', color:'white', border:'none', padding:'4px 10px', borderRadius:3, cursor:'pointer', fontSize:12}}
                                                >
                                                    X
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffManager;