// client/src/components_admin/AdminUsers.jsx - VERSIONE FINALE OTTIMIZZATA 👥
import { useState, useEffect } from 'react';

function AdminUsers({ API_URL }) {
    const [utenti, setUtenti] = useState([]);
    const [editingUser, setEditingUser] = useState(null); 
    const [showNewModal, setShowNewModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente' });

    useEffect(() => { ricaricaUtenti(); }, []);

    const ricaricaUtenti = () => {
        fetch(`${API_URL}/api/utenti`)
            .then(res => res.json())
            .then(data => setUtenti(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/utenti/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingUser)
            });
            if(res.ok) { 
                alert("✅ Utente aggiornato con successo!"); 
                setEditingUser(null); 
                ricaricaUtenti(); 
            }
        } catch(err) { alert("Errore connessione"); }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if(data.success) {
                alert("🚀 Nuovo utente creato correttamente!");
                setShowNewModal(false);
                setNewUser({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente' });
                ricaricaUtenti();
            } else { alert("Errore: " + data.error); }
        } catch(err) { alert("Errore connessione"); }
    };

    const downloadExcel = () => { window.open(`${API_URL}/api/utenti/export/excel`, '_blank'); };

    const uploadExcel = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: formData });
            const d = await res.json();
            if(d.success) { alert("✅ Importazione Excel completata!"); ricaricaUtenti(); }
        } catch(err) { alert("Errore durante l'importazione"); } finally { setUploading(false); }
    };

    return (
        <div className="card" style={{ padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', flexDirection: 'column', alignItems: 'stretch' }}>
            
            {/* 1. TITOLO GESTIONE UTENTI */}
            <div style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem' }}>👥 Gestione Utenti ({utenti.length})</h2>
            </div>

            {/* 2. PULSANTI AZIONE (Sotto il titolo) */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowNewModal(true)} style={{ background: '#3498db', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>➕</span> NUOVO UTENTE
                </button>
                
                <button onClick={downloadExcel} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📥</span> SCARICA EXCEL
                </button>
                
                <label style={{ background: '#e67e22', color: 'white', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📤</span> {uploading ? "CARICAMENTO..." : "CARICA EXCEL"}
                    <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={uploadExcel} disabled={uploading} />
                </label>
            </div>

            {/* 3. TABELLA CON TUTTI GLI ALTRI CAMPI */}
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                            <th style={{ padding: '15px', color: '#7f8c8d', borderBottom: '2px solid #eee' }}>Ruolo</th>
                            <th style={{ padding: '15px', color: '#7f8c8d', borderBottom: '2px solid #eee' }}>Nome</th>
                            <th style={{ padding: '15px', color: '#7f8c8d', borderBottom: '2px solid #eee' }}>Email / Password</th>
                            <th style={{ padding: '15px', color: '#7f8c8d', borderBottom: '2px solid #eee' }}>Contatti & Indirizzo</th>
                            <th style={{ padding: '15px', color: '#7f8c8d', borderBottom: '2px solid #eee' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {utenti.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: u.ruolo === 'admin' ? '#2c3e50' : u.ruolo === 'cameriere' ? '#e67e22' : '#3498db', color: 'white' }}>
                                        {u.ruolo || 'cliente'}
                                    </span>
                                </td>
                                <td style={{ padding: '15px', fontWeight: '600', color: '#333' }}>{u.nome}</td>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ color: '#3498db', fontSize: '14px' }}>{u.email}</div>
                                    <div style={{ color: '#d35400', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>🔑 {u.password}</div>
                                </td>
                                <td style={{ padding: '15px', fontSize: '13px', color: '#666' }}>
                                    <div>📞 {u.telefono || '---'}</div>
                                    <div style={{ marginTop: '4px' }}>🏠 {u.indirizzo || '---'}</div>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <button onClick={() => setEditingUser({...u})} style={{ background: '#f1c40f', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Modifica</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALE CREAZIONE NUOVO */}
            {showNewModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>🆕 Registra Nuovo Staff / Utente</h3>
                        <form onSubmit={handleCreateUser} style={formStyle}>
                            <input type="text" placeholder="Nome Completo" required onChange={e => setNewUser({...newUser, nome: e.target.value})} style={inputStyle} />
                            <input type="email" placeholder="Email" required onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Password" required onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
                            <select value={newUser.ruolo} onChange={e => setNewUser({...newUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cliente">Ruolo: Cliente</option>
                                <option value="cameriere">Ruolo: Cameriere</option>
                                <option value="admin">Ruolo: Admin</option>
                            </select>
                            <input type="text" placeholder="Telefono" onChange={e => setNewUser({...newUser, telefono: e.target.value})} style={inputStyle} />
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:8, fontWeight:'bold'}}>CREA</button>
                                <button type="button" onClick={() => setShowNewModal(false)} style={{flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:8}}>CHIUDI</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE MODIFICA ESISTENTE */}
            {editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>✏️ Modifica Utente</h3>
                        <form onSubmit={handleSave} style={formStyle}>
                            <label style={{fontSize:'12px', fontWeight:'bold', color:'#7f8c8d'}}>RUOLO SISTEMA</label>
                            <select value={editingUser.ruolo || 'cliente'} onChange={e => setEditingUser({...editingUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cliente">Cliente</option>
                                <option value="cameriere">Cameriere</option>
                                <option value="admin">Admin</option>
                                <option value="cassa">Cassa</option>
                                <option value="cucina">Cucina</option>
                                <option value="pizzeria">Pizzeria</option>
                                <option value="bar">Bar</option>
                            </select>
                            <label style={{fontSize:'12px', fontWeight:'bold', color:'#7f8c8d'}}>DATI UTENTE</label>
                            <input type="text" placeholder="Nome" value={editingUser.nome} onChange={e=>setEditingUser({...editingUser, nome:e.target.value})} style={inputStyle} required />
                            <input type="email" placeholder="Email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Password" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Telefono" value={editingUser.telefono || ''} onChange={e=>setEditingUser({...editingUser, telefono:e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Indirizzo" value={editingUser.indirizzo || ''} onChange={e=>setEditingUser({...editingUser, indirizzo:e.target.value})} style={inputStyle} />
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:8, fontWeight:'bold'}}>SALVA</button>
                                <button type="button" onClick={() => setEditingUser(null)} style={{flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:8}}>ANNULLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const modalOverlayStyle = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' };
const modalContentStyle = { background:'white', padding:30, borderRadius:15, width:'90%', maxWidth:'450px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const formStyle = { display:'flex', flexDirection:'column', gap:12 };
const inputStyle = { padding:12, border:'1px solid #ddd', borderRadius:8, fontSize: '14px' };

export default AdminUsers;