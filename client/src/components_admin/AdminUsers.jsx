// client/src/components_admin/AdminUsers.jsx - VERSIONE GESTIONE STAFF COMPLETA 👥
import { useState, useEffect } from 'react';

function AdminUsers({ API_URL }) {
    const [utenti, setUtenti] = useState([]);
    const [editingUser, setEditingUser] = useState(null); 
    const [showNewModal, setShowNewModal] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente' });

    useEffect(() => { ricaricaUtenti(); }, []);

    const ricaricaUtenti = () => {
        fetch(`${API_URL}/api/utenti`)
            .then(res => res.json())
            .then(data => setUtenti(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    };

    // --- SALVATAGGIO (MODIFICA ESISTENTE) ---
    const handleSaveEdit = async (e) => {
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
            }
        } catch(err) { alert("Errore connessione"); }
    };

    // --- CREAZIONE (NUOVO UTENTE/STAFF) ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/utenti`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if(res.ok) {
                alert("🚀 Nuovo utente/staff creato!");
                setShowNewModal(false);
                setNewUser({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente' });
                ricaricaUtenti();
            } else {
                const err = await res.json();
                alert("Errore: " + err.error);
            }
        } catch(err) { alert("Errore connessione"); }
    };

    const handleDelete = async (id) => {
        if(!confirm("Eliminare definitivamente questo utente?")) return;
        await fetch(`${API_URL}/api/utenti/${id}`, { method: 'DELETE' });
        ricaricaUtenti();
    };

    return (
        <div className="card" style={{flexDirection:'column', alignItems:'stretch'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h3 style={{margin:0}}>👥 Gestione Utenti & Staff</h3>
                <button onClick={() => setShowNewModal(true)} style={{background:'#27ae60', color:'white'}}>+ AGGIUNGI UTENTE</button>
            </div>

            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', textAlign:'left'}}>
                    <thead>
                        <tr style={{background:'#f8f9fa', borderBottom:'2px solid #dee2e6'}}>
                            <th style={{padding:12}}>Nome / Email</th>
                            <th style={{padding:12}}>Ruolo</th>
                            <th style={{padding:12}}>Contatti</th>
                            <th style={{padding:12}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {utenti.map(u => (
                            <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:12}}>
                                    <strong>{u.nome}</strong><br/>
                                    <span style={{fontSize:'0.8rem', color:'#666'}}>{u.email}</span>
                                </td>
                                <td style={{padding:12}}>
                                    <span style={{
                                        padding:'4px 8px', borderRadius:4, fontSize:'0.75rem', fontWeight:'bold', color:'white',
                                        background: u.ruolo === 'cameriere' ? '#e67e22' : '#3498db'
                                    }}>
                                        {u.ruolo?.toUpperCase() || 'CLIENTE'}
                                    </span>
                                </td>
                                <td style={{padding:12, fontSize:'0.85rem'}}>
                                    📞 {u.telefono || '-'}<br/>
                                    📍 {u.indirizzo || '-'}
                                </td>
                                <td style={{padding:12}}>
                                    <button onClick={() => setEditingUser({...u})} style={{background:'#f1c40f', marginRight:5}}>✏️</button>
                                    <button onClick={() => handleDelete(u.id)} style={{background:'#e74c3c', color:'white'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODALE MODIFICA (Cambio Ruolo e Dati) --- */}
            {editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h4>Modifica Utente</h4>
                        <form onSubmit={handleSaveEdit} style={formStyle}>
                            <label>Nome</label>
                            <input type="text" value={editingUser.nome} onChange={e=>setEditingUser({...editingUser, nome:e.target.value})} required />
                            
                            <label>Ruolo Sistema</label>
                            <select value={editingUser.ruolo} onChange={e=>setEditingUser({...editingUser, ruolo:e.target.value})} style={inputStyle}>
                                <option value="cliente">Cliente (Standard)</option>
                                <option value="cameriere">Cameriere (Staff)</option>
                            </select>

                            <label>Email</label>
                            <input type="email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} required />
                            <label>Telefono</label>
                            <input type="text" value={editingUser.telefono || ''} onChange={e=>setEditingUser({...editingUser, telefono:e.target.value})} />
                            <label>Indirizzo</label>
                            <input type="text" value={editingUser.indirizzo || ''} onChange={e=>setEditingUser({...editingUser, indirizzo:e.target.value})} />
                            
                            <div style={{display:'flex', gap:10, marginTop:15}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white'}}>SALVA</button>
                                <button type="button" onClick={()=>setEditingUser(null)} style={{flex:1, background:'#95a5a6', color:'white'}}>ANNULLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODALE CREAZIONE NUOVO --- */}
            {showNewModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h4>🆕 Crea Nuovo Utente/Staff</h4>
                        <form onSubmit={handleCreateUser} style={formStyle}>
                            <input type="text" placeholder="Nome Completo" onChange={e=>setNewUser({...newUser, nome:e.target.value})} required style={inputStyle}/>
                            <input type="email" placeholder="Email" onChange={e=>setNewUser({...newUser, email:e.target.value})} required style={inputStyle}/>
                            <input type="password" placeholder="Password" onChange={e=>setNewUser({...newUser, password:e.target.value})} required style={inputStyle}/>
                            <select value={newUser.ruolo} onChange={e=>setNewUser({...newUser, ruolo:e.target.value})} style={inputStyle}>
                                <option value="cliente">Ruolo: Cliente</option>
                                <option value="cameriere">Ruolo: Cameriere</option>
                            </select>
                            <input type="text" placeholder="Telefono" onChange={e=>setNewUser({...newUser, telefono:e.target.value})} style={inputStyle}/>
                            
                            <div style={{display:'flex', gap:10, marginTop:15}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white'}}>CREA ORA</button>
                                <button type="button" onClick={()=>setShowNewModal(false)} style={{flex:1, background:'#95a5a6', color:'white'}}>CHIUDI</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Stili rapidi per i modali
const modalOverlayStyle = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContentStyle = { background:'white', padding:25, borderRadius:10, width:'90%', maxWidth:450 };
const formStyle = { display:'flex', flexDirection:'column', gap:10 };
const inputStyle = { padding:10, borderRadius:5, border:'1px solid #ccc' };

export default AdminUsers;