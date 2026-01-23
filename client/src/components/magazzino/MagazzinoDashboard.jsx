import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const MagazzinoDashboard = ({ stats }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
            <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <h3>💰 Spesa per Fornitore</h3>
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
            {/* Qui puoi aggiungere altri grafici se vuoi in futuro */}
        </div>
    );
};

export default MagazzinoDashboard;