import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// Helper per ottenere YYYY-MM-DDTHH:mm corrente locale
const getNowLocalISO = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16); 
};

const MagazzinoUpload = ({ user, API_URL, ricaricaDati, recordDaModificare, setRecordDaModificare, onSuccess }) => {
    // Refs
    const fileInputRef = useRef(null); 
    const allegatoInputRef = useRef(null); 
    const importExcelRef = useRef(null);

    // Stati
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const [uploadingMerci, setUploadingMerci] = useState(false);

    // Form Esteso per Contabilità
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: getNowLocalISO(), // Data inserimento a sistema
        data_bolla: new Date().toISOString().split('T')[0], // Data stampata sul documento
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        
        // Logistica
        tipo_unita: 'Pz', // Pz, Kg, Colli, Lt, ecc.
        quantita: '', 
        
        // Contabilità
        prezzo_unitario_netto: '', // Prezzo del singolo pezzo senza IVA
        aliquota_iva: '10', // 4, 10, 22, 0
        
        // Totali Calcolati
        valore_totale_netto: '',
        valore_totale_iva: '',
        valore_totale_lordo: '',

        temperatura: '', conforme: true, integro: true, 
        note: '', allegato_url: '', destinazione: ''
    });

    // Effetto per caricare dati in modifica
    useEffect(() => {
        if (recordDaModificare) {
            let dataCompleta = recordDaModificare.data_ricezione;
            // Gestione combinazione data+ora se presente
            if (recordDaModificare.ora && recordDaModificare.data_ricezione) {
                const soloData = recordDaModificare.data_ricezione.split('T')[0];
                dataCompleta = `${soloData}T${recordDaModificare.ora}`;
            } else if (recordDaModificare.data_ricezione) {
                 const d = new Date(recordDaModificare.data_ricezione);
                 d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                 dataCompleta = d.toISOString().slice(0, 16);
            }

            setMerciForm({
                ...recordDaModificare,
                data_ricezione: dataCompleta,
                data_bolla: recordDaModificare.data_bolla ? recordDaModificare.data_bolla.split('T')[0] : new Date().toISOString().split('T')[0],
                scadenza: recordDaModificare.scadenza ? recordDaModificare.scadenza.split('T')[0] : '',
                // Mapping vecchi campi su nuovi se necessario
                prezzo_unitario_netto: recordDaModificare.prezzo_unitario_netto || recordDaModificare.prezzo_unitario || '',
                aliquota_iva: recordDaModificare.aliquota_iva || recordDaModificare.iva || '10',
                tipo_unita: recordDaModificare.tipo_unita || recordDaModificare.unita_misura || 'Pz'
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [recordDaModificare]);

    // --- CALCOLATRICE AUTOMATICA ---
    // Ogni volta che cambi Qta, Prezzo Unitario o IVA, ricalcola i totali
    useEffect(() => {
        const qta = parseFloat(merciForm.quantita) || 0;
        const unitNetto = parseFloat(merciForm.prezzo_unitario_netto) || 0;
        const ivaPerc = parseFloat(merciForm.aliquota_iva) || 0;

        const totNetto = qta * unitNetto;
        const totIva = totNetto * (ivaPerc / 100);
        const totLordo = totNetto + totIva;

        // Aggiorna solo se i valori sono cambiati per evitare loop infiniti
        // Usiamo toFixed(2) per la visualizzazione contabile
        setMerciForm(prev => {
            const nuovoNetto = totNetto.toFixed(2);
            if (prev.valore_totale_netto !== nuovoNetto || 
                prev.valore_totale_iva !== totIva.toFixed(2)) {
                return {
                    ...prev,
                    valore_totale_netto: nuovoNetto,
                    valore_totale_iva: totIva.toFixed(2),
                    valore_totale_lordo: totLordo.toFixed(2)
                };
            }
            return prev;
        });
    }, [merciForm.quantita, merciForm.prezzo_unitario_netto, merciForm.aliquota_iva]);


    // --- FUNZIONI AI SCAN (AGGIORNATA PER NUOVI CAMPI) ---
    const handleScanBolla = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        setIsScanning(true); 
        
        try {
            const fd = new FormData();
            fd.append('photo', file);
            
            // 1. SCANSIONE AI
            const resAI = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const jsonAI = await resAI.json();
            
            if (!jsonAI.success) throw new Error(jsonAI.error || "Errore AI");
            
            const datiTestata = jsonAI.data;
            const prodottiTrovati = datiTestata.prodotti || [];

            if (prodottiTrovati.length === 0) throw new Error("Nessun prodotto trovato nel documento.");

            // 2. PREPARAZIONE DATI PER IMPORT MASSIVO (CALCOLI INCLUSI)
            const merceDaImportare = prodottiTrovati.map(p => {
                const qta = parseFloat(p.quantita) || 1;
                const unitNetto = parseFloat(p.prezzo_unitario) || 0;
                const ivaPerc = parseFloat(p.iva) || 0; // L'AI cerca di indovinare l'IVA

                const totNetto = qta * unitNetto;
                const totIva = totNetto * (ivaPerc / 100);
                const totLordo = totNetto + totIva;

                return {
                    ristorante_id: user.id,
                    data_ricezione: datiTestata.data_ricezione || new Date().toISOString().split('T')[0],
                    data_bolla: datiTestata.data_ricezione || new Date().toISOString().split('T')[0],
                    ora: datiTestata.ora_consegna || "12:00",
                    fornitore: datiTestata.fornitore || "Fornitore Sconosciuto",
                    note: `Rif. Doc: ${datiTestata.numero_documento || 'ND'}`,
                    
                    prodotto: p.nome,
                    quantita: qta,
                    tipo_unita: p.unita_misura || 'Pz', // Mappa su tipo_unita
                    unita_misura: p.unita_misura || 'Pz', // Legacy fallback
                    
                    prezzo_unitario_netto: unitNetto,
                    aliquota_iva: ivaPerc,
                    
                    valore_totale_netto: totNetto,
                    valore_totale_iva: totIva,
                    valore_totale_lordo: totLordo,

                    // Campi legacy per compatibilità
                    prezzo: totLordo, 
                    prezzo_unitario: unitNetto,
                    iva: ivaPerc,
                    
                    lotto: p.lotto || '',
                    scadenza: p.scadenza || null,
                    is_haccp: true,
                    operatore: 'MAGIC_SCAN'
                };
            });

            // 3. INVIO DIRETTO ALL'IMPORTATORE
            const resImport = await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merci: merceDaImportare })
            });

            const jsonImport = await resImport.json();

            if (jsonImport.success) {
                setIsScanning(false);
                alert(`✅ SCANSIONE COMPLETATA!\n\n🆕 ${jsonImport.inserted} nuovi prodotti inseriti\n🔄 ${jsonImport.updated} prodotti aggiornati`);
                ricaricaDati();
                if(onSuccess) onSuccess();
            } else {
                throw new Error(jsonImport.error);
            }

        } catch(err) { 
            console.error(err);
            setIsScanning(false);
            alert("⚠️ ERRORE: " + err.message); 
        } finally { 
            e.target.value = null; 
        }
    };

    const usaDatiTestata = () => {
        const docNum = scannedData.numero_documento || 'ND';
        const docData = scannedData.data_ricezione || 'ND';
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            data_bolla: scannedData.data_ricezione || prev.data_bolla,
            note: `Rif. Doc: ${docNum}`,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        if (scannedData.prodotti.length === 0) setScannedData(null);
    };

    const importaProdottoScan = (prod) => {
        // Logica per import singolo da anteprima (se usata)
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            prodotto: prod.nome, 
            quantita: prod.quantita || '', 
            lotto: prod.lotto || '', 
            scadenza: prod.scadenza || '',
            prezzo_unitario_netto: prod.prezzo_unitario || '', 
            aliquota_iva: prod.iva || '10',
            note: `Rif. Doc: ${scannedData.numero_documento || 'ND'}`, 
            tipo_unita: prod.unita_misura || 'Pz'
        }));
        setScannedData(prev => ({ ...prev, prodotti: prev.prodotti.filter(p => p !== prod) }));
    };

    // --- UPLOAD FOTO ---
    const handleMerciPhoto = async (e) => {
        const f = e.target.files[0]; if(!f) return;
        setUploadingMerci(true);
        try {
            const fd = new FormData(); fd.append('photo', f);
            const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
            const data = await res.json();
            setMerciForm(prev => ({...prev, allegato_url: data.url}));
        } catch(err){ alert("Errore upload"); } finally { setUploadingMerci(false); }
    };

    // --- SALVATAGGIO MANUALE ---
    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const method = merciForm.id ? 'PUT' : 'POST';
            // Se è modifica usiamo la nuova rotta update-full, se è nuovo usiamo l'import
            // Ma per semplicità, usiamo l'endpoint di import per il nuovo, e update-full per l'update
            
            let url, payload;

            // ESTRAGGO DATA E ORA
            const dataISO = new Date(merciForm.data_ricezione);
            const dataDb = dataISO.toISOString().split('T')[0];
            const oraDb = dataISO.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

            const basePayload = {
                ...merciForm,
                ristorante_id: user.id,
                operatore: 'ADMIN',
                data_ricezione: dataDb,
                ora: oraDb,
                // Mappatura Legacy per HACCP
                prezzo: parseFloat(merciForm.valore_totale_lordo) || 0,
                prezzo_unitario: parseFloat(merciForm.prezzo_unitario_netto) || 0,
                iva: parseFloat(merciForm.aliquota_iva) || 0,
                unita_misura: merciForm.tipo_unita
            };

            if (merciForm.id) {
                // UPDATE ESISTENTE
                url = `${API_URL}/api/magazzino/update-full/${merciForm.id}`;
                payload = basePayload; // La rotta update-full gestisce tutti i campi nuovi
            } else {
                // NUOVO INSERIMENTO (Usiamo l'import per sfruttare la logica magazzino "smart")
                url = `${API_URL}/api/haccp/merci/import`;
                payload = { merci: [basePayload] }; // L'import si aspetta un array
            }
            
            const res = await fetch(url, { method: merciForm.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();

            if(data.success) {
                alert(merciForm.id ? "✅ Aggiornato!" : "✅ Salvato!");
                setMerciForm({ 
                    id: null, data_ricezione: getNowLocalISO(), data_bolla: new Date().toISOString().split('T')[0],
                    fornitore:'', prodotto:'', lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'', temperatura: '', conforme: true, integro: true,
                    quantita:'', tipo_unita: 'Pz', prezzo_unitario_netto:'', aliquota_iva:'10', valore_totale_netto:'', valore_totale_iva:'', valore_totale_lordo:''
                });
                ricaricaDati();
                if(onSuccess) onSuccess();
            } else { alert("Errore: " + data.error); }
        } catch (err) { alert("Errore connessione: " + err.message); }
    };

    // Stili CSS Rapidi
    const inputStyle = {width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, boxSizing:'border-box'};
    const labelStyle = {fontSize:11, fontWeight:'bold', marginBottom:4, display:'block', color:'#555'};

    return (
        <div style={{position:'relative'}}>
            
            {/* --- OVERLAY LOADING --- */}
            {isScanning && (
                <div style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.95)', 
                    zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'
                }}>
                    <div style={{fontSize:'60px', animation: 'spin 2s linear infinite'}}>🤖</div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <h2 style={{color:'#3498db', marginTop:'20px'}}>Analisi Bolla in corso...</h2>
                    <p style={{color:'#666'}}>Non chiudere la pagina.</p>
                </div>
            )}

            {/* HEADER TASTI RAPIDI */}
            <div style={{display:'flex', gap:15, marginBottom:20, flexWrap:'wrap'}}>
                <div onClick={() => fileInputRef.current.click()} style={{flex:1, minWidth:300, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding:20, borderRadius:15, color:'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                    <div><h3 style={{margin:0}}>✨ Magic Scan (Auto-Import)</h3><p style={{margin:0, fontSize:12}}>Carica Bolla - Importazione Automatica</p></div>
                    <span style={{fontSize:24}}>📸</span>
                    <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{display:'none'}} />
                </div>
            </div>

            {/* ANTEPRIMA SCAN SINGOLO (SE USATO) */}
            {scannedData && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <div><strong>Doc: {scannedData.numero_documento}</strong></div>
                        <button onClick={usaDatiTestata} style={{background:'#0097a7', color:'white', border:'none', padding:'5px', borderRadius:5, fontSize:11}}>📝 Usa Dati Testata</button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                        {scannedData.prodotti.map((p, idx) => (
                            <div key={idx} onClick={() => importaProdottoScan(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', flex:1, minWidth:200}}>
                                <div>{p.nome}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setScannedData(null)} style={{marginTop:10, border:'none', background:'transparent', textDecoration:'underline', color:'#c0392b'}}>Chiudi Anteprima</button>
                </div>
            )}

            {/* FORM COMPLETO */}
            <div style={{background:'white', padding:25, borderRadius:15, marginBottom:30, borderLeft:'5px solid #27ae60', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Riga' : '📥 Registrazione Manuale'}</h3>
                
                <form onSubmit={salvaMerciManuale}>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:15, marginBottom:20}}>
                        
                        {/* RIGA 1: DATE E FORNITORE */}
                        <div><label style={labelStyle}>Data Inserimento (Sistema)</label><input type="datetime-local" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={inputStyle} required /></div>
                        <div><label style={labelStyle}>Data Documento (Bolla)</label><input type="date" value={merciForm.data_bolla} onChange={e=>setMerciForm({...merciForm, data_bolla:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={inputStyle} placeholder="Es. Metro" required /></div>
                        <div><label style={labelStyle}>Prodotto / Ingrediente</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={inputStyle} placeholder="Es. Farina 00" required /></div>
                    
                        {/* RIGA 2: DETTAGLI LOGISTICI */}
                        <div><label style={labelStyle}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={inputStyle} /></div>
                        <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Note / Rif. Bolla</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={inputStyle} placeholder="Numero documento..." /></div>
                    </div>

                    {/* SEZIONE CONTABILE (CALCOLATRICE) */}
                    <div style={{background:'#f8f9fa', padding:20, borderRadius:10, border:'1px solid #eee', marginBottom:20}}>
                        <h4 style={{margin:'0 0 15px 0', color:'#34495e', borderBottom:'1px solid #ddd', paddingBottom:5}}>🧮 Dati Contabili & Quantità</h4>
                        
                        <div style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            <div style={{flex:1, minWidth:80}}>
                                <label style={labelStyle}>Quantità</label>
                                <input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{...inputStyle, fontWeight:'bold', color:'#2c3e50'}} required />
                            </div>
                            
                            <div style={{flex:1, minWidth:80}}>
                                <label style={labelStyle}>Unità</label>
                                <select value={merciForm.tipo_unita} onChange={e=>setMerciForm({...merciForm, tipo_unita:e.target.value})} style={inputStyle}>
                                    <option value="Pz">Pezzi (Pz)</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Colli">Colli</option>
                                    <option value="Lt">Litri</option>
                                    <option value="Ct">Cartoni</option>
                                </select>
                            </div>

                            <div style={{flex:1, minWidth:120}}>
                                <label style={labelStyle}>€ Netto Unitario</label>
                                <input type="number" step="0.001" value={merciForm.prezzo_unitario_netto} onChange={e=>setMerciForm({...merciForm, prezzo_unitario_netto:e.target.value})} style={inputStyle} placeholder="0.00" />
                            </div>

                            <div style={{flex:1, minWidth:80}}>
                                <label style={labelStyle}>IVA %</label>
                                <select value={merciForm.aliquota_iva} onChange={e=>setMerciForm({...merciForm, aliquota_iva:e.target.value})} style={inputStyle}>
                                    <option value="4">4%</option>
                                    <option value="10">10%</option>
                                    <option value="22">22%</option>
                                    <option value="0">0%</option>
                                </select>
                            </div>
                        </div>

                        {/* RISULTATI CALCOLI */}
                        <div style={{display:'flex', gap:10, marginTop:15, padding:'15px', background:'#eaf2f8', borderRadius:8, border:'1px solid #d6eaf8'}}>
                            <div style={{flex:1, textAlign:'center', borderRight:'1px solid #bdc3c7'}}>
                                <div style={{fontSize:10, color:'#7f8c8d', textTransform:'uppercase'}}>Totale Netto</div>
                                <div style={{fontSize:16, fontWeight:'bold', color:'#2c3e50'}}>€ {merciForm.valore_totale_netto || '0.00'}</div>
                            </div>
                            <div style={{flex:1, textAlign:'center', borderRight:'1px solid #bdc3c7'}}>
                                <div style={{fontSize:10, color:'#7f8c8d', textTransform:'uppercase'}}>Valore IVA</div>
                                <div style={{fontSize:16, fontWeight:'bold', color:'#7f8c8d'}}>€ {merciForm.valore_totale_iva || '0.00'}</div>
                            </div>
                            <div style={{flex:1, textAlign:'center'}}>
                                <div style={{fontSize:10, color:'#27ae60', textTransform:'uppercase', fontWeight:'bold'}}>TOTALE LORDO</div>
                                <div style={{fontSize:20, fontWeight:'bold', color:'#27ae60'}}>€ {merciForm.valore_totale_lordo || '0.00'}</div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER AZIONI */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:15}}>
                        <div onClick={()=>allegatoInputRef.current.click()} style={{cursor:'pointer', color: merciForm.allegato_url ? '#27ae60' : '#3498db', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}>
                             📎 {merciForm.allegato_url ? 'Allegato Presente (Clicca per cambiare)' : 'Carica Foto/PDF Bolla'}
                             <input type="file" ref={allegatoInputRef} accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                        </div>
                        
                        <div style={{display:'flex', gap:10}}>
                             <button type="button" onClick={()=>{ setRecordDaModificare(null); onSuccess(); }} style={{padding:'12px 20px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>ANNULLA</button>
                             <button type="submit" style={{padding:'12px 30px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                                {merciForm.id ? 'AGGIORNA RIGA' : 'SALVA RIGA'}
                             </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default MagazzinoUpload;