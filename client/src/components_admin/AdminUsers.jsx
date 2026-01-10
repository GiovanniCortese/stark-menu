// client/src/components_admin/AdminUsers.jsx - VERSIONE COMPLETA (CRUD + EXCEL + PASSWORDS) 👥
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

    // --- GESTIONE MODIFICA ---
    const handleEditClick = (u) => { setEditingUser({ ...u }); };
    const handleCancel = () => { setEditingUser(null); };
    
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/utenti/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingUser)
            });
            if(res.ok) {
                alert("✅ Utente aggiornato!");
                setEditingUser(null);
                ricaricaUtenti();
            } else alert("Errore aggiornamento");
        } catch(err) { alert("Errore connessione"); }
    };

    // --- CREAZIONE NUOVO UTENTE ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/register`, { // Utilizza l'endpoint di registrazione esistente
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if(data.success) {
                alert("🚀 Nuovo utente creato con successo!");
                setShowNewModal(false);
                setNewUser({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente' });
                ricaricaUtenti();
            } else {
                alert("Errore: " + data.error);
            }
        } catch(err) { alert("Errore connessione"); }
    };

    // --- GESTIONE EXCEL ---
    const downloadExcel = () => { window.open(`${API_URL}/api/utenti/export/excel`, '_blank'); };

    const uploadExcel = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(!confirm("⚠️ L'importazione sovrascriverà i dati esistenti per le email corrispondenti. Continuare?")) return;

        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);

        try {
            const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: formData });
            const d = await res.json();
            if(d.success) { alert("✅ Importazione completata!"); ricaricaUtenti(); }
            else alert("Errore importazione: " + d.error);
        } catch(err) { alert("Errore upload"); } finally { setUploading(false); }
    };

    const rowStyle = { borderBottom: '1px solid #eee' };

    return (
        <div className="card" style={{ padding: '20px', background: 'white', borderRadius:'8px' }}>
            
            {/* HEADER CON AZIONI */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #3498db', paddingBottom:10, marginBottom:15, flexWrap:'wrap', gap:10}}>
                <h2 style={{margin:0, color:'#2c3e50'}}>👥 Gestione Utenti ({utenti.length})</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setShowNewModal(true)} style={{background:'#3498db', color:'white', padding:'8px 12px', borderRadius:5, cursor:'pointer', fontWeight:'bold', border:'none'}}>
                        ➕ NUOVO UTENTE
                    </button>
                    <button onClick={downloadExcel} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 12px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>
                        📥 EXCEL
                    </button>
                    <label style={{background:'#e67e22', color:'white', padding:'8px 12px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>
                        {uploading ? "⏳..." : "📤 EXCEL"}
                        <input type="file" accept=".xlsx, .xls" style={{display:'none'}} onChange={uploadExcel} disabled={uploading} />
                    </label>
                </div>
            </div>

            {/* TABELLA UTENTI */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                            <th style={{ padding: '12px', borderBottom:'2px solid #ddd' }}>Ruolo</th>
                            <th style={{ padding: '12px', borderBottom:'2px solid #ddd' }}>Nome</th>
                            <th style={{ padding: '12px', borderBottom:'2px solid #ddd' }}>Email / Password</th>
                            <th style={{ padding: '12px', borderBottom:'2px solid #ddd' }}>Contatti</th>
                            <th style={{ padding: '12px', borderBottom:'2px solid #ddd' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {utenti.map(u => (
                            <tr key={u.id} style={rowStyle}>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding:'3px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:'bold', textTransform:'uppercase',
                                        background: u.ruolo==='admin'?'#2c3e50': u.ruolo==='cameriere'?'#e67e22':'#3498db',
                                        color:'white'
                                    }}>{u.ruolo || 'cliente'}</span>
                                </td>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.nome}</td>
                                <td style={{ padding: '12px', fontSize:'13px' }}>
                                    <div style={{color:'#3498db'}}>{u.email}</div>
                                    <div style={{color:'#d35400', fontWeight:'bold'}}>🔑 {u.password}</div>
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                    <div>📞 {u.telefono || '-'}</div>
                                    <div style={{color:'#777', fontSize:'11px'}}>🏠 {u.indirizzo || '-'}</div>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => handleEditClick(u)} style={{background:'#f1c40f', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>✏️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALE NUOVO UTENTE */}
            {showNewModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>🆕 Registra Nuovo Utente / Staff</h3>
                        <form onSubmit={handleCreateUser} style={formStyle}>
                            <input type="text" placeholder="Nome Completo" required onChange={e => setNewUser({...newUser, nome: e.target.value})} style={inputStyle} />
                            <input type="email" placeholder="Email" required onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Password" required onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
                            <select onChange={e => setNewUser({...newUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cliente">Cliente</option>
                                <option value="cameriere">Cameriere</option>
                                <option value="admin">Admin</option>
                            </select>
                            <input type="text" placeholder="Telefono" onChange={e => setNewUser({...newUser, telefono: e.target.value})} style={inputStyle} />
                            <div style={{display:'flex', gap:10}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:5, fontWeight:'bold'}}>CREA</button>
                                <button type="button" onClick={() => setShowNewModal(false)} style={{flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:5}}>CHIUDI</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE DI MODIFICA */}
            {editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>✏️ Modifica: {editingUser.nome}</h3>
                        <form onSubmit={handleSave} style={formStyle}>
                            <label style={{fontSize:'12px', fontWeight:'bold'}}>Ruolo</label>
                            <select value={editingUser.ruolo || 'cliente'} onChange={e => setEditingUser({...editingUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cliente">Cliente</option>
                                <option value="admin">Admin</option>
                                <option value="cassa">Cassa</option>
                                <option value="cucina">Cucina</option>
                                <option value="pizzeria">Pizzeria</option>
                                <option value="bar">Bar</option>
                                <option value="cameriere">Cameriere</option>
                            </select>
                            <input type="text" placeholder="Nome" value={editingUser.nome} onChange={e=>setEditingUser({...editingUser, nome:e.target.value})} style={inputStyle} required />
                            <input type="email" placeholder="Email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Password" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Telefono" value={editingUser.telefono || ''} onChange={e=>setEditingUser({...editingUser, telefono:e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Indirizzo" value={editingUser.indirizzo || ''} onChange={e=>setEditingUser({...editingUser, indirizzo:e.target.value})} style={inputStyle} />

                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:5, fontWeight:'bold'}}>SALVA</button>
                                <button type="button" onClick={handleCancel} style={{flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:5}}>ANNULLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const modalOverlayStyle = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' };
const modalContentStyle = { background:'white', padding:30, borderRadius:10, width:'90%', maxWidth:'500px' };
const formStyle = { display:'flex', flexDirection:'column', gap:12 };
const inputStyle = { padding:10, border:'1px solid #ddd', borderRadius:5 };

export default AdminUsers;