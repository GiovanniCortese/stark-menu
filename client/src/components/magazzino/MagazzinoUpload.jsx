import React, { useState, useEffect, useRef } from 'react';

const MagazzinoUpload = ({ user, API_URL, onSuccess, onCancel, recordDaModificare, setRecordDaModificare, ricaricaDati, onScanComplete }) => {
    // Refs
    const fileInputRef = useRef(null); 
    const allegatoInputRef = useRef(null); 

    // Stati
    const [isScanning, setIsScanning] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Helper data odierna per input datetime-local
    const getNowLocalISO = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Helper per evitare valori null/undefined nei campi input
    const safeVal = (val, def = '') => (val !== undefined && val !== null) ? val : def;

    // Form Completo
    const [formData, setFormData] = useState({
        id: null, 
        ristorante_id: user.id,
        data_ricezione: getNowLocalISO(), 
        data_documento: new Date().toISOString().split('T')[0], 
        riferimento_documento: '',
        fornitore: '',
        codice_articolo: '',
        sconto: 0,
        prodotto: '',
        lotto: '',
        scadenza: '',
        note: '',
        quantita: '',
        unita_misura: 'Pz',
        prezzo_unitario: '',
        iva: '10', 
        totale_netto: '',
        totale_iva: '',
        totale_lordo: '',
        allegato_url: '',
        is_haccp: true,
        operatore: user.nome || 'Admin'
    });

    // --- CARICAMENTO DATI PER MODIFICA (FIX ROBUSTO) ---
    useEffect(() => {
        if (recordDaModificare) {
            console.log("Caricamento Record:", recordDaModificare);

            let dataIns = getNowLocalISO();
            // Gestione data ricezione sicura
            if(recordDaModificare.data_ricezione) {
                try {
                    const d = new Date(recordDaModificare.data_ricezione);
                    if(!isNaN(d.getTime())) {
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        dataIns = d.toISOString().slice(0, 16);
                    }
                } catch(e) { console.error("Errore parsing data ricezione", e); }
            }

            // Gestione data documento sicura
            let dataDoc = new Date().toISOString().split('T')[0];
            if (recordDaModificare.data_documento) {
                dataDoc = recordDaModificare.data_documento.split('T')[0];
            } else if (recordDaModificare.data_documento_iso) {
                dataDoc = recordDaModificare.data_documento_iso;
            }

            setFormData(prev => ({
                ...prev,
                id: recordDaModificare.id,
                ristorante_id: recordDaModificare.ristorante_id || user.id,
                
                // Date
                data_ricezione: dataIns,
                data_documento: dataDoc,
                
                // Campi Testo (safeVal evita crash su null)
                riferimento_documento: safeVal(recordDaModificare.riferimento_documento),
                fornitore: safeVal(recordDaModificare.fornitore),
                codice_articolo: safeVal(recordDaModificare.codice_articolo),
                prodotto: safeVal(recordDaModificare.prodotto),
                lotto: safeVal(recordDaModificare.lotto),
                unita_misura: safeVal(recordDaModificare.unita_misura, 'Pz'),
                note: safeVal(recordDaModificare.note),
                allegato_url: safeVal(recordDaModificare.allegato_url),
                
                // Campi Numerici
                quantita: safeVal(recordDaModificare.quantita, 0),
                prezzo_unitario: safeVal(recordDaModificare.prezzo_unitario, 0),
                sconto: safeVal(recordDaModificare.sconto, 0),
                
                // FIX IVA: Trasforma "4.00" in "4" per il select
                iva: recordDaModificare.iva ? String(parseFloat(recordDaModificare.iva)) : '10',
                
                // Totali (verranno sovrascritti dal calcolo automatico, ma inizializziamoli)
                totale_netto: safeVal(recordDaModificare.totale_netto, 0),
                totale_iva: safeVal(recordDaModificare.totale_iva, 0),
                totale_lordo: safeVal(recordDaModificare.totale_lordo, 0),
                
                scadenza: recordDaModificare.scadenza ? recordDaModificare.scadenza.split('T')[0] : '',
                is_haccp: recordDaModificare.is_haccp !== undefined ? recordDaModificare.is_haccp : true,
                operatore: recordDaModificare.operatore || user.nome || 'Admin'
            }));
        }
    }, [recordDaModificare]);

    // --- CALCOLATRICE AUTOMATICA ---
    useEffect(() => {
        const qta = parseFloat(formData.quantita) || 0;
        const unitListino = parseFloat(formData.prezzo_unitario) || 0;
        const sc = parseFloat(formData.sconto) || 0;
        const ivaPerc = parseFloat(formData.iva) || 0;
        
        // Calcolo Netto Scontato
        const unitNetto = unitListino * (1 - sc/100);
        
        const totNetto = qta * unitNetto;
        const totIva = totNetto * (ivaPerc / 100);
        const totLordo = totNetto + totIva;

        const nuovoNettoStr = totNetto.toFixed(2);
        const nuovoIvaStr = totIva.toFixed(2);
        const nuovoLordoStr = totLordo.toFixed(2);
        
        // Aggiorna solo se cambia il valore per evitare loop
        if (formData.totale_netto !== nuovoNettoStr && (qta > 0 || unitListino > 0)) {
            setFormData(prev => ({
                ...prev,
                totale_netto: nuovoNettoStr,
                totale_iva: nuovoIvaStr,
                totale_lordo: nuovoLordoStr
            }));
        }
    }, [formData.quantita, formData.prezzo_unitario, formData.sconto, formData.iva]);

    // --- FUNZIONE SCAN ---
    const handleScan = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        const fd = new FormData();
        fd.append('photo', file);
        
        try {
            // 1. Upload Immagine
            const uploadRes = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
            const uploadData = await uploadRes.json();
            const urlAllegato = uploadData.url || '';

            // 2. Analisi AI
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const result = await res.json();

            if (result.success && result.data) {
                const d = result.data;
                const prodottiTrovati = d.prodotti || [];

                if (prodottiTrovati.length === 0) {
                    alert("⚠️ L'AI non ha trovato prodotti. Riprova con una foto più nitida.");
                    setIsScanning(false);
                    return;
                }

                // 3. Prepare Data for Staging
                const merciDaRevisionare = prodottiTrovati.map(prod => ({
                    ristorante_id: user.id,
                    
                    // DATE
                    data_documento: d.data_documento_iso || '', 
                    data_ricezione: new Date().toISOString().split('T')[0], // Oggi
                    ora: new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}),
                    
                    fornitore: d.fornitore || 'Fornitore Sconosciuto',
                    riferimento_documento: d.numero_documento || '',
                    
                    codice_articolo: prod.codice_articolo || '',
                    prodotto: prod.nome,
                    quantita: parseFloat(prod.quantita) || 0,
                    unita_misura: prod.unita_misura || 'Pz',
                    
                    prezzo_unitario: parseFloat(prod.prezzo_unitario) || 0,
                    sconto: parseFloat(prod.sconto) || 0,
                    iva: parseFloat(prod.iva) || 0,
                    
                    lotto: prod.lotto || '',
                    scadenza: prod.scadenza || null,
                    is_haccp: prod.is_haccp,
                    
                    allegato_url: urlAllegato,
                    operatore: user.nome || 'AI Scan',
                    note: `AI Scan: ${d.numero_documento || ''}`
                }));

                if (onScanComplete) {
                    onScanComplete(merciDaRevisionare);
                }

            } else {
                alert("⚠️ AI non ha restituito dati leggibili.");
            }
        } catch (error) {
            console.error("Errore Scan:", error);
            alert("Errore connessione AI.");
        } finally {
            setIsScanning(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAllegato = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('photo', file);
        try {
            const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) setFormData(prev => ({ ...prev, allegato_url: data.url }));
        } catch (error) { alert("Errore caricamento file"); } finally { setUploading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            const payload = {
                ...formData,
                prezzo_unitario: parseFloat(formData.prezzo_unitario) || 0,
                sconto: parseFloat(formData.sconto) || 0,
                totale_netto: parseFloat(formData.totale_netto) || 0,
                totale_iva: parseFloat(formData.totale_iva) || 0,
                totale_lordo: parseFloat(formData.totale_lordo) || 0,
                ora: new Date(formData.data_ricezione).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})
            };

            let url = formData.id 
                ? `${API_URL}/api/haccp/merci/${formData.id}` // PUT
                : `${API_URL}/api/haccp/merci`; // POST
            
            const method = formData.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const jsonRes = await res.json();
            
            if (jsonRes.success) {
                alert("✅ Salvato!");
                if (ricaricaDati) ricaricaDati(); 
                if (setRecordDaModificare) setRecordDaModificare(null);
                onSuccess(); 
            } else { alert("Errore: " + jsonRes.error); }
        } catch (error) { alert("Errore server."); } finally { setUploading(false); }
    };

    const rowStyle = { display: 'flex', gap: 15, marginBottom: 15, flexWrap:'wrap' };
    const colStyle = { flex: 1, minWidth: '150px' };
    const labelStyle = { display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: '12px', color: '#7f8c8d' };
    const inputStyle = { width: '100%', padding: '10px', borderRadius: 5, border: '1px solid #ccc', fontSize: '14px' };

    return (
        <div style={{ background: 'white', padding: 30, borderRadius: 15, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            {isScanning && (
                <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.9)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <div style={{fontSize:50, animation:'spin 2s linear infinite'}}>🤖</div>
                    <h3>Jarvis sta analizzando il documento...</h3>
                    <p style={{color:'#666'}}>Lettura prodotti, ci possono volere fino a 5 minuti...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom:'1px solid #eee', paddingBottom:10 }}>
                <h3 style={{ margin: 0, color: '#2c3e50' }}>{formData.id ? '✏️ Modifica Riga' : '📥 Nuovo Carico Merce'}</h3>
                {!formData.id && (
                    <div style={{display:'flex', gap:10}}>
                        <button type="button" onClick={() => fileInputRef.current.click()} style={{ background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 30, cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:5, boxShadow:'0 4px 15px rgba(37, 117, 252, 0.3)' }}>
                            <span>📸</span> SCAN BOLLA AI
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleScan} style={{ display: 'none' }} accept="image/*,application/pdf" />
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{background:'#f8f9fa', padding:15, borderRadius:8, marginBottom:20}}>
                    <h4 style={{marginTop:0, fontSize:14, color:'#3498db'}}>📄 Dati Documento</h4>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>Data Inserimento</label>
                            <input type="datetime-local" required style={inputStyle} value={formData.data_ricezione} onChange={e => setFormData({ ...formData, data_ricezione: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Data Doc. (Fattura)</label>
                            <input type="date" required style={inputStyle} value={formData.data_documento} onChange={e => setFormData({ ...formData, data_documento: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Riferimento Doc. (Num)</label>
                            <input type="text" placeholder="Es. Fatt. 402/A" style={inputStyle} value={formData.riferimento_documento} onChange={e => setFormData({ ...formData, riferimento_documento: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Fornitore</label>
                            <input type="text" required style={inputStyle} value={formData.fornitore} onChange={e => setFormData({ ...formData, fornitore: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div style={{background:'#fff', border:'1px solid #eee', padding:15, borderRadius:8, marginBottom:20}}>
                    <h4 style={{marginTop:0, fontSize:14, color:'#27ae60'}}>📦 Dati Prodotto (Manuale)</h4>
                    <div style={rowStyle}>
                        <div style={{...colStyle, flex:0.5}}>
                            <label style={labelStyle}>Cod. Articolo</label>
                            <input type="text" style={{...inputStyle, background:'#f9f9f9'}} value={formData.codice_articolo} onChange={e => setFormData({ ...formData, codice_articolo: e.target.value })} placeholder="Opz." />
                        </div>
                        <div style={{...colStyle, flex:2}}>
                            <label style={labelStyle}>Prodotto</label>
                            <input type="text" required style={{...inputStyle, fontWeight:'bold'}} value={formData.prodotto} onChange={e => setFormData({ ...formData, prodotto: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Lotto</label>
                            <input type="text" style={inputStyle} value={formData.lotto} onChange={e => setFormData({ ...formData, lotto: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Scadenza</label>
                            <input type="date" style={inputStyle} value={formData.scadenza} onChange={e => setFormData({ ...formData, scadenza: e.target.value })} />
                        </div>
                    </div>
                    
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>Quantità</label>
                            <input type="number" step="0.01" required style={{...inputStyle, textAlign:'center', fontWeight:'bold'}} value={formData.quantita} onChange={e => setFormData({ ...formData, quantita: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Unità</label>
                            <select style={inputStyle} value={formData.unita_misura} onChange={e => setFormData({ ...formData, unita_misura: e.target.value })}>
                                <option value="Pz">Pezzi (Pz)</option><option value="Kg">Kg</option><option value="Lt">Litri</option><option value="Ct">Cartoni</option>
                            </select>
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>€ Netto (Unit)</label>
                            <input type="number" step="0.001" required style={inputStyle} value={formData.prezzo_unitario} onChange={e => setFormData({ ...formData, prezzo_unitario: e.target.value })} />
                        </div>
                        <div style={{...colStyle, maxWidth:80}}>
                            <label style={labelStyle}>Sc.%</label>
                            <input type="number" step="0.01" style={{...inputStyle, color:'red'}} value={formData.sconto} onChange={e => setFormData({ ...formData, sconto: e.target.value })} />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>IVA %</label>
                            <select style={inputStyle} value={formData.iva} onChange={e => setFormData({ ...formData, iva: e.target.value })}>
                                <option value="4">4%</option><option value="10">10%</option><option value="22">22%</option><option value="0">0%</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{background:'#eaf2f8', padding:15, borderRadius:8, marginBottom:20, border:'1px solid #d6eaf8'}}>
                    <h4 style={{marginTop:0, fontSize:14, color:'#2980b9'}}>🧮 Riepilogo Costi</h4>
                    <div style={{display:'flex', gap:15}}>
                        <div style={{flex:1, textAlign:'center', borderRight:'1px solid #ccc'}}>
                            <div style={{fontSize:11, color:'#7f8c8d'}}>TOTALE NETTO</div>
                            <div style={{fontSize:18, fontWeight:'bold', color:'#2c3e50'}}>€ {formData.totale_netto || '0.00'}</div>
                        </div>
                        <div style={{flex:1, textAlign:'center', borderRight:'1px solid #ccc'}}>
                            <div style={{fontSize:11, color:'#7f8c8d'}}>TOTALE IVA</div>
                            <div style={{fontSize:18, fontWeight:'bold', color:'#7f8c8d'}}>€ {formData.totale_iva || '0.00'}</div>
                        </div>
                        <div style={{flex:1, textAlign:'center'}}>
                            <div style={{fontSize:11, color:'#27ae60', fontWeight:'bold'}}>TOTALE LORDO</div>
                            <div style={{fontSize:22, fontWeight:'bold', color:'#27ae60'}}>€ {formData.totale_lordo || '0.00'}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 }}>
                    <div onClick={() => allegatoInputRef.current.click()} style={{ cursor: 'pointer', color: formData.allegato_url ? '#27ae60' : '#7f8c8d', display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{fontSize:20}}>📎</span> {formData.allegato_url ? <b>Allegato OK!</b> : "Carica Foto Manuale"}
                        <input type="file" ref={allegatoInputRef} onChange={handleAllegato} style={{ display: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={onCancel} style={{ padding: '12px 20px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>ANNULLA</button>
                        <button type="submit" disabled={uploading} style={{ padding: '12px 30px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(39, 174, 96, 0.3)' }}>
                            {uploading ? '...' : (formData.id ? '💾 AGGIORNA' : '💾 SALVA RIGA')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default MagazzinoUpload;