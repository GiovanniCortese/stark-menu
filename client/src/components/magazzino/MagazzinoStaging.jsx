import React, { useState, useEffect } from 'react';

const MagazzinoStaging = ({ initialData, onConfirm, onCancel }) => {
    // Aggiungiamo un ID temporaneo se manca, per gestire la lista React
    const [data, setData] = useState(initialData.map((item, idx) => ({ ...item, tempId: Date.now() + idx })));

    // Gestione modifica cella generica
    const handleEdit = (id, field, value) => {
        setData(prev => prev.map(item => 
            item.tempId === id ? { ...item, [field]: value } : item
        ));
    };

    const handleDelete = (id) => {
        setData(prev => prev.filter(item => item.tempId !== id));
    };

    const aggiungiRigaVuota = () => {
        setData([...data, { 
            tempId: Date.now(), 
            prodotto: '', quantita: 1, unita_misura: 'Pz', 
            prezzo_unitario: 0, sconto: 0, iva: 10, 
            codice_articolo: '', lotto: '', scadenza: '' 
        }]);
    };

    // Calcolo Totale Stimato (Netto Scontato + IVA)
    const calculateTotal = () => {
        return data.reduce((acc, item) => {
            const qta = parseFloat(item.quantita) || 0;
            const prz = parseFloat(item.prezzo_unitario) || 0;
            const sc = parseFloat(item.sconto) || 0;
            const iva = parseFloat(item.iva) || 0;
            
            const nettoScontato = prz * (1 - sc/100);
            const totRiga = (qta * nettoScontato) * (1 + iva/100);
            
            return acc + totRiga;
        }, 0).toFixed(2);
    };

    // Stili CSS veloci
    const thStyle = { padding: 10, textAlign: 'left', background:'#f8f9fa', borderBottom:'2px solid #ddd', fontSize:'13px' };
    const inputStyle = { width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: 4, fontSize:'13px' };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 5px 25px rgba(0,0,0,0.1)' }}>
            <div style={{borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom:20}}>
                <h2 style={{ margin: 0, color:'#2c3e50' }}>🧐 Revisione Bolla AI</h2>
                <p style={{ color: '#7f8c8d', margin:0, fontSize:14 }}>Verifica i dati letti prima di salvarli nel database.</p>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto', border:'1px solid #eee', borderRadius:8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={{...thStyle, width:40}}></th>
                            <th style={{...thStyle, width:100}}>Codice</th>
                            <th style={thStyle}>Prodotto</th>
                            <th style={{...thStyle, width:70}}>Qta</th>
                            <th style={{...thStyle, width:70}}>Unità</th>
                            <th style={{...thStyle, width:90}}>€ Unit.</th>
                            <th style={{...thStyle, width:70}}>Sc.%</th>
                            <th style={{...thStyle, width:70}}>IVA%</th>
                            <th style={{...thStyle, width:130}}>Scadenza</th>
                            <th style={{...thStyle, width:100}}>Lotto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.tempId} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                <td style={{ padding: 5, textAlign: 'center' }}>
                                    <button onClick={() => handleDelete(item.tempId)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight:'bold' }}>✕</button>
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="text" value={item.codice_articolo || ''} onChange={(e) => handleEdit(item.tempId, 'codice_articolo', e.target.value)} style={inputStyle} placeholder="Cod." />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="text" value={item.prodotto} onChange={(e) => handleEdit(item.tempId, 'prodotto', e.target.value)} style={{...inputStyle, fontWeight:'bold'}} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="number" step="0.01" value={item.quantita} onChange={(e) => handleEdit(item.tempId, 'quantita', e.target.value)} style={{...inputStyle, textAlign:'center'}} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="text" value={item.unita_misura} onChange={(e) => handleEdit(item.tempId, 'unita_misura', e.target.value)} style={{...inputStyle, textAlign:'center'}} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="number" step="0.001" value={item.prezzo_unitario} onChange={(e) => handleEdit(item.tempId, 'prezzo_unitario', e.target.value)} style={inputStyle} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="number" step="0.01" value={item.sconto} onChange={(e) => handleEdit(item.tempId, 'sconto', e.target.value)} style={{...inputStyle, color:'red'}} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <select value={item.iva} onChange={(e) => handleEdit(item.tempId, 'iva', e.target.value)} style={inputStyle}>
                                        <option value="4">4%</option><option value="10">10%</option><option value="22">22%</option><option value="0">0%</option>
                                    </select>
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="date" value={item.scadenza ? item.scadenza.split('T')[0] : ''} onChange={(e) => handleEdit(item.tempId, 'scadenza', e.target.value)} style={inputStyle} />
                                </td>
                                <td style={{ padding: 5 }}>
                                    <input type="text" value={item.lotto} onChange={(e) => handleEdit(item.tempId, 'lotto', e.target.value)} style={inputStyle} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'#ecf0f1', padding:15, borderRadius:8 }}>
                <button onClick={aggiungiRigaVuota} style={{ padding: '8px 15px', background: '#34495e', color:'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold' }}>+ Aggiungi Riga</button>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color:'#27ae60' }}>Totale Documento: € {calculateTotal()}</div>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 15 }}>
                <button onClick={onCancel} style={{ flex: 1, padding: 15, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', cursor: 'pointer', fontWeight:'bold' }}>
                    ❌ ANNULLA TUTTO
                </button>
                <button onClick={() => onConfirm(data)} style={{ flex: 2, padding: 15, background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow:'0 4px 15px rgba(46, 204, 113, 0.4)' }}>
                    ✅ CONFERMA E IMPORTA IN MAGAZZINO
                </button>
            </div>
        </div>
    );
};

export default MagazzinoStaging;