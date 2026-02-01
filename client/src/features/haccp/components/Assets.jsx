// client/src/features/haccp/components/Assets.jsx
import { useState, useEffect } from 'react';

export default function Assets({ API_URL, ristoranteId }) {
    const [assets, setAssets] = useState([]);
    const [form, setForm] = useState({ nome: '', tipo: 'frigo', temperatura_target: 4, tolleranza: 2 });

    useEffect(() => {
        caricaAssets();
    }, []);

    const caricaAssets = () => {
        fetch(`${API_URL}/api/haccp/assets/${ristoranteId}`)
            .then(r => r.json())
            .then(setAssets);
    };

    const salva = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/api/haccp/assets`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...form, ristorante_id: ristoranteId })
        });
        setForm({ nome: '', tipo: 'frigo', temperatura_target: 4, tolleranza: 2 });
        caricaAssets();
    };

    const elimina = async (id) => {
        if(!confirm("Eliminare macchina?")) return;
        await fetch(`${API_URL}/api/haccp/assets/${id}`, { method: 'DELETE' });
        caricaAssets();
    };

    return (
        <div style={{padding:20}}>
            <h3>⚙️ Gestione Macchinari (Frighi/Freezer)</h3>
            <div style={{display:'flex', gap:20}}>
                <form onSubmit={salva} style={{background:'white', padding:20, borderRadius:10, width:300}}>
                    <input placeholder="Nome (es. Frigo Bibite)" value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})} required style={{width:'100%', padding:8, marginBottom:10}} />
                    <select value={form.tipo} onChange={e=>setForm({...form, tipo:e.target.value})} style={{width:'100%', padding:8, marginBottom:10}}>
                        <option value="frigo">Frigorifero (+4°C)</option>
                        <option value="freezer">Congelatore (-18°C)</option>
                        <option value="vetrina">Vetrina</option>
                        <option value="altro">Altro</option>
                    </select>
                    <div style={{display:'flex', gap:5}}>
                        <input type="number" placeholder="Target °C" value={form.temperatura_target} onChange={e=>setForm({...form, temperatura_target:e.target.value})} style={{flex:1, padding:8}} />
                        <input type="number" placeholder="+/- Toll." value={form.tolleranza} onChange={e=>setForm({...form, tolleranza:e.target.value})} style={{flex:1, padding:8}} />
                    </div>
                    <button style={{width:'100%', marginTop:10, padding:10, background:'#27ae60', color:'white', border:'none', cursor:'pointer'}}>AGGIUNGI</button>
                </form>

                <div style={{flex:1, display:'flex', flexWrap:'wrap', gap:10}}>
                    {assets.map(a => (
                        <div key={a.id} style={{background:'white', padding:15, borderRadius:8, width:200, borderLeft:`5px solid ${a.tipo === 'freezer' ? '#3498db' : '#2ecc71'}`}}>
                            <strong>{a.nome}</strong>
                            <div style={{fontSize:12, color:'#666'}}>{a.tipo.toUpperCase()}</div>
                            <div style={{fontSize:14}}>Target: {a.temperatura_target}°C (±{a.tolleranza})</div>
                            <button onClick={()=>elimina(a.id)} style={{marginTop:5, background:'#c0392b', color:'white', border:'none', padding:'2px 8px', fontSize:10, cursor:'pointer'}}>ELIMINA</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}