// client/src/components/haccp/MerciManager.jsx - TABELLA ESPANSA
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

    // Funzione di compressione Immagini
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
                    if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => { if (!blob) return reject(new Error("Errore")); const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }); resolve(resizedFile); }, 'image/jpeg', quality);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleScanBolla = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        setIsScanning(true); setScannedData(null);
        try {
            const fd = new FormData();
            if (file.type === 'application/pdf') fd.append('photo', file);
            else { const compressedFile = await resizeImage(file, 800, 0.6); fd.append('photo', compressedFile); }
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setScannedData(json.data);
            if (json.isPdf) alert("📄 PDF Caricato! Allega e usa i dati di testata.");
        } catch(err) { alert("⚠️ ERRORE SCANSIONE: " + err.message); } finally { setIsScanning(false); e.target.value = null; }
    };

    const importaProdotto = (prod) => {
        const docNum = scannedData.numero_documento || 'ND';
        const docData = scannedData.data_ricezione || 'ND';
        const notaCostruita = `Rif. Doc: ${docNum} del ${docData}`;
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            prodotto: prod.nome, quantita: prod.quantita || '', lotto: prod.lotto || '', scadenza: prod.scadenza || '',
            note: notaCostruita, allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        setScannedData(prev => ({ ...prev, prodotti: prev.prodotti.filter(p => p !== prod) }));
    };

    const usaDatiTestata = () => {
        const docNum = scannedData.numero_documento || 'ND';
        const docData = scannedData.data_ricezione || 'ND';
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            note: `Rif. Doc: ${docNum} del ${docData}`,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        if (scannedData.prodotti.length === 0) setScannedData(null);
    };

    return (
        <div className="no-print">
            {/* SEZIONE SCANSIONE */}
            <div onClick={() => scanInputRef.current.click()} style={{marginBottom: 20, padding: 15, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, color: 'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: 'pointer'}}>
                <div><h3 style={{margin:0}}>✨ Magic Scan (AI)</h3><p style={{margin:0, fontSize:12}}>Carica Foto o PDF per auto-compilazione.</p></div>
                <button disabled={isScanning} style={{background:'white', color:'#764ba2', border:'none', padding:'10px 20px', borderRadius:25, fontWeight:'bold'}}>{isScanning ? '🤖...' : '📸 SCANSIONA'}</button>
                <input type="file" ref={scanInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{ display: 'none' }} />            
            </div>

            {/* RISULTATI SCAN */}
            {scannedData && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <div><strong>Fornitore: {scannedData.fornitore}</strong></div>
                        <button onClick={usaDatiTestata} style={{background:'#0097a7', color:'white', border:'none', padding:'5px', borderRadius:5, fontSize:11}}>📝 Usa Dati Testata</button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                        {scannedData.prodotti.map((p, idx) => (
                            <div key={idx} onClick={() => importaProdotto(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', flex:1, minWidth:200}}>
                                <div style={{fontWeight:'bold'}}>{p.nome}</div>
                                <div style={{fontSize:11}}>Qta: {p.quantita} | € {p.prezzo}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setScannedData(null)} style={{marginTop:10, border:'none', background:'transparent', textDecoration:'underline', color:'#c0392b'}}>Chiudi</button>
                </div>
            )}

            {/* FORM MANUALE */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><h3>{merciForm.id ? '✏️ Modifica' : '📥 Nuovo Arrivo'}</h3>{merciForm.id && <button onClick={resetMerciForm}>Annulla</button>}</div>
                <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Quantità</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Destinazione</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                          <option value="">-- Seleziona --</option>
                          {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note (DDT)</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <label style={{background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, cursor:'pointer', fontSize:12}}>{uploadingMerci ? "..." : "📎 Allegato"}<input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} /></label>
                    <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:11}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label><label style={{fontSize:11}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label></div>
                    <button type="submit" style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold'}}>SALVA</button>
                </form>
            </div>

            {/* TABELLA STORICO (ESPANSA) */}
            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}><h3>📦 Storico</h3><button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'5px 15px', borderRadius:5}}>⬇ Report</button></div>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                                <th style={{padding:8}}>Data</th>
                                <th style={{padding:8}}>Fornitore</th>
                                <th style={{padding:8}}>Prodotto</th>
                                <th style={{padding:8}}>Qta</th>
                                <th style={{padding:8}}>Lotto</th>
                                <th style={{padding:8}}>Scadenza</th>
                                <th style={{padding:8}}>Temp</th>
                                <th style={{padding:8}}>Note / Doc</th>
                                <th style={{padding:8}}>Allegato</th>
                                <th style={{padding:8}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merci.map(m => (
                                <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                    <td style={{padding:8}}>{m.fornitore}</td>
                                    <td style={{padding:8}}><strong>{m.prodotto}</strong></td>
                                    <td style={{padding:8}}>{m.quantita}</td>
                                    <td style={{padding:8}}>{m.lotto || '-'}</td>
                                    <td style={{padding:8}}>{m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}</td>
                                    <td style={{padding:8}}>{m.temperatura ? m.temperatura+'°' : '-'}</td>
                                    <td style={{padding:8, fontSize:11, color:'#555'}}>{m.note}</td>
                                    <td style={{padding:8}}>
                                       {m.allegato_url && <button onClick={() => handleFileAction(m.allegato_url)} style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 5px', cursor:'pointer'}}>📎</button>}
                                    </td>
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
        </div>
    );
};

export default MerciManager;