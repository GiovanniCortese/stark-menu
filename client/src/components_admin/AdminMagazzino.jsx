// client/src/components_admin/AdminMagazzino.jsx - GESTIONALE COMPLETO
import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); // dashboard, analisi, carico
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    
    // Filtri avanzati
    const [filtroGlobale, setFiltroGlobale] = useState("");
    const [filtroFornitore, setFiltroFornitore] = useState(""); // Cliccando sul grafico

    // Stati per Carico AI (Uguale a MerciManager)
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const [scannedData, setScannedData] = useState(null);

    useEffect(() => { ricaricaDati(); }, []);

    const ricaricaDati = () => {
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`)
            .then(r => r.json())
            .then(setStats)
            .catch(console.error);
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
                alert("✨ Documento analizzato! Controlla i dati.");
            } else throw new Error(data.error);
        } catch(err) { alert("Errore AI: " + err.message); } 
        finally { setIsScanning(false); }
    };

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
            allegato_url: scannedData.allegato_url // Salva il PDF/Foto anche qui
        };

        try {
            await fetch(`${API_URL}/api/haccp/merci`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            // Rimuovi visivamente
            const newProd = [...scannedData.prodotti];
            newProd.splice(index, 1);
            setScannedData({ ...scannedData, prodotti: newProd });
            ricaricaDati(); 
        } catch(e) { alert("Errore salvataggio riga"); }
    };

    const apriAllegato = (url) => {
        if(!url) return;
        // Usa una nuova tab per semplicità, oppure potresti usare la modale proxy
        window.open(url, '_blank');
    };

    // --- FILTRAGGIO INTELLIGENTE ---
    const movimentiFiltrati = stats.storico.filter(r => {
        const matchText = (r.prodotto + r.fornitore + r.note).toLowerCase().includes(filtroGlobale.toLowerCase());
        const matchFornitore = filtroFornitore ? r.fornitore === filtroFornitore : true;
        return matchText && matchFornitore;
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A28DFF'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2 style={{color: '#2c3e50', margin:0}}>📦 Gestionale Magazzino</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setTab('dashboard')} style={{padding:'10px 20px', background: tab==='dashboard'?'#34495e':'white', color: tab==='dashboard'?'white':'#555', border:'1px solid #ddd', borderRadius:20, cursor:'pointer', fontWeight:'bold'}}>📊 Dashboard & Analisi</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', background: tab==='carico'?'#8e44ad':'white', color: tab==='carico'?'white':'#8e44ad', border:'1px solid #8e44ad', borderRadius:20, cursor:'pointer', fontWeight:'bold'}}>📸 Carico Rapido (AI)</button>
                </div>
            </div>

            {/* DASHBOARD & ANALISI */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    
                    {/* 1. GRAFICO FORNITORI INTERATTIVO */}
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:10}}>💰 Spesa per Fornitore</h3>
                        <div style={{height: 250, position:'relative'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label 
                                        onClick={(data) => setFiltroFornitore(data.fornitore === filtroFornitore ? "" : data.fornitore)}
                                        cursor="pointer"
                                    >
                                        {stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={filtroFornitore && filtroFornitore !== entry.fornitore ? 0.3 : 1} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{textAlign:'center', fontSize:12, color:'#7f8c8d'}}>
                            {filtroFornitore ? <span>Filtro attivo: <strong>{filtroFornitore}</strong> (Clicca per rimuovere)</span> : "Clicca su uno spicchio per filtrare i documenti sotto"}
                        </div>
                    </div>

                    {/* 2. TOP PRODOTTI */}
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:10}}>🏆 Top Prodotti (Valore)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.top_prodotti} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="prodotto" type="category" width={120} tick={{fontSize:11}} />
                                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                <Bar dataKey="totale_speso" fill="#2ecc71" barSize={15} radius={[0, 10, 10, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 3. TABELLA GESTIONALE POTENTE */}
                    <div style={{gridColumn:'1 / -1', background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:15}}>
                            <div>
                                <h3 style={{margin:0}}>🔍 Analisi Prodotti & Fatture</h3>
                                <p style={{margin:0, fontSize:13, color:'#7f8c8d'}}>Cerca "Vodka", "Fattura 102", o il nome di un fornitore.</p>
                            </div>
                            <input 
                                type="text" 
                                placeholder="🔎 Cerca ovunque..." 
                                value={filtroGlobale} 
                                onChange={e => setFiltroGlobale(e.target.value)}
                                style={{padding:12, borderRadius:8, border:'1px solid #ddd', width:'100%', maxWidth:'350px', fontSize:14, background:'#f9f9f9'}}
                            />
                        </div>

                        <div style={{overflowX:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>
                                <thead>
                                    <tr style={{background:'#f8f9fa', textAlign:'left', color:'#7f8c8d'}}>
                                        <th style={{padding:12, borderRadius:'8px 0 0 8px'}}>Data</th>
                                        <th style={{padding:12}}>Prodotto</th>
                                        <th style={{padding:12}}>Fornitore</th>
                                        <th style={{padding:12}}>Dettagli</th>
                                        <th style={{padding:12}}>Documento</th>
                                        <th style={{padding:12, borderRadius:'0 8px 8px 0'}}>Allegato</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimentiFiltrati.length === 0 && <tr><td colSpan="6" style={{padding:20, textAlign:'center'}}>Nessun dato trovato.</td></tr>}
                                    {movimentiFiltrati.slice(0, 50).map((r, i) => (
                                        <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                            <td style={{padding:12}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                            <td style={{padding:12}}>
                                                <strong>{r.prodotto}</strong>
                                                <div style={{fontSize:11, color:'#999'}}>{r.lotto}</div>
                                            </td>
                                            <td style={{padding:12}}>
                                                <span style={{background:'#e8f8f5', color:'#16a085', padding:'2px 8px', borderRadius:4, fontSize:12, fontWeight:'bold'}}>{r.fornitore}</span>
                                            </td>
                                            <td style={{padding:12}}>
                                                {r.quantita} <br/>
                                                <span style={{color:'#c0392b', fontWeight:'bold'}}>€ {Number(r.prezzo).toFixed(2)}</span>
                                            </td>
                                            <td style={{padding:12, fontSize:12, fontStyle:'italic', maxWidth:150, color:'#555'}}>
                                                {r.note || "-"}
                                            </td>
                                            <td style={{padding:12}}>
                                                {r.allegato_url ? (
                                                    <button 
                                                        onClick={() => apriAllegato(r.allegato_url)} 
                                                        style={{background:'#3498db', color:'white', border:'none', padding:'6px 12px', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12}}
                                                    >
                                                        📎 Vedi Doc
                                                    </button>
                                                ) : <span style={{color:'#ccc', fontSize:12}}>No File</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CARICO MERCE RAPIDO */}
            {tab === 'carico' && (
                <div style={{background:'white', padding:40, borderRadius:20, textAlign:'center', maxWidth:800, margin:'0 auto', boxShadow:'0 10px 40px rgba(0,0,0,0.1)'}}>
                    {!scannedData ? (
                        <div 
                            style={{border:'3px dashed #bdc3c7', padding:60, borderRadius:20, cursor:'pointer', background:'#fafafa', transition:'all 0.2s'}} 
                            onClick={() => fileInputRef.current.click()}
                            onMouseOver={e => e.currentTarget.style.background = '#f0f0f0'}
                            onMouseOut={e => e.currentTarget.style.background = '#fafafa'}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="image/*,application/pdf" // ACCETTA PDF
                                onChange={handleScan} 
                                style={{ display: 'none' }} 
                            />
                            <div style={{fontSize:60, marginBottom:10}}>📸 📄</div>
                            <h2 style={{color:'#2c3e50', margin:0}}>Carica Fattura o Bolla</h2>
                            <p style={{color:'#7f8c8d', fontSize:16}}>Supporta Foto (.jpg, .png) e Documenti (.pdf)</p>
                            {isScanning && <p style={{color:'#8e44ad', fontWeight:'bold', fontSize:18}}>🤖 Analisi Intelligenza Artificiale in corso...</p>}
                        </div>
                    ) : (
                        <div style={{textAlign:'left'}}>
                            <div style={{display:'flex', gap:20, marginBottom:30, alignItems:'flex-start', background:'#f8f9fa', padding:20, borderRadius:15}}>
                                <div>
                                    <h2 style={{margin:0, color:'#2c3e50'}}>{scannedData.fornitore || "Fornitore Sconosciuto"}</h2>
                                    <p style={{margin:'5px 0'}}>Data: <strong>{scannedData.data_ricezione}</strong></p>
                                    <p style={{margin:'5px 0'}}>Doc: <strong>{scannedData.numero_documento || "N/D"}</strong></p>
                                    {scannedData.allegato_url && <a href={scannedData.allegato_url} target="_blank" style={{color:'#3498db', textDecoration:'none', fontWeight:'bold'}}>📎 Vedi Allegato Originale</a>}
                                </div>
                                <button onClick={() => setScannedData(null)} style={{marginLeft:'auto', background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:8, cursor:'pointer'}}>❌ Annulla</button>
                            </div>

                            <h3 style={{borderBottom:'2px solid #eee', paddingBottom:10}}>Prodotti Rilevati ({scannedData.prodotti.length})</h3>
                            <div style={{display:'grid', gap:15}}>
                                {scannedData.prodotti.map((p, i) => (
                                    <div key={i} style={{display:'flex', gap:15, alignItems:'center', background:'white', padding:15, borderRadius:10, border:'1px solid #eee', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                                        <div style={{flex:2}}>
                                            <label style={{fontSize:11, fontWeight:'bold', color:'#999'}}>PRODOTTO</label>
                                            <input value={p.nome} onChange={e=>{const n=[...scannedData.prodotti]; n[i].nome=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{width:'100%', padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                                        </div>
                                        <div style={{flex:1}}>
                                            <label style={{fontSize:11, fontWeight:'bold', color:'#999'}}>QTA</label>
                                            <input value={p.quantita} onChange={e=>{const n=[...scannedData.prodotti]; n[i].quantita=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{width:'100%', padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                                        </div>
                                        <div style={{flex:1}}>
                                            <label style={{fontSize:11, fontWeight:'bold', color:'#999'}}>PREZZO</label>
                                            <input type="number" value={p.prezzo} onChange={e=>{const n=[...scannedData.prodotti]; n[i].prezzo=e.target.value; setScannedData({...scannedData, prodotti:n})}} style={{width:'100%', padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                                        </div>
                                        <button onClick={() => salvaRigaBolla(p, i)} style={{alignSelf:'flex-end', background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontWeight:'bold', height:38}}>SALVA</button>
                                    </div>
                                ))}
                            </div>
                            {scannedData.prodotti.length === 0 && <div style={{padding:30, background:'#dff9fb', color:'#2c3e50', borderRadius:10, marginTop:20, textAlign:'center'}}>✅ Tutti i prodotti sono stati caricati correttamente!</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminMagazzino;