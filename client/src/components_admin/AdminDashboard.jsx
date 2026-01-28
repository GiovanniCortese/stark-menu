// client/src/components_admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AdminDashboard({ user, API_URL, config, setConfig }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [datiForm, setDatiForm] = useState({ ragioneSociale: '', piva: '', indirizzo: '', telefono: '', rawText: '' });

    useEffect(() => {
        // Carica statistiche
        fetch(`${API_URL}/api/stats/dashboard/${user.id}`)
            .then(res => res.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        
        // Carica config aggiornata
        fetch(`${API_URL}/api/ristorante/config/${user.id}`)
            .then(r => r.json())
            .then(d => { 
                if (d.dati_fiscali) setDatiForm(prev => ({...prev, rawText: d.dati_fiscali})); 
                if(setConfig) setConfig(d); // Aggiorna lo stato globale con i nuovi permessi
            });
    }, [user.id, API_URL, setConfig]);

    const salvaDatiSocietari = async () => {
        const stringaFinale = `${datiForm.ragioneSociale || user.nome} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}`;
        const payload = datiForm.rawText && datiForm.rawText.length > 5 ? datiForm.rawText : stringaFinale;
        try {
            await fetch(`${API_URL}/api/ristorante/dati-fiscali/${user.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dati_fiscali: payload }) });
            alert("✅ Dati Societari Aggiornati!");
        } catch(e) { alert("Errore salvataggio"); }
    };

    if(loading) return <div style={{padding:20}}>🔄 Caricamento dashboard...</div>;
    if(!stats) return <div style={{padding:20}}>❌ Errore caricamento dati.</div>;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #eff0f1' };
    const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing:'border-box' };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/D';
        return new Date(dateStr).toLocaleDateString('it-IT');
    };

    // --- MAPPATURA CORRETTA DEI MODULI ---
    // Qui colleghiamo i flag del DB (cassa_full_suite, modulo_utenti) alle card visuali
    const moduliList = [
        { 
            label: "Menu Digitale 📱", 
            active: config.modulo_menu_digitale, 
            scadenza: config.scadenza_menu_digitale 
        },
        { 
            label: "Ordini al Tavolo 🍽️", 
            active: config.modulo_ordini_clienti, 
            scadenza: config.scadenza_ordini_clienti 
        },
        { 
            label: "Sistema Cassa 💶", 
            active: config.modulo_cassa, 
            scadenza: config.scadenza_cassa 
        },
        { 
            // FIX: Collegamento corretto a cassa_full_suite
            label: "KDS Suite (Cucina) 👨‍🍳", 
            active: config.cassa_full_suite, 
            scadenza: config.scadenza_cassa // Usa la stessa scadenza della cassa
        },
        { 
            label: "Magazzino & Costi 📦", 
            active: config.modulo_magazzino, 
            scadenza: config.scadenza_magazzino 
        },
        { 
            label: "HACCP Digitale 🛡️", 
            active: config.modulo_haccp, 
            scadenza: config.scadenza_haccp 
        },
        { 
            // FIX: Collegamento corretto a modulo_utenti
            label: "CRM & Utenti 👥", 
            active: config.modulo_utenti, 
            scadenza: config.scadenza_utenti 
        }
    ];

    return (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
            
            {/* 1. SEZIONE ABBONAMENTI & MODULI */}
            <div style={{...cardStyle, marginBottom: '30px', borderLeft: '5px solid #8e44ad', background: '#fdfefe'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'20px'}}>
                    <div>
                        <h3 style={{margin:0, color:'#2c3e50', display:'flex', alignItems:'center', gap:'10px'}}>
                            💎 Il tuo Piano Abbonamento
                        </h3>
                        <p style={{fontSize:'13px', color:'#64748b', margin:'5px 0 20px 0'}}>
                            Stato dei servizi attivi e relative scadenze.
                        </p>
                    </div>
                    {config.account_attivo && (
                        <div style={{background:'#e8f5e9', color:'#2e7d32', padding:'5px 15px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold', border:'1px solid #a5d6a7'}}>
                            ✅ ACCOUNT ATTIVO
                        </div>
                    )}
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'15px'}}>
                    {moduliList.map((mod, idx) => (
                        <div key={idx} style={{
                            padding:'15px', 
                            borderRadius:'10px', 
                            border: mod.active ? '1px solid #d1f2eb' : '1px dashed #ccc',
                            background: mod.active ? '#f4fbf9' : '#fafafa',
                            transition: 'all 0.2s',
                            opacity: mod.active ? 1 : 0.6
                        }}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                <span style={{fontWeight:'bold', color: mod.active ? '#16a085' : '#7f8c8d', fontSize:'13px'}}>
                                    {mod.label}
                                </span>
                                <span style={{fontSize:'16px'}}>{mod.active ? '✨' : '🔒'}</span>
                            </div>
                            
                            {mod.active ? (
                                <div>
                                    <div style={{fontSize:'10px', color:'#7f8c8d', textTransform:'uppercase'}}>Scadenza</div>
                                    <div style={{fontSize:'13px', fontWeight:'bold', color: '#27ae60'}}>
                                        {formatDate(mod.scadenza)}
                                    </div>
                                </div>
                            ) : (
                                <div style={{display:'flex', alignItems:'center', height:'100%', paddingTop:'5px'}}>
                                    <span style={{fontSize:'11px', fontWeight:'bold', color: '#95a5a6', background:'#eee', padding:'3px 8px', borderRadius:'4px'}}>
                                        DA ATTIVARE
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. STATISTICHE GENERALI (KPI) */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                <div style={cardStyle}>
                    <span style={{fontSize:'12px', color:'#6b7280', fontWeight:'bold', textTransform:'uppercase'}}>Incasso Oggi</span>
                    <h3 style={{fontSize:'28px', margin:'5px 0', color:'#111827'}}>€ {Number(stats.incassi.oggi || 0).toFixed(2)}</h3>
                    <span style={{fontSize:12, color: stats.incassi.oggi >= stats.incassi.ieri ? '#10b981' : '#ef4444'}}>
                        {stats.incassi.oggi >= stats.incassi.ieri ? '▲' : '▼'} vs Ieri (€ {Number(stats.incassi.ieri || 0).toFixed(2)})
                    </span>
                </div>
                <div style={cardStyle}>
                    <span style={{fontSize:'12px', color:'#6b7280', fontWeight:'bold', textTransform:'uppercase'}}>Ordini Mese</span>
                    <h3 style={{fontSize:'28px', margin:'5px 0', color:'#3b82f6'}}>{stats.chartData.reduce((acc, curr) => acc + curr.ordini, 0)}</h3>
                </div>
                <div style={cardStyle}>
                    <span style={{fontSize:'12px', color:'#6b7280', fontWeight:'bold', textTransform:'uppercase'}}>Piatti Totali</span>
                    <h3 style={{fontSize:'28px', margin:'5px 0', color:'#8b5cf6'}}>{stats.topDishes ? stats.topDishes.length : 0}</h3>
                </div>
            </div>

            {/* 3. SEZIONE INTESTAZIONE / DATI FISCALI */}
            <div style={{...cardStyle, marginBottom: '30px', borderLeft: '5px solid #4f46e5', background: '#f8fafc'}}>
                <h3 style={{marginTop:0, color:'#1e293b', display:'flex', alignItems:'center', gap:'10px'}}>
                    📄 Intestazione Documenti & Dati Aziendali
                </h3>
                <p style={{fontSize:'13px', color:'#64748b', marginBottom:'20px'}}>
                    Questi dati appariranno nell'intestazione dei report PDF, delle comande e dell'HACCP.
                </p>
                
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px', marginBottom:'15px'}}>
                    <input style={inputStyle} value={datiForm.ragioneSociale} onChange={e => setDatiForm({...datiForm, ragioneSociale: e.target.value, rawText: ''})} placeholder={`Ragione Sociale (Es. ${user.nome})`} />
                    <input style={inputStyle} value={datiForm.piva} onChange={e => setDatiForm({...datiForm, piva: e.target.value, rawText: ''})} placeholder="P.IVA / C.F." />
                    <input style={inputStyle} value={datiForm.indirizzo} onChange={e => setDatiForm({...datiForm, indirizzo: e.target.value, rawText: ''})} placeholder="Indirizzo Completo" />
                    <input style={inputStyle} value={datiForm.telefono} onChange={e => setDatiForm({...datiForm, telefono: e.target.value, rawText: ''})} placeholder="Telefono" />
                </div>
                <div style={{display:'flex', gap:'10px', alignItems:'flex-end', flexWrap:'wrap'}}>
                    <div style={{flex:1, minWidth:'250px'}}>
                        <label style={{fontSize:'11px', fontWeight:'bold', color:'#64748b'}}>Anteprima stringa completa (Modificabile manualmente):</label>
                        <textarea value={datiForm.rawText || (datiForm.ragioneSociale ? `${datiForm.ragioneSociale} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}` : '')} onChange={e => setDatiForm({...datiForm, rawText: e.target.value})} style={{...inputStyle, minHeight:'50px', fontFamily:'monospace', background:'white'}} />
                    </div>
                    <button onClick={salvaDatiSocietari} style={{background: '#4f46e5', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height:'50px'}}>💾 SALVA DATI</button>
                </div>
            </div>

            {/* 4. GRAFICI */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px'}}>
                <div style={cardStyle}>
                    <h4 style={{marginTop:0, color:'#374151'}}>🕒 Andamento Ordini (Oggi)</h4>
                    <div style={{ width: '100%', height: 300 }}> 
                        <ResponsiveContainer>
                            <AreaChart data={stats.chartData}>
                                <defs><linearGradient id="colorOrdini" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" />
                                <YAxis fontSize={12} stroke="#9ca3af"/>
                                <Tooltip />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <Area type="monotone" dataKey="ordini" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrdini)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div style={cardStyle}>
                    <h4 style={{marginTop:0, color:'#374151'}}>🏆 Top Piatti Venduti</h4>
                    <div style={{ width: '100%', height: 300, display:'flex', alignItems:'center' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={stats.topDishes} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {stats.topDishes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{width:'40%', fontSize:'12px'}}>
                             {stats.topDishes.map((entry, index) => (
                                 <div key={index} style={{marginBottom:5, display:'flex', alignItems:'center'}}>
                                     <div style={{width:10, height:10, background:COLORS[index % COLORS.length], borderRadius:'50%', marginRight:5}}></div>
                                     <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{entry.name}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default AdminDashboard;