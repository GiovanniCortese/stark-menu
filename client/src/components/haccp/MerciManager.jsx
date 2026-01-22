// client/src/components/haccp/MerciManager.jsx - SMART COMPONENT (MAGAZZINO + HACCP)
import React, { useState, useEffect, useRef } from 'react';

const MerciManager = ({ 
    ristoranteId, 
    mode = "haccp", // 'haccp' (solo alimenti) o 'all' (tutto il magazzino)
    title, 
    showHaccpToggle = false,
    openDownloadModal, // Prop opzionale per aprire il modal download del genitore
    API_URL = "https://stark-backend-gg17.onrender.com" // Default URL
}) => {
    
    // --- STATI DATI ---
    const [merci, setMerci] = useState([]);
    const [assets, setAssets] = useState([]); // Per dropdown destinazione
    const [loading, setLoading] = useState(false);
    
    // --- STATI FORM ---
    const initialFormState = {
        data_ricezione: new Date().toISOString().split('T')[0],
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        fornitore: '', prodotto: '', quantita: '', unita_misura: 'pz',
        prezzo: '', prezzo_unitario: '', iva: '',
        lotto: '', scadenza: '', temperatura: '',
        destinazione: '', note: '',
        conforme: true, integro: true,
        allegato_url: '', is_haccp: mode === 'haccp' // Default true se siamo in tab haccp
    };
    const [merciForm, setMerciForm] = useState(initialFormState);
    const [uploadingMerci, setUploadingMerci] = useState(false);

    // --- STATI SCAN & AI ---
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null); 
    const scanInputRef = useRef(null);

    // --- HELPER TIME ---
    const getCurrentTime = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    // --- CARICAMENTO DATI ---
    const fetchMerci = async () => {
        if(!ristoranteId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
            const data = await res.json();
            setMerci(Array.isArray(data) ? data : []);
        } catch (err) { console.error("Err fetch merci:", err); } 
        finally { setLoading(false); }
    };

    const fetchAssets = async () => {
        if(!ristoranteId) return;
        try {
            const res = await fetch(`${API_URL}/api/haccp/assets/${ristoranteId}`);
            const data = await res.json();
            setAssets(Array.isArray(data) ? data : []);
        } catch (err) { console.error("Err fetch assets:", err); }
    };

    useEffect(() => {
        if (ristoranteId) {
            fetchMerci();
            fetchAssets();
        }
    }, [ristoranteId, mode]);

    // --- CALCOLO AUTOMATICO PREZZI NEL FORM ---
    useEffect(() => {
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        if (!isNaN(qta) && !isNaN(unit)) {
            const tot = (qta * unit).toFixed(2);
            if (merciForm.prezzo !== tot) {
                setMerciForm(prev => ({ ...prev, prezzo: tot }));
            }
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario]);

    // --- HELPER TABELLA ---
    const renderRowData = (r) => {
        const qta = parseFloat(r.quantita) || 0;
        const unit = parseFloat(r.prezzo_unitario) || 0;
        const imp = parseFloat(r.prezzo) || (qta * unit);
        const iva = parseFloat(r.iva) || 0;
        const ivaTot = imp * (iva / 100);
        const totIvato = imp + ivaTot;
        return { 
            imp: imp.toFixed(2), 
            ivaTot: ivaTot.toFixed(2), 
            totIvato: totIvato.toFixed(2) 
        };
    };

    // --- LOGICA AZIONI (SALVA, ELIMINA, TOGGLE) ---
    
    // Salva / Aggiorna / Importa
    const salvaMerci = async (e) => {
        if(e) e.preventDefault();
        
        // Assicuriamoci che ci sia l'ora
        const payload = { 
            ...merciForm, 
            ristorante_id: ristoranteId,
            ora: merciForm.ora || getCurrentTime()
        };

        // URL e Metodo dipendono se è nuovo o modifica
        const url = payload.id 
            ? `${API_URL}/api/haccp/merci/${payload.id}` 
            : `${API_URL}/api/haccp/merci`;
        
        const method = payload.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                setMerciForm(initialFormState); // Reset form
                fetchMerci(); // Ricarica tabella
            } else {
                alert("Errore salvataggio");
            }
        } catch (err) { console.error(err); alert("Errore connessione"); }
    };

    const eliminaMerce = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
        try {
            await fetch(`${API_URL}/api/haccp/merci/${id}`, { method: 'DELETE' });
            fetchMerci();
        } catch (e) { alert("Errore eliminazione"); }
    };

    const toggleIsHaccp = async (item) => {
        // Toggle rapido: usiamo l'import massivo che fa UPSERT per aggiornare solo il flag
        const updatedItem = { ...item, is_haccp: !item.is_haccp };
        
        // Optimistic UI update
        setMerci(merci.map(m => m.id === item.id ? updatedItem : m));

        try {
            await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ merci: [updatedItem] })
            });
        } catch (e) { 
            console.error(e);
            fetchMerci(); // Revert on error
        }
    };

    const iniziaModificaMerci = (m) => {
        setMerciForm({
            ...m,
            scadenza: m.scadenza ? m.scadenza.split('T')[0] : '',
            data_ricezione: m.data_ricezione ? m.data_ricezione.split('T')[0] : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetMerciForm = () => setMerciForm(initialFormState);

    // --- UPLOAD IMMAGINI ---
    const handleMerciPhoto = async (e) => {
        const f = e.target.files[0]; if(!f) return;
        setUploadingMerci(true);
        const fd = new FormData(); fd.append('photo', f);
        try {
            const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
            const data = await res.json();
            if(data.url) setMerciForm(prev => ({...prev, allegato_url: data.url}));
        } catch(e) { alert("Errore Upload"); } 
        finally { setUploadingMerci(false); }
    };

    // --- MAGIC SCAN & IMAGE UTILS ---
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
            
            // Fix: se l'AI torna un oggetto, lo usiamo. Se c'è un campo data, lo preserviamo
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
            ora: scannedData.ora_consegna || getCurrentTime(), 
            prodotto: prod.nome, 
            quantita: prod.quantita || '', 
            lotto: prod.lotto || '', 
            scadenza: prod.scadenza || '',
            note: notaCostruita, 
            allegato_url: scannedData.allegato_url || prev.allegato_url,
            prezzo: prod.prezzo || '',
            // Se l'AI ha capito che è HACCP usa quello, altrimenti usa il default del form (che dipende dal mode)
            is_haccp: prod.is_haccp !== undefined ? prod.is_haccp : prev.is_haccp
        }));
        // Rimuove dalla lista temporanea visiva
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
        if (scannedData.prodotti.length === 0) setScannedData(null);
    };

    return (
        <div className="no-print">
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <h3 style={{color:'#2c3e50', margin:0}}>{title || (mode === 'all' ? "📦 Magazzino Generale" : "🍎 Ricevimento Merci HACCP")}</h3>
                {/* Tasto Download Report (se passato dal genitore) o autonomo */}
                {openDownloadModal && (
                    <button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report Excel</button>
                )}
            </div>

            {/* SEZIONE SCANSIONE */}
            <div onClick={() => scanInputRef.current.click()} style={{marginBottom: 20, padding: 15, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, color: 'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: 'pointer', boxShadow:'0 4px 15px rgba(118, 75, 162, 0.3)'}}>
                <div><h3 style={{margin:0}}>✨ Magic Scan (AI)</h3><p style={{margin:0, fontSize:12, opacity:0.9}}>Carica Foto o PDF per auto-compilazione.</p></div>
                <button disabled={isScanning} style={{background:'white', color:'#764ba2', border:'none', padding:'10px 20px', borderRadius:25, fontWeight:'bold', cursor:'pointer'}}>{isScanning ? '🤖 Analisi...' : '📸 SCANSIONA'}</button>
                <input type="file" ref={scanInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{ display: 'none' }} />            
            </div>

            {/* RISULTATI SCAN */}
            {scannedData && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <div><strong>Fornitore: {scannedData.fornitore}</strong></div>
                        <button onClick={usaDatiTestata} style={{background:'#0097a7', color:'white', border:'none', padding:'5px', borderRadius:5, fontSize:11, cursor:'pointer'}}>📝 Usa Dati Testata</button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                        {scannedData.prodotti.map((p, idx) => (
                            <div key={idx} onClick={() => importaProdotto(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', flex:1, minWidth:200, boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                                <div style={{fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                    {p.nome}
                                    {p.is_haccp && <span style={{fontSize:10, background:'#2ecc71', color:'white', padding:'1px 4px', borderRadius:3}}>HACCP</span>}
                                </div>
                                <div style={{fontSize:11, color:'#555'}}>Qta: {p.quantita} | € {p.prezzo}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setScannedData(null)} style={{marginTop:10, border:'none', background:'transparent', textDecoration:'underline', color:'#c0392b', cursor:'pointer'}}>Chiudi</button>
                </div>
            )}

            {/* FORM MANUALE */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: '5px solid #27ae60', boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h4 style={{margin:'0 0 15px 0', color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Prodotto' : '📥 Registra Nuovo Arrivo'}</h4>
                    {merciForm.id && <button onClick={resetMerciForm} style={{background:'#95a5a6', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>Annulla Modifica</button>}
                </div>
                
                <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    
                    <div style={{flex:1, minWidth:120}}>
                        <label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Data</label>
                        <input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} required />
                    </div>
                    
                    <div style={{flex:0.5, minWidth:80}}>
                        <label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Ora</label>
                        <input type="time" value={merciForm.ora || ''} onChange={e=>setMerciForm({...merciForm, ora:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                    </div>

                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} required /></div>
                    
                    {/* PREZZI & QUANTITA */}
                    <div style={{flex:1, minWidth:80}}>
                        <label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Quantità</label>
                        <input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} />
                    </div>
                    
                    <div style={{flex:0.8, minWidth:80}}>
                        <label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>U.M.</label>
                        <select value={merciForm.unita_misura || 'pz'} onChange={e=>setMerciForm({...merciForm, unita_misura:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd', borderRadius:4}}>
                            <option value="pz">Pz</option>
                            <option value="kg">Kg</option>
                            <option value="lt">Lt</option>
                            <option value="gr">Gr</option>
                            <option value="ct">Cartoni</option>
                            <option value="css">Casse</option>
                            <option value="pch">Pacchi</option>
                        </select>
                    </div>

                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>P. Unitario</label><input type="number" step="0.01" placeholder="€" value={merciForm.prezzo_unitario || ''} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    <div style={{flex:1, minWidth:50}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>IVA %</label><input type="text" placeholder="22" value={merciForm.iva || ''} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>TOTALE</label><input type="number" step="0.01" placeholder="Tot" value={merciForm.prezzo} onChange={e=>setMerciForm({...merciForm, prezzo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4, background:'#f8f9fa', fontWeight:'bold'}} /></div>

                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Destinazione</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd', borderRadius:4}}>
                          <option value="">-- Seleziona --</option>
                          {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>
                    
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11, fontWeight:'bold', color:'#7f8c8d'}}>Note (DDT)</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4}} /></div>
                    
                    <label style={{background: merciForm.allegato_url ? '#2ecc71' : '#bdc3c7', color:'white', padding:'9px 15px', borderRadius:5, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5}}>
                        {uploadingMerci ? "⏳..." : (merciForm.allegato_url ? "📎 OK" : "📎 Allegato")}
                        <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                    </label>
                    
                    {/* TOGGLE HACCP NEL FORM (SE SERVE FORZARE) */}
                    {showHaccpToggle && (
                        <div style={{display:'flex', alignItems:'center', background:'#f1c40f', padding:'5px 10px', borderRadius:5}}>
                            <label style={{fontSize:12, fontWeight:'bold', cursor:'pointer'}}>
                                <input type="checkbox" checked={merciForm.is_haccp} onChange={e=>setMerciForm({...merciForm, is_haccp:e.target.checked})} /> 
                                È Alimento (HACCP)
                            </label>
                        </div>
                    )}

                    <div style={{display:'flex', flexDirection:'column', fontSize:11}}>
                        <label><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                        <label><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                    </div>
                    
                    <button type="submit" style={{background:'#27ae60', color:'white', border:'none', padding:'10px 30px', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginLeft:'auto'}}>
                        {merciForm.id ? 'AGGIORNA' : 'SALVA'}
                    </button>
                </form>
            </div>

            {/* TABELLA STORICO */}
            <div style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                {loading && <div style={{textAlign:'center', padding:20}}>Caricamento...</div>}
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f8f9fa', textAlign:'left', borderBottom:'2px solid #ddd'}}>
                                <th style={{padding:12}}>Data / Ora</th>
                                <th style={{padding:12}}>Fornitore</th>
                                <th style={{padding:12}}>Prodotto</th>
                                <th style={{padding:12}}>Qta</th>
                                <th style={{padding:12}}>Prezzo</th>
                                <th style={{padding:12}}>Lotto/Scad</th>
                                {showHaccpToggle && <th style={{padding:12, textAlign:'center'}}>Produzione?</th>}
                                <th style={{padding:12, textAlign:'right'}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merci.map(m => {
                                const c = renderRowData(m); 
                                return (
                                    <tr key={m.id} style={{borderBottom:'1px solid #eee', background: (showHaccpToggle && !m.is_haccp) ? '#fcfcfc' : 'white'}}>
                                        <td style={{padding:12}}>
                                            <div style={{fontWeight:'bold'}}>{new Date(m.data_ricezione).toLocaleDateString()}</div>
                                            <div style={{fontSize:11, color:'#888'}}>🕒 {m.ora || '--:--'}</div>
                                        </td>
                                        <td style={{padding:12, color:'#555'}}>{m.fornitore}</td>
                                        <td style={{padding:12}}>
                                            <strong style={{color: m.is_haccp ? '#2c3e50' : '#7f8c8d'}}>{m.prodotto}</strong>
                                            {m.note && <div style={{fontSize:10, color:'#999', fontStyle:'italic'}}>{m.note}</div>}
                                        </td>
                                        <td style={{padding:12}}>
                                            {m.quantita} <span style={{fontSize:10, color:'#666'}}>{m.unita_misura}</span>
                                        </td>
                                        <td style={{padding:12}}>
                                            <div style={{fontWeight:'bold', color:'#27ae60'}}>€ {c.totIvato}</div>
                                            <div style={{fontSize:10, color:'#999'}}>Imponibile: {c.imp}</div>
                                        </td>
                                        <td style={{padding:12}}>
                                            <div>{m.lotto || '-'}</div>
                                            {m.scadenza && <div style={{fontSize:10, color:'#c0392b'}}>Exp: {new Date(m.scadenza).toLocaleDateString()}</div>}
                                        </td>
                                        
                                        {/* TOGGLE BUTTON COLUMN */}
                                        {showHaccpToggle && (
                                            <td style={{padding:12, textAlign:'center'}}>
                                                <button 
                                                    onClick={() => toggleIsHaccp(m)}
                                                    style={{
                                                        background: m.is_haccp ? '#27ae60' : '#bdc3c7',
                                                        color: 'white', border:'none', padding:'5px 10px', 
                                                        borderRadius:20, cursor:'pointer', fontSize:10, fontWeight:'bold',
                                                        transition: 'background 0.3s'
                                                    }}
                                                >
                                                    {m.is_haccp ? "SI (Cucina)" : "NO (Solo Stock)"}
                                                </button>
                                            </td>
                                        )}

                                        <td style={{padding:12, textAlign:'right'}}>
                                            <button onClick={()=>iniziaModificaMerci(m)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16, marginRight:10}}>✏️</button>
                                            <button onClick={()=>eliminaMerce(m.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16}}>🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {merci.length === 0 && !loading && <div style={{padding:40, textAlign:'center', color:'#888'}}>Nessun prodotto trovato.</div>}
                </div>
            </div>
        </div>
    );
};

export default MerciManager;