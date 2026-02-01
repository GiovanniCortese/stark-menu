// client/src/features/haccp/components/Temperature.jsx

import { useState, useEffect } from 'react';

export default function Temperature({ API_URL, ristoranteId }) {
    const [logs, setLogs] = useState([]);
    const [assets, setAssets] = useState([]);
    const [form, setForm] = useState({ asset_id: '', valore: '', operatore: '', note: '' });

    useEffect(() => {
        caricaDati();
    }, []);

    const caricaDati = () => {
        fetch(`${API_URL}/api/haccp/assets/${ristoranteId}`).then(r=>r.json()).then(setAssets);
        fetch(`${API_URL}/api/haccp/logs/${ristoranteId}`).then(r=>r.json()).then(setLogs);
    };

    const registra = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/api/haccp/logs`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...form, ristorante_id: ristoranteId })
        });
        if(res.ok) {
            alert("Registrato!");
            setForm({ asset_id: '', valore: '', operatore: '', note: '' });
            caricaDati();
        }
    };

    return (
        <div style={{padding:20}}>
            <h3>🌡️ Registro Temperature</h3>
            
            {/* FORM REGISTRAZIONE RAPIDA */}
            <form onSubmit={registra} style={{background:'#eafaf1', padding:20, borderRadius:10, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:20}}>
                <select required value={form.asset_id} onChange={e=>setForm({...form, asset_id:e.target.value})} style={{padding:10, minWidth:200}}>
                    <option value="">Seleziona Macchina...</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <input required type="number" step="0.1" placeholder="°C Rilevati" value={form.valore} onChange={e=>setForm({...form, valore:e.target.value})} style={{padding:10, width:100}} />
                <input required type="text" placeholder="Operatore" value={form.operatore} onChange={e=>setForm({...form, operatore:e.target.value})} style={{padding:10}} />
                <input type="text" placeholder="Note (es. Sbrinamento)" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} style={{padding:10, flex:1}} />
                <button style={{padding:10, background:'#27ae60', color:'white', border:'none', cursor:'pointer', fontWeight:'bold'}}>REGISTRA</button>
            </form>

            {/* TABELLA LOGS */}
            <div style={{background:'white', borderRadius:10, overflow:'hidden'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead style={{background:'#333', color:'white'}}>
                        <tr>
                            <th style={{padding:10}}>Data/Ora</th>
                            <th style={{padding:10}}>Macchina</th>
                            <th style={{padding:10}}>Valore</th>
                            <th style={{padding:10}}>Operatore</th>
                            <th style={{padding:10}}>Note</th>
                            <th style={{padding:10}}>Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(l => {
                            // Trova asset per capire se è allarme
                            const asset = assets.find(a => a.id === l.asset_id);
                            let status = '✅ OK';
                            let color = 'green';
                            if(asset) {
                                const val = parseFloat(l.valore);
                                const target = parseFloat(asset.temperatura_target);
                                const toll = parseFloat(asset.tolleranza);
                                if (val > target + toll || val < target - toll) {
                                    status = '🔥 ALLARME';
                                    color = 'red';
                                }
                            }

                            return (
                                <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:10}}>{new Date(l.data_ora).toLocaleString()}</td>
                                    <td style={{padding:10}}>{asset?.nome || '???'}</td>
                                    <td style={{padding:10, fontWeight:'bold'}}>{l.valore}°C</td>
                                    <td style={{padding:10}}>{l.operatore}</td>
                                    <td style={{padding:10}}>{l.note}</td>
                                    <td style={{padding:10, color:color, fontWeight:'bold'}}>{status}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}