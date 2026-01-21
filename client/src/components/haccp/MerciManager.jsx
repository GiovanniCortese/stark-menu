import React, { useState, useRef } from 'react';

const MerciManager = ({ 
    merci, merciForm, setMerciForm, salvaMerci, handleMerciPhoto, 
    uploadingMerci, iniziaModificaMerci, eliminaMerce, assets, resetMerciForm,
    handleFileAction, openDownloadModal,
    API_URL 
}) => {
    
    // Stati per la scansione AI
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null); 
    const scanInputRef = useRef(null);

    // Funzione di compressione Immagini (NON usata per PDF)
    const resizeImage = (file, maxWidth = 1000, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width *= maxWidth / height;
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) return reject(new Error("Errore compressione"));
                        const resizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    }, 'image/jpeg', quality);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    // Gestione Scansione (Supporta PDF e Immagini)
    const handleScanBolla = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setIsScanning(true);
        setScannedData(null); // Reset dati precedenti
        
        try {
            const fd = new FormData();

            // CRASH FIX: Se è PDF, NON comprimere. Invia diretto.
            if (file.type === 'application/pdf') {
                fd.append('photo', file);
            } else {
                // Se è immagine, comprimi per velocità
                const compressedFile = await resizeImage(file, 800, 0.6); 
                fd.append('photo', compressedFile);
            }

            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { 
                method: 'POST', 
                body: fd
            });

            if (!res.ok) {
                let msg = "Errore durante l'analisi.";
                try { const j = await res.json(); if(j.error) msg = j.error; } catch(e){}
                throw new Error(msg);
            }

            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Dati non validi.");

            setScannedData(json.data);
            
            // Se è un PDF (che l'AI non legge riga per riga), avvisa l'utente
            if (json.isPdf) {
                alert("📄 PDF Caricato! L'allegato è pronto. Puoi usare il tasto 'Usa Dati Testata' per compilare il form.");
            }

        } catch(err) {
            console.error(err);
            alert("⚠️ ERRORE SCANSIONE\n\n" + err.message); 
        } finally {
            setIsScanning(false);
            e.target.value = null; 
        }
    };

    // Importa un singolo prodotto rilevato dall'AI nel form
    const importaProdotto = (prod) => {
        // COSTRUZIONE NOTA AUTOMATICA (DDT + DATA)
        const docNum = scannedData.numero_documento || 'ND';
        const docData = scannedData.data_ricezione || 'ND';
        const notaCostruita = `Rif. Doc: ${docNum} del ${docData}`;

        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            
            prodotto: prod.nome,
            quantita: prod.quantita || '',
            lotto: prod.lotto || '',
            scadenza: prod.scadenza || '',
            
            // QUI INSERIAMO LE NOTE FORMATTATE E L'URL ALLEGATO
            note: notaCostruita,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));

        // Rimuovi dalla lista temporanea per evitare doppi inserimenti
        setScannedData(prev => ({
            ...prev,
            prodotti: prev.prodotti.filter(p => p !== prod)
        }));
    };

    // Funzione per usare solo i dati di testata (utile per PDF o bolle illeggibili)
    const usaDatiTestata = () => {
        const docNum = scannedData.numero_documento || 'ND';
        const docData = scannedData.data_ricezione || 'ND';
        const notaCostruita = `Rif. Doc: ${docNum} del ${docData}`;

        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            note: notaCostruita,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        
        // Non chiudiamo scannedData se ci sono prodotti, ma in caso di PDF è utile
        if (scannedData.prodotti.length === 0) setScannedData(null);
    };

    return (
        <div className="no-print">
            {/* --- SEZIONE SCANSIONE AI --- */}
            <div 
                onClick={() => scanInputRef.current.click()}
                style={{marginBottom: 20, padding: 15, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, color: 'white', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 15px rgba(0,0,0,0.2)', cursor: 'pointer'}}
            >
                <div>
                    <h3 style={{margin:0, fontSize:18}}>✨ Magic Scan (AI)</h3>
                    <p style={{margin:'5px 0 0 0', fontSize:12, opacity:0.9}}>Carica Foto o PDF: l'IA compilerà i dati e allegherà il file.</p>
                </div>
                <button 
                    disabled={isScanning}
                    style={{background:'white', color:'#764ba2', border:'none', padding:'10px 20px', borderRadius:25, fontWeight:'bold', cursor: isScanning ? 'wait' : 'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}
                >
                    {isScanning ? '🤖 Analisi...' : '📸 SCANSIONA / CARICA'}
                </button>
                <input 
                    type="file" 
                    ref={scanInputRef}
                    accept="image/*,application/pdf"
                    onChange={handleScanBolla} 
                    style={{ display: 'none' }} 
                />            
            </div>

            {/* --- LISTA RISULTATI SCAN --- */}
            {scannedData && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center'}}>
                        <div>
                            <strong style={{color:'#006064'}}>Risultati Scansione</strong>
                            <div style={{fontSize:11, color:'#00838f'}}>
                                Fornitore: {scannedData.fornitore || 'ND'} | Doc: {scannedData.numero_documento || 'ND'}
                            </div>
                        </div>
                        <div style={{display:'flex', gap:10}}>
                             {/* Bottone utile per PDF o inserimenti manuali con allegato già pronto */}
                             <button onClick={usaDatiTestata} style={{background:'#0097a7', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:'bold'}}>
                                📝 Usa Dati Testata e Allegato
                            </button>
                            <button onClick={() => setScannedData(null)} style={{fontSize:11, background:'transparent', border:'none', textDecoration:'underline', cursor:'pointer', color:'#c0392b'}}>Chiudi</button>
                        </div>
                    </div>

                    {scannedData.prodotti.length > 0 ? (
                        <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                            {scannedData.prodotti.map((p, idx) => (
                                <div key={idx} onClick={() => importaProdotto(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', minWidth:200, flex:1, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
                                    <div style={{fontWeight:'bold', fontSize:13}}>{p.nome}</div>
                                    <div style={{fontSize:11, color:'#555'}}>Qta: {p.quantita} | Lotto: {p.lotto || '-'}</div>
                                    <div style={{fontSize:10, color:'#00838f', marginTop:5, fontWeight:'bold'}}>CLICCA PER IMPORTARE ⬇</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{fontSize:12, fontStyle:'italic', color:'#555', padding:10, background:'white', borderRadius:5}}>
                            Nessun prodotto specifico rilevato (o file PDF). Usa "Usa Dati Testata" per compilare fornitore/data/allegato e inserire i prodotti manualmente.
                        </div>
                    )}
                </div>
            )}

            {/* --- FORM DI INSERIMENTO --- */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: merciForm.id ? '5px solid #f39c12' : '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h3>{merciForm.id ? '✏️ Modifica Arrivo Merce' : '📥 Nuovo Arrivo'}</h3>
                    {merciForm.id && <button onClick={resetMerciForm} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:5, padding:'5px 10px', cursor:'pointer'}}>Annulla Modifica</button>}
                </div>
                
                <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data Arrivo</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Quantità (KG/Colli)</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Es. 10kg" style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Destinazione</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                          <option value="">-- Seleziona --</option>
                          {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>

                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note (DDT / Fattura)</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} placeholder="Es. Rif. Doc: 104 del 20/10" style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{display:'flex', alignItems:'center', gap:5}}>
                      <label style={{cursor:'pointer', background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, border:'1px solid #ccc', fontSize:12, whiteSpace:'nowrap'}}>
                          {uploadingMerci ? "Caricamento..." : (merciForm.allegato_url ? "📎 File Allegato" : "📎 Allega Manualmente")}
                          <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                      </label>
                    </div>

                    <div style={{display:'flex', flexDirection:'column', gap:5, minWidth:100}}>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                    </div>
                    
                    <button type="submit" style={{background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold'}}>
                        {merciForm.id ? 'AGGIORNA' : 'REGISTRA'}
                    </button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                   <h3>📦 Storico Arrivi</h3>
                   <button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'5px 15px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>⬇ Scarica Report Merci</button>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Fornitore / Prodotto</th>
                            <th style={{padding:8}}>Condizione</th> 
                            <th style={{padding:8}}>Lotto / Scadenza</th>
                            <th style={{padding:8}}>Note / Doc</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merci.map(m => (
                            <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                <td style={{padding:8}}><strong>{m.fornitore}</strong><br/>{m.prodotto} ({m.quantita})</td>
                                <td style={{padding:8}}>
                                    {!m.conforme ? <span style={{color:'red', fontWeight:'bold'}}>TEMP KO</span> : 
                                     (!m.integro ? <span style={{color:'orange', fontWeight:'bold'}}>DANNEGGIATO</span> : 
                                     <span style={{color:'green', fontWeight:'bold'}}>CONFORME</span>)}
                                </td>
                                <td style={{padding:8}}>
                                     L: {m.lotto}<br/>
                                     S: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                                </td>
                                <td style={{padding:8}}>
                                     {m.note && <div style={{fontWeight:'bold', color:'#555'}}>{m.note}</div>}
                                     {m.destinazione && <div style={{fontSize:11}}>📍 {m.destinazione}</div>}
                                </td>
                                <td style={{padding:8, display:'flex', gap:5}}>
                                   {m.allegato_url && (
                                        <button 
                                            onClick={() => handleFileAction(m.allegato_url)} 
                                            style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 5px', cursor:'pointer'}}
                                            title="Vedi Allegato"
                                        >
                                            📎
                                        </button>
                                    )}
                                    <button onClick={()=>iniziaModificaMerci(m)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'2px 5px'}}>✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'2px 5px'}}>🗑️</button>
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