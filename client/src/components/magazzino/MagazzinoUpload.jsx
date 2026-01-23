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

    // Form
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: getNowLocalISO(),
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: '',
        quantita: '', unita_misura: 'Pz', 
        allegato_url: '', destinazione: '', 
        prezzo_unitario: '', iva: '', prezzo: '' 
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
                scadenza: recordDaModificare.scadenza ? recordDaModificare.scadenza.split('T')[0] : ''
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [recordDaModificare]);

    // Calcolo automatico prezzi
    useEffect(() => {
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        if (!isNaN(qta) && !isNaN(unit)) {
            const totImponibile = (qta * unit).toFixed(2);
            if (merciForm.prezzo !== totImponibile) {
                setMerciForm(prev => ({ ...prev, prezzo: totImponibile }));
            }
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario]);

    // --- FUNZIONI AI SCAN ---
    const resizeImage = (file, maxWidth = 1000, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } } else { if (h > maxWidth) { w *= maxWidth / h; h = maxWidth; } }
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
                };
            };
            reader.onerror = reject;
        });
    };

const handleScanBolla = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        setIsScanning(true); 
        
        try {
            const fd = new FormData();
            // Inviamo il file (PDF o Immagine)
            fd.append('photo', file);
            
            // 1. SCANSIONE AI
            const resAI = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const jsonAI = await resAI.json();
            
            if (!jsonAI.success) throw new Error(jsonAI.error || "Errore AI");
            
            const datiTestata = jsonAI.data;
            const prodottiTrovati = datiTestata.prodotti || [];

            if (prodottiTrovati.length === 0) throw new Error("Nessun prodotto trovato nel documento.");

            // 2. PREPARAZIONE DATI PER IMPORT MASSIVO
            // Uniamo i dati della testata (Fornitore, Data) su ogni singola riga prodotto
            const merceDaImportare = prodottiTrovati.map(p => ({
                ristorante_id: user.id,
                data_ricezione: datiTestata.data_ricezione || new Date().toISOString().split('T')[0],
                ora: datiTestata.ora_consegna || "12:00",
                fornitore: datiTestata.fornitore || "Fornitore Sconosciuto",
                note: `Rif. Doc: ${datiTestata.numero_documento || 'ND'}`,
                
                prodotto: p.nome,
                quantita: p.quantita || 1,
                unita_misura: p.unita_misura || 'Pz',
                prezzo_unitario: p.prezzo_unitario || 0,
                iva: p.iva || 0,
                prezzo: p.prezzo_totale || ((p.quantita || 1) * (p.prezzo_unitario || 0)), // Totale riga
                
                lotto: p.lotto || '',
                scadenza: p.scadenza || null,
                is_haccp: true, // Di default assumiamo sia merce alimentare se siamo in questo contesto
                operatore: 'MAGIC_SCAN'
            }));

            // 3. INVIO DIRETTO ALL'IMPORTATORE (Upsert)
            const resImport = await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merci: merceDaImportare })
            });

            const jsonImport = await resImport.json();

            if (jsonImport.success) {
                // 4. FEEDBACK UTENTE (Stile AdminMenu)
                alert(`✅ SCANSIONE COMPLETATA!\n\n🆕 ${jsonImport.inserted} nuovi prodotti inseriti\n🔄 ${jsonImport.updated} prodotti aggiornati`);
                ricaricaDati(); // Aggiorna la tabella sotto
                if(onSuccess) onSuccess();
            } else {
                throw new Error(jsonImport.error);
            }

        } catch(err) { 
            console.error(err);
            alert("⚠️ ERRORE: " + err.message); 
        } finally { 
            setIsScanning(false); 
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
            note: `Rif. Doc: ${docNum} del ${docData}`,
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        if (scannedData.prodotti.length === 0) setScannedData(null);
    };

    const importaProdottoScan = (prod) => {
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            prodotto: prod.nome, 
            quantita: prod.quantita || '', lotto: prod.lotto || '', scadenza: prod.scadenza || '',
            prezzo_unitario: prod.prezzo || '', 
            note: `Rif. Doc: ${scannedData.numero_documento || 'ND'}`, 
            allegato_url: scannedData.allegato_url || prev.allegato_url,
            unita_misura: 'Pz' 
        }));
        setScannedData(prev => ({ ...prev, prodotti: prev.prodotti.filter(p => p !== prod) }));
    };

    // --- IMPORT EXCEL ---
    const handleImportExcel = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                const formattedData = data.map(row => ({
                    ristorante_id: user.id,
                    data_ricezione: row['Data'] || new Date(),
                    fornitore: row['Fornitore'] || 'Excel',
                    prodotto: row['Prodotto'] || 'Sconosciuto',
                    quantita: row['Quantita'] || row['Qta'] || 1,
                    unita_misura: row['UdM'] || row['Unita'] || 'Pz',
                    prezzo_unitario: row['Prezzo Unitario'] || row['Unitario'] || 0,
                    iva: row['IVA'] || 0,
                    prezzo: row['Totale'] || ((row['Prezzo Unitario'] || 0) * (row['Qta'] || 1)) || 0,
                    lotto: row['Lotto'] || '',
                    scadenza: row['Scadenza'] || null,
                    note: row['Documento'] || row['Note'] || '', 
                    operatore: 'ADMIN_IMPORT'
                }));
                const res = await fetch(`${API_URL}/api/haccp/merci/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merci: formattedData }) });
                const json = await res.json();
                if(json.success) { alert(`✅ Importati: ${json.inserted}, Aggiornati: ${json.updated}`); ricaricaDati(); } 
                else { alert("Errore Import: " + json.error); }
            } catch (err) { alert("Errore Excel: " + err.message); }
        };
        reader.readAsBinaryString(file); e.target.value = null; 
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

    // --- SALVATAGGIO ---
    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const url = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
            const method = merciForm.id ? 'PUT' : 'POST';
            
            const qta = parseFloat(merciForm.quantita) || 0;
            const unit = parseFloat(merciForm.prezzo_unitario) || 0;
            const imp = parseFloat(merciForm.prezzo) || (qta * unit); 

            // ESTRAGGO DATA E ORA SEPARATI
            const dataISO = new Date(merciForm.data_ricezione);
            const dataDb = dataISO.toISOString().split('T')[0];
            const oraDb = dataISO.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

            const payload = { 
                ...merciForm, 
                ristorante_id: user.id, 
                operatore: 'ADMIN',
                data_ricezione: dataDb, 
                ora: oraDb,             
                prezzo: imp, 
                prezzo_unitario: unit,
                iva: parseFloat(merciForm.iva) || 0,
                scadenza: merciForm.scadenza || null,
                temperatura: merciForm.temperatura ? parseFloat(merciForm.temperatura) : null
            };
            
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();

            if(data.success) {
                alert(merciForm.id ? "✅ Aggiornato!" : "✅ Salvato!");
                setMerciForm({ 
                    id: null, 
                    data_ricezione: getNowLocalISO(), 
                    fornitore:'', prodotto:'', quantita:'', unita_misura: 'Pz', prezzo_unitario:'', iva:'', prezzo:'', 
                    lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'', temperatura: '', conforme: true, integro: true
                });
                ricaricaDati();
                if(onSuccess) onSuccess();
            } else { alert("Errore: " + data.error); }
        } catch (err) { alert("Errore connessione"); }
    };

    return (
        <div>
<div style={{display:'flex', gap:15, marginBottom:20, flexWrap:'wrap'}}>
                {/* TASTO MAGIC SCAN */}
                <div onClick={() => fileInputRef.current.click()} style={{flex:1, minWidth:300, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding:20, borderRadius:15, color:'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                    <div>
                        <h3 style={{margin:0}}>✨ Magic Scan (Auto-Import)</h3>
                        <p style={{margin:0, fontSize:12}}>Carica Bolla - Importazione Automatica</p>
                    </div>
                    <span style={{fontSize:24}}>{isScanning ? '⏳' : '📸'}</span>
                    <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{display:'none'}} />
                </div>
            </div>

            {scannedData && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <div><strong>Fornitore: {scannedData.fornitore}</strong></div>
                        <button onClick={usaDatiTestata} style={{background:'#0097a7', color:'white', border:'none', padding:'5px', borderRadius:5, fontSize:11}}>📝 Usa Dati Testata</button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                        {scannedData.prodotti.map((p, idx) => (
                            <div key={idx} onClick={() => importaProdottoScan(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', flex:1, minWidth:200}}>
                                <div style={{fontWeight:'bold'}}>{p.nome}</div>
                                <div style={{fontSize:11}}>Qta: {p.quantita} | € {p.prezzo}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setScannedData(null)} style={{marginTop:10, border:'none', background:'transparent', textDecoration:'underline', color:'#c0392b'}}>Chiudi</button>
                </div>
            )}

            <div style={{background:'white', padding:25, borderRadius:15, marginBottom:30, borderLeft:'5px solid #27ae60', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Registrazione Manuale'}</h3>
                <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                    
                    <div style={{flex:1, minWidth:160}}>
                        <label style={{fontSize:11, fontWeight:'bold'}}>Data e Ora</label>
                        <input 
                            type="datetime-local" 
                            required 
                            value={merciForm.data_ricezione} 
                            onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} 
                            style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} 
                        />
                    </div>
                    
                    <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Metro" /></div>
                    <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Pomodori" /></div>
                    
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Qta</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                    
                    <div style={{flex:1, minWidth:80}}>
                        <label style={{fontSize:11}}>UdM</label>
                        <select value={merciForm.unita_misura} onChange={e=>setMerciForm({...merciForm, unita_misura:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'white'}}>
                            <option value="Pz">Pz</option><option value="Kg">Kg</option><option value="g">g</option>
                            <option value="L">L</option><option value="ml">ml</option><option value="Cartoni">Cartoni</option>
                            <option value="Pedane">Pedane</option><option value="Pacchi">Pacchi</option><option value="Altro">Altro</option>
                        </select>
                    </div>

                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Unitario (€)</label><input type="number" step="0.01" value={merciForm.prezzo_unitario} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="€ Unit" /></div>
                    <div style={{flex:1, minWidth:60}}><label style={{fontSize:11}}>IVA %</label><input type="number" value={merciForm.iva} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="22" /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>IMPONIBILE €</label><input type="number" step="0.01" value={merciForm.prezzo} readOnly style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'#f0f0f0', fontWeight:'bold'}} placeholder="Totale" /></div>

                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                    <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note / DDT</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Rif DDT" /></div>

                    <div style={{flex:1, minWidth:120}} onClick={()=>allegatoInputRef.current.click()}>
                        <label style={{fontSize:11, display:'block'}}>Allegato</label>
                        <div style={{
                            padding:10, border:'1px solid #ddd', borderRadius:5, 
                            background: uploadingMerci ? '#f39c12' : (merciForm.allegato_url ? '#eafaf1' : 'white'), 
                            cursor:'pointer', textAlign:'center', 
                            color: uploadingMerci ? 'white' : (merciForm.allegato_url ? '#27ae60' : '#aaa'),
                            fontWeight: 'bold', fontSize: 12
                        }}>{uploadingMerci ? '⏳...' : (merciForm.allegato_url ? '✅ Fatto!' : '📎 Carica')}</div>
                        <input type="file" ref={allegatoInputRef} accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                    </div>

                    <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                    </div>

                    <button type="submit" style={{padding:'10px 25px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:42}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
                    {merciForm.id && <button type="button" onClick={()=>{ setRecordDaModificare(null); onSuccess(); }} style={{padding:'10px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', height:42}}>ANNULLA</button>}
                </form>
            </div>
        </div>
    );
};

export default MagazzinoUpload;