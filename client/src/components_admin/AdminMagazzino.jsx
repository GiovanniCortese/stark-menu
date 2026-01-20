// client/src/components_admin/AdminMagazzino.jsx
import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); // dashboard, carico
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const [previewImg, setPreviewImg] = useState(null);
    const [bollaData, setBollaData] = useState(null);

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
        
        // Preview
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewImg(ev.target.result);
        reader.readAsDataURL(file);

        setIsScanning(true);
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.success) {
                setBollaData(data.data); // { fornitore, data, prodotti: [...] }
                alert("✨ Bolla analizzata! Verifica i dati prima di salvare.");
            } else throw new Error(data.error);
        } catch(err) { alert("Errore AI: " + err.message); } 
        finally { setIsScanning(false); }
    };

    const salvaRigaBolla = async (prod, index) => {
        const payload = {
            ristorante_id: user.id,
            data_ricezione: bollaData.data_ricezione || new Date(),
            fornitore: bollaData.fornitore,
            prodotto: prod.nome,
            quantita: prod.quantita,
            prezzo: prod.prezzo || 0,
            lotto: prod.lotto || `TEMP-${Date.now()}`,
            scadenza: prod.scadenza,
            temperatura: 4, // Default frigo
            conforme: true, integro: true, operatore: "AI SCAN"
        };

        try {
            await fetch(`${API_URL}/api/haccp/merci`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            // Rimuovi dalla lista visiva
            const newProd = [...bollaData.prodotti];
            newProd.splice(index, 1);
            setBollaData({ ...bollaData, prodotti: newProd });
            ricaricaDati(); // Aggiorna grafici
        } catch(e) { alert("Errore salvataggio riga"); }
    };

    // COLORI GRAFICI
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // FILTRO RICERCA STORICO
    const storicoFiltrato = stats.storico.filter(r => 
        r.prodotto.toLowerCase().includes(filtro.toLowerCase()) || 
        r.fornitore.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh'}}>
            <h2 style={{color: '#2c3e50', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                📦 Gestione Magazzino & Fornitori
                <div>
                    <button onClick={() => setTab('dashboard')} style={{marginRight:10, padding:'10px 20px', background: tab==='dashboard'?'#34495e':'#ecf0f1', color: tab==='dashboard'?'white':'black', border:'none', borderRadius:5, cursor:'pointer'}}>📊 Dashboard</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', background: tab==='carico'?'#27ae60':'#ecf0f1', color: tab==='carico'?'white':'black', border:'none', borderRadius:5, cursor:'pointer'}}>📸 Carico Merce (AI)</button>
                </div>
            </h2>

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    
                    {/* CARD FORNITORI */}
                    <div style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                        <h3>💰 Spesa per Fornitore</h3>
                        <div style={{height: 300}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label>
                                        {stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{maxHeight:200, overflowY:'auto'}}>
                            {stats.fornitori.map((f, i) => (
                                <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #eee'}}>
                                    <span>{f.fornitore}</span>
                                    <strong>€ {Number(f.totale).toFixed(2)}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARD TOP PRODOTTI */}
                    <div style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                        <h3>🏆 Top Prodotti Acquistati</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.top_prodotti} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="prodotto" type="category" width={100} />
                                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                <Bar dataKey="totale_speso" fill="#82ca9d" barSize={20} radius={[0, 10, 10, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* SUPER TABELLA RICERCA */}
                    <div style={{gridColumn:'1 / -1', background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                            <h3>🔍 Ricerca Movimenti (Vodka, Farina...)</h3>
                            <input 
                                type="text" 
                                placeholder="Cerca prodotto o fornitore..." 
                                value={filtro} 
                                onChange={e => setFiltro(e.target.value)}
                                style={{padding:10, borderRadius:5, border:'1px solid #ddd', width:300}}
                            />
                        </div>
                        <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>
                            <thead>
                                <tr style={{background:'#f8f9fa', textAlign:'left'}}>
                                    <th style={{padding:10}}>Data</th>
                                    <th style={{padding:10}}>Prodotto</th>
                                    <th style={{padding:10}}>Fornitore</th>
                                    <th style={{padding:10}}>Qta</th>
                                    <th style={{padding:10}}>Prezzo</th>
                                    <th style={{padding:10}}>Lotto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storicoFiltrato.slice(0, 20).map((r, i) => (
                                    <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={{padding:10}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                        <td style={{padding:10, fontWeight:'bold'}}>{r.prodotto}</td>
                                        <td style={{padding:10}}>{r.fornitore}</td>
                                        <td style={{padding:10}}>{r.quantita}</td>
                                        <td style={{padding:10, color:'#e74c3c'}}>€ {Number(r.prezzo).toFixed(2)}</td>
                                        <td style={{padding:10}}><span style={{background:'#eee', padding:'2px 6px', borderRadius:4, fontSize:11}}>{r.lotto}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CARICO MERCE */}
            {tab === 'carico' && (
                <div style={{background:'white', padding:30, borderRadius:10, textAlign:'center'}}>
                    {!bollaData ? (
                        <div style={{border:'3px dashed #bdc3c7', padding:50, borderRadius:20, cursor:'pointer'}} onClick={() => fileInputRef.current.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleScan} accept="image/*" style={{display:'none'}} />
                            <div style={{fontSize:50}}>📸</div>
                            <h3>Clicca per scansionare una Fattura o Bolla</h3>
                            <p style={{color:'#7f8c8d'}}>L'AI estrarrà Fornitore, Prodotti e Prezzi automaticamente.</p>
                            {isScanning && <p style={{color:'#e67e22', fontWeight:'bold'}}>🤖 Analisi in corso...</p>}
                        </div>
                    ) : (
                        <div style={{textAlign:'left'}}>
                            <div style={{display:'flex', gap:20, marginBottom:20}}>
                                {previewImg && <img src={previewImg} style={{width:200, borderRadius:10, border:'1px solid #ddd'}} />}
                                <div>
                                    <h2>Fornitore: {bollaData.fornitore}</h2>
                                    <p>Data: {bollaData.data_ricezione}</p>
                                    <button onClick={() => setBollaData(null)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>Annulla / Nuova Scansione</button>
                                </div>
                            </div>

                            <h3>Prodotti Trovati ({bollaData.prodotti.length})</h3>
                            <div style={{display:'grid', gap:10}}>
                                {bollaData.prodotti.map((p, i) => (
                                    <div key={i} style={{display:'flex', gap:10, alignItems:'center', background:'#f9f9f9', padding:10, borderRadius:5, border:'1px solid #eee'}}>
                                        <input value={p.nome} onChange={e=>{const n=[...bollaData.prodotti]; n[i].nome=e.target.value; setBollaData({...bollaData, prodotti:n})}} style={{flex:2, padding:8}} />
                                        <input value={p.quantita} onChange={e=>{const n=[...bollaData.prodotti]; n[i].quantita=e.target.value; setBollaData({...bollaData, prodotti:n})}} style={{flex:1, padding:8}} placeholder="Qta" />
                                        <input type="number" value={p.prezzo} onChange={e=>{const n=[...bollaData.prodotti]; n[i].prezzo=e.target.value; setBollaData({...bollaData, prodotti:n})}} style={{flex:1, padding:8}} placeholder="€" />
                                        <button onClick={() => salvaRigaBolla(p, i)} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SALVA E ARCHIVIA</button>
                                    </div>
                                ))}
                            </div>
                            {bollaData.prodotti.length === 0 && <div style={{padding:20, background:'#dff9fb', color:'#2c3e50', borderRadius:10, marginTop:20}}>✅ Tutti i prodotti sono stati archiviati nel magazzino!</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminMagazzino;