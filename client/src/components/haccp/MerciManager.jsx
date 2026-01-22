// client/src/components/haccp/MerciManager.jsx - VERSIONE UNIVERSALE (Props + Smart)
import React, { useState, useEffect, useRef } from 'react';

const MerciManager = (props) => {
    // 1. ESTRAPOLIAMO LE PROPS (con valori di default sicuri)
    const { 
        API_URL = "https://stark-backend-gg17.onrender.com",
        ristoranteId, 
        mode = "haccp", 
        title, 
        showHaccpToggle = false,
        openDownloadModal,
        // Props da Haccp.jsx (opzionali)
        merci: propMerci,
        merciForm: propForm,
        setMerciForm: propSetForm,
        salvaMerci: propSalva,
        handleMerciPhoto: propPhoto,
        uploadingMerci: propUploading,
        iniziaModificaMerci: propIniziaModifica,
        eliminaMerce: propElimina,
        assets: propAssets,
        resetMerciForm: propReset
    } = props;

    // 2. MODALITÀ RILEVAMENTO: Se "propMerci" esiste, siamo controllati dal padre (Haccp.jsx)
    const isControlled = propMerci !== undefined;

    // --- STATI INTERNI (Usati solo se NON controllato / Magazzino) ---
    const initialInternalForm = {
        data_ricezione: new Date().toISOString().split('T')[0],
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        fornitore: '', prodotto: '', quantita: '', unita_misura: 'pz',
        prezzo: '', prezzo_unitario: '', iva: '',
        lotto: '', scadenza: '', temperatura: '',
        destinazione: '', note: '', conforme: true, integro: true, allegato_url: '',
        is_haccp: mode === 'haccp'
    };

    const [internalMerci, setInternalMerci] = useState([]);
    const [internalAssets, setInternalAssets] = useState([]);
    const [internalForm, setInternalForm] = useState(initialInternalForm);
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalUploading, setInternalUploading] = useState(false);

    // --- VARIABILI UNIFICATE (Usiamo props se ci sono, altrimenti stato interno) ---
    const merci = isControlled ? propMerci : internalMerci;
    const assets = isControlled ? propAssets : internalAssets;
    const merciForm = isControlled ? propForm : internalForm;
    const setMerciForm = isControlled ? propSetForm : setInternalForm;
    const uploadingMerci = isControlled ? propUploading : internalUploading;

    // --- SCAN & AI STATE ---
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null); 
    const scanInputRef = useRef(null);

    // --- HELPER TIME ---
    const getCurrentTime = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    // --- 3. LOGICA FETCH (SOLO SMART MODE) ---
    useEffect(() => {
        if (!isControlled && ristoranteId) {
            const fetchData = async () => {
                setInternalLoading(true);
                try {
                    const [resM, resA] = await Promise.all([
                        fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`),
                        fetch(`${API_URL}/api/haccp/assets/${ristoranteId}`)
                    ]);
                    setInternalMerci(await resM.json());
                    setInternalAssets(await resA.json());
                } catch(e) { console.error("Err Fetch", e); }
                finally { setInternalLoading(false); }
            };
            fetchData();
        }
    }, [isControlled, ristoranteId, mode, API_URL]);

    // --- 4. LOGICA AZIONI (PONTE TRA INTERNAL E PROPS) ---

    // RESET FORM
    const handleReset = () => {
        if (isControlled && propReset) propReset();
        else setInternalForm(initialInternalForm);
    };

    // SAVE WRAPPER
    const handleSave = async (e) => {
        if(e) e.preventDefault();
        
        // Assicuriamoci che ci sia l'ora
        const formWithTime = { ...merciForm, ora: merciForm.ora || getCurrentTime() };
        if(!isControlled) setInternalForm(formWithTime); // Aggiorna stato locale se serve

        if (isControlled) {
            // Usa la funzione del padre, ma assicuriamoci che l'ora sia nel form
            if (!merciForm.ora) {
                // Hack: se il padre usa lo stato 'merciForm' per salvare, dobbiamo aggiornarlo prima
                setMerciForm(prev => ({...prev, ora: getCurrentTime()}));
                // Lasciamo un tick per il render? No, chiamiamo propSalva sperando legga lo stato o l'evento
            }
            propSalva(e); 
        } else {
            // LOGICA SALVATAGGIO INTERNA (Per Magazzino)
            try {
                const payload = { ...formWithTime, ristorante_id: ristoranteId };
                const url = payload.id ? `${API_URL}/api/haccp/merci/${payload.id}` : `${API_URL}/api/haccp/merci`;
                const method = payload.id ? 'PUT' : 'POST';
                
                await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
                handleReset();
                // Ricarica dati
                const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
                setInternalMerci(await r.json());
            } catch(e) { alert("Errore salvataggio"); }
        }
    };

    // UPLOAD WRAPPER
    const handlePhoto = async (e) => {
        if (isControlled) {
            propPhoto(e);
        } else {
            // Upload Interno
            const f = e.target.files[0]; if(!f) return;
            setInternalUploading(true);
            const fd = new FormData(); fd.append('photo', f);
            try {
                const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
                const d = await res.json();
                if(d.url) setInternalForm(prev => ({...prev, allegato_url: d.url}));
            } catch(e) { alert("Err Upload"); }
            finally { setInternalUploading(false); }
        }
    };

    // DELETE WRAPPER
    const handleDelete = async (id) => {
        if (isControlled) {
            propElimina(id);
        } else {
            if(!confirm("Eliminare?")) return;
            await fetch(`${API_URL}/api/haccp/merci/${id}`, { method: 'DELETE' });
            const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
            setInternalMerci(await r.json());
        }
    };

    // EDIT WRAPPER
    const handleEdit = (m) => {
        const cleanData = {
            ...m,
            scadenza: m.scadenza ? m.scadenza.split('T')[0] : '',
            data_ricezione: m.data_ricezione ? m.data_ricezione.split('T')[0] : ''
        };
        if(isControlled) propIniziaModifica(cleanData);
        else setInternalForm(cleanData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // TOGGLE HACCP (Nuova Feature)
    const toggleHaccpLocal = async (item) => {
        const newVal = !item.is_haccp;
        // Aggiornamento Ottimistico
        if(!isControlled) {
            setInternalMerci(prev => prev.map(m => m.id === item.id ? {...m, is_haccp: newVal} : m));
        } 
        
        try {
            await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ merci: [{ ...item, is_haccp: newVal }] })
            });
            // Se controllato, dovrebbe pensarci il padre a ricaricare o l'utente a fare refresh
            // Se interno, ricarichiamo
            if(!isControlled) {
                 const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
                 setInternalMerci(await r.json());
            }
        } catch(e) { console.error(e); }
    };

    // --- 5. EFFETTI UTILITY (CALCOLO PREZZI & INIT) ---
    useEffect(() => {
        if (!merciForm.id) {
            // Default su nuovo inserimento
            setMerciForm(prev => ({
                ...prev,
                ora: prev.ora || getCurrentTime(),
                unita_misura: prev.unita_misura || 'pz',
                is_haccp: prev.is_haccp !== undefined ? prev.is_haccp : (mode === 'haccp')
            }));
        }
    }, [merciForm.id, mode, setMerciForm]);

    useEffect(() => {
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        if (!isNaN(qta) && !isNaN(unit)) {
            const tot = (qta * unit).toFixed(2);
            if (merciForm.prezzo !== tot) {
                setMerciForm(prev => ({ ...prev, prezzo: tot }));
            }
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario, setMerciForm]);

    // --- HELPER TABELLA ---
    const renderRowData = (r) => {
        const qta = parseFloat(r.quantita) || 0;
        const unit = parseFloat(r.prezzo_unitario) || 0;
        const imp = parseFloat(r.prezzo) || (qta * unit);
        const iva = parseFloat(r.iva) || 0;
        const ivaTot = imp * (iva / 100);
        const totIvato = imp + ivaTot;
        return { imp: imp.toFixed(2), totIvato: totIvato.toFixed(2) };
    };

    // --- 6. MAGIC SCAN ---
    const resizeImage = (file, maxWidth = 1000, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
                };
            };
            reader.onerror = reject;
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
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            ora: scannedData.ora_consegna || getCurrentTime(),
            prodotto: prod.nome, 
            quantita: prod.quantita || '', 
            lotto: prod.lotto || (scannedData.numero_documento || ''), 
            scadenza: prod.scadenza || '',
            note: `Rif. Doc: ${docNum} del ${docData}`, 
            allegato_url: scannedData.allegato_url || prev.allegato_url,
            prezzo: prod.prezzo || '',
            is_haccp: prod.is_haccp !== undefined ? prod.is_haccp : (mode === 'haccp')
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
            ora: scannedData.ora_consegna || getCurrentTime(),
            note: `Rif. Doc: ${docNum} del ${docData}`,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        setScannedData(null);
    };

    // --- RENDER ---
    return (
        <div className="no-print">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <h3 style={{color:'#2c3e50', margin:0}}>{title || (mode === 'all' ? "📦 Magazzino Generale" : "🍎 Ricevimento Merci HACCP")}</h3>
                {openDownloadModal && (
                    <button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report Excel</button>
                )}
            </div>

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
                                <div style={{fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                    {p.nome}
                                    {p.is_haccp && <span style={{fontSize:10, background:'#2ecc71', color:'white', padding:'1px 4px', borderRadius:3}}>ALIM.</span>}
                                </div>
                                <div style={{fontSize:11}}>Qta: {p.quantita} | € {p.prezzo}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setScannedData(null)} style={{marginTop:10, border:'none', background:'transparent', textDecoration:'underline', color:'#c0392b'}}>Chiudi</button>
                </div>
            )}

            {/* FORM */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><h3>{merciForm.id ? '✏️ Modifica' : '📥 Nuovo Arrivo'}</h3>{merciForm.id && <button onClick={handleReset}>Annulla</button>}</div>
                <form onSubmit={handleSave} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    
                    <div style={{flex:1, minWidth:120}}>
                        <label style={{fontSize:11}}>Data</label>
                        <input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required />
                    </div>
                    <div style={{flex:0.5, minWidth:80}}>
                        <label style={{fontSize:11}}>Ora</label>
                        <input type="time" value={merciForm.ora || ''} onChange={e=>setMerciForm({...merciForm, ora:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} />
                    </div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    
                    <div style={{flex:1, minWidth:80}}>
                        <label style={{fontSize:11}}>Quantità</label>
                        <input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} />
                    </div>
                    <div style={{flex:0.8, minWidth:80}}>
                        <label style={{fontSize:11}}>U.M.</label>
                        <select value={merciForm.unita_misura || 'pz'} onChange={e=>setMerciForm({...merciForm, unita_misura:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                            <option value="pz">Pz</option><option value="kg">Kg</option><option value="lt">Lt</option><option value="gr">Gr</option>
                            <option value="ct">Cartoni</option><option value="css">Casse</option><option value="pch">Pacchi</option>
                        </select>
                    </div>

                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>P. Unitario</label><input type="number" step="0.01" value={merciForm.prezzo_unitario || ''} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>TOTALE</label><input type="number" step="0.01" value={merciForm.prezzo} onChange={e=>setMerciForm({...merciForm, prezzo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', background:'#f0f0f0', fontWeight:'bold'}} /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Destinazione</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                          <option value="">-- Seleziona --</option>
                          {assets && assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>

                    {showHaccpToggle && (
                         <div style={{flex:1, minWidth:120, display:'flex', alignItems:'center', background:'#f1c40f', padding:'0 10px', borderRadius:5, marginTop:18, height:38}}>
                            <label style={{fontSize:12, fontWeight:'bold', cursor:'pointer', width:'100%'}}>
                                <input type="checkbox" checked={merciForm.is_haccp} onChange={e=>setMerciForm({...merciForm, is_haccp:e.target.checked})} style={{marginRight:5}} /> 
                                È Alimento
                            </label>
                        </div>
                    )}
                    
                    <label style={{background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, cursor:'pointer', fontSize:12, marginTop:18}}>{uploadingMerci ? "..." : "📎 Allegato"}<input type="file" accept="image/*,.pdf" onChange={handlePhoto} style={{display:'none'}} /></label>
                    <button type="submit" style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', marginTop:18}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
                </form>
            </div>

            {/* TABELLA */}
            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}><h3>📦 Storico</h3></div>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                        <thead>
                            <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                                <th style={{padding:8}}>Data / Ora</th>
                                <th style={{padding:8}}>Fornitore</th>
                                <th style={{padding:8}}>Prodotto</th>
                                <th style={{padding:8}}>Qta</th>
                                <th style={{padding:8}}>Totale</th>
                                <th style={{padding:8}}>Lotto/Scad</th>
                                {showHaccpToggle && <th style={{padding:8, textAlign:'center'}}>Produzione?</th>}
                                <th style={{padding:8}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merci && merci.map(m => {
                                const c = renderRowData(m); 
                                return (
                                    <tr key={m.id} style={{borderBottom:'1px solid #eee', background: (showHaccpToggle && !m.is_haccp) ? '#fcfcfc' : 'white'}}>
                                        <td style={{padding:8}}>
                                            {new Date(m.data_ricezione).toLocaleDateString()}
                                            <div style={{fontSize:10, color:'#666'}}>{m.ora}</div>
                                        </td>
                                        <td style={{padding:8}}>{m.fornitore}</td>
                                        <td style={{padding:8}}><strong style={{color: m.is_haccp ? '#2c3e50' : '#7f8c8d'}}>{m.prodotto}</strong></td>
                                        <td style={{padding:8}}>{m.quantita} {m.unita_misura}</td>
                                        <td style={{padding:8, color:'#27ae60', fontWeight:'bold'}}>€ {c.totIvato}</td>
                                        <td style={{padding:8}}>
                                            <div>{m.lotto}</div>
                                            {m.scadenza && <div style={{fontSize:10, color:'#c0392b'}}>{new Date(m.scadenza).toLocaleDateString()}</div>}
                                        </td>
                                        
                                        {showHaccpToggle && (
                                            <td style={{padding:8, textAlign:'center'}}>
                                                <button 
                                                    onClick={() => toggleHaccpLocal(m)}
                                                    style={{
                                                        background: m.is_haccp ? '#27ae60' : '#bdc3c7',
                                                        color: 'white', border:'none', padding:'4px 8px', 
                                                        borderRadius:10, cursor:'pointer', fontSize:10, fontWeight:'bold'
                                                    }}
                                                >
                                                    {m.is_haccp ? "SI" : "NO"}
                                                </button>
                                            </td>
                                        )}

                                        <td style={{padding:8}}>
                                            <button onClick={()=>handleEdit(m)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16}}>✏️</button>
                                            <button onClick={()=>handleDelete(m.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16}}>🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MerciManager;