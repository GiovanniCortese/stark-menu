// client/src/components_admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

function AdminDashboard({ user, API_URL }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [datiForm, setDatiForm] = useState({ ragioneSociale: '', piva: '', indirizzo: '', telefono: '', rawText: '' });

    useEffect(() => {
        fetch(`${API_URL}/api/stats/dashboard/${user.id}`)
            .then(res => res.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });

        fetch(`${API_URL}/api/ristorante/config/${user.id}`)
            .then(r => r.json())
            .then(d => {
                if (d.dati_fiscali) setDatiForm(prev => ({...prev, rawText: d.dati_fiscali})); 
            });
    }, [user.id, API_URL]);

    const salvaDatiSocietari = async () => {
        const stringaFinale = `${datiForm.ragioneSociale || user.nome} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}`;
        const payload = datiForm.rawText && datiForm.rawText.length > 5 ? datiForm.rawText : stringaFinale;
        try {
            await fetch(`${API_URL}/api/ristorante/dati-fiscali/${user.id}`, {
                method: 'PUT', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ dati_fiscali: payload })
            });
            alert("✅ Dati Societari Aggiornati!");
        } catch(e) { alert("Errore salvataggio"); }
    };

    if(loading) return <div className="p-10 text-center">🔄 Caricamento dashboard...</div>;
    if(!stats) return <div className="p-10 text-center text-red-500">❌ Errore dati.</div>;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    // Stili CSS inline per simulare Tailwind/Bootstrap
    const styles = {
        container: { padding: '30px', background: '#f3f4f6', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
        header: { marginBottom: '30px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' },
        title: { fontSize: '28px', fontWeight: '800', color: '#1f2937', margin: 0 },
        subtitle: { color: '#6b7280', marginTop: '5px' },
        gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' },
        cardStat: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', justifyContent:'center' },
        statVal: { fontSize: '32px', fontWeight: 'bold', color: '#111827', margin: '5px 0' },
        statLabel: { fontSize: '14px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
        sectionTitle: { fontSize: '18px', fontWeight: 'bold', color: '#374151', marginBottom: '15px' },
        gridCharts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' },
        card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        inputGroup: { marginBottom: '15px' },
        label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '5px' },
        input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', transition: 'border 0.2s' },
        btnSave: { background: '#4f46e5', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Dashboard Amministrativa</h1>
                <p style={styles.subtitle}>Benvenuto, {user.nome}. Ecco la panoramica del tuo locale.</p>
            </div>

            {/* 1. KEY METRICS CARDS */}
            <div style={styles.gridStats}>
                <div style={styles.cardStat}>
                    <span style={styles.statLabel}>Incasso Oggi</span>
                    <h3 style={styles.statVal}>€ {Number(stats.incassi.oggi || 0).toFixed(2)}</h3>
                    <span style={{fontSize:12, color: stats.incassi.oggi >= stats.incassi.ieri ? '#10b981' : '#ef4444'}}>
                        {stats.incassi.oggi >= stats.incassi.ieri ? '▲' : '▼'} Rispetto a ieri
                    </span>
                </div>
                <div style={styles.cardStat}>
                    <span style={styles.statLabel}>Incasso Ieri</span>
                    <h3 style={styles.statVal}>€ {Number(stats.incassi.ieri || 0).toFixed(2)}</h3>
                </div>
                <div style={styles.cardStat}>
                    <span style={styles.statLabel}>Ordini Totali (Mese)</span>
                    <h3 style={styles.statVal}>{stats.chartData.reduce((acc, curr) => acc + curr.ordini, 0)}</h3>
                </div>
                <div style={styles.cardStat}>
                    <span style={styles.statLabel}>Stato Servizio</span>
                    <div style={{display:'flex', alignItems:'center', gap:10, marginTop:5}}>
                        <div style={{width:10, height:10, borderRadius:'50%', background:'#10b981'}}></div>
                        <span style={{fontWeight:'bold', color:'#374151'}}>Online</span>
                    </div>
                </div>
            </div>

            {/* 2. CHARTS SECTION */}
            <div style={styles.gridCharts}>
                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>🕒 Affluenza Oraria (Oggi)</h3>
                    <div style={{ width: '100%', height: 300 }}> 
                        <ResponsiveContainer>
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorOrdini" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" />
                                <YAxis fontSize={12} stroke="#9ca3af"/>
                                <Tooltip contentStyle={{borderRadius:8, border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <Area type="monotone" dataKey="ordini" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrdini)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.sectionTitle}>🏆 Top 5 Piatti Venduti</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={stats.topDishes} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {stats.topDishes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{fontSize:14, fontWeight:'bold', fill:'#374151'}}>
                                    TOP 5
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginTop:10}}>
                             {stats.topDishes.map((entry, index) => (
                                 <div key={index} style={{display:'flex', alignItems:'center', fontSize:11}}>
                                     <div style={{width:8, height:8, background:COLORS[index % COLORS.length], borderRadius:'50%', marginRight:5}}></div>
                                     {entry.name}
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. SETTINGS SECTION (Dati Fiscali) */}
            <div style={styles.card}>
                <h3 style={{...styles.sectionTitle, color:'#4f46e5', borderBottom:'2px solid #e0e7ff', paddingBottom:10}}>
                    📄 Intestazione Report & Dati Aziendali
                </h3>
                <p style={{fontSize:'14px', color:'#6b7280', marginBottom:20}}>
                    Compila questi campi per personalizzare l'intestazione dei file Excel/PDF (HACCP, Ordini).
                </p>
                
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px'}}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Ragione Sociale</label>
                        <input style={styles.input} value={datiForm.ragioneSociale} onChange={e => setDatiForm({...datiForm, ragioneSociale: e.target.value, rawText: ''})} placeholder={user.nome} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>P.IVA / C.F.</label>
                        <input style={styles.input} value={datiForm.piva} onChange={e => setDatiForm({...datiForm, piva: e.target.value, rawText: ''})} placeholder="IT00000000000" />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Indirizzo Completo</label>
                        <input style={styles.input} value={datiForm.indirizzo} onChange={e => setDatiForm({...datiForm, indirizzo: e.target.value, rawText: ''})} placeholder="Via Roma 1, Milano" />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Telefono</label>
                        <input style={styles.input} value={datiForm.telefono} onChange={e => setDatiForm({...datiForm, telefono: e.target.value, rawText: ''})} placeholder="+39 02 123456" />
                    </div>
                </div>
                
                <div style={{marginTop:'10px'}}>
                    <label style={styles.label}>Anteprima stringa salvata (Modificabile manualmente se necessario):</label>
                    <textarea 
                        value={datiForm.rawText || (datiForm.ragioneSociale ? `${datiForm.ragioneSociale} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}` : '')}
                        onChange={e => setDatiForm({...datiForm, rawText: e.target.value})}
                        style={{...styles.input, minHeight:'60px', fontFamily:'monospace', background:'#f9fafb'}}
                    />
                </div>

                <div style={{marginTop:20, textAlign:'right'}}>
                    <button onClick={salvaDatiSocietari} style={styles.btnSave}>
                        💾 SALVA IMPOSTAZIONI
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;