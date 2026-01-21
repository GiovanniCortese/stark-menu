import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx'; 

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); 
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [assets, setAssets] = useState([]); 
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI e File
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const fileInputRef = useRef(null); 
    const allegatoInputRef = useRef(null); 
    const importExcelRef = useRef(null); 

    // Form Manuale
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: '',
        quantita: '', allegato_url: '', destinazione: '', 
        prezzo_unitario: '', iva: '', prezzo: '' // prezzo = IMPONIBILE
    });

    const [uploadingMerci, setUploadingMerci] = useState(false);

    useEffect(() => { ricaricaDati(); }, []);

    // --- CALCOLO AUTOMATICO PREZZI ---
    useEffect(() => {
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        
        // Se ho Qta e Unitario, calcolo l'Imponibile
        if (!isNaN(qta) && !isNaN(unit)) {
            const totImponibile = (qta * unit).toFixed(2);
            if (merciForm.prezzo !== totImponibile) {
                setMerciForm(prev => ({ ...prev, prezzo: totImponibile }));
            }
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario]);

    const ricaricaDati = () => {
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`).then(r => r.json()).then(setStats).catch(console.error);
        fetch(`${API_URL}/api/haccp/assets/${user.id}`).then(r => r.json()).then(setAssets).catch(console.error);
    };

    // --- MAGIC SCAN AI ---
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
            quantita: prod.quantita || '', 
            lotto: prod.lotto || '', 
            scadenza: prod.scadenza || '',
            prezzo_unitario: prod.prezzo || '', 
            note: `Rif. Doc: ${scannedData.numero_documento || 'ND'}`, 
            allegato_url: scannedData.allegato_url || prev.allegato_url
        }));
        setScannedData(prev => ({ ...prev, prodotti: prev.prodotti.filter(p => p !== prod) }));
    };

    // --- UPLOAD ALLEGATO ---
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

    // --- IMPORT EXCEL ---
    const handleImportExcel = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                const formattedData = data.map(row => ({
                    ristorante_id: user.id,
                    data_ricezione: row['Data'] || new Date(),
                    fornitore: row['Fornitore'] || 'Excel',
                    prodotto: row['Prodotto'] || 'Sconosciuto',
                    quantita: row['Quantita'] || row['Qta'] || 1,
                    prezzo_unitario: row['Prezzo Unitario'] || row['Unitario'] || 0,
                    iva: row['IVA'] || 0,
                    prezzo: row['Totale'] || ((row['Prezzo Unitario'] || 0) * (row['Qta'] || 1)) || 0,
                    lotto: row['Lotto'] || '',
                    scadenza: row['Scadenza'] || null,
                    note: row['Documento'] || row['Note'] || '', 
                    operatore: 'ADMIN_IMPORT'
                }));
                const res = await fetch(`${API_URL}/api/haccp/merci/import`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merci: formattedData })
                });
                const json = await res.json();
                if(json.success) { alert(`✅ Importazione: ${json.inserted} nuovi, ${json.updated} aggiornati.`); ricaricaDati(); } 
                else { alert("Errore Import: " + json.error); }
            } catch (err) { alert("Errore Excel: " + err.message); }
        };
        reader.readAsBinaryString(file); e.target.value = null; 
    };

    // --- SALVATAGGIO MANUALE ---
    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const url = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
            const method = merciForm.id ? 'PUT' : 'POST';
            
            // Calcoli di sicurezza prima dell'invio
            const qta = parseFloat(merciForm.quantita) || 0;
            const unit = parseFloat(merciForm.prezzo_unitario) || 0;
            const imp = parseFloat(merciForm.prezzo) || (qta * unit); // Se l'utente non ha toccato il totale, lo ricalcolo

            const payload = { 
                ...merciForm, 
                ristorante_id: user.id, 
                operatore: 'ADMIN',
                prezzo: imp, // IMPONIBILE
                prezzo_unitario: unit,
                iva: parseFloat(merciForm.iva) || 0,
                scadenza: merciForm.scadenza || null,
                temperatura: merciForm.temperatura ? parseFloat(merciForm.temperatura) : null
            };
            
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();

            if(data.success) {
                alert(merciForm.id ? "✅ Aggiornato!" : "✅ Salvato correttamente!");
                setMerciForm({ 
                    id: null, data_ricezione: new Date().toISOString().split('T')[0],
                    fornitore:'', prodotto:'', quantita:'', prezzo_unitario:'', iva:'', prezzo:'', 
                    lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'', temperatura: '', conforme: true, integro: true
                });
                ricaricaDati();
            } else { alert("Errore salvataggio: " + data.error); }
        } catch (err) { alert("Errore connessione salvataggio"); }
    };

    const iniziaModifica = (r) => {
        setTab('carico');
        setMerciForm({
            ...r,
            data_ricezione: r.data_ricezione ? r.data_ricezione.split('T')[0] : '',
            scadenza: r.scadenza ? r.scadenza.split('T')[0] : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminaMerce = async (id) => {
        if(!window.confirm("Eliminare questa riga?")) return;
        await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'});
        ricaricaDati();
    };

    // --- HELPER CALCOLI TABELLA ---
    const renderRowData = (r) => {
        const qta = parseFloat(r.quantita) || 0;
        const unit = parseFloat(r.prezzo_unitario) || 0;
        const imp = parseFloat(r.prezzo) || (qta * unit); // Totale Imponibile
        const ivaPerc = parseFloat(r.iva) || 0;
        const ivaVal = imp * (ivaPerc / 100);
        const totIvato = imp + ivaVal;
        return { imp: imp.toFixed(2), ivaVal: ivaVal.toFixed(2), totIvato: totIvato.toFixed(2) };
    };

    const movimentiFiltrati = stats.storico.filter(r => (r.prodotto + r.fornitore + (r.note||"")).toLowerCase().includes(filtro.toLowerCase()));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2 style={{color: '#2c3e50', margin:0}}>📦 Magazzino & Acquisti</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setTab('dashboard')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='dashboard'?'#34495e':'white', color:tab==='dashboard'?'white':'#333', border:'1px solid #ccc'}}>📊 Dashboard</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='carico'?'#27ae60':'white', color:tab==='carico'?'white':'#27ae60', border:'1px solid #27ae60'}}>📥 Nuovo Arrivo</button>
                </div>
            </div>

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                        <h3>💰 Spesa per Fornitore</h3>
                        <div style={{height: 250}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label>{stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* CARICO / MODIFICA */}
            {tab === 'carico' && (
                <div>
                     <div style={{display:'flex', gap:15, marginBottom:20, flexWrap:'wrap'}}>
                        {/* BOX AI SCAN */}
                        <div onClick={() => fileInputRef.current.click()} style={{flex:1, minWidth:300, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding:20, borderRadius:15, color:'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                            <div><h3 style={{margin:0}}>✨ Magic Scan (AI)</h3><p style={{margin:0, fontSize:12}}>Scansiona Fattura/Bolla (Foto o PDF)</p></div>
                            <span style={{fontSize:24}}>{isScanning ? '⏳' : '📸'}</span>
                            <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{display:'none'}} />
                        </div>

                        {/* BOX IMPORT EXCEL */}
                        <div onClick={() => importExcelRef.current.click()} style={{flex:1, minWidth:300, background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', borderLeft:'5px solid #27ae60'}}>
                            <div><h3 style={{margin:0, color:'#27ae60'}}>📊 Importa Excel</h3><p style={{margin:0, fontSize:12}}>Carica lista prodotti (No Duplicati)</p></div>
                            <span style={{fontSize:24}}>📂</span>
                            <input type="file" ref={importExcelRef} accept=".xlsx, .xls" onChange={handleImportExcel} style={{display:'none'}} />
                        </div>
                    </div>

                    {/* RISULTATI AI SCAN */}
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
                        <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Nuovo Arrivo'}</h3>
                        <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Data</label><input type="date" required value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Russo" /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Vodka" /></div>
                            
                            {/* --- PREZZI & QTA (VISIBILI E MODIFICABILI) --- */}
                            <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Quantità</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>P. Unitario (€)</label><input type="number" step="0.01" value={merciForm.prezzo_unitario} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="€ Unit" /></div>
                            <div style={{flex:1, minWidth:60}}><label style={{fontSize:11}}>IVA %</label><input type="number" value={merciForm.iva} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="22" /></div>
                            
                            {/* CALCOLI AUTOMATICI (SOLA LETTURA) */}
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Tot. Imponibile</label><input type="number" step="0.01" value={merciForm.prezzo} readOnly style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'#f0f0f0', fontWeight:'bold'}} placeholder="Imponibile" /></div>

                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note (DDT/Fattura)</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Fattura 1004" /></div>

                            {/* ALLEGATO */}
                            <div style={{flex:1, minWidth:120}} onClick={()=>allegatoInputRef.current.click()}>
                                <label style={{fontSize:11, display:'block'}}>Allegato</label>
                                <div style={{padding:10, border:'1px solid #ddd', borderRadius:5, background: merciForm.allegato_url ? '#eafaf1' : 'white', cursor:'pointer', textAlign:'center', color: merciForm.allegato_url ? '#27ae60' : '#aaa'}}>
                                    {uploadingMerci ? '...' : (merciForm.allegato_url ? '📎 Presente' : '➕ Carica')}
                                </div>
                                <input type="file" ref={allegatoInputRef} accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                            </div>

                            <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                            </div>

                            <button type="submit" style={{padding:'10px 25px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:42}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
                            {merciForm.id && <button type="button" onClick={()=>{setMerciForm({id:null, data_ricezione: new Date().toISOString().split('T')[0], fornitore:'', prodotto:'', quantita:'', prezzo:'', prezzo_unitario:'', iva:'', lotto:'', scadenza:'', note:'', allegato_url:''});}} style={{padding:'10px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', height:42}}>ANNULLA</button>}
                        </form>
                    </div>
                </div>
            )}

            {/* TABELLA STORICO */}
            <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                    <h3>📦 Storico</h3>
                    <div style={{display:'flex', gap:10}}>
                         <input type="text" placeholder="Cerca..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                    </div>
                </div>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f0f0f0', textAlign:'left', color:'#333', borderBottom:'2px solid #ddd'}}>
                                <th style={{padding:10}}>Data</th>
                                <th style={{padding:10}}>Fornitore</th>
                                <th style={{padding:10}}>Prodotto</th>
                                <th style={{padding:10}}>Qta</th>
                                <th style={{padding:10}}>Unit.</th>
                                <th style={{padding:10}}>Tot. Imp.</th>
                                <th style={{padding:10}}>IVA %</th>
                                <th style={{padding:10}}>Tot. IVA</th>
                                <th style={{padding:10}}>Tot. Ivato</th>
                                <th style={{padding:10}}>Lotto</th>
                                <th style={{padding:10}}>Doc</th>
                                <th style={{padding:10}}>Allegato</th>
                                <th style={{padding:10}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentiFiltrati.slice(0, 100).map((r, i) => {
                                const calcs = renderRowData(r);
                                return (
                                    <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                        <td style={{padding:10}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                        <td style={{padding:10}}>{r.fornitore}</td>
                                        <td style={{padding:10, fontWeight:'bold'}}>{r.prodotto}</td>
                                        <td style={{padding:10}}>{r.quantita}</td>
                                        <td style={{padding:10}}>€ {r.prezzo_unitario || '-'}</td>
                                        <td style={{padding:10}}>€ {calcs.imp}</td>
                                        <td style={{padding:10}}>{r.iva ? r.iva + '%' : '-'}</td>
                                        <td style={{padding:10, color:'#e67e22'}}>€ {calcs.ivaVal}</td>
                                        <td style={{padding:10, fontWeight:'bold', color:'#27ae60'}}>€ {calcs.totIvato}</td>
                                        <td style={{padding:10, fontSize:12}}>{r.lotto || '-'}</td>
                                        <td style={{padding:10, fontSize:12, color:'#555'}}>{r.note}</td>
                                        <td style={{padding:10}}>
                                           {r.allegato_url && <button onClick={() => window.open(r.allegato_url, '_blank')} style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 6px', cursor:'pointer'}}>📎</button>}
                                        </td>
                                        <td style={{padding:10, display:'flex', gap:5}}>
                                            <button onClick={()=>iniziaModifica(r)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Modifica">✏️</button>
                                            <button onClick={()=>eliminaMerce(r.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Elimina">🗑️</button>
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
}

export default AdminMagazzino;