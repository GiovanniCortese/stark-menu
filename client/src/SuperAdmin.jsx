// client/src/SuperAdmin.jsx - VERSIONE V60 (GOD MODE: FULL CRUD & DATA MAPPING) 🌍
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [utentiGlobali, setUtentiGlobali] = useState([]); 
  const [authorized, setAuthorized] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '', code2fa: '' });
  const [error, setError] = useState("");
  
  // STATI MODALE RISTORANTE
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ nome: '', slug: '', email: '', telefono: '', password: '' });

  // STATI MODALE UTENTI (GOD MODE)
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false); 
  const [editingUser, setEditingUser] = useState(null); 
  const [userFormData, setUserFormData] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente', ristorante_id: '' });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    const token = localStorage.getItem("super_admin_token");
    if (token === "SUPER_GOD_TOKEN_2026") {
        setAuthorized(true);
        caricaDati();
    }
  }, []);

  const handleSuperLogin = async (e) => {
      e.preventDefault();
      setError("");
      try {
          const res = await fetch(`${API_URL}/api/super/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loginData)
          });
          const data = await res.json();
          if (data.success) {
              localStorage.setItem("super_admin_token", data.token);
              setAuthorized(true);
              caricaDati();
          } else {
              setError(data.error);
          }
      } catch (err) { setError("Errore di connessione"); }
  };

  const caricaDati = () => {
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setRistoranti(data); })
      .catch(err => console.error(err));

    fetch(`${API_URL}/api/utenti?mode=super`)
      .then(r => r.json())
      .then(data => { if(Array.isArray(data)) setUtentiGlobali(data); })
      .catch(e => console.error(e));
  };

  // --- LOGICA UTENTI AVANZATA ---
  const handleOpenUserForm = (user = null) => {
      if (user) {
          setEditingUser(user);
          setUserFormData({
              nome: user.nome || '', email: user.email || '', password: user.password || '',
              telefono: user.telefono || '', indirizzo: user.indirizzo || '',
              ruolo: user.ruolo || 'cliente', ristorante_id: user.ristorante_id || ''
          });
      } else {
          setEditingUser(null);
          setUserFormData({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente', ristorante_id: '' });
      }
      setShowUserForm(true);
  };

  const handleSaveUser = async (e) => {
      e.preventDefault();
      const payload = { ...userFormData };
      if (payload.ristorante_id === "") payload.ristorante_id = null;

      try {
          let res;
          if (editingUser) {
              res = await fetch(`${API_URL}/api/utenti/${editingUser.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
              });
          } else {
              res = await fetch(`${API_URL}/api/register`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
              });
          }
          if (res.ok) {
              alert(editingUser ? "Utente aggiornato!" : "Utente creato!");
              setShowUserForm(false);
              caricaDati();
          }
      } catch (err) { alert("Errore connessione"); }
  };

  const handleDeleteUser = async (id, nome) => {
      if (!confirm(`⚠️ AZIONE IRREVERSIBILE\nVuoi eliminare definitivamente l'utente "${nome}"?`)) return;
      try {
          await fetch(`${API_URL}/api/utenti/${id}`, { method: 'DELETE' });
          alert("Utente rimosso.");
          caricaDati();
      } catch (err) { alert("Errore eliminazione"); }
  };

  // --- LOGICA ORDINAMENTO E FILTRO ---
  const handleSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
      let users = [...utentiGlobali];
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          users = users.filter(u => 
              (u.nome && u.nome.toLowerCase().includes(lowerTerm)) ||
              (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
              (u.telefono && u.telefono.includes(lowerTerm)) ||
              (u.ruolo && u.ruolo.toLowerCase().includes(lowerTerm)) ||
              String(u.id).includes(lowerTerm)
          );
      }
      if (sortConfig.key) {
          users.sort((a, b) => {
              let valA = a[sortConfig.key] || "";
              let valB = b[sortConfig.key] || "";
              
              if (sortConfig.key === 'id' || sortConfig.key === 'ristorante_id') {
                  valA = Number(valA); valB = Number(valB);
              }
              
              if (typeof valA === 'string') valA = valA.toLowerCase();
              if (typeof valB === 'string') valB = valB.toLowerCase();

              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return users;
  }, [utentiGlobali, searchTerm, sortConfig]);

  const exportUsersExcel = () => {
      const ws = XLSX.utils.json_to_sheet(filteredUsers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Utenti Globali");
      XLSX.writeFile(wb, "Utenti_Stark_Enterprise.xlsx");
  };

  const handleImportTrigger = () => document.getElementById('file-upload-users').click();
  const handleImportUsers = async (e) => {
      const file = e.target.files[0]; if(!file) return; setUploading(true);
      const formData = new FormData(); formData.append('file', file);
      try {
          const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: formData });
          if(res.ok) { alert("✅ Importazione completata!"); caricaDati(); }
      } catch(err) { alert("Errore"); } finally { setUploading(false); e.target.value = null; }
  };

  // --- GESTIONE RISTORANTI ---
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const apriModaleNuovo = () => { setEditingId(null); setFormData({ nome: '', slug: '', email: '', telefono: '', password: '' }); setShowModal(true); };
  const apriModaleModifica = (r) => { setEditingId(r.id); setFormData({ nome: r.nome, slug: r.slug, email: r.email || '', telefono: r.telefono || '', password: '' }); setShowModal(true); };
  const chiudiModale = () => { setShowModal(false); setEditingId(null); };
  const handleSalva = async (e) => { e.preventDefault(); const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`; const method = editingId ? 'PUT' : 'POST'; try { const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); if(res.ok) { alert(editingId ? "Aggiornato!" : "Creato!"); chiudiModale(); caricaDati(); } } catch(err) { alert("Errore"); } };
  const handleElimina = async (id, nome) => { if(!confirm(`Eliminare "${nome}"?`)) return; try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); caricaDati(); } catch(err) { alert("Errore"); } };
  const toggleSospensione = async (id, statoAttuale) => { setRistoranti(ristoranti.map(r => r.id === id ? { ...r, account_attivo: !statoAttuale } : r)); await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_attivo: !statoAttuale }) }); };
  const toggleMasterCucina = async (id, statoAttualeSuper) => { setRistoranti(ristoranti.map(r => r.id === id ? { ...r, cucina_super_active: !statoAttualeSuper } : r)); await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cucina_super_active: !statoAttualeSuper }) }); };
  const entraNelPannello = (slug) => { localStorage.setItem(`stark_admin_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { if (confirm("Uscire dal J.A.R.V.I.S.?")) { localStorage.removeItem("super_admin_token"); setAuthorized(false); navigate('/'); } };

  if (!authorized) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#000'}}><div style={{background:'#1a1a1a', padding:'40px', borderRadius:'10px', width:'100%', maxWidth:'400px', border:'1px solid #333'}}><h1 style={{color:'white', textAlign:'center', marginBottom:30}}>🛡️ J.A.R.V.I.S. Access</h1><form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}><input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} /><input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} /><div style={{borderTop:'1px solid #333', marginTop:10, paddingTop:10}}><label style={{color:'#888', fontSize:12}}>AUTENTICAZIONE 2 FATTORI</label><input type="text" placeholder="Codice Sicurezza" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white', width:'100%', marginTop:5}} /></div>{error && <p style={{color:'#ff4d4d', textAlign:'center', margin:0}}>{error}</p>}<button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginTop:10}}>VERIFICA IDENTITÀ</button></form></div></div>;

  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '16px' };

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div><h1 style={{margin:0}}>🦸‍♂️ J.A.R.V.I.S. Control</h1><p style={{margin:0, opacity:0.7}}>Stark Enterprise - Global Admin</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO LOCALE</button>
            <button onClick={() => setShowUsersModal(true)} style={{background:'#3498db', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>👥 DATABASE UTENTI</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px'}}>
        {ristoranti.map(r => (
            <div key={r.id} style={{border: '1px solid #ddd', borderRadius: '12px', overflow:'hidden', background: r.account_attivo !== false ? '#fff' : '#f2f2f2', boxShadow: '0 5px 15px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column'}}>
                <div style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
                    <div><h2 style={{margin:0, fontSize:'1.4rem'}}>{r.nome}</h2><span style={{background:'#000000ff', color:'#fff', padding:'3px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</span></div>
                    <div style={{display:'flex', gap:5}}><button onClick={() => apriModaleModifica(r)} style={{background:'#f39c12', border:'none', borderRadius:4, padding:5}}>✏️</button><button onClick={() => handleElimina(r.id, r.nome)} style={{background:'#c0392b', color:'white', border:'none', borderRadius:4, padding:5}}>🗑️</button></div>
                </div>
                <div style={{padding:15, flex:1}}><p>📧 {r.email || '-'}</p><p>📞 {r.telefono || '-'}</p></div>
                <div style={{padding:15, background:'#f9f9f9', borderTop:'1px solid #eee'}}>
                    <button onClick={() => toggleSospensione(r.id, r.account_attivo)} style={{width:'100%', padding:10, background: r.account_attivo !== false ? '#2c3e50':'#e67e22', color:'white', borderRadius:6, marginBottom:10}}>{r.account_attivo !== false ? "⏸️ PAUSA" : "▶️ ATTIVA"}</button>
                    <button onClick={() => toggleMasterCucina(r.id, r.cucina_super_active)} style={{width:'100%', padding:10, background:'white', color: r.cucina_super_active !== false ? '#27ae60':'#c0392b', border:`2px solid ${r.cucina_super_active !== false ? '#27ae60':'#c0392b'}`, borderRadius:6, marginBottom:10}}>{r.cucina_super_active !== false ? "✅ CUCINA ON" : "⛔ CUCINA OFF"}</button>
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background:'#3498db', color:'white', border:'none', padding:12, borderRadius:6, fontWeight:'bold'}}>⚙️ GESTISCI ↗</button>
                </div>
            </div>
        ))}
      </div>

      {/* MODALE RISTORANTE */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%'}}>
                  <h2>{editingId ? "Modifica Locale" : "Nuovo Locale"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:15}}>
                      <input required name="nome" placeholder="Nome Attività" value={formData.nome} onChange={handleInputChange} style={inputStyle} />
                      <input required name="slug" placeholder="Slug (URL)" value={formData.slug} onChange={handleInputChange} style={inputStyle} />
                      <input name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} style={inputStyle} />
                      <input name="telefono" placeholder="Telefono" value={formData.telefono} onChange={handleInputChange} style={inputStyle} />
                      <input name="password" type="password" placeholder="Password Admin" value={formData.password} onChange={handleInputChange} style={inputStyle} />
                      <div style={{display:'flex', gap:10}}><button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, borderRadius:5}}>SALVA</button><button type="button" onClick={chiudiModale} style={{flex:1, background:'#95a5a6', color:'white', padding:12, borderRadius:5}}>ANNULLA</button></div>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODALE DATABASE UTENTI (GOD MODE) --- */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: 'white', borderRadius: '12px', width: '1300px', maxWidth:'98%', height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
                <div style={{padding:'20px 25px', background:'#1a252f', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0}}>🌍 Database Utenti Centralizzato ({filteredUsers.length})</h2>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>✕</button>
                </div>

                <div style={{padding:'15px 25px', background:'#ecf0f1', display:'flex', justifyContent:'space-between', gap:15}}>
                     <input type="text" placeholder="🔍 Cerca per nome, email, telefono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex:1, padding:12, borderRadius:30, border:'1px solid #ccc'}} />
                     <button onClick={() => handleOpenUserForm(null)} style={{background:'#2ecc71', color:'white', padding:'10px 20px', borderRadius:6, fontWeight:'bold'}}>➕ NUOVO UTENTE</button>
                     <button onClick={handleImportTrigger} style={{background:'#e67e22', color:'white', padding:'10px 20px', borderRadius:6, fontWeight:'bold'}}>{uploading ? '...' : '📤 IMPORTA'}</button>
                     <input type="file" id="file-upload-users" style={{display:'none'}} accept=".xlsx, .xls" onChange={handleImportUsers} />
                     <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', padding:'10px 20px', borderRadius:6, fontWeight:'bold'}}>📥 EXCEL</button>
                </div>

                <div style={{flex:1, overflowY:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead style={{position:'sticky', top:0, background:'#f8f9fa', zIndex:10}}>
                            <tr>
                                <th onClick={() => handleSort('id')} style={{padding:15, textAlign:'left', cursor:'pointer', borderBottom:'2px solid #ddd'}}>ID</th>
                                <th onClick={() => handleSort('nome')} style={{padding:15, textAlign:'left', cursor:'pointer', borderBottom:'2px solid #ddd'}}>NOME</th>
                                <th onClick={() => handleSort('email')} style={{padding:15, textAlign:'left', cursor:'pointer', borderBottom:'2px solid #ddd'}}>EMAIL</th>
                                <th style={{padding:15, textAlign:'left', borderBottom:'2px solid #ddd'}}>PASSWORD</th>
                                <th onClick={() => handleSort('ruolo')} style={{padding:15, textAlign:'left', cursor:'pointer', borderBottom:'2px solid #ddd'}}>RUOLO</th>
                                <th onClick={() => handleSort('ristorante_id')} style={{padding:15, textAlign:'left', cursor:'pointer', borderBottom:'2px solid #ddd'}}>LOCALE</th>
                                <th style={{padding:15, textAlign:'left', borderBottom:'2px solid #ddd'}}>TELEFONO</th>
                                <th style={{padding:15, textAlign:'left', borderBottom:'2px solid #ddd'}}>DATA</th>
                                <th style={{padding:15, textAlign:'left', borderBottom:'2px solid #ddd'}}>AZIONI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan="9" style={{padding:'40px', textAlign:'center', color:'#999'}}>Nessun utente trovato.</td></tr>
                            )}
                            {filteredUsers.map((u, idx) => {
                                const locale = ristoranti.find(r => r.id === u.ristorante_id);
                                const nomeLocale = locale ? `${locale.nome} (${locale.slug})` : (u.ristorante_id ? `ID: ${u.ristorante_id}` : 'GLOBALE');
                                
                                return (
                                <tr key={u.id} style={{borderBottom:'1px solid #eee', background: idx%2===0?'#fff':'#fcfcfc'}}>
                                    <td style={{padding:15, color:'#888'}}>#{u.id}</td>
                                    <td style={{padding:15, fontWeight:'bold', color:'#333'}}>{u.nome}</td>
                                    <td style={{padding:15, color:'#3498db'}}>{u.email}</td>
                                    <td style={{padding:15, fontFamily:'monospace', color:'#c0392b', fontWeight:'bold'}}>{u.password}</td>
                                    <td style={{padding:15}}><span style={{background: u.ruolo==='admin'?'#c0392b':(u.ruolo==='cameriere'?'#e67e22':'#3498db'), color:'white', padding:'4px 10px', borderRadius:15, fontSize:10, fontWeight:'bold', textTransform:'uppercase'}}>{u.ruolo || 'cliente'}</span></td>
                                    <td style={{padding:15, fontWeight:'bold', color:'#555'}}>{nomeLocale}</td>
                                    <td style={{padding:15, color:'#666'}}>{u.telefono || '-'}</td>
                                    <td style={{padding:15, fontSize:'11px', color:'#999'}}>{u.data_registrazione ? new Date(u.data_registrazione).toLocaleDateString() : '-'}</td>
                                    <td style={{padding:15}}>
                                        <div style={{display:'flex', gap:5}}>
                                            <button onClick={() => handleOpenUserForm(u)} style={{background:'#f1c40f', border:'none', borderRadius:4, padding:5, cursor:'pointer'}}>✏️</button>
                                            <button onClick={() => handleDeleteUser(u.id, u.nome)} style={{background:'#e74c3c', border:'none', color:'white', borderRadius:4, padding:5, cursor:'pointer'}}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- MODALE AGGIUNGI/MODIFICA UTENTE --- */}
      {showUserForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '450px', boxShadow:'0 15px 40px rgba(0,0,0,0.5)'}}>
                  <h3>{editingUser ? "Modifica Utente" : "Nuovo Utente"}</h3>
                  <form onSubmit={handleSaveUser} style={{display:'flex', flexDirection:'column', gap:12}}>
                      <label style={{fontSize:11, fontWeight:'bold', color:'#888'}}>RUOLO & LOCALE</label>
                      <div style={{display:'flex', gap:10}}>
                          <select value={userFormData.ruolo} onChange={e=>setUserFormData({...userFormData, ruolo:e.target.value})} style={{...inputStyle, flex:1}}>
                              <option value="cliente">Cliente</option><option value="cameriere">Cameriere</option><option value="editor">Editor</option><option value="admin">Admin</option>
                          </select>
                          <select value={userFormData.ristorante_id} onChange={e=>setUserFormData({...userFormData, ristorante_id:e.target.value})} style={{...inputStyle, flex:1}}>
                              <option value="">-- Globale (Nessuno) --</option>
                              {ristoranti.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                          </select>
                      </div>
                      <input placeholder="Nome" value={userFormData.nome} onChange={e=>setUserFormData({...userFormData, nome:e.target.value})} required style={inputStyle} />
                      <input placeholder="Email" value={userFormData.email} onChange={e=>setUserFormData({...userFormData, email:e.target.value})} required style={inputStyle} />
                      <input placeholder="Password" value={userFormData.password} onChange={e=>setUserFormData({...userFormData, password:e.target.value})} required style={{...inputStyle, border:'2px solid #e74c3c'}} />
                      <input placeholder="Telefono" value={userFormData.telefono} onChange={e=>setUserFormData({...userFormData, telefono:e.target.value})} style={inputStyle} />
                      <div style={{display:'flex', gap:10, marginTop:10}}><button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, borderRadius:5}}>SALVA</button><button type="button" onClick={() => setShowUserForm(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:12, borderRadius:5}}>ANNULLA</button></div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}

export default SuperAdmin;