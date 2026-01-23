import React, { useState } from 'react';

const MagazzinoStaging = ({ initialData, onConfirm, onCancel }) => {
    const [data, setData] = useState(initialData);

    // Gestione modifica cella
    const handleEdit = (id, field, value) => {
        setData(prev => prev.map(item => 
            item.tempId === id ? { ...item, [field]: value } : item
        ));
    };

    const handleDelete = (id) => {
        setData(prev => prev.filter(item => item.tempId !== id));
    };

    const aggiungiRigaVuota = () => {
        setData([...data, { tempId: Date.now(), prodotto: '', quantita: 1, prezzo: 0 }]);
    };

    const calculateTotal = () => {
        return data.reduce((acc, item) => acc + (parseFloat(item.prezzo) || 0), 0).toFixed(2);
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
            <h2 style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', marginTop: 0 }}>🔍 Verifica Dati (Anteprima)</h2>
            <p style={{ color: '#666' }}>Controlla che l'AI abbia letto bene. Modifica se necessario, poi conferma.</p>

            <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#ecf0f1', zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: 10, textAlign: 'left' }}>Prodotto</th>
                            <th style={{ padding: 10, width: '100px' }}>Qta</th>
                            <th style={{ padding: 10, width: '80px' }}>Unità</th>
                            <th style={{ padding: 10, width: '100px' }}>Prezzo (€)</th>
                            <th style={{ padding: 10, width: '120px' }}>Scadenza</th>
                            <th style={{ padding: 10, width: '120px' }}>Lotto</th>
                            <th style={{ padding: 10, width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.tempId} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="text" 
                                        value={item.prodotto} 
                                        onChange={(e) => handleEdit(item.tempId, 'prodotto', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="number" 
                                        value={item.quantita} 
                                        onChange={(e) => handleEdit(item.tempId, 'quantita', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="text" 
                                        value={item.unita_misura} 
                                        onChange={(e) => handleEdit(item.tempId, 'unita_misura', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={item.prezzo} 
                                        onChange={(e) => handleEdit(item.tempId, 'prezzo', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="date" 
                                        value={item.scadenza ? item.scadenza.split('T')[0] : ''} 
                                        onChange={(e) => handleEdit(item.tempId, 'scadenza', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10 }}>
                                    <input 
                                        type="text" 
                                        value={item.lotto} 
                                        onChange={(e) => handleEdit(item.tempId, 'lotto', e.target.value)}
                                        style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                                    />
                                </td>
                                <td style={{ padding: 10, textAlign: 'center' }}>
                                    <button onClick={() => handleDelete(item.tempId)} style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={aggiungiRigaVuota} style={{ padding: '8px 15px', background: '#f1c40f', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ Aggiungi Riga</button>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Totale Fattura: € {calculateTotal()}</div>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 20 }}>
                <button onClick={() => onConfirm(data)} style={{ flex: 2, padding: 15, background: '#27ae60', color: 'white', border: 'none', borderRadius: 5, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ CONFERMA E SALVA IN MAGAZZINO
                </button>
                <button onClick={onCancel} style={{ flex: 1, padding: 15, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 5, fontSize: '1.1rem', cursor: 'pointer' }}>
                    ❌ ANNULLA
                </button>
            </div>
        </div>
    );
};

export default MagazzinoStaging;