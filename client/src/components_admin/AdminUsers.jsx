// client/src/components_admin/AdminUsers.jsx - VERSIONE FINAL (Staff vs Clienti) 👥
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; // Assicurati di installare: npm install xlsx

function AdminUsers({ API_URL, user }) { // Aggiunto 'user' per filtrare per ristorante
    const [staff, setStaff] = useState([]);
    const [clienti, setClienti] = useState([]);
    const [tab, setTab] = useState('staff'); // 'staff' | 'clienti'
    
    const [editingUser, setEditingUser] = useState(null); 
    const [showNewModal, setShowNewModal] = useState(false);
    
    // Stato per nuovo Staff (Default ruolo: Cameriere)
    const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cameriere' });

    useEffect(() => { ricaricaTutto(); }, []);

    const ricaricaTutto = () => {
        // 1. Carica Staff (Editor/Camerieri del locale)
        fetch(`${API_URL}/api/utenti?mode=staff&ristorante_id=${user.id}`)
            .then(res => res.json())
            .then(data => setStaff(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
        
        // 2. Carica Clienti (Quelli che hanno ordinato)
        fetch(`${API_URL}/api/utenti?mode=clienti&ristorante_id=${user.id}`)
            .then(res => res.json())
            .then(data => setClienti(Array.isArray(data) ? data : []))
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
                alert("✅ Utente aggiornato!"); 
                setEditingUser(null); 
                ricaricaTutto(); 
            }
        } catch(err) { alert("Errore connessione"); }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        // Forza l'ID del ristorante e limita i ruoli
        const payload = { ...newUser, ristorante_id: user.id };
        
        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(data.success) {
                alert("🚀 Nuovo membro staff creato!");
                setShowNewModal(false);
                setNewUser({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cameriere' });
                ricaricaTutto();
            } else { alert("Errore: " + data.error); }
        } catch(err) { alert("Errore connessione"); }
    };

    // Export Excel Client-Side (Scarica quello che vedi)
    const downloadExcel = () => { 
        const data = tab === 'staff' ? staff : clienti;
        const filename = tab === 'staff' ? 'Staff_Lista.xlsx' : 'Clienti_Lista.xlsx';
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dati");
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="card" style={{ padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', flexDirection: 'column', alignItems: 'stretch' }}>
            
            {/* 1. TITOLO & TABS */}
            <div style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem' }}>👥 Gestione Persone</h2>
                
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={()=>setTab('staff')} style={{padding:'10px 20px', borderRadius:'30px', border:'none', cursor:'pointer', fontWeight:'bold', background: tab==='staff'?'#2c3e50':'#f0f0f0', color: tab==='staff'?'white':'#555', boxShadow: tab==='staff'?'0 4px 10px rgba(0,0,0,0.2)':'none'}}>
                        👔 IL MIO STAFF ({staff.length})
                    </button>
                    <button onClick={()=>setTab('clienti')} style={{padding:'10px 20px', borderRadius:'30px', border:'none', cursor:'pointer', fontWeight:'bold', background: tab==='clienti'?'#27ae60':'#f0f0f0', color: tab==='clienti'?'white':'#555', boxShadow: tab==='clienti'?'0 4px 10px rgba(0,0,0,0.2)':'none'}}>
                        🍔 I MIEI CLIENTI ({clienti.length})
                    </button>
                </div>
            </div>

            {/* 2. AREA STAFF */}
            {tab === 'staff' && (
                <>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
                        <button onClick={() => setShowNewModal(true)} style={{ background: '#3498db', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>➕</span> AGGIUNGI STAFF
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Ruolo</th>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Nome</th>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Credenziali</th>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: u.ruolo === 'editor' ? '#8e44ad' : '#e67e22', color: 'white' }}>
                                                {u.ruolo}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', fontWeight: '600', color: '#333' }}>{u.nome}</td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ color: '#3498db', fontSize: '14px' }}>{u.email}</div>
                                            <div style={{ color: '#d35400', fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>🔑 {u.password}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <button onClick={() => setEditingUser({...u})} style={{ background: '#f1c40f', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* 3. AREA CLIENTI */}
            {tab === 'clienti' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background:'#e8f8f5', padding:'15px', borderRadius:'8px' }}>
                        <p style={{margin:0, color:'#16a085'}}>Visualizzi solo i clienti che hanno effettuato almeno un ordine.</p>
                        <button onClick={downloadExcel} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📥</span> EXPORT EXCEL
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Cliente</th>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Contatti</th>
                                    <th style={{ padding: '15px', color: '#7f8c8d' }}>Ultimo Ordine</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clienti.length === 0 && <tr><td colSpan="3" style={{padding:30, textAlign:'center', color:'#999'}}>Nessun cliente recente.</td></tr>}
                                {clienti.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>{u.nome}</td>
                                        <td style={{ padding: '15px', fontSize:'13px' }}>
                                            📧 {u.email}<br/>
                                            📞 {u.telefono}
                                        </td>
                                        <td style={{ padding: '15px', color:'#2c3e50' }}>
                                            📅 {u.ultimo_ordine ? new Date(u.ultimo_ordine).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* MODALE NUOVO STAFF (Limitato a Editor/Cameriere) */}
            {showNewModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>🆕 Nuovo Membro Staff</h3>
                        <form onSubmit={handleCreateStaff} style={formStyle}>
                            <label style={{fontSize:'12px', fontWeight:'bold', color:'#7f8c8d'}}>RUOLO</label>
                            <select value={newUser.ruolo} onChange={e => setNewUser({...newUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cameriere">Cameriere (Prende ordini ai tavoli)</option>
                                <option value="editor">Editor (Modifica solo il Menu)</option>
                            </select>
                            
                            <input type="text" placeholder="Nome Completo" required value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} style={inputStyle} />
                            <input type="email" placeholder="Email (Login)" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
                            
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:8, fontWeight:'bold'}}>CREA STAFF</button>
                                <button type="button" onClick={() => setShowNewModal(false)} style={{flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:8}}>ANNULLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE MODIFICA (Solo per Staff) */}
            {editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>✏️ Modifica Staff</h3>
                        <form onSubmit={handleSave} style={formStyle}>
                            <label style={{fontSize:'12px', fontWeight:'bold', color:'#7f8c8d'}}>RUOLO</label>
                            <select value={editingUser.ruolo} onChange={e => setEditingUser({...editingUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cameriere">Cameriere</option>
                                <option value="editor">Editor</option>
                            </select>
                            <input type="text" placeholder="Nome" value={editingUser.nome} onChange={e=>setEditingUser({...editingUser, nome:e.target.value})} style={inputStyle} required />
                            <input type="email" placeholder="Email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Password" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} style={inputStyle} required />
                            
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

// STILI
const modalOverlayStyle = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' };
const modalContentStyle = { background:'white', padding:30, borderRadius:15, width:'90%', maxWidth:'400px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const formStyle = { display:'flex', flexDirection:'column', gap:12 };
const inputStyle = { padding:12, border:'1px solid #ddd', borderRadius:8, fontSize: '14px' };

export default AdminUsers;