// client/src/components_admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AdminDashboard({ user, API_URL }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/stats/dashboard/${user.id}`)
            .then(res => res.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, [user.id]);

    if(loading) return <div style={{padding:20}}>🔄 Calcolo statistiche in corso...</div>;
    if(!stats) return <div style={{padding:20}}>❌ Errore caricamento dati.</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{paddingBottom:50}}>
            <h2 style={{color:'#2c3e50'}}>📈 Dashboard {user.nome}</h2>

            {/* 1. CARDS INCASSO */}
            <div style={{display:'flex', gap:'20px', marginBottom:'30px', flexWrap:'wrap'}}>
                <div className="card" style={{flex:1, textAlign:'center', background:'#27ae60', color:'white', border:'none'}}>
                    <h3 style={{margin:0}}>€ {Number(stats.incassi.oggi).toFixed(2)}</h3>
                    <p style={{margin:0, opacity:0.8}}>Incasso Oggi</p>
                </div>
                <div className="card" style={{flex:1, textAlign:'center', background:'#7f8c8d', color:'white', border:'none'}}>
                    <h3 style={{margin:0}}>€ {Number(stats.incassi.ieri).toFixed(2)}</h3>
                    <p style={{margin:0, opacity:0.8}}>Incasso Ieri</p>
                </div>
                <div className="card" style={{flex:1, textAlign:'center', background: Number(stats.incassi.oggi) >= Number(stats.incassi.ieri) ? '#2ecc71' : '#e74c3c', color:'white', border:'none'}}>
                    <h3 style={{margin:0}}>
                        {Number(stats.incassi.ieri) > 0 
                            ? (((stats.incassi.oggi - stats.incassi.ieri) / stats.incassi.ieri) * 100).toFixed(1) 
                            : '0'}%
                    </h3>
                    <p style={{margin:0, opacity:0.8}}>Trend</p>
                </div>
            </div>

            <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                {/* 2. GRAFICO ORARI DI PUNTA */}
                <div className="card" style={{flex:2, minWidth:'300px', height:'350px'}}>
                    <h3 style={{color:'#333'}}>🕒 Affluenza Oraria (Oggi)</h3>
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

                {/* 3. TOP 5 PIATTI */}
                <div className="card" style={{flex:1, minWidth:'300px', height:'350px'}}>
                    <h3 style={{color:'#333'}}>🏆 Top 5 Piatti</h3>
                    {stats.topDishes.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.topDishes}
                                    cx="50%" cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {stats.topDishes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{textAlign:'center', color:'#999', marginTop:100}}>Nessun dato sufficiente.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;