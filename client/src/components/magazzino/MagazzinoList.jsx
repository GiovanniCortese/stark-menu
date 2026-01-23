import React, { useState } from 'react';

const MagazzinoList = ({ storico, ricaricaDati, API_URL }) => {
    const [filtro, setFiltro] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'asc' });
    const [editRow, setEditRow] = useState(null); // Riga in modifica

    // --- FUNZIONE ORDINAMENTO ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...storico].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Gestione Numeri
        if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else {
            // Gestione Stringhe (case insensitive)
            valA = valA ? valA.toString().toLowerCase() : '';
            valB = valB ? valB.toString().toLowerCase() : '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const datiFiltrati = sortedData.filter(r => 
        r.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        (r.marca && r.marca.toLowerCase().includes(filtro.toLowerCase())) ||
        (r.lotto && r.lotto.toLowerCase().includes(filtro.toLowerCase()))
    );

    // --- SALVATAGGIO MODIFICHE ---
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/api/magazzino/update-full/${editRow.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(editRow)
            });
            setEditRow(null);
            ricaricaDati();
        } catch(err) { alert("Errore salvataggio"); }
    };

    const Th = ({ label, sortKey, width }) => (
        <th 
            onClick={() => handleSort(sortKey)} 
            style={{
                padding:12, cursor:'pointer', userSelect:'none', 
                background: sortConfig.key === sortKey ? '#ecf0f1' : 'transparent',
                minWidth: width || 'auto'
            }}
        >
            {label} {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : ''}
        </th>
    );

    return (
        <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
            
            {/* SEARCH BAR */}
            <div style={{marginBottom:20}}>
                <input 
                    type="text" 
                    placeholder="🔍 Cerca per nome, marca, lotto..." 
                    value={filtro}
                    onChange={(e)=>setFiltro(e.target.value)}
                    style={{width:'100%', padding:'12px', borderRadius:8, border:'1px solid #ddd', fontSize:14}}
                />
            </div>

            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:1000}}>
                    <thead>
                        <tr style={{background:'#2c3e50', color:'white', textAlign:'left'}}>
                            <Th label="DATA BOLLA" sortKey="data_bolla_iso" />
                            <Th label="PRODOTTO" sortKey="nome" />
                            <Th label="FORNITORE" sortKey="marca" />
                            <Th label="LOTTO" sortKey="lotto" />
                            <Th label="QTA" sortKey="giacenza" />
                            <Th label="UNITÀ" sortKey="tipo_unita" />
                            <Th label="€ NETTO (Unit)" sortKey="prezzo_unitario_netto" />
                            <Th label="IVA %" sortKey="aliquota_iva" />
                            <Th label="€ TOT NETTO" sortKey="valore_totale_netto" />
                            <Th label="€ TOT IVA" sortKey="valore_totale_iva" />
                            <Th label="€ TOT LORDO" sortKey="valore_totale_lordo" />
                            <th style={{padding:12}}>AZIONI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datiFiltrati.map(p => (
                            <tr key={p.id} style={{borderBottom:'1px solid #eee', hover: {background:'#f9f9f9'}}}>
                                <td style={{padding:10}}>{p.data_bolla_iso || '-'}</td>
                                <td style={{padding:10, fontWeight:'bold'}}>{p.nome}</td>
                                <td style={{padding:10}}>{p.marca}</td>
                                <td style={{padding:10}}>{p.lotto}</td>
                                <td style={{padding:10, fontWeight:'bold', color:'#2980b9'}}>{Number(p.giacenza).toFixed(2)}</td>
                                <td style={{padding:10}}>{p.tipo_unita}</td>
                                <td style={{padding:10}}>€ {Number(p.prezzo_unitario_netto).toFixed(3)}</td>
                                <td style={{padding:10}}>{p.aliquota_iva}%</td>
                                <td style={{padding:10}}>€ {Number(p.valore_totale_netto).toFixed(2)}</td>
                                <td style={{padding:10, color:'#7f8c8d'}}>€ {Number(p.valore_totale_iva).toFixed(2)}</td>
                                <td style={{padding:10, fontWeight:'bold', color:'#27ae60'}}>€ {Number(p.valore_totale_lordo).toFixed(2)}</td>
                                <td style={{padding:10}}>
                                    <button onClick={()=>setEditRow(p)} style={{border:'none', background:'transparent', cursor:'pointer'}}>✏️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALE DI MODIFICA RAPIDA */}
            {editRow && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
                    <div style={{background:'white', padding:30, borderRadius:15, width:500, maxWidth:'90%'}}>
                        <h3>✏️ Modifica: {editRow.nome}</h3>
                        <form onSubmit={handleSave} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                            
                            <div><label>Data Bolla</label><input type="date" value={editRow.data_bolla ? editRow.data_bolla.split('T')[0] : ''} onChange={e=>setEditRow({...editRow, data_bolla: e.target.value})} style={{width:'100%', padding:8}} /></div>
                            <div><label>Fornitore</label><input value={editRow.marca || ''} onChange={e=>setEditRow({...editRow, marca: e.target.value})} style={{width:'100%', padding:8}} /></div>
                            
                            <div><label>Lotto</label><input value={editRow.lotto || ''} onChange={e=>setEditRow({...editRow, lotto: e.target.value})} style={{width:'100%', padding:8}} /></div>
                            <div>
                                <label>Tipo Unità</label>
                                <select value={editRow.tipo_unita} onChange={e=>setEditRow({...editRow, tipo_unita: e.target.value})} style={{width:'100%', padding:8}}>
                                    <option value="Pz">Pezzi (Pz)</option>
                                    <option value="Kg">Chilogrammi (Kg)</option>
                                    <option value="Colli">Colli / Pacchi</option>
                                    <option value="Lt">Litri (Lt)</option>
                                </select>
                            </div>

                            <div><label>Quantità</label><input type="number" step="0.01" value={editRow.giacenza} onChange={e=>setEditRow({...editRow, giacenza: e.target.value})} style={{width:'100%', padding:8}} /></div>
                            <div><label>Prezzo Netto Unitario</label><input type="number" step="0.001" value={editRow.prezzo_unitario_netto} onChange={e=>setEditRow({...editRow, prezzo_unitario_netto: e.target.value})} style={{width:'100%', padding:8}} /></div>
                            
                            <div>
                                <label>IVA %</label>
                                <select value={editRow.aliquota_iva} onChange={e=>setEditRow({...editRow, aliquota_iva: e.target.value})} style={{width:'100%', padding:8}}>
                                    <option value="4">4%</option>
                                    <option value="10">10%</option>
                                    <option value="22">22%</option>
                                    <option value="0">0%</option>
                                </select>
                            </div>

                            <div style={{gridColumn:'span 2', marginTop:10, display:'flex', gap:10}}>
                                <button type="button" onClick={()=>setEditRow(null)} style={{flex:1, padding:10, background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Annulla</button>
                                <button type="submit" style={{flex:1, padding:10, background:'#27ae60', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>SALVA MODIFICHE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MagazzinoList;