import React from 'react';

const StaffManager = ({ staffList, selectedStaff, openStaffDocs, setSelectedStaff, newDoc, setNewDoc, uploadStaffDoc, staffDocs, deleteDoc }) => {
    return (
        <div className="no-print">
            <h3>Gestione Personale & Documenti</h3>
            <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:300, background:'white', padding:20, borderRadius:10}}>
                    <h4>Staff Attivo</h4>
                    {staffList.map(u => (
                        <div key={u.id} onClick={()=>openStaffDocs(u)} 
                             style={{padding:10, borderBottom:'1px solid #eee', cursor:'pointer', background: selectedStaff?.id===u.id ? '#eafaf1' : 'white', display:'flex', justifyContent:'space-between'}}>
                            <span style={{fontWeight:'bold'}}>{u.nome}</span>
                            <span style={{fontSize:12, background:'#eee', padding:'2px 6px', borderRadius:4}}>{u.ruolo}</span>
                        </div>
                    ))}
                </div>

                {selectedStaff && (
                    <div style={{flex:2, minWidth:300, background:'white', padding:20, borderRadius:10, borderLeft:'4px solid #3498db'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3 style={{margin:0}}>📂 {selectedStaff.nome}</h3>
                            <button onClick={()=>setSelectedStaff(null)}>X</button>
                        </div>
                        <div style={{marginTop:20, display:'flex', gap:10}}>
                            <select value={newDoc.tipo} onChange={e=>setNewDoc({...newDoc, tipo:e.target.value})}>
                                <option value="Contratto">Contratto</option>
                                <option value="Attestato HACCP">Attestato HACCP</option>
                            </select>
                            <label style={{background:'#3498db', color:'white', padding:'8px', borderRadius:4, cursor:'pointer'}}>
                                ⬆ Carica <input type="file" onChange={uploadStaffDoc} style={{display:'none'}} />
                            </label>
                        </div>
                        <table style={{width:'100%', marginTop:20, fontSize:13}}>
                            <tbody>
                                {staffDocs.map(d => (
                                    <tr key={d.id}>
                                        <td>{d.tipo_doc}</td>
                                        <td>{d.nome_file}</td>
                                        <td><a href={d.url} target="_blank">Vedi</a></td>
                                        <td><button onClick={()=>deleteDoc(d.id)}>X</button></td>
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