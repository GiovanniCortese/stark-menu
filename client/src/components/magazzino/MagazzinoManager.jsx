// client/src/components_haccp/MagazzinoManager.jsx
import React, { useState, useEffect } from 'react';
import MagazzinoDashboard from './MagazzinoDashboard';
import MagazzinoCalendar from './MagazzinoCalendar';
import MagazzinoUpload from './MagazzinoUpload';
import MagazzinoList from './MagazzinoList';
import MagazzinoStaging from './MagazzinoStaging'; 

// Helper date
const getMonday = (d) => { const date = new Date(d); const day = date.getDay(), diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff)); };
const formatDateISO = (date) => date.toISOString().split('T')[0];

const MagazzinoManager = ({ user, API_URL }) => {
    const [tab, setTab] = useState('lista'); // 'dashboard', 'calendario', 'lista', 'carico', 'staging'
    
    // STATO PER FILTRARE LA LISTA (Calendario o Default)
    const [filtroData, setFiltroData] = useState(null); 
    
    // STATO PER I DATI IN REVISIONE (AI SCAN o EDIT MASSIVO)
    const [stagingData, setStagingData] = useState(null);
    const [isBulkEditMode, setIsBulkEditMode] = useState(false); // Distingue tra "Nuovo Import" e "Modifica Massiva"

    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] }); 
    const [magazzinoReale, setMagazzinoReale] = useState([]); 
    const [assets, setAssets] = useState([]); 
    
    // Stati Modali
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState('excel');
    const [selectedMonth, setSelectedMonth] = useState(''); 
    const [previewDoc, setPreviewDoc] = useState(null); 
    const [isDownloading, setIsDownloading] = useState(false);

    // Stato modifica singola
    const [recordDaModificare, setRecordDaModificare] = useState(null);

    // Caricamento dati (incluso refresh al cambio filtro data)
    useEffect(() => { ricaricaDati(); }, [filtroData]);

    const ricaricaDati = () => {
        // 1. CARICA LO STORICO MOVIMENTI (HACCP MERCI)
        // Se filtroData è null, il backend restituisce di default gli ultimi 7 giorni
        let url = `${API_URL}/api/haccp/merci/${user.id}`;
        if (filtroData) {
            url += `?start=${filtroData}&end=${filtroData}`;
        }

        fetch(url)
            .then(r => r.json())
            .then(data => {
                setStats(prev => ({
                    ...prev,
                    storico: Array.isArray(data) ? data : [] 
                }));
            })
            .catch(console.error);

        // 2. CARICA LE GIACENZE ATTUALI
        fetch(`${API_URL}/api/magazzino/lista/${user.id}`)
            .then(r => r.json())
            .then(data => {
                setMagazzinoReale(Array.isArray(data) ? data : []);
            })
            .catch(console.error);

        // 3. Carica Statistiche
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`)
            .then(r => r.json())
            .then(data => {
                setStats(prev => ({
                    ...prev,
                    fornitori: data.fornitori || [],
                    top_prodotti: data.top_prodotti || []
                }));
            })
            .catch(console.error);

        // 4. Carica Assets
        fetch(`${API_URL}/api/haccp/assets/${user.id}`)
            .then(r => r.json())
            .then(data => setAssets(Array.isArray(data) ? data : []))
            .catch(console.error);
    };

    // --- LOGICA CLICK CALENDARIO ---
    const onSelectDataCalendario = (dataIso) => {
        setFiltroData(dataIso); // Imposta filtro data specifico
        setTab('lista');        
    };

    const resetFiltro = () => {
        setFiltroData(null); // Resetta al default (7 giorni)
    };

    const gestisciModifica = (record) => {
        setRecordDaModificare(record);
        setTab('carico'); 
    };

    // --- NUOVA LOGICA: MODIFICA MASSIVA (BULK EDIT) ---
    const handleBulkEdit = (selectedRows) => {
        if (!selectedRows || selectedRows.length === 0) return;
        setStagingData(selectedRows);
        setIsBulkEditMode(true); // Attiva modalità aggiornamento
        setTab('staging');
    };

    // --- LOGICA STAGING (SCAN -> REVISIONE -> SAVE) ---
    
    // 1. Riceve i dati dall'Upload (Nuovo Import)
    const handleScanSuccess = (datiGrezzi) => {
        setStagingData(datiGrezzi);
        setIsBulkEditMode(false); // Modalità nuovo inserimento
        setTab('staging');
    };

    // 2. Salva o Aggiorna nel DB
    const handleStagingConfirm = async (datiFinali) => {
        try {
            let url, method, body;

            if (isBulkEditMode) {
                // MODALITÀ AGGIORNAMENTO
                url = `${API_URL}/api/haccp/merci/update-bulk`;
                method = 'POST';
                body = JSON.stringify({ merci: datiFinali });
            } else {
                // MODALITÀ NUOVO IMPORT
                url = `${API_URL}/api/haccp/merci/import`;
                method = 'POST';
                body = JSON.stringify({ merci: datiFinali });
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body
            });
            const json = await res.json();
            
            if (json.success) {
                alert(isBulkEditMode ? "✅ Modifiche salvate con successo!" : "✅ Carico salvato con successo!");
                setStagingData(null); 
                setIsBulkEditMode(false);
                ricaricaDati();       
                setTab('lista');      
            } else {
                alert("Errore salvataggio: " + json.error);
            }
        } catch (e) {
            alert("Errore server durante il salvataggio.");
        }
    };

    // --- EXPORT LOGIC ---
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
            start = null; end = null;
            rangeName = "Storico_Completo";
        }

        let url = `${API_URL}/api/haccp/export/merci/${user.id}?format=${downloadFormat}&rangeName=${rangeName}`;
        if(start && end) url += `&start=${formatDateISO(start)}&end=${formatDateISO(end)}`;
        
        window.open(url, '_blank');
        setShowDownloadModal(false);
    };

    // --- FILE VIEWER ---
    const handleFileAction = (url, name) => {
        if(!url) return;
        const isPdf = url.toLowerCase().includes('.pdf');
        let previewUrl = isPdf ? `${API_URL}/api/proxy-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}` : url;
        setPreviewDoc({ url, previewUrl, name, type: isPdf ? 'pdf' : 'image' });
    };

    const handleForceDownload = async () => {
        if (!previewDoc) return;
        setIsDownloading(true);
        try {
            const proxyDownloadUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(previewDoc.url)}&name=${encodeURIComponent(previewDoc.name)}`;
            const response = await fetch(proxyDownloadUrl);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = previewDoc.name || "documento"; 
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) { alert("Errore download."); } 
        finally { setIsDownloading(false); }
    };

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
                <div>
                    <h2 style={{color: '#2c3e50', margin:0}}>📦 Magazzino & Contabilità</h2>
                    <p style={{margin:0, fontSize:12, color:'#7f8c8d'}}>Gestione acquisti, giacenze e registro HACCP</p>
                </div>
                <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                    {['dashboard','calendario','lista','carico'].map(t => (
                        <button key={t} onClick={() => { 
                            setTab(t); 
                            if(t === 'lista') resetFiltro(); // Reset se clicco Tab Lista
                            if(t!=='carico') setRecordDaModificare(null); 
                        }} style={{
                            padding:'8px 15px', borderRadius:20, cursor:'pointer', border:'1px solid #ccc',
                            background: tab===t ? '#34495e' : 'white', color: tab===t ? 'white' : '#333', textTransform:'capitalize', fontWeight: tab===t?'bold':'normal'
                        }}>{t === 'carico' ? '+ Nuovo Carico' : t}</button>
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            {tab === 'dashboard' && <MagazzinoDashboard stats={stats} />}
            
            {tab === 'calendario' && <MagazzinoCalendar stats={stats} onDateClick={onSelectDataCalendario} />}

            {tab === 'carico' && (
                <MagazzinoUpload 
                    user={user} 
                    API_URL={API_URL} 
                    ricaricaDati={ricaricaDati}
                    recordDaModificare={recordDaModificare}
                    setRecordDaModificare={setRecordDaModificare}
                    onSuccess={() => { setRecordDaModificare(null); setTab('lista'); }}
                    onScanComplete={handleScanSuccess}
                />
            )}

            {/* VISTA DI REVISIONE (STAGING & BULK EDIT) */}
            {tab === 'staging' && stagingData && (
                <MagazzinoStaging 
                    initialData={stagingData}
                    onConfirm={handleStagingConfirm}
                    onCancel={() => { 
                        if(window.confirm("Annullare le modifiche?")) {
                            setStagingData(null); 
                            // Se eravamo in edit, torna alla lista, altrimenti al carico
                            setTab(isBulkEditMode ? 'lista' : 'carico'); 
                        }
                    }}
                />
            )}

            {tab === 'lista' && (
                <MagazzinoList 
                    storico={stats.storico}
                    ricaricaDati={ricaricaDati}
                    API_URL={API_URL}
                    handleFileAction={handleFileAction}
                    onEdit={gestisciModifica}
                    onBulkEdit={handleBulkEdit} // Passiamo la funzione per modifica massiva
                    openDownloadModal={() => setShowDownloadModal(true)}
                    filtroDataEsterno={filtroData}
                    resetFiltroEsterno={resetFiltro}
                />
            )}

            {/* MODALI (Download & Preview) */}
            {showDownloadModal && (
                <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000}}>
                    <div style={{background: 'white', padding: '20px', borderRadius: '10px', width: '350px', textAlign: 'center'}}>
                        <h3 style={{marginBottom: '15px'}}>Scarica Report</h3>
                        <div style={{display:'flex', justifyContent:'center', gap:10, marginBottom:15}}>
                             <button onClick={()=>setDownloadFormat('excel')} style={{padding:'5px 15px', borderRadius:20, border:'none', cursor:'pointer', background: downloadFormat==='excel'?'#27ae60':'#eee', color: downloadFormat==='excel'?'white':'#333', fontWeight:'bold'}}>Excel</button>
                             <button onClick={()=>setDownloadFormat('pdf')} style={{padding:'5px 15px', borderRadius:20, border:'none', cursor:'pointer', background: downloadFormat==='pdf'?'#e74c3c':'#eee', color: downloadFormat==='pdf'?'white':'#333', fontWeight:'bold'}}>PDF</button>
                        </div>
                        <div style={{display:'flex', gap:5, marginBottom:15, justifyContent:'center'}}>
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                            <button onClick={()=>executeDownload('custom-month')} style={{background:'#8e44ad', color:'white', border:'none', padding:'8px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SCARICA</button>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            <button onClick={()=>executeDownload('week')} style={{background: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Ultima Settimana</button>
                            <button onClick={()=>executeDownload('month')} style={{background: '#2980b9', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Mese Corrente</button>
                            <button onClick={()=>executeDownload('all')} style={{background: '#2c3e50', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold'}}>Tutto lo storico</button>
                        </div>
                        <button onClick={()=>setShowDownloadModal(false)} style={{marginTop: '20px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline'}}>Annulla</button>
                    </div>
                </div>
            )}

            {previewDoc && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <div style={{background:'white', width:'90%', height:'90%', maxWidth:'1000px', borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                        <div style={{padding:'10px 15px', background:'#ecf0f1', borderBottom:'1px solid #ccc', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontWeight:'bold', color:'#2c3e50'}}>📄 {previewDoc.name}</span>
                            <div style={{display:'flex', gap:10}}>
                                <button onClick={handleForceDownload} disabled={isDownloading} style={{background:'#27ae60', color:'white', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>{isDownloading ? '⏳...' : '⬇️ Scarica'}</button>
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

export default MagazzinoManager;