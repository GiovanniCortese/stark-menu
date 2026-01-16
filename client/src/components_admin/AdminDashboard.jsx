// client/src/components_admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AdminDashboard({ user, API_URL }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Stato per Dati Societari
    const [datiForm, setDatiForm] = useState({
        ragioneSociale: '',
        piva: '',
        indirizzo: '',
        telefono: ''
    });

    useEffect(() => {
        // Carica Statistiche
        fetch(`${API_URL}/api/stats/dashboard/${user.id}`)
            .then(res => res.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });

        // Carica Configurazione Attuale (Dati Fiscali)
        fetch(`${API_URL}/api/ristorante/config/${user.id}`)
            .then(r => r.json())
            .then(d => {
                // Se esiste già una stringa dati_fiscali, proviamo a pre-compilare (in modo semplice)
                // oppure lasciamo l'input libero se è un testo complesso.
                // Qui mostriamo il testo attuale se presente.
                if (d.dati_fiscali) {
                   // Per semplicità, se è un testo unico, lo mettiamo nel primo campo o lo gestiamo come raw text
                   // Qui permettiamo di sovrascrivere.
                   setDatiForm(prev => ({...prev, rawText: d.dati_fiscali})); 
                }
            });
    }, [user.id, API_URL]);

    const salvaDatiSocietari = async () => {
        // Concateniamo i dati per formare la stringa da salvare nel DB
        // Se l'utente ha modificato i campi singoli, usiamo quelli.
        const stringaFinale = `${datiForm.ragioneSociale || user.nome} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}`;
        
        // Se l'utente preferisce un testo libero, usiamo quello (gestione ibrida)
        const payload = datiForm.rawText && datiForm.rawText.length > 5 ? datiForm.rawText : stringaFinale;

        try {
            await fetch(`${API_URL}/api/ristorante/dati-fiscali/${user.id}`, {
                method: 'PUT', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ dati_fiscali: payload })
            });
            alert("✅ Dati Societari Aggiornati per i Report Excel");
        } catch(e) { alert("Errore salvataggio"); }
    };

    if(loading) return <div style={{padding:20}}>🔄 Calcolo statistiche in corso...</div>;
    if(!stats) return <div style={{padding:20}}>❌ Errore caricamento dati.</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{paddingBottom:50}}>
            <h2 style={{color:'#2c3e50'}}>📈 Dashboard {user.nome}</h2>

            {/* --- SEZIONE CONFIGURAZIONE REPORT EXCEL (NUOVA) --- */}
            <div className="card" style={{background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', marginBottom:'30px', borderLeft:'5px solid #8e44ad'}}>
                <h3 style={{marginTop:0, color:'#8e44ad'}}>📄 Intestazione Report & Dati Societari</h3>
                <p style={{fontSize:'14px', color:'#666'}}>Questi dati appariranno nell'intestazione dei file Excel (HACCP, Ordini, ecc).</p>
                
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px', marginTop:'15px'}}>
                    <div>
                        <label style={{fontWeight:'bold', fontSize:'12px'}}>Ragione Sociale</label>
                        <input 
                            value={datiForm.ragioneSociale} 
                            onChange={e => setDatiForm({...datiForm, ragioneSociale: e.target.value, rawText: ''})} 
                            placeholder={user.nome}
                            style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'5px'}} 
                        />
                    </div>
                    <div>
                        <label style={{fontWeight:'bold', fontSize:'12px'}}>P.IVA / C.F.</label>
                        <input 
                            value={datiForm.piva} 
                            onChange={e => setDatiForm({...datiForm, piva: e.target.value, rawText: ''})} 
                            placeholder="es. 12345678901"
                            style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'5px'}} 
                        />
                    </div>
                    <div>
                        <label style={{fontWeight:'bold', fontSize:'12px'}}>Indirizzo Completo</label>
                        <input 
                            value={datiForm.indirizzo} 
                            onChange={e => setDatiForm({...datiForm, indirizzo: e.target.value, rawText: ''})} 
                            placeholder="Via Roma 1, Milano"
                            style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'5px'}} 
                        />
                    </div>
                    <div>
                        <label style={{fontWeight:'bold', fontSize:'12px'}}>Telefono / Info</label>
                        <input 
                            value={datiForm.telefono} 
                            onChange={e => setDatiForm({...datiForm, telefono: e.target.value, rawText: ''})} 
                            placeholder="02 1234567"
                            style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'5px'}} 
                        />
                    </div>
                </div>
                
                {/* Visualizzazione Anteprima o Campo Libero se già esistente */}
                <div style={{marginTop:'15px'}}>
                    <label style={{fontWeight:'bold', fontSize:'12px'}}>Anteprima stringa salvata (modificabile manualmente):</label>
                    <textarea 
                        value={datiForm.rawText || (datiForm.ragioneSociale ? `${datiForm.ragioneSociale} - P.IVA: ${datiForm.piva} - ${datiForm.indirizzo} - Tel: ${datiForm.telefono}` : '')}
                        onChange={e => setDatiForm({...datiForm, rawText: e.target.value})}
                        style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'5px', minHeight:'60px', fontFamily:'monospace'}}
                    />
                </div>

                <button onClick={salvaDatiSocietari} style={{marginTop:'15px', background:'#8e44ad', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                    💾 SALVA INTESTAZIONE
                </button>
            </div>

            {/* ... IL RESTO DELLA DASHBOARD RIMANE INVARIATO (CARDS INCASSO, GRAFICI ECC) ... */}
            <div style={{display:'flex', gap:'20px', marginBottom:'30px', flexWrap:'wrap'}}>
                {/* ... codice esistente dei grafici ... */}
                 <div className="card" style={{flex:1, textAlign:'center', background:'#27ae60', color:'white', border:'none', minWidth:'200px'}}>
                    <h3 style={{margin:0}}>€ {Number(stats.incassi.oggi).toFixed(2)}</h3>
                    <p style={{margin:0, opacity:0.8}}>Incasso Oggi</p>
                </div>
                {/* ... eccetera ... */}
            </div>
            
            <div style={{display:'flex', gap:'20px', flexWrap:'wrap', alignItems: 'stretch'}}>
                <div className="card" style={{flex:2, minWidth:'300px', display: 'flex', flexDirection: 'column'}}>
                     <h3 style={{color:'#333', marginBottom: '20px'}}>🕒 Affluenza Oraria (Oggi)</h3>
                     <div style={{ width: '100%', height: 300, minHeight: 300 }}> 
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip contentStyle={{color:'black'}} />
                                <Bar dataKey="ordini" fill="#3498db" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="card" style={{flex:1, minWidth:'300px', display: 'flex', flexDirection: 'column'}}>
                    <h3 style={{color:'#333', marginBottom: '20px'}}>🏆 Top 5 Piatti</h3>
                    <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.topDishes} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {stats.topDishes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;