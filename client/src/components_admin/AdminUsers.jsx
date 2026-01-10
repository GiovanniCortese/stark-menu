// client/src/components_admin/AdminUsers.jsx - VERSIONE V_FINAL (FIXED)
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 

function AdminUsers({ API_URL, user }) { 
    const [staff, setStaff] = useState([]);
    const [clienti, setClienti] = useState([]);
    
    // ✅ MODIFICA 1: Default su 'clienti' per vederli subito
    const [tab, setTab] = useState('clienti'); 
    
    const [editingUser, setEditingUser] = useState(null); 
    const [showNewModal, setShowNewModal] = useState(false);
    
    const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cameriere' });

    // 🔄 Caricamento dati
    useEffect(() => { 
        if (user && user.id) {
            ricaricaTutto(); 
            const interval = setInterval(ricaricaTutto, 10000); 
            return () => clearInterval(interval);
        }
    }, [user]);

    const ricaricaTutto = () => {
        if (!user || !user.id) return;

        // 1. Carica Staff
        fetch(`${API_URL}/api/utenti?mode=staff&ristorante_id=${user.id}`)
            .then(res => res.json())
            .then(data => setStaff(Array.isArray(data) ? data : []))
            .catch(err => console.error("Errore Staff:", err));
        
        // 2. Carica Clienti CRM
        fetch(`${API_URL}/api/utenti?mode=clienti_ordini&ristorante_id=${user.id}`)
            .then(res => res.json())
            .then(data => setClienti(Array.isArray(data) ? data : []))
            .catch(err => console.error("Errore Clienti:", err));
    };

    // 💾 Salva Modifiche Staff
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

    // ➕ Crea Nuovo Staff
    const handleCreateStaff = async (e) => {
        e.preventDefault();
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

    // 🗑️ Elimina Staff
    const handleDelete = async (id) => {
        if(!window.confirm("Sei sicuro di voler eliminare questo utente?")) return;
        try {
            await fetch(`${API_URL}/api/utenti/${id}`, { method: 'DELETE' });
            ricaricaTutto();
        } catch(e) { alert("Errore eliminazione"); }
    };

    // 📥 Export Excel Staff (Locale)
    const downloadStaffExcel = () => { 
        const ws = XLSX.utils.json_to_sheet(staff);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staff");
        XLSX.writeFile(wb, 'Staff_Lista.xlsx');
    };

    // ✅ MODIFICA 2: Export Excel Clienti (Locale - ROBUSTO)
    const scaricaExcelClienti = () => {
        if (clienti.length === 0) return alert("Nessun cliente da esportare!");

        const datiPuliti = clienti.map(c => ({
            "Nome Cliente": c.nome || "Sconosciuto",
            "Email": c.email || "N/A",
            "Telefono": c.telefono || "",
            "Totale Ordini": c.totale_ordini || 0,
            "Ultima Visita": c.ultimo_ordine ? new Date(c.ultimo_ordine).toLocaleString('it-IT') : "Mai"
        }));

        const ws = XLSX.utils.json_to_sheet(datiPuliti);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clienti");
        XLSX.writeFile(wb, "Clienti_CRM.xlsx");
    };

    return (
        <div className="card" style={{ padding: '25px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display:'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            
            {/* HEADER */}
            <div style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem' }}>👥 Gestione Persone</h2>
                
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={()=>setTab('clienti')} style={{padding:'10px 20px', borderRadius:'30px', border:'none', cursor:'pointer', fontWeight:'bold', background: tab==='clienti'?'#27ae60':'#f0f0f0', color: tab==='clienti'?'white':'#555', transition:'0.3s'}}>
                        🍔 CLIENTI ({clienti.length})
                    </button>
                    <button onClick={()=>setTab('staff')} style={{padding:'10px 20px', borderRadius:'30px', border:'none', cursor:'pointer', fontWeight:'bold', background: tab==='staff'?'#2c3e50':'#f0f0f0', color: tab==='staff'?'white':'#555', transition:'0.3s'}}>
                        👔 STAFF ({staff.length})
                    </button>
                </div>
            </div>

            {/* === TAB STAFF === */}
            {tab === 'staff' && (
                <>
                    <div style={{ display: 'flex', justifyContent:'space-between', marginBottom: '25px' }}>
                        <button onClick={() => setShowNewModal(true)} style={{ background: '#3498db', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>➕</span> AGGIUNGI STAFF
                        </button>
                        <button onClick={downloadStaffExcel} style={{ background: '#1abc9c', color: 'white', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📥</span> EXCEL STAFF
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
                                {staff.length === 0 && <tr><td colSpan="4" style={{padding:20, textAlign:'center'}}>Nessun membro staff trovato.</td></tr>}
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
                                        <td style={{ padding: '15px', display:'flex', gap:10 }}>
                                            <button onClick={() => setEditingUser({...u})} style={{ background: '#f1c40f', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                                            <button onClick={() => handleDelete(u.id)} style={{ background: '#e74c3c', color:'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* === TAB CLIENTI === */}
            {tab === 'clienti' && (
                <div style={{width:'100%'}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#e8f8f5', padding: '15px', borderRadius: '10px', border: '1px solid #16a085' }}>
                        <div style={{color: '#16a085'}}>
                            <strong>📊 Database CRM</strong>
                            <div style={{fontSize: '0.8rem'}}>Elenco dei clienti che hanno ordinato nel locale.</div>
                        </div>
                        {/* ✅ TASTO EXCEL CORRETTO */}
                        <button 
                            onClick={scaricaExcelClienti}
                            style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        >
                            <span>📥</span> SCARICA REPORT EXCEL
                        </button>
                    </div>

                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                                <th style={{padding:10}}>Cliente</th>
                                <th style={{padding:10}}>Contatti</th>
                                <th style={{padding:10}}>Ordini</th>
                                <th style={{padding:10}}>Ultima Visita</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clienti.length === 0 && <tr><td colSpan="4" style={{padding:20, textAlign:'center', color: '#999'}}>Nessun cliente ha ancora effettuato ordini.</td></tr>}
                            {clienti.map(c => (
                                <tr key={c.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:10}}>
                                        {/* ✅ MODIFICA 3: Rimosso Username (@user) */}
                                        <strong style={{fontSize:'1.1rem'}}>{c.nome}</strong>
                                    </td>
                                    <td style={{padding:10}}>
                                        {c.email}<br/>
                                        <span style={{fontSize: '0.9rem', color: '#666'}}>{c.telefono || 'N/D'}</span>
                                    </td>
                                    <td style={{padding:10}}>
                                        <span style={{background:'#3498db', color:'white', padding:'2px 8px', borderRadius:10, fontSize: '0.9rem'}}>
                                            {c.totale_ordini || 0} ordini
                                        </span>
                                    </td>
                                    <td style={{padding:10}}>
                                        {c.ultimo_ordine ? new Date(c.ultimo_ordine).toLocaleDateString() : '---'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === MODALI (INVARIATI) === */}
            
            {/* NUOVO STAFF */}
            {showNewModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>🆕 Nuovo Staff</h3>
                        <form onSubmit={handleCreateStaff} style={formStyle}>
                            <label style={labelStyle}>RUOLO</label>
                            <select value={newUser.ruolo} onChange={e => setNewUser({...newUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cameriere">Cameriere (Prende ordini)</option>
                                <option value="editor">Editor (Modifica Menu)</option>
                            </select>
                            
                            <input type="text" placeholder="Nome Completo" required value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} style={inputStyle} />
                            <input type="email" placeholder="Email (Login)" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
                            
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={btnSaveStyle}>CREA</button>
                                <button type="button" onClick={() => setShowNewModal(false)} style={btnCancelStyle}>ANNULLA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODIFICA STAFF */}
            {editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{marginTop:0}}>✏️ Modifica Staff</h3>
                        <form onSubmit={handleSave} style={formStyle}>
                            <label style={labelStyle}>RUOLO</label>
                            <select value={editingUser.ruolo} onChange={e => setEditingUser({...editingUser, ruolo: e.target.value})} style={inputStyle}>
                                <option value="cameriere">Cameriere</option>
                                <option value="editor">Editor</option>
                            </select>
                            <input type="text" placeholder="Nome" value={editingUser.nome} onChange={e=>setEditingUser({...editingUser, nome:e.target.value})} style={inputStyle} required />
                            <input type="email" placeholder="Email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} style={inputStyle} required />
                            <input type="text" placeholder="Password" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} style={inputStyle} required />
                            
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="submit" style={btnSaveStyle}>SALVA</button>
                                <button type="button" onClick={() => setEditingUser(null)} style={btnCancelStyle}>ANNULLA</button>
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
const labelStyle = { fontSize:'12px', fontWeight:'bold', color:'#7f8c8d' };
const btnSaveStyle = { flex:1, background:'#27ae60', color:'white', padding:12, border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer' };
const btnCancelStyle = { flex:1, background:'#e74c3c', color:'white', padding:12, border:'none', borderRadius:8, cursor:'pointer' };

export default AdminUsers;