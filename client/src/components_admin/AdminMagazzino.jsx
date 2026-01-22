import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx'; 

// Helper per calcolo date report
const getMonday = (d) => { const date = new Date(d); const day = date.getDay(), diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff)); };
const formatDateISO = (date) => date.toISOString().split('T')[0];

const getNowLocalISO = () => {
    const now = new Date();
    // Corregge il fuso orario per l'input datetime-local
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16); // Formato: YYYY-MM-DDTHH:mm
};

// --- NUOVO HELPER PER FORMATTAZIONE DATA/ORA ITALIANA ---
const formatTimeDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    
    // Controlla se la data è valida
    if (isNaN(date.getTime())) return dateStr;

    const time = date.toLocaleTimeString('it-IT', { 
        timeZone: 'Europe/Rome', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const day = date.toLocaleDateString('it-IT', { 
        timeZone: 'Europe/Rome', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    
    return `${time} - ${day}`;
};

function AdminMagazzino({ user, API_URL }) {
    // Tabs disponibili: dashboard, calendario, carico, lista, report
    const [tab, setTab] = useState('lista'); 
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [assets, setAssets] = useState([]); 
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI e File
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const fileInputRef = useRef(null); 
    const allegatoInputRef = useRef(null); 
    const importExcelRef = useRef(null); 

    // Stati Calendario
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Form Manuale
    const [merciForm, setMerciForm] = useState({
    id: null,
    data_ricezione: getNowLocalISO(), // <--- MODIFICATO QUI: Ora usa data e ora locali
    fornitore: '', prodotto: '', lotto: '', scadenza: '',
    temperatura: '', conforme: true, integro: true, note: '',
    quantita: '', unita_misura: 'Pz', 
    allegato_url: '', destinazione: '', 
    prezzo_unitario: '', iva: '', prezzo: '' 
});

    const [uploadingMerci, setUploadingMerci] = useState(false);

    // --- NUOVI STATI: MODALE DOWNLOAD & ANTEPRIMA ---
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState('excel'); // 'excel' | 'pdf'
    const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
    
    const [previewDoc, setPreviewDoc] = useState(null); 
    const [isDownloading, setIsDownloading] = useState(false);

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

    // --- LOGICA EXPORT AVANZATO (MODALE) ---
    const executeDownload = (rangeType) => {
        let start, end, rangeName;
        const today = new Date();

        if (rangeType === 'week') {
            start = getMonday(today);
            end = new Date(start); end.setDate(end.getDate() + 6);
            rangeName = "Ultima_Settimana";
        } else if (rangeType === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            rangeName = "Mese_Corrente";
        } else if (rangeType === 'custom-month') {
            if (!selectedMonth) return alert("Seleziona un mese!");
            const [y, m] = selectedMonth.split('-');
            start = new Date(y, m - 1, 1);
            end = new Date(y, m, 0, 23, 59, 59);
            rangeName = `Mese_${selectedMonth}`;
        } else {
            // Tutto
            start = null; end = null;
            rangeName = "Storico_Completo";
        }

        let url = `${API_URL}/api/haccp/export/merci/${user.id}?format=${downloadFormat}&rangeName=${rangeName}`;
        if(start && end) url += `&start=${formatDateISO(start)}&end=${formatDateISO(end)}`;
        
        window.open(url, '_blank');
        setShowDownloadModal(false);
    };

    // --- GESTIONE ANTEPRIMA FILE & DOWNLOAD ---
    const handleFileAction = (url, name) => {
        if(!url) return;
        const isPdf = url.toLowerCase().includes('.pdf');
        // Usa il proxy per i PDF per evitare problemi CORS nel visualizzatore
        let previewUrl = isPdf ? `${API_URL}/api/proxy-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}` : url;
        
        setPreviewDoc({
            url: url, // URL originale per download
            previewUrl: previewUrl, // URL per visualizzazione
            name: name,
            type: isPdf ? 'pdf' : 'image'
        });
    };

    const handleForceDownload = async () => {
        if (!previewDoc) return;
        setIsDownloading(true);
        try {
            const proxyDownloadUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(previewDoc.url)}&name=${encodeURIComponent(previewDoc.name)}`;
            const response = await fetch(proxyDownloadUrl);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = previewDoc.name || "documento"; 
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert("Errore durante il download."); } 
        finally { setIsDownloading(false); }
    };

    // --- LOGICA CALENDARIO ---
    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const startBlank = firstDay === 0 ? 6 : firstDay - 1; // Start Monday

        const days = [];
        for (let i = 0; i < startBlank; i++) days.push(<div key={`blank-${i}`} style={{height:80, background:'#f9f9f9', border:'1px solid #eee'}}></div>);
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const speseGiorno = stats.storico.filter(r => r.data_ricezione.startsWith(dateStr));
            const totaleGiorno = speseGiorno.reduce((acc, curr) => {
                const qta = parseFloat(curr.quantita) || 0;
                const unit = parseFloat(curr.prezzo_unitario) || 0;
                const imp = parseFloat(curr.prezzo) || (qta * unit);
                const iva = parseFloat(curr.iva) || 0;
                return acc + imp + (imp * iva / 100);
            }, 0);

            days.push(
                <div key={d} style={{height:80, background:'white', border:'1px solid #eee', padding:5, position:'relative', cursor:'pointer'}} 
                     onClick={() => { setFiltro(dateStr); setTab('lista'); }}>
                    <div style={{fontWeight:'bold', color:'#7f8c8d'}}>{d}</div>
                    {totaleGiorno > 0 && (
                        <div style={{position:'absolute', bottom:5, right:5, background:'#e74c3c', color:'white', fontSize:11, padding:'2px 6px', borderRadius:4, fontWeight:'bold'}}>
                            € {totaleGiorno.toFixed(2)}
                        </div>
                    )}
                </div>
            );
        }
        return days;
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
            allegato_url: scannedData.allegato_url || prev.allegato_url,
            unita_misura: 'Pz' // Default su AI
        }));
        setScannedData(prev => ({ ...prev, prodotti: prev.prodotti.filter(p => p !== prod) }));
    };

    // --- UPLOAD ALLEGATO CON FEEDBACK VISIVO ---
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
                    unita_misura: row['UdM'] || row['Unita'] || 'Pz', // Supporto UdM
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
            const imp = parseFloat(merciForm.prezzo) || (qta * unit); 

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
        id: null, 
        // ERRORE ERA QUI: data_ricezione: new Date().toISOString().split('T')[0],
        data_ricezione: getNowLocalISO(), // <--- CORREZIONE: Richiama la funzione che include l'ora attuale
        fornitore:'', prodotto:'', quantita:'', unita_misura: 'Pz', prezzo_unitario:'', iva:'', prezzo:'', 
        lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'', temperatura: '', conforme: true, integro: true
    });
    
    ricaricaDati();
    setTab('lista'); // Torna alla lista
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

    const movimentiFiltrati = stats.storico.filter(r => (r.prodotto + r.fornitore + (r.note||"") + r.data_ricezione).toLowerCase().includes(filtro.toLowerCase()));
    
    // Calcolo Totali Vista (per il Footer della tabella)
    const totaleVista = movimentiFiltrati.reduce((acc, r) => {
        const d = renderRowData(r);
        return { 
            imp: acc.imp + parseFloat(d.imp), 
            iva: acc.iva + parseFloat(d.ivaVal), 
            tot: acc.tot + parseFloat(d.totIvato) 
        };
    }, { imp: 0, iva: 0, tot: 0 });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            {/* HEADER NAVIGAZIONE */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <div>
                    <h2 style={{color: '#2c3e50', margin:0}}>📦 Magazzino & Contabilità</h2>
                    <p style={{margin:0, fontSize:12, color:'#7f8c8d'}}>Gestione acquisti, fatture e prima nota</p>
                </div>
                <div style={{display:'flex', gap:10}}>
                    {['dashboard','calendario','lista','carico'].map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding:'8px 15px', borderRadius:20, cursor:'pointer', border:'1px solid #ccc',
                            background: tab===t ? '#34495e' : 'white', color: tab===t ? 'white' : '#333', textTransform:'capitalize'
                        }}>{t}</button>
                    ))}
                </div>
            </div>

            {/* 1. DASHBOARD */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                        <h3>💰 Spesa per Fornitore</h3>
                       <div style={{height: 250, display:'flex', alignItems:'center', justifyContent:'center'}}>
    {stats.fornitori && stats.fornitori.length > 0 && stats.fornitori.some(f => f.totale > 0) ? (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
            </PieChart>
        </ResponsiveContainer>
    ) : (
        <p style={{color:'#999'}}>Nessun dato di spesa disponibile per il grafico.</p>
    )}
</div>
                    </div>
                </div>
            )}

            {/* 2. CALENDARIO */}
            {tab === 'calendario' && (
                <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                        <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} style={{border:'none', background:'#eee', padding:'5px 15px', borderRadius:5, cursor:'pointer'}}>◀ Prec.</button>
                        <h3 style={{margin:0}}>{currentMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                        <button onClick={()=>setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} style={{border:'none', background:'#eee', padding:'5px 15px', borderRadius:5, cursor:'pointer'}}>Succ. ▶</button>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', textAlign:'center', fontWeight:'bold', marginBottom:5, fontSize:12, color:'#7f8c8d'}}>
                        <div>LUN</div><div>MAR</div><div>MER</div><div>GIO</div><div>VEN</div><div>SAB</div><div>DOM</div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)'}}>
                        {renderCalendar()}
                    </div>
                </div>
            )}

            {/* 3. CARICO (AI + FORM) */}
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
                        <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Registrazione Manuale'}</h3>
                        <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            
<div style={{flex:1, minWidth:130}}>
    <label style={{fontSize:11}}>Data e Ora</label>
    <input 
        type="datetime-local"  // <--- CAMBIATO QUI
        required 
        value={merciForm.data_ricezione} 
        onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} 
        style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} 
    />
</div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Metro" /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Prodotto / Descr.</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Fattura n.102" /></div>
                            
                            {/* --- QTA + UdM --- */}
                            <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Qta</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            
                            {/* SELETTORE UNITA DI MISURA */}
                            <div style={{flex:1, minWidth:80}}>
                                <label style={{fontSize:11}}>UdM</label>
                                <select value={merciForm.unita_misura} onChange={e=>setMerciForm({...merciForm, unita_misura:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'white'}}>
                                    <option value="Pz">Pz</option>
                                    <option value="Kg">Kg</option>
                                    <option value="g">g</option>
                                    <option value="L">L</option>
                                    <option value="ml">ml</option>
                                    <option value="Cartoni">Cartoni</option>
                                    <option value="Pedane">Pedane</option>
                                    <option value="Pacchi">Pacchi</option>
                                    <option value="Barattoli">Barattoli</option>
                                    <option value="Altro">Altro</option>
                                </select>
                            </div>

                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Unitario (€)</label><input type="number" step="0.01" value={merciForm.prezzo_unitario} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="€ Unit" /></div>
                            <div style={{flex:1, minWidth:60}}><label style={{fontSize:11}}>IVA %</label><input type="number" value={merciForm.iva} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="22" /></div>
                            
                            {/* IMPONIBILE */}
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>IMPONIBILE €</label><input type="number" step="0.01" value={merciForm.prezzo} readOnly style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'#f0f0f0', fontWeight:'bold'}} placeholder="Totale" /></div>

                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note / DDT</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Rif DDT" /></div>

                            {/* ALLEGATO CON FEEDBACK VISIVO */}
                            <div style={{flex:1, minWidth:120}} onClick={()=>allegatoInputRef.current.click()}>
                                <label style={{fontSize:11, display:'block'}}>Allegato</label>
                                <div style={{
                                    padding:10, border:'1px solid #ddd', borderRadius:5, 
                                    background: uploadingMerci ? '#f39c12' : (merciForm.allegato_url ? '#eafaf1' : 'white'), 
                                    cursor:'pointer', textAlign:'center', 
                                    color: uploadingMerci ? 'white' : (merciForm.allegato_url ? '#27ae60' : '#aaa'),
                                    fontWeight: 'bold', fontSize: 12
                                }}>
                                    {uploadingMerci ? '⏳ Caricamento...' : (merciForm.allegato_url ? '✅ Fatto!' : '📎 Carica')}
                                </div>
                                <input type="file" ref={allegatoInputRef} accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                            </div>

                            <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                            </div>

                            <button type="submit" style={{padding:'10px 25px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:42}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
{merciForm.id && 
    <button type="button" 
        onClick={()=>{
            setMerciForm({
                id:null, 
                // ERRORE ERA QUI: data_ricezione: new Date().toISOString().split('T')[0],
                data_ricezione: getNowLocalISO(), // <--- CORREZIONE
                fornitore:'', prodotto:'', quantita:'', unita_misura:'Pz', 
                prezzo:'', prezzo_unitario:'', iva:'', lotto:'', scadenza:'', 
                note:'', allegato_url:''
            });
        }} 
        style={{padding:'10px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', height:42}}>
        ANNULLA
    </button>
}
                        </form>
                    </div>
                </div>
            )}

            {/* 4. TABELLA LISTA / STORICO */}
            {(tab === 'lista' || tab === 'carico') && (
                <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginTop:20}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                        <h3>📦 Storico</h3>
                        <div style={{display:'flex', gap:10}}>
                             {/* TASTO REPORT CHE APRE IL MODALE */}
                             <button onClick={() => setShowDownloadModal(true)} style={{background:'#e67e22', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report</button>
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
                                    <th style={{padding:10}}>UdM</th> {/* NUOVA COLONNA */}
                                    <th style={{padding:10}}>Unit.</th>
                                    <th style={{padding:10}}>Tot. Imp.</th>
                                    <th style={{padding:10}}>IVA %</th>
                                    <th style={{padding:10}}>Tot. IVA</th>
                                    <th style={{padding:10}}>Tot. Ivato</th>
                                    <th style={{padding:10}}>Lotto</th>
                                    <th style={{padding:10}}>Doc</th>
                                    <th style={{padding:10}}>All.</th>
                                    <th style={{padding:10}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimentiFiltrati.slice(0, 100).map((r, i) => {
                                    const calcs = renderRowData(r);
                                    return (
                                        <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                            {/* DATA FORMATTATA CON ORARIO ITALIANO E POI DATA */}
                                            <td style={{padding:10, whiteSpace:'nowrap'}}>{formatTimeDate(r.data_ricezione)}</td>
                                            <td style={{padding:10}}>{r.fornitore}</td>
                                            <td style={{padding:10, fontWeight:'bold'}}>{r.prodotto}</td>
                                            <td style={{padding:10}}>{r.quantita}</td>
                                            <td style={{padding:10, fontWeight:'bold', color:'#34495e'}}>{r.unita_misura || 'Pz'}</td> {/* UdM */}
                                            <td style={{padding:10}}>€ {r.prezzo_unitario || '-'}</td>
                                            <td style={{padding:10}}>€ {calcs.imp}</td>
                                            <td style={{padding:10}}>{r.iva ? r.iva + '%' : '-'}</td>
                                            <td style={{padding:10, color:'#e67e22'}}>€ {calcs.ivaVal}</td>
                                            <td style={{padding:10, fontWeight:'bold', color:'#27ae60'}}>€ {calcs.totIvato}</td>
                                            <td style={{padding:10, fontSize:12}}>{r.lotto || '-'}</td>
                                            <td style={{padding:10, fontSize:12, color:'#555'}}>{r.note}</td>
                                            <td style={{padding:10}}>
                                            {r.allegato_url && <button onClick={() => handleFileAction(r.allegato_url, `Doc_${r.data_ricezione}`)} style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 6px', cursor:'pointer'}}>📎</button>}
                                            </td>
                                            <td style={{padding:10, display:'flex', gap:5}}>
                                                <button onClick={()=>iniziaModifica(r)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Modifica">✏️</button>
                                                <button onClick={()=>eliminaMerce(r.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Elimina">🗑️</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot style={{background:'#2c3e50', color:'white', fontWeight:'bold'}}>
                                <tr>
                                    <td colSpan={6} style={{padding:15, textAlign:'right'}}>TOTALE VISUALIZZATO:</td>
                                    <td style={{padding:15}}>€ {totaleVista.imp.toFixed(2)}</td>
                                    <td></td>
                                    <td style={{padding:15}}>€ {totaleVista.iva.toFixed(2)}</td>
                                    <td style={{padding:15, color:'#2ecc71'}}>€ {totaleVista.tot.toFixed(2)}</td>
                                    <td colSpan={4}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALE DOWNLOAD (SCARICA REPORT) --- */}
            {showDownloadModal && (
                <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000}}>
                    <div style={{background: 'white', padding: '20px', borderRadius: '10px', width: '350px', textAlign: 'center'}}>
                        <h3 style={{marginBottom: '15px'}}>Scarica Report</h3>
                        
                        {/* Selettore Formato */}
                        <div style={{display:'flex', justifyContent:'center', gap:10, marginBottom:15}}>
                             <button onClick={()=>setDownloadFormat('excel')} style={{padding:'5px 15px', borderRadius:20, border:'none', cursor:'pointer', background: downloadFormat==='excel'?'#27ae60':'#eee', color: downloadFormat==='excel'?'white':'#333', fontWeight:'bold'}}>Excel</button>
                             <button onClick={()=>setDownloadFormat('pdf')} style={{padding:'5px 15px', borderRadius:20, border:'none', cursor:'pointer', background: downloadFormat==='pdf'?'#e74c3c':'#eee', color: downloadFormat==='pdf'?'white':'#333', fontWeight:'bold'}}>PDF</button>
                        </div>

                        {/* Selettore Mese Custom */}
                        <div style={{display:'flex', gap:5, marginBottom:15, justifyContent:'center'}}>
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                            <button onClick={()=>executeDownload('custom-month')} style={{background:'#8e44ad', color:'white', border:'none', padding:'8px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SCARICA</button>
                        </div>

                        {/* Bottoni Rapidi */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            <button onClick={()=>executeDownload('week')} style={{background: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Ultima Settimana</button>
                            <button onClick={()=>executeDownload('month')} style={{background: '#2980b9', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Mese Corrente</button>
                            <button onClick={()=>executeDownload('all')} style={{background: '#2c3e50', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Tutto lo storico</button>
                        </div>
                        
                        <button onClick={()=>setShowDownloadModal(false)} style={{marginTop: '20px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline'}}>Annulla</button>
                    </div>
                </div>
            )}

            {/* --- MODALE ANTEPRIMA FILE --- */}
            {previewDoc && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <div style={{background:'white', width:'90%', height:'90%', maxWidth:'1000px', borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                        <div style={{padding:'10px 15px', background:'#ecf0f1', borderBottom:'1px solid #ccc', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontWeight:'bold', color:'#2c3e50'}}>📄 {previewDoc.name}</span>
                            <div style={{display:'flex', gap:10}}>
                                <button onClick={handleForceDownload} disabled={isDownloading} style={{background:'#27ae60', color:'white', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>
                                    {isDownloading ? '⏳...' : '⬇️ Scarica'}
                                </button>
                                <button onClick={()=>setPreviewDoc(null)} style={{background:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>Chiudi X</button>
                            </div>
                        </div>
                        <div style={{flex:1, background:'#555', overflow:'hidden', display:'flex', justifyContent:'center', alignItems:'center'}}>
                            {previewDoc.type === 'pdf' ? (
                                <iframe src={previewDoc.previewUrl} style={{width:'100%', height:'100%', border:'none'}} title="Anteprima PDF" />
                            ) : (
                                <img src={previewDoc.previewUrl} alt="Anteprima" style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} />
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminMagazzino;