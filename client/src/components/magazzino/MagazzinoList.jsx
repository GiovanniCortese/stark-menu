import React, { useState } from 'react';

const MagazzinoList = ({ storico, ricaricaDati, API_URL, avviaModifica }) => {
    const [filtro, setFiltro] = useState("");
    const [editGiacenzaId, setEditGiacenzaId] = useState(null);
    const [tempGiacenza, setTempGiacenza] = useState("");

    // Filtro ricerca
    const datiFiltrati = Array.isArray(storico) ? storico.filter(r => 
        r.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        (r.marca && r.marca.toLowerCase().includes(filtro.toLowerCase()))
    ) : [];

    // Calcolo Totali Magazzino
    const totaleValore = datiFiltrati.reduce((acc, curr) => {
        const qta = parseFloat(curr.giacenza) || 0;
        const prezzo = parseFloat(curr.prezzo_medio) || 0;
        return acc + (qta * prezzo);
    }, 0);

    // Funzione Modifica Rapida Giacenza (Inventario)
    const salvaNuovaGiacenza = async (id) => {
        try {
            await fetch(`${API_URL}/api/magazzino/update-qta/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ giacenza: tempGiacenza })
            });
            setEditGiacenzaId(null);
            ricaricaDati();
        } catch(e) { alert("Errore aggiornamento"); }
    };

    const eliminaProdotto = async (id) => {
        if(!window.confirm("Eliminare definitivamente dal magazzino?")) return;
        await fetch(`${API_URL}/api/magazzino/prodotto/${id}`, {method:'DELETE'});
        ricaricaDati();
    };

    return (
        <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
            
            {/* BARRA SUPERIORE */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10}}>
                <div style={{position:'relative', width:'100%', maxWidth:'300px'}}>
                    <span style={{position:'absolute', left:10, top:10}}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Cerca prodotto..." 
                        value={filtro}
                        onChange={(e)=>setFiltro(e.target.value)}
                        style={{width:'100%', padding:'10px 10px 10px 35px', borderRadius:20, border:'1px solid #ddd', outline:'none'}}
                    />
                </div>
                <div style={{background:'#e8f8f5', padding:'10px 20px', borderRadius:10, color:'#27ae60', fontWeight:'bold', border:'1px solid #2ecc71'}}>
                    💎 Valore Magazzino: € {totaleValore.toFixed(2)}
                </div>
            </div>

            {/* TABELLA PRODOTTI */}
            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', minWidth:600}}>
                    <thead>
                        <tr style={{background:'#f8f9fa', color:'#7f8c8d', fontSize:12, textTransform:'uppercase'}}>
                            <th style={{padding:15, textAlign:'left'}}>Prodotto</th>
                            <th style={{padding:15, textAlign:'center'}}>Giacenza</th>
                            <th style={{padding:15, textAlign:'right'}}>Prezzo Medio</th>
                            <th style={{padding:15, textAlign:'right'}}>Valore Tot.</th>
                            <th style={{padding:15, textAlign:'right'}}>Ultimo Agg.</th>
                            <th style={{padding:15, textAlign:'center'}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datiFiltrati.map(p => {
                            const giacenza = parseFloat(p.giacenza).toFixed(2);
                            const scorta = parseFloat(p.scorta_minima) || 0;
                            const isLowStock = parseFloat(p.giacenza) <= scorta;
                            const prezzoMedio = parseFloat(p.prezzo_medio) || 0;
                            const valoreTot = (parseFloat(p.giacenza) * prezzoMedio);

                            return (
                                <tr key={p.id} style={{borderBottom:'1px solid #eee', background: isLowStock ? '#fff5f5' : 'white'}}>
                                    <td style={{padding:15}}>
                                        <div style={{fontWeight:'bold', color:'#2c3e50', fontSize:15}}>{p.nome}</div>
                                        <div style={{fontSize:11, color:'#95a5a6'}}>{p.marca} • {p.categoria}</div>
                                        {isLowStock && <span style={{fontSize:10, background:'#c0392b', color:'white', padding:'2px 6px', borderRadius:4}}>⚠️ SCORTA BASSA</span>}
                                    </td>
                                    
                                    <td style={{padding:15, textAlign:'center'}}>
                                        {editGiacenzaId === p.id ? (
                                            <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:5}}>
                                                <input 
                                                    type="number" 
                                                    value={tempGiacenza} 
                                                    onChange={e=>setTempGiacenza(e.target.value)}
                                                    style={{width:60, padding:5, borderRadius:5, border:'1px solid #3498db'}}
                                                />
                                                <button onClick={()=>salvaNuovaGiacenza(p.id)} style={{background:'#27ae60', color:'white', border:'none', borderRadius:3, cursor:'pointer'}}>OK</button>
                                            </div>
                                        ) : (
                                            <div onClick={() => { setEditGiacenzaId(p.id); setTempGiacenza(p.giacenza); }} style={{cursor:'pointer', fontWeight:'bold', fontSize:16, color: isLowStock ? '#c0392b' : '#2c3e50', borderBottom:'1px dashed #ccc', display:'inline-block'}}>
                                                {giacenza} <span style={{fontSize:11, fontWeight:'normal'}}>{p.unita_misura}</span>
                                            </div>
                                        )}
                                    </td>

                                    <td style={{padding:15, textAlign:'right'}}>€ {prezzoMedio.toFixed(2)}</td>
                                    <td style={{padding:15, textAlign:'right', fontWeight:'bold', color:'#2980b9'}}>€ {valoreTot.toFixed(2)}</td>
                                    
                                    <td style={{padding:15, textAlign:'right', fontSize:12, color:'#7f8c8d'}}>
                                        {/* QUI L'ORA SARÀ CORRETTA PERCHÉ ARRIVA GIÀ FORMATTATA DAL DB */}
                                        {p.ultima_modifica_it || "-"}
                                    </td>

                                    <td style={{padding:15, textAlign:'center'}}>
                                        <button onClick={()=>eliminaProdotto(p.id)} style={{border:'none', background:'transparent', cursor:'pointer', fontSize:18}} title="Elimina">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {datiFiltrati.length === 0 && (
                    <div style={{padding:40, textAlign:'center', color:'#aaa'}}>
                        📭 Nessun prodotto in magazzino. Fai uno scan!
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagazzinoList;