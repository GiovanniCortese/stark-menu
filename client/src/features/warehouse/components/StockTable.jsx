// client/src/features/warehouse/components/StockTable.jsx

import { useState, useEffect } from 'react';

export default function StockTable({ API_URL, ristoranteId }) {
    const [stock, setStock] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingItem, setEditingItem] = useState(null); // Per modale modifica

    useEffect(() => {
        loadStock();
    }, [ristoranteId]);

    const loadStock = () => {
        fetch(`${API_URL}/api/magazzino/${ristoranteId}`)
            .then(r => r.json())
            .then(setStock)
            .catch(e => console.error(e));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if(!editingItem) return;

        try {
            await fetch(`${API_URL}/api/magazzino/${editingItem.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editingItem)
            });
            setEditingItem(null);
            loadStock();
        } catch(err) { alert("Errore aggiornamento"); }
    };

    const filtered = stock.filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{padding:20}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <input 
                    placeholder="🔍 Cerca prodotto..." 
                    value={searchTerm} 
                    onChange={e=>setSearchTerm(e.target.value)}
                    style={{padding:10, width:300, borderRadius:5, border:'1px solid #ddd'}}
                />
                <button onClick={loadStock} style={{background:'#34495e', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer'}}>Aggiorna</button>
            </div>

            <table style={{width:'100%', borderCollapse:'collapse', background:'white', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                <thead style={{background:'#8e44ad', color:'white'}}>
                    <tr>
                        <th style={{padding:15, textAlign:'left'}}>Prodotto</th>
                        <th style={{padding:15}}>Giacenza</th>
                        <th style={{padding:15}}>Unità</th>
                        <th style={{padding:15}}>Valore Unit.</th>
                        <th style={{padding:15}}>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(item => (
                        <tr key={item.id} style={{borderBottom:'1px solid #eee'}}>
                            <td style={{padding:15, fontWeight:'bold'}}>{item.nome}</td>
                            <td style={{padding:15, textAlign:'center', color: item.giacenza <= item.scorta_minima ? 'red' : 'black', fontWeight: item.giacenza <= item.scorta_minima ? 'bold' : 'normal'}}>
                                {parseFloat(item.giacenza).toFixed(2)}
                            </td>
                            <td style={{padding:15, textAlign:'center'}}>{item.unita_misura}</td>
                            <td style={{padding:15, textAlign:'center'}}>€ {parseFloat(item.prezzo_medio).toFixed(2)}</td>
                            <td style={{padding:15, textAlign:'center'}}>
                                <button onClick={()=>setEditingItem(item)} style={{background:'#f39c12', color:'white', border:'none', padding:'5px 10px', borderRadius:3, cursor:'pointer'}}>✏️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* MODALE EDIT RAPIDO */}
            {editingItem && (
                <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <form onSubmit={handleUpdate} style={{background:'white', padding:30, borderRadius:10, width:300}}>
                        <h3>Modifica {editingItem.nome}</h3>
                        <label>Giacenza Reale:</label>
                        <input type="number" step="0.01" value={editingItem.giacenza} onChange={e=>setEditingItem({...editingItem, giacenza:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                        
                        <label>Prezzo Acquisto (Netto):</label>
                        <input type="number" step="0.01" value={editingItem.prezzo_unitario_netto} onChange={e=>setEditingItem({...editingItem, prezzo_unitario_netto:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                        
                        <div style={{display:'flex', gap:10}}>
                            <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:10, cursor:'pointer'}}>SALVA</button>
                            <button type="button" onClick={()=>setEditingItem(null)} style={{flex:1, background:'#c0392b', color:'white', border:'none', padding:10, cursor:'pointer'}}>ANNULLA</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}