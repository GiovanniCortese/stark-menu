import React, { useState, useEffect } from 'react';

const MagazzinoList = ({ ristoranteId, API_URL, refreshTrigger }) => {
    const [merci, setMerci] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=all`)
            .then(r => r.json())
            .then(data => {
                setMerci(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [ristoranteId, API_URL, refreshTrigger]);

    if (loading) return <div>Caricamento listino...</div>;

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
            <h2>Giacenze Attuali</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f8f9fa', color: '#7f8c8d' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>Data</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>Prodotto</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>Fornitore</th>
                        <th style={{ padding: 10 }}>Qta</th>
                        <th style={{ padding: 10 }}>Scadenza</th>
                    </tr>
                </thead>
                <tbody>
                    {merci.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: 10 }}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                            <td style={{ padding: 10, fontWeight: 'bold' }}>{m.prodotto}</td>
                            <td style={{ padding: 10 }}>{m.fornitore}</td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                                <span style={{ background: '#e0f7fa', color: '#006064', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                    {m.quantita} {m.unita_misura}
                                </span>
                            </td>
                            <td style={{ padding: 10, textAlign: 'center', color: m.scadenza ? 'black' : '#ccc' }}>
                                {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MagazzinoList;