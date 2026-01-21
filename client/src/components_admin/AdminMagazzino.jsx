// client/src/components_admin/AdminMagazzino.jsx
import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); // dashboard, carico, lista
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [assets, setAssets] = useState([]); // Per la destinazione
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI e Manuale
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const [scannedData, setScannedData] = useState(null);

    // Form Manuale
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: '',
        quantita: '', allegato_url: '', destinazione: '', prezzo: ''
    });
    const [uploadingMerci, setUploadingMerci] = useState(false);

    // Stati Anteprima File (Modal)
    const [previewDoc, setPreviewDoc] = useState(null); 
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => { ricaricaDati(); }, []);

    const ricaricaDati = () => {
        // 1. Stats e Storico
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`)
            .then(r => r.json())
            .then(setStats)
            .catch(console.error);
        
        // 2. Assets per destinazione
        fetch(`${API_URL}/api/haccp/assets/${user.id}`)
            .then(r => r.json())
            .then(setAssets)
            .catch(console.error);
    };

    // --- GESTIONE ALLEGATO E ANTEPRIMA ---
    const handleFileAction = (url, name = "Documento") => {
        if(!url) return;
        const isPdf = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
        let previewUrl = url;
        if (isPdf) {
            previewUrl = `${API_URL}/api/proxy-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
        }
        setPreviewDoc({ url, previewUrl, name, type: isPdf ? 'pdf' : 'image' });
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
            link.download = previewDoc.name; 
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) { alert("Errore download."); } 
        finally { setIsDownloading(false); }
    };

    // --- LOGICA AI SCAN ---
    const handleScan = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setIsScanning(true);
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.success) {
                setScannedData(data.data); 
                // Precompila form manuale con i dati di testata
                const noteDoc = data.data.numero_documento ? `Rif: ${data.data.numero_documento}` : '';
                setMerciForm(prev => ({
                    ...prev,
                    fornitore: data.data.fornitore || '',
                    data_ricezione: data.data.data_ricezione || new Date().toISOString().split('T')[0],
                    note: noteDoc, 
                    allegato_url: data.data.allegato_url || ''
                }));
                alert("✨ Documento analizzato! Usa i prodotti sotto o compila manualmente.");
            } else throw new Error(data.error);
        } catch(err) { alert("Errore AI: " + err.message); } 
        finally { setIsScanning(false); }
    };

    // Salva riga da AI
    const salvaRigaBolla = async (prod, index) => {
        const noteDoc = scannedData.numero_documento ? `Rif: ${scannedData.numero_documento}` : '';
        const payload = {
            ristorante_id: user.id,
            data_ricezione: scannedData.data_ricezione || new Date(),
            fornitore: scannedData.fornitore,
            prodotto: prod.nome,
            quantita: prod.quantita,
            prezzo: prod.prezzo || 0,
            lotto: `AI-${Date.now()}`,
            scadenza: null,
            temperatura: 4, 
            conforme: true, integro: true, operatore: "ADMIN",
            note: noteDoc,
            allegato_url: scannedData.allegato_url 
        };

        try {
            await fetch(`${API_URL}/api/haccp/merci`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            const newProd = [...scannedData.prodotti];
            newProd.splice(index, 1);
            setScannedData({ ...scannedData, prodotti: newProd });
            ricaricaDati(); 
        } catch(e) { alert("Errore salvataggio riga"); }
    };

    // --- LOGICA MANUALE ---
    const handleMerciPhoto = async (e) => { 
        const f = e.target.files[0]; if(!f) return; setUploadingMerci(true); 
        const fd = new FormData(); fd.append('photo', f);
        try { 
            const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
            const data = await res.json();
            setMerciForm(prev => ({...prev, allegato_url: data.url})); 
        } finally { setUploadingMerci(false); } 
    };

    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...merciForm, ristorante_id: user.id, operatore: 'ADMIN' };
            if (!payload.scadenza) payload.scadenza = null;
            
            await fetch(`${API_URL}/api/haccp/merci`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            alert("✅ Merce registrata!");
            setMerciForm({ ...merciForm, prodotto:'', quantita:'', prezzo:'', lotto:'', scadenza:'', note:'' }); // Reset parziale
            ricaricaDati();
        } catch (err) { alert("Errore Salvataggio"); }
    };

    // --- FILTRAGGIO ---
    const movimentiFiltrati = stats.storico.filter(r => {
        const matchText = (r.prodotto + r.fornitore + (r.note||"")).toLowerCase().includes(filtro.toLowerCase());
        return matchText;
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
                <h2 style={{color: '#2c3e50', margin:0}}>📦 Gestionale Magazzino</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setTab('dashboard')} style={{padding:'10px 20px', background: tab==='dashboard'?'#34495e':'white', color: tab==='dashboard'?'white':'#555', border:'1px solid #ddd', borderRadius:20, cursor:'pointer', fontWeight:'bold'}}>📊 Dashboard</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', background: tab==='carico'?'#27ae60':'white', color: tab==='carico'?'white':'#27ae60', border:'1px solid #27ae60', borderRadius:20, cursor:'pointer', fontWeight:'bold'}}>📥 Carico Merci</button>
                </div>
            </div>

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0}}>💰 Spesa per Fornitore</h3>
                        <div style={{height: 250}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label>
                                        {stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0}}>🏆 Top Prodotti (Spesa)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.top_prodotti} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="prodotto" type="category" width={120} tick={{fontSize:11}} />
                                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                <Bar dataKey="totale_speso" fill="#2ecc71" barSize={15} radius={[0, 10, 10, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* CARICO MERCE & TABELLA (TUTTO INSIEME ORA) */}
            {tab === 'carico' && (
                <div>
                    {/* 1. SEZIONE AI SCAN */}
                    <div style={{background:'white', padding:20, borderRadius:15, marginBottom:20, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:15}}>
                        <div>
                            <h3 style={{margin:0, color:'#8e44ad'}}>✨ Magic Scan (AI)</h3>
                            <p style={{margin:0, fontSize:13, color:'#666'}}>Carica Fattura o Bolla (PDF/Foto) per compilazione automatica.</p>
                        </div>
                        <button onClick={() => fileInputRef.current.click()} style={{background:'#8e44ad', color:'white', border:'none', padding:'10px 20px', borderRadius:25, cursor:'pointer', fontWeight:'bold'}}>
                            {isScanning ? '⏳ Analisi...' : '📸 SCANSIONA / CARICA'}
                        </button>
                        <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={handleScan} style={{display:'none'}} />
                    </div>

                    {/* RISULTATI AI */}
                    {scannedData && (
                        <div style={{marginBottom:20, padding:20, background:'#f3e5f5', borderRadius:10, border:'1px solid #e1bee7'}}>
                            <h4>Risultati Scan: {scannedData.fornitore}</h4>
                            <div style={{display:'grid', gap:10}}>
                                {scannedData.prodotti.map((p, i) => (
                                    <div key={i} style={{display:'flex', gap:10, alignItems:'center', background:'white', padding:10, borderRadius:5}}>
                                        <input value={p.nome} onChange={e=>{const n=[...scannedData.prodotti]; n[i].nome=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{flex:2, padding:8}} />
                                        <input value={p.quantita} onChange={e=>{const n=[...scannedData.prodotti]; n[i].quantita=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{flex:1, padding:8}} placeholder="Qta" />
                                        <input type="number" value={p.prezzo} onChange={e=>{const n=[...scannedData.prodotti]; n[i].prezzo=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{flex:1, padding:8}} placeholder="€" />
                                        <button onClick={() => salvaRigaBolla(p, i)} style={{background:'#27ae60', color:'white', border:'none', padding:'8px', borderRadius:5, cursor:'pointer'}}>SALVA</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setScannedData(null)} style={{marginTop:10, background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>Chiudi Scan</button>
                        </div>
                    )}

                    {/* 2. FORM MANUALE COMPLETO */}
                    <div style={{background:'white', padding:25, borderRadius:15, marginBottom:30, boxShadow:'0 4px 20px rgba(0,0,0,0.05)', borderLeft:'5px solid #27ae60'}}>
                        <h3 style={{marginTop:0, color:'#2c3e50'}}>📥 Carico Manuale</h3>
                        <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11, fontWeight:'bold'}}>Data Arrivo</label><input type="date" required value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11, fontWeight:'bold'}}>Fornitore</label><input placeholder="Es. Metro" required value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11, fontWeight:'bold'}}>Prodotto</label><input placeholder="Es. Farina 00" required value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold'}}>Quantità</label><input placeholder="10 kg" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11, fontWeight:'bold'}}>Prezzo Tot</label><input type="number" step="0.01" placeholder="€" value={merciForm.prezzo} onChange={e=>setMerciForm({...merciForm, prezzo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            
                            <div style={{flex:1, minWidth:120}}><label style={{fontSize:11, fontWeight:'bold'}}>Lotto</label><input placeholder="L-123" value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11, fontWeight:'bold'}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:80}}><label style={{fontSize:11, fontWeight:'bold'}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>
                            
                            <div style={{flex:1, minWidth:150}}><label style={{fontSize:11, fontWeight:'bold'}}>Destinazione</label>
                                <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd', borderRadius:5}}>
                                    <option value="">-- Seleziona --</option>
                                    {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                                </select>
                            </div>

                            <div style={{flex:2, minWidth:200}}><label style={{fontSize:11, fontWeight:'bold'}}>Note / Doc</label><input placeholder="Rif. Fattura 102" value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:5}} /></div>

                            <div style={{flex:1, minWidth:150, display:'flex', alignItems:'center'}}>
                                <label style={{cursor:'pointer', background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, width:'100%', textAlign:'center', fontSize:12, border:'1px solid #ddd'}}>
                                    {uploadingMerci ? "Caricamento..." : (merciForm.allegato_url ? "📎 ALLEGATO OK" : "📎 Allega File")}
                                    <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                                </label>
                            </div>

                            <button type="submit" style={{padding:'10px 25px', background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:38}}>REGISTRA</button>
                        </form>
                    </div>
                </div>
            )}

            {/* SUPER TABELLA (SEMPRE VISIBILE O QUASI) */}
            <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:15}}>
                    <h3 style={{margin:0}}>🔍 Registro Completo</h3>
                    <input 
                        type="text" 
                        placeholder="🔎 Cerca per nome, fornitore, lotto..." 
                        value={filtro} 
                        onChange={e => setFiltro(e.target.value)}
                        style={{padding:10, borderRadius:8, border:'1px solid #ddd', width:'100%', maxWidth:'300px', fontSize:14, background:'#f9f9f9'}}
                    />
                </div>

                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f8f9fa', textAlign:'left', color:'#7f8c8d'}}>
                                <th style={{padding:12}}>Data</th>
                                <th style={{padding:12}}>Fornitore</th>
                                <th style={{padding:12}}>Prodotto</th>
                                <th style={{padding:12}}>Qta</th>
                                <th style={{padding:12}}>Prezzo</th>
                                <th style={{padding:12}}>Lotto</th>
                                <th style={{padding:12}}>Scadenza</th>
                                <th style={{padding:12}}>Temp</th>
                                <th style={{padding:12}}>Destinazione</th>
                                <th style={{padding:12}}>Note/Doc</th>
                                <th style={{padding:12}}>Allegato</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentiFiltrati.length === 0 && <tr><td colSpan="11" style={{padding:20, textAlign:'center'}}>Nessun dato.</td></tr>}
                            {movimentiFiltrati.slice(0, 100).map((r, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                    <td style={{padding:12}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                    <td style={{padding:12, fontWeight:'bold', color:'#2c3e50'}}>{r.fornitore}</td>
                                    <td style={{padding:12, fontWeight:'bold'}}>{r.prodotto}</td>
                                    <td style={{padding:12}}>{r.quantita}</td>
                                    <td style={{padding:12, color:'#c0392b'}}>€ {Number(r.prezzo).toFixed(2)}</td>
                                    <td style={{padding:12, fontFamily:'monospace'}}>{r.lotto || '-'}</td>
                                    <td style={{padding:12}}>{r.scadenza ? new Date(r.scadenza).toLocaleDateString() : '-'}</td>
                                    <td style={{padding:12}}>{r.temperatura ? `${r.temperatura}°C` : '-'}</td>
                                    <td style={{padding:12, fontStyle:'italic'}}>{r.destinazione || '-'}</td>
                                    <td style={{padding:12, fontSize:12, color:'#555', maxWidth:150}}>{r.note}</td>
                                    <td style={{padding:12}}>
                                        {r.allegato_url ? (
                                            <button 
                                                onClick={() => handleFileAction(r.allegato_url, `Doc_${r.fornitore}`)} 
                                                style={{background:'#3498db', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12}}
                                            >
                                                📎 Vedi
                                            </button>
                                        ) : <span style={{color:'#ccc'}}>-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALE ANTEPRIMA --- */}
            {previewDoc && (
                <div style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, 
                    background:'rgba(0,0,0,0.85)', zIndex:9999, 
                    display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                    <div style={{
                        background:'white', width:'90%', height:'90%', maxWidth:'1000px', 
                        borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            padding:'10px 15px', background:'#ecf0f1', borderBottom:'1px solid #ccc',
                            display:'flex', justifyContent:'space-between', alignItems:'center'
                        }}>
                            <span style={{fontWeight:'bold', color:'#2c3e50'}}>📄 {previewDoc.name}</span>
                            <div style={{display:'flex', gap:10}}>
                                <button 
                                    onClick={handleForceDownload}
                                    disabled={isDownloading}
                                    style={{background: isDownloading ? '#95a5a6' : '#27ae60', color:'white', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer'}}
                                >
                                    {isDownloading ? '⏳...' : '⬇️ Scarica'}
                                </button>
                                <button onClick={() => setPreviewDoc(null)} style={{background:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:4, cursor:'pointer'}}>X</button>
                            </div>
                        </div>
                        <div style={{flex:1, background:'#555', overflow:'hidden', display:'flex', justifyContent:'center', alignItems:'center'}}>
                            {previewDoc.type === 'pdf' ? (
                                <iframe src={previewDoc.previewUrl} style={{width:'100%', height:'100%', border:'none'}} title="Anteprima" />
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