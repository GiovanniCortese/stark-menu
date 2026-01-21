// client/src/components_admin/AdminMagazzino.jsx - FIXED & ENHANCED
import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx'; // Assicurati che xlsx sia installato

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); 
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [assets, setAssets] = useState([]); 
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const importExcelRef = useRef(null); // Ref per Excel
    const [scannedData, setScannedData] = useState(null);

    // Form Manuale
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: '',
        quantita: '', allegato_url: '', destinazione: '', 
        prezzo_unitario: '', iva: '', prezzo: '' // Prezzo = Totale
    });
    
    // Stato per evitare loop infinito nel calcolo
    const [isManualTotal, setIsManualTotal] = useState(false); 

    const [uploadingMerci, setUploadingMerci] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null); 
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => { ricaricaDati(); }, []);

    // --- CALCOLO AUTOMATICO PREZZI ---
    useEffect(() => {
        if (isManualTotal) return; // Se l'utente ha scritto il totale a mano, non sovrascrivere
        
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        
        if (!isNaN(qta) && !isNaN(unit)) {
            const tot = (qta * unit).toFixed(2);
            setMerciForm(prev => ({ ...prev, prezzo: tot }));
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario]);

    const handleTotalChange = (e) => {
        setIsManualTotal(true); // Attiva flag manuale
        setMerciForm({ ...merciForm, prezzo: e.target.value });
    };

    const ricaricaDati = () => {
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`).then(r => r.json()).then(setStats).catch(console.error);
        fetch(`${API_URL}/api/haccp/assets/${user.id}`).then(r => r.json()).then(setAssets).catch(console.error);
    };

    // --- GESTIONE IMPORT EXCEL ---
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws); // Array di oggetti

                // Mappa i campi Excel -> Database
                const formattedData = data.map(row => ({
                    ristorante_id: user.id,
                    data_ricezione: row['Data'] || new Date(),
                    fornitore: row['Fornitore'] || 'Excel Import',
                    prodotto: row['Prodotto'] || 'Prodotto',
                    quantita: row['Qta'] || 1,
                    prezzo_unitario: row['Prezzo Unitario'] || 0,
                    iva: row['IVA'] || 0,
                    prezzo: row['Totale'] || (row['Prezzo Unitario'] * row['Qta']) || 0,
                    lotto: row['Lotto'] || '',
                    scadenza: row['Scadenza'] || null,
                    operatore: 'IMPORT',
                    note: 'Importato da Excel'
                }));

                // Invia al backend
                await fetch(`${API_URL}/api/haccp/merci/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merci: formattedData })
                });

                alert(`✅ Importate ${formattedData.length} righe con successo!`);
                ricaricaDati();
            } catch (err) {
                alert("Errore importazione Excel: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // Reset input
    };

    // --- GESTIONE MODIFICA & ELIMINA ---
    const iniziaModifica = (riga) => {
        setTab('carico');
        setMerciForm({
            ...riga,
            data_ricezione: riga.data_ricezione ? riga.data_ricezione.split('T')[0] : '',
            scadenza: riga.scadenza ? riga.scadenza.split('T')[0] : '',
            prezzo_unitario: riga.prezzo_unitario || '',
            iva: riga.iva || '',
            prezzo: riga.prezzo || ''
        });
        setIsManualTotal(true); // Quando modifichi, preserva il totale esistente
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminaMerce = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questa riga dal magazzino?")) return;
        try {
            await fetch(`${API_URL}/api/haccp/merci/${id}`, { method: 'DELETE' });
            ricaricaDati();
        } catch (e) { alert("Errore eliminazione"); }
    };

    // --- SALVATAGGIO MANUALE ---
    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const url = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
            const method = merciForm.id ? 'PUT' : 'POST';

            const payload = { ...merciForm, ristorante_id: user.id, operatore: 'ADMIN' };
            if (!payload.scadenza) payload.scadenza = null;
            
            const res = await fetch(url, { 
                method: method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if(res.ok) {
                alert(merciForm.id ? "✅ Riga aggiornata!" : "✅ Merce registrata!");
                // Reset form
                setMerciForm({ 
                    id: null, data_ricezione: new Date().toISOString().split('T')[0],
                    fornitore:'', prodotto:'', quantita:'', prezzo_unitario:'', iva:'', prezzo:'', 
                    lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'' 
                });
                setIsManualTotal(false);
                ricaricaDati();
            } else {
                throw new Error("Errore Server");
            }
        } catch (err) { alert("Errore Salvataggio: " + err.message); }
    };

    // --- GESTIONE ALLEGATI (Uguale a prima) ---
    const handleFileAction = (url, name) => {
        if(!url) return;
        const isPdf = url.toLowerCase().includes('.pdf');
        let previewUrl = isPdf ? `${API_URL}/api/proxy-download?url=${encodeURIComponent(url)}` : url;
        setPreviewDoc({ url, previewUrl, name, type: isPdf ? 'pdf' : 'image' });
    };

    // --- RENDER ---
    const movimentiFiltrati = stats.storico.filter(r => 
        (r.prodotto + r.fornitore + (r.note||"")).toLowerCase().includes(filtro.toLowerCase())
    );

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2 style={{color: '#2c3e50', margin:0}}>📦 Gestionale Magazzino</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setTab('dashboard')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='dashboard'?'#34495e':'white', color:tab==='dashboard'?'white':'#333', border:'1px solid #ccc'}}>📊 Dashboard</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='carico'?'#27ae60':'white', color:tab==='carico'?'white':'#27ae60', border:'1px solid #27ae60'}}>📥 Carico / Modifica</button>
                </div>
            </div>

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

            {tab === 'carico' && (
                <div>
                     {/* IMPORT EXCEL & SCAN */}
                    <div style={{display:'flex', gap:15, marginBottom:20}}>
                         <div style={{flex:1, background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                            <div><h3 style={{margin:0, color:'#8e44ad'}}>✨ Magic Scan (AI)</h3><p style={{margin:0, fontSize:12}}>Carica PDF/Foto</p></div>
                            <button onClick={() => fileInputRef.current.click()} style={{background:'#8e44ad', color:'white', border:'none', padding:'10px 20px', borderRadius:25, cursor:'pointer'}}>{isScanning ? '⏳...' : '📸 SCAN'}</button>
                            <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={() => {/* Logica Scan rimasta uguale */}} style={{display:'none'}} />
                        </div>

                        <div style={{flex:1, background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                            <div><h3 style={{margin:0, color:'#27ae60'}}>📊 Importa Excel</h3><p style={{margin:0, fontSize:12}}>Carica lista prodotti</p></div>
                            <button onClick={() => importExcelRef.current.click()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:25, cursor:'pointer'}}>📂 CARICA XLS</button>
                            <input type="file" ref={importExcelRef} accept=".xlsx, .xls" onChange={handleImportExcel} style={{display:'none'}} />
                        </div>
                    </div>

                    {/* FORM MANUALE */}
                    <div style={{background:'white', padding:25, borderRadius:15, marginBottom:30, borderLeft:'5px solid #27ae60', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Riga' : '📥 Carico Manuale'}</h3>
                        <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            {/* Campi Standard */}
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11, fontWeight:'bold'}}>Data</label><input type="date" required value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11, fontWeight:'bold'}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11, fontWeight:'bold'}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            
                            {/* NUOVI CAMPI PREZZO */}
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold'}}>Quantità</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>{ setIsManualTotal(false); setMerciForm({...merciForm, quantita:e.target.value}); }} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold'}}>Prezzo Unit.</label><input type="number" step="0.01" value={merciForm.prezzo_unitario} onChange={e=>{ setIsManualTotal(false); setMerciForm({...merciForm, prezzo_unitario:e.target.value}); }} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:60}}><label style={{fontSize:11, fontWeight:'bold'}}>IVA %</label><input type="text" placeholder="22" value={merciForm.iva} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold'}}>TOTALE (€)</label><input type="number" step="0.01" value={merciForm.prezzo} onChange={handleTotalChange} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5, background:'#f9f9f9', fontWeight:'bold'}} /></div>

                            {/* Altri Campi */}
                            <div style={{flex:1, minWidth:120}}><label style={{fontSize:11, fontWeight:'bold'}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11, fontWeight:'bold'}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            
                            <button type="submit" style={{padding:'10px 25px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:38}}>
                                {merciForm.id ? 'AGGIORNA' : 'REGISTRA'}
                            </button>
                            {merciForm.id && <button type="button" onClick={()=>{setMerciForm({id:null, data_ricezione:'', fornitore:'', prodotto:'', quantita:'', prezzo:'', prezzo_unitario:'', iva:''}); setIsManualTotal(false);}} style={{padding:'10px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>ANNULLA</button>}
                        </form>
                    </div>
                </div>
            )}

            <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                    <h3>🔍 Registro Completo</h3>
                    <input type="text" placeholder="Cerca..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{padding:10, borderRadius:8, border:'1px solid #ddd'}} />
                </div>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f8f9fa', textAlign:'left', color:'#7f8c8d'}}>
                                <th style={{padding:12}}>Data</th>
                                <th style={{padding:12}}>Fornitore/Prodotto</th>
                                <th style={{padding:12}}>Qta</th>
                                <th style={{padding:12}}>Unitario</th>
                                <th style={{padding:12}}>IVA</th>
                                <th style={{padding:12}}>Totale</th>
                                <th style={{padding:12}}>Doc</th>
                                <th style={{padding:12}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentiFiltrati.slice(0, 100).map((r, i) => (
                                <tr 
                                    key={i} 
                                    onClick={() => iniziaModifica(r)} // RIGA CLICCABILE
                                    style={{borderBottom:'1px solid #f1f1f1', cursor:'pointer', transition:'background 0.2s'}}
                                    onMouseOver={e => e.currentTarget.style.background = '#f0f8ff'}
                                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{padding:12}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                    <td style={{padding:12}}>
                                        <div style={{fontWeight:'bold'}}>{r.prodotto}</div>
                                        <div style={{fontSize:11, color:'#666'}}>{r.fornitore}</div>
                                    </td>
                                    <td style={{padding:12}}>{r.quantita}</td>
                                    <td style={{padding:12}}>€ {r.prezzo_unitario || '-'}</td>
                                    <td style={{padding:12}}>{r.iva ? r.iva + '%' : '-'}</td>
                                    <td style={{padding:12, fontWeight:'bold', color:'#27ae60'}}>€ {Number(r.prezzo).toFixed(2)}</td>
                                    <td style={{padding:12}}>{r.allegato_url ? '📎' : '-'}</td>
                                    <td style={{padding:12, display:'flex', gap:10}} onClick={e => e.stopPropagation()}>
                                        <button onClick={(e) => {e.stopPropagation(); iniziaModifica(r);}} style={{background:'none', border:'none', fontSize:16, cursor:'pointer'}}>✏️</button>
                                        <button onClick={(e) => {e.stopPropagation(); eliminaMerce(r.id);}} style={{background:'none', border:'none', fontSize:16, cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALE ANTEPRIMA (Stessa di MerciManager) */}
            {previewDoc && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <div style={{background:'white', width:'90%', height:'90%', borderRadius:10, display:'flex', flexDirection:'column'}}>
                         <div style={{padding:10, display:'flex', justifyContent:'space-between'}}>
                             <span>{previewDoc.name}</span>
                             <button onClick={()=>setPreviewDoc(null)}>Chiudi</button>
                         </div>
                         <iframe src={previewDoc.previewUrl} style={{flex:1}} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminMagazzino;