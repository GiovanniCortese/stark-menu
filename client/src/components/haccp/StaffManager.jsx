import React, { useState } from 'react';

const StaffManager = ({ 
    staffList, 
    selectedStaff, 
    openStaffDocs, 
    setSelectedStaff, 
    newDoc, 
    setNewDoc, 
    uploadFile,
    staffDocs, 
    deleteDoc,
    API_URL 
}) => {
    
    const [isLoading, setIsLoading] = useState(false);
    // Stato per gestire il popup del PDF/Immagine
    const [previewDoc, setPreviewDoc] = useState(null); 

    const handleUploadWrapper = async (e) => {
        const f = e.target.files[0];
        if(!f) return;
        setIsLoading(true);
        try {
            const url = await uploadFile(f);
            await fetch(`${API_URL}/api/staff/docs`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ utente_id: selectedStaff.id, tipo_doc: newDoc.tipo, nome_file: f.name, url })
            });
            openStaffDocs(selectedStaff);
            setNewDoc({...newDoc, url: ''});
            alert("✅ Caricamento completato!");
        } catch (error) {
            console.error(error);
            alert("❌ Errore durante il caricamento.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- FUNZIONE: PREPARA IL POPUP ---
    const handleViewFile = (doc) => {
        const isPdf = doc.nome_file.toLowerCase().endsWith('.pdf') || doc.url.toLowerCase().endsWith('.pdf');
        
        // Se è PDF usiamo il Proxy, se è immagine usiamo l'URL diretto
        let urlFinale = doc.url;
        if (isPdf) {
            // Usiamo il proxy per aggirare i blocchi e mostrare l'anteprima
            urlFinale = `${API_URL}/api/proxy-download?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.nome_file)}`;
        }

        setPreviewDoc({
            url: urlFinale,
            name: doc.nome_file,
            type: isPdf ? 'pdf' : 'image'
        });
    };

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
                            
                            <label style={{
                                background: isLoading ? '#95a5a6' : '#3498db', 
                                color:'white', padding:'8px 15px', borderRadius:4, 
                                cursor: isLoading ? 'not-allowed' : 'pointer', 
                                fontSize:13, fontWeight:'bold'
                            }}>
                                {isLoading ? "⏳ Caricamento..." : "⬆ Carica File"}
                                <input type="file" onChange={handleUploadWrapper} disabled={isLoading} style={{display:'none'}} />
                            </label>
                        </div>

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
                                {staffDocs.length === 0 ? (
                                    <tr><td colSpan="4" style={{padding:20, textAlign:'center', color:'#999'}}>Nessun documento.</td></tr>
                                ) : (
                                    staffDocs.map(d => (
                                        <tr key={d.id} style={{borderBottom:'1px solid #eee'}}>
                                            <td style={{padding:8}}>{new Date(d.data_caricamento).toLocaleDateString()}</td>
                                            <td style={{padding:8}}><span style={{background:'#eee', padding:'2px 5px', borderRadius:3, fontSize:11}}>{d.tipo_doc}</span></td>
                                            <td style={{padding:8}}>{d.nome_file}</td>
                                            <td style={{padding:8, display:'flex', gap:5}}>
                                                
                                                {/* TASTO VISUALIZZA MODIFICATO */}
                                                <button
                                                    onClick={() => handleViewFile(d)}
                                                    style={{
                                                        background:'#3498db', 
                                                        color:'white', 
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding:'4px 10px', 
                                                        borderRadius:3, 
                                                        fontSize:12, 
                                                        fontWeight:'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}
                                                >
                                                    👁️ Visualizza
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

            {/* --- MODALE POPUP ANTEPRIMA --- */}
            {previewDoc && (
                <div style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, 
                    background:'rgba(0,0,0,0.85)', zIndex:9999, 
                    display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                    <div style={{
                        background:'white', width:'90%', height:'90%', maxWidth:'1000px', 
                        borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                    }}>
                        {/* HEADER DEL POPUP */}
                        <div style={{
                            padding:'10px 15px', background:'#ecf0f1', borderBottom:'1px solid #ccc',
                            display:'flex', justifyContent:'space-between', alignItems:'center'
                        }}>
                            <span style={{fontWeight:'bold', color:'#2c3e50'}}>📄 {previewDoc.name}</span>
                            <div style={{display:'flex', gap:10}}>
                                {/* Tasto Download Diretto */}
                                <a 
                                    href={previewDoc.url} 
                                    download={previewDoc.name}
                                    style={{
                                        background:'#27ae60', color:'white', textDecoration:'none', 
                                        padding:'6px 12px', borderRadius:4, fontSize:13, fontWeight:'bold'
                                    }}
                                >
                                    ⬇️ Scarica
                                </a>
                                {/* Tasto Chiudi */}
                                <button 
                                    onClick={() => setPreviewDoc(null)}
                                    style={{
                                        background:'#e74c3c', color:'white', border:'none', 
                                        padding:'6px 12px', borderRadius:4, cursor:'pointer', fontWeight:'bold'
                                    }}
                                >
                                    Chiudi X
                                </button>
                            </div>
                        </div>

                        {/* CORPO DEL POPUP (IFRAME o IMG) */}
                        <div style={{flex:1, background:'#555', overflow:'hidden', display:'flex', justifyContent:'center', alignItems:'center'}}>
                            {previewDoc.type === 'pdf' ? (
                                <iframe 
                                    src={previewDoc.url} 
                                    style={{width:'100%', height:'100%', border:'none'}} 
                                    title="Anteprima PDF"
                                />
                            ) : (
                                <img 
                                    src={previewDoc.url} 
                                    alt="Anteprima" 
                                    style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StaffManager;