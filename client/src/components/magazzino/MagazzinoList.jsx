import React, { useState, useEffect } from 'react';

const MagazzinoList = ({ storico, ricaricaDati, API_URL, onEdit, filtroDataEsterno, resetFiltroEsterno, onBulkEdit, handleFileAction }) => {
    const [filtro, setFiltro] = useState("");
    const [selectedIds, setSelectedIds] = useState([]); 
    const [sortConfig, setSortConfig] = useState({ key: 'data_ricezione', direction: 'desc' });

    useEffect(() => {
        if (filtroDataEsterno) {
            setFiltro(filtroDataEsterno);
        }
    }, [filtroDataEsterno]);

    const enrichData = (item) => {
        const qta = parseFloat(item.quantita) || 0;
        const unitNetto = parseFloat(item.prezzo_unitario) || 0;
        const ivaPerc = parseFloat(item.iva) || 0;
        const sc = parseFloat(item.sconto) || 0;
        
        const prezzoScontato = unitNetto * (1 - sc/100);
        const totNetto = item.totale_netto ? parseFloat(item.totale_netto) : (qta * prezzoScontato);
        const totIva = item.totale_iva ? parseFloat(item.totale_iva) : (totNetto * (ivaPerc / 100));
        const totLordo = item.totale_lordo ? parseFloat(item.totale_lordo) : (totNetto + totIva);

        return {
            ...item,
            _totNetto: totNetto,
            _totIva: totIva,
            _totLordo: totLordo
        };
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedData = [...storico].map(enrichData).sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const datiFiltrati = sortedData.filter(item => 
        item.prodotto?.toLowerCase().includes(filtro.toLowerCase()) ||
        item.fornitore?.toLowerCase().includes(filtro.toLowerCase()) ||
        item.riferimento_documento?.toLowerCase().includes(filtro.toLowerCase()) ||
        item.codice_articolo?.toLowerCase().includes(filtro.toLowerCase()) ||
        (item.data_documento && item.data_documento.includes(filtro)) ||
        (item.data_ricezione && item.data_ricezione.includes(filtro))
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(datiFiltrati.map(i => i.id));
        else setSelectedIds([]);
    };

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    // --- NUOVA LOGICA MODIFICA MASSIVA ---
    const handleBulkEditClick = () => {
        if (selectedIds.length === 0) return;
        const rowsToEdit = sortedData.filter(row => selectedIds.includes(row.id));
        if (onBulkEdit) {
            onBulkEdit(rowsToEdit); 
        }
    };

    const handleDeleteSingle = async (id) => {
        if (!window.confirm("Eliminare questa riga?")) return;
        try {
            await fetch(`${API_URL}/api/haccp/merci/${id}`, { method: 'DELETE' });
            ricaricaDati();
        } catch (e) { alert("Errore cancellazione"); }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Eliminare definitivamente ${selectedIds.length} elementi selezionati?`)) return;
        try {
            await fetch(`${API_URL}/api/magazzino/delete-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            setSelectedIds([]);
            ricaricaDati();
        } catch (e) { alert("Errore cancellazione multipla"); }
    };

    const clearFilter = () => {
        setFiltro("");
        if(resetFiltroEsterno) resetFiltroEsterno();
    };

    const thStyle = { padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd', background: '#f8f9fa', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer' };
    const tdStyle = { padding: '10px 8px', borderBottom: '1px solid #eee', fontSize: '13px', verticalAlign: 'middle' };

    return (
        <div style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div style={{position:'relative', display:'flex', alignItems:'center'}}>
                    <input 
                        type="text" 
                        placeholder="🔍 Cerca prodotto, data, fornitore..." 
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        style={{ padding: '10px', width: '350px', borderRadius: 5, border: '1px solid #ccc', paddingRight: 30 }}
                    />
                    {filtro && (
                        <button onClick={clearFilter} style={{position:'absolute', right:5, background:'transparent', border:'none', cursor:'pointer', color:'#999', fontSize:16}}>✕</button>
                    )}
                </div>
                
                {/* BOTTONI AZIONI DI MASSA */}
                <div style={{display:'flex', gap:10}}>
                    {selectedIds.length > 0 && (
                        <>
                            <button 
                                onClick={handleBulkEditClick}
                                style={{ background: '#f1c40f', color: '#2c3e50', border: 'none', padding: '10px 20px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', display:'flex', alignItems:'center', gap:5 }}
                            >
                                ✏️ MODIFICA ({selectedIds.length})
                            </button>

                            <button 
                                onClick={handleDeleteSelected}
                                style={{ background: '#c0392b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                🗑️ ELIMINA ({selectedIds.length})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1700px' }}>
                    <thead>
                        <tr>
                            <th style={{...thStyle, width: 40}}>
                                <input type="checkbox" onChange={handleSelectAll} checked={datiFiltrati.length > 0 && selectedIds.length === datiFiltrati.length} />
                            </th>
                            <th style={thStyle} onClick={() => handleSort('data_documento')}>📅 Data Doc.</th>
                            <th style={thStyle} onClick={() => handleSort('riferimento_documento')}>📄 Rif. Doc</th>
                            <th style={thStyle} onClick={() => handleSort('fornitore')}>🚚 Fornitore</th>
                            <th style={thStyle} onClick={() => handleSort('codice_articolo')}>🔢 Cod.</th>
                            <th style={thStyle} onClick={() => handleSort('prodotto')}>📦 Prodotto</th>
                            <th style={thStyle} onClick={() => handleSort('lotto')}>🔢 Lotto</th>
                            <th style={thStyle} onClick={() => handleSort('scadenza')}>⏳ Scadenza</th>
                            <th style={thStyle}>Qta</th>
                            <th style={thStyle}>Unità</th>
                            <th style={thStyle}>€ Netto (Unit)</th>
                            <th style={thStyle}>✂️ Sc.%</th>
                            <th style={thStyle}>IVA %</th>
                            <th style={thStyle}>Tot. Netto</th>
                            <th style={thStyle}>Tot. IVA</th>
                            <th style={thStyle}>Tot. Lordo</th>
                            <th style={thStyle}>📎 All.</th>
                            <th style={thStyle}>🕒 Ins. (IT)</th> 
                            <th style={{...thStyle, textAlign:'center'}}>🛠️ Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datiFiltrati.map(row => (
                            <tr key={row.id} style={{ background: selectedIds.includes(row.id) ? '#fff3cd' : 'white' }}>
                                <td style={tdStyle}>
                                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => handleSelectRow(row.id)} />
                                </td>
                                
                                <td style={tdStyle}>
                                    {row.data_documento ? new Date(row.data_documento).toLocaleDateString('it-IT') : '-'}
                                </td>
                                
                                <td style={tdStyle}>
                                    <span style={{fontWeight:'bold', color:'#2980b9'}}>{row.riferimento_documento || row.lotto || '-'}</span>
                                </td>
                                <td style={tdStyle}>
                                    <div><strong>{row.fornitore}</strong></div>
                                </td>
                                <td style={{...tdStyle, fontSize:11, color:'#666', fontFamily:'monospace'}}>
                                    {row.codice_articolo || '-'}
                                </td>
                                <td style={tdStyle}><strong>{row.prodotto}</strong></td>
                                <td style={tdStyle}><span style={{background:'#eee', padding:'2px 5px', borderRadius:3}}>{row.lotto || '-'}</span></td>
                                <td style={{...tdStyle, color: row.scadenza ? '#c0392b' : '#333'}}>
                                    {row.scadenza ? new Date(row.scadenza).toLocaleDateString() : '-'}
                                </td>
                                <td style={{...tdStyle, fontWeight:'bold', fontSize:14}}>{row.quantita}</td>
                                <td style={tdStyle}>{row.unita_misura || 'Pz'}</td>
                                <td style={tdStyle}>€ {Number(row.prezzo_unitario).toFixed(2)}</td>
                                <td style={{...tdStyle, color: row.sconto > 0 ? '#e74c3c' : '#ccc', fontWeight: row.sconto > 0 ? 'bold' : 'normal'}}>
                                    {row.sconto > 0 ? `-${Number(row.sconto).toFixed(0)}%` : '-'}
                                </td>
                                <td style={tdStyle}>{row.iva}%</td>
                                <td style={tdStyle}>€ {row._totNetto.toFixed(2)}</td>
                                <td style={{...tdStyle, color:'#7f8c8d'}}>€ {row._totIva.toFixed(2)}</td>
                                <td style={{...tdStyle, fontWeight:'bold', color:'#27ae60'}}>€ {row._totLordo.toFixed(2)}</td>
                                
                                {/* MODIFICA: Uso di handleFileAction per aprire il popup */}
                                <td style={tdStyle}>
                                    {row.allegato_url ? (
                                        <button 
                                            onClick={() => handleFileAction && handleFileAction(row.allegato_url, row.riferimento_documento || 'documento')}
                                            style={{background:'transparent', border:'none', cursor:'pointer', fontSize:18}}
                                            title="Vedi Allegato"
                                        >
                                            📎
                                        </button>
                                    ) : <span style={{color:'#eee'}}>—</span>}
                                </td>
                                
                                {/* DATA INSERIMENTO (Fuso Orario IT) */}
                                <td style={{...tdStyle, fontSize:10, color:'#999'}}>
                                    {row.data_inserimento 
                                        ? new Date(row.data_inserimento).toLocaleString('it-IT', { 
                                            day: '2-digit', month: '2-digit', year: 'numeric', 
                                            hour: '2-digit', minute: '2-digit' 
                                          }) 
                                        : (row.data_ins_fmt || '-')}
                                </td>

                                <td style={{...tdStyle, textAlign:'center'}}>
                                    <div style={{display:'flex', gap:5, justifyContent:'center'}}>
                                        <button onClick={() => onEdit(row)} title="Modifica" style={{background:'#f1c40f', border:'none', borderRadius:4, padding:'6px', cursor:'pointer'}}>✏️</button>
                                        <button onClick={() => handleDeleteSingle(row.id)} title="Elimina" style={{background:'#e74c3c', color:'white', border:'none', borderRadius:4, padding:'6px', cursor:'pointer'}}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {datiFiltrati.length === 0 && (
                            <tr><td colSpan="19" style={{textAlign:'center', padding:30, color:'#999'}}>Nessun documento trovato.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MagazzinoList;