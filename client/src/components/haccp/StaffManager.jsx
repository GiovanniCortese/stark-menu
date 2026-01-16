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

    // --- FUNZIONE PER GESTIRE APERTURA FILE ---
    const handleViewFile = (doc) => {
        const isPdf = doc.url.toLowerCase().includes('.pdf') || doc.nome_file.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
            // 💡 SOLUZIONE: Passiamo tramite il proxy del tuo server
            // Usiamo encodeURIComponent per evitare che caratteri speciali rompano l'URL
            const proxyUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.nome_file)}`;
            
            // Apriamo in una nuova finestra (popup del browser)
            window.open(proxyUrl, '_blank', 'noopener,noreferrer');
        } else {
            // Se è un'immagine, Cloudinary va bene diretto
            window.open(doc.url, '_blank');
        }
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
                                                
                                                {/* MODIFICA QUI: Usiamo un button che chiama la funzione intelligente */}
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
        </div>
    );
};

export default StaffManager;