// client/src/components_admin/AdminUsers.jsx
import { useState, useEffect } from 'react';

function AdminUsers({ API_URL }) {
    const [utenti, setUtenti] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/utenti`)
            .then(res => res.json())
            .then(data => setUtenti(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="card" style={{ padding: '20px', background: 'white' }}>
            <h2 style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', color: '#2c3e50' }}>👥 Gestione Clienti ({utenti.length})</h2>
            
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', textAlign: 'left', color: '#555' }}>
                            <th style={{ padding: '12px' }}>Nome</th>
                            <th style={{ padding: '12px' }}>Email</th>
                            <th style={{ padding: '12px' }}>Telefono</th>
                            <th style={{ padding: '12px' }}>Indirizzo</th>
                            <th style={{ padding: '12px' }}>Data Reg.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {utenti.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.nome}</td>
                                <td style={{ padding: '12px', color: '#3498db' }}>{u.email}</td>
                                <td style={{ padding: '12px' }}>{u.telefono}</td>
                                <td style={{ padding: '12px', fontSize: '0.9rem' }}>{u.indirizzo || "-"}</td>
                                <td style={{ padding: '12px', fontSize: '0.8rem', color: '#888' }}>
                                    {new Date(u.data_registrazione).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {utenti.length === 0 && <p style={{textAlign:'center', marginTop:20}}>Nessun utente registrato.</p>}
            </div>
        </div>
    );
}

export default AdminUsers;