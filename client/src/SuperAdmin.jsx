// client/src/SuperAdmin.jsx - VERSIONE V50 (GOD MODE PRO: SORT, SEARCH, FULL DATA) 🌍
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
    // Fetch Ristoranti
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setRistoranti(data); })
      .catch(err => console.error(err));

    // Fetch Utenti Globali
    fetch(`${API_URL}/api/utenti?mode=super`)
      .then(r => r.json())
      .then(data => { if(Array.isArray(data)) setUtentiGlobali(data); })
      .catch(e => console.error(e));
  };

  // --- LOGICA ORDINAMENTO E FILTRO (GOD MODE) ---
  const handleSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
      let users = [...utentiGlobali];

      // 1. Filtro Ricerca
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

      // 2. Ordinamento
      if (sortConfig.key) {
          users.sort((a, b) => {
              let valA = a[sortConfig.key] || "";
              let valB = b[sortConfig.key] || "";

              // Gestione Numeri
              if (sortConfig.key === 'id' || sortConfig.key === 'ristorante_id') {
                  valA = Number(valA);
                  valB = Number(valB);
              }
              // Gestione Date
              if (sortConfig.key === 'data_registrazione') {
                  valA = new Date(valA || 0);
                  valB = new Date(valB || 0);
              }
              // Gestione Stringhe
              if (typeof valA === 'string') valA = valA.toLowerCase();
              if (typeof valB === 'string') valB = valB.toLowerCase();

              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return users;
  }, [utentiGlobali, searchTerm, sortConfig]);

  // --- IMPORT / EXPORT ---
  const exportUsersExcel = () => {
      const ws = XLSX.utils.json_to_sheet(filteredUsers); // Esporta quelli filtrati
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Utenti Globali");
      XLSX.writeFile(wb, "Utenti_Stark_Enterprise.xlsx");
  };

  const handleImportTrigger = () => document.getElementById('file-upload-users').click();

  const handleImportUsers = async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
          const res = await fetch(`${API_URL}/api/utenti/import/excel`, {
              method: 'POST',
              body: formData
          });
          const d = await res.json();
          if(d.success) {
              alert("✅ Importazione completata con successo!");
              caricaDati();
          } else {
              alert("Errore importazione: " + d.error);
          }
      } catch(err) { alert("Errore connessione"); }
      finally { setUploading(false); e.target.value = null; }
  };

  // --- GESTIONE RISTORANTI ---
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const apriModaleNuovo = () => { setEditingId(null); setFormData({ nome: '', slug: '', email: '', telefono: '', password: '' }); setShowModal(true); };
  const apriModaleModifica = (r) => { setEditingId(r.id); setFormData({ nome: r.nome, slug: r.slug, email: r.email || '', telefono: r.telefono || '', password: '' }); setShowModal(true); };
  const chiudiModale = () => { setShowModal(false); setEditingId(null); };

  const handleSalva = async (e) => {
      e.preventDefault();
      const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`;             
      const method = editingId ? 'PUT' : 'POST';
      try {
          const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
          if(res.ok) { alert(editingId ? "Dati aggiornati!" : "Nuovo ristorante creato!"); chiudiModale(); caricaDati(); } 
          else { alert("Errore salvataggio."); }
      } catch(err) { alert("Errore connessione."); }
  };

  const handleElimina = async (id, nome) => {
      if(!confirm(`⚠️ ATTENZIONE ⚠️\nStai per eliminare "${nome}".\n\nSei sicuro?`)) return;
      try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); alert("Eliminato."); caricaDati(); } 
      catch(err) { alert("Errore eliminazione."); }
  };

  const toggleSospensione = async (id, statoAttuale) => {
    const isAttivo = statoAttuale !== false; 
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, account_attivo: !isAttivo } : r));
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_attivo: !isAttivo }) });
  };

  const toggleMasterCucina = async (id, statoAttualeSuper) => {
    const isMasterActive = statoAttualeSuper !== false; 
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, cucina_super_active: !isMasterActive } : r));
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cucina_super_active: !isMasterActive }) });
  };

  const entraNelPannello = (slug) => { localStorage.setItem(`stark_admin_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  
  const logout = () => {
    if (confirm("Uscire dal J.A.R.V.I.S.?")) {
        localStorage.removeItem("super_admin_token"); 
        setAuthorized(false);
        navigate('/'); 
    }
  };

  if (!authorized) {
    return (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#000'}}>
            <div style={{background:'#1a1a1a', padding:'40px', borderRadius:'10px', width:'100%', maxWidth:'400px', border:'1px solid #333'}}>
                <h1 style={{color:'white', textAlign:'center', marginBottom:30}}>🛡️ J.A.R.V.I.S. Access</h1>
                <form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}>
                    <input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                    <input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                    <div style={{borderTop:'1px solid #333', marginTop:10, paddingTop:10}}>
                        <label style={{color:'#888', fontSize:12}}>AUTENTICAZIONE 2 FATTORI</label>
                        <input type="text" placeholder="Codice Sicurezza" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white', width:'100%', marginTop:5}} />
                    </div>
                    {error && <p style={{color:'#ff4d4d', textAlign:'center', margin:0}}>{error}</p>}
                    <button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginTop:10}}>VERIFICA IDENTITÀ</button>
                </form>
            </div>
        </div>
    );
  }

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
      
      {/* GRIGLIA RISTORANTI */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px'}}>
        {ristoranti.map(r => {
            const isAbbonamentoAttivo = r.account_attivo !== false;
            const isMasterCucinaAttivo = r.cucina_super_active !== false;

            return (
            <div key={r.id} style={{border: '1px solid #ddd', borderRadius: '12px', overflow:'hidden', background: isAbbonamentoAttivo ? '#ffffff' : '#f2f2f2', boxShadow: '0 5px 15px rgba(0,0,0,0.08)', position:'relative', display:'flex', flexDirection:'column'}}>
                <div style={{padding:'15px', borderBottom:'1px solid #eee', background: isAbbonamentoAttivo ? '#fff' : '#e0e0e0', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                        <h2 style={{margin:'0 0 5px 0', fontSize:'1.4rem', color:'#333'}}>{r.nome}</h2>
                        <span style={{background:'#333', color:'#fff', padding:'3px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</span>
                    </div>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => apriModaleModifica(r)} title="Modifica" style={{background:'#f39c12', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px', width:'30px', height:'30px'}}>✏️</button>
                        <button onClick={() => handleElimina(r.id, r.nome)} title="Elimina" style={{background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px', width:'30px', height:'30px'}}>🗑️</button>
                    </div>
                </div>
                <div style={{padding:'15px', color:'#666', fontSize:'0.9rem', flex:1}}>
                    <p style={{margin:'5px 0'}}>📧 {r.email || '-'}</p>
                    <p style={{margin:'5px 0'}}>📞 {r.telefono || '-'}</p>
                </div>
                <div style={{padding:'15px', background:'#f9f9f9', borderTop:'1px solid #eee'}}>
                    <div style={{marginBottom:'15px'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Abbonamento</div>
                        <button onClick={() => toggleSospensione(r.id, r.account_attivo)} style={{width: '100%', padding:'10px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold', background: isAbbonamentoAttivo ? '#2c3e50' : '#e67e22', color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                            {isAbbonamentoAttivo ? <span>⏸️ METTI IN PAUSA</span> : <span>▶️ RIATTIVA ACCOUNT</span>}
                        </button>
                    </div>
                    {isAbbonamentoAttivo ? (
                        <div style={{marginBottom:'15px'}}>
                            <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Cucina Master Switch</div>
                            <button onClick={() => toggleMasterCucina(r.id, r.cucina_super_active)} style={{width: '100%', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', border: isMasterCucinaAttivo ? '2px solid #27ae60' : '2px solid #e74c3c', background: 'white', color: isMasterCucinaAttivo ? '#27ae60' : '#e74c3c', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                                {isMasterCucinaAttivo ? <span>✅ CUCINA ABILITATA</span> : <span>⛔ CUCINA BLOCCATA</span>}
                            </button>
                        </div>
                    ) : (
                        <div style={{background:'#fceceb', color:'#c0392b', padding:'10px', borderRadius:'5px', textAlign:'center', fontSize:'0.9rem', marginBottom:'15px'}}>🚫 Account Sospeso.</div>
                    )}
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background: '#3498db', color: 'white', border: 'none', padding: '12px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold'}}>⚙️ ENTRA NEL PANNELLO ↗</button>
                </div>
            </div>
            );
        })}
      </div>

      {/* --- MODALE RISTORANTE --- */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
                  <h2 style={{marginTop:0, color:'#333'}}>{editingId ? "Modifica Locale" : "Nuovo Locale"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Nome Attività:</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Slug (URL):</label><input required name="slug" value={formData.slug} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Email:</label><input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Telefono:</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} style={inputStyle} /></div>
                      <div style={{borderTop:'1px solid #eee', paddingTop:'10px'}}><label style={{color:'#333', fontWeight:'bold'}}>Password Admin:</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Lascia vuoto per non cambiare" : "Obbligatoria"} style={inputStyle} /></div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>SALVA</button>
                          <button type="button" onClick={chiudiModale} style={{flex:1, background:'#95a5a6', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODALE UTENTI GLOBALI (GOD MODE) --- */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: 'white', borderRadius: '12px', width: '1200px', maxWidth:'98%', height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.7)'}}>
                
                {/* HEADER MODALE */}
                <div style={{padding:'20px 25px', background:'#1a252f', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #34495e'}}>
                    <div>
                        <h2 style={{margin:0, fontSize:'1.6rem', display:'flex', alignItems:'center', gap:'10px'}}>
                            🌍 Database Utenti Centralizzato
                            <span style={{background:'#3498db', fontSize:'0.8rem', padding:'3px 8px', borderRadius:'12px'}}>{filteredUsers.length} totali</span>
                        </h2>
                        <p style={{margin:'5px 0 0 0', opacity:0.6, fontSize:'0.9rem'}}>Visualizzazione e gestione completa di tutti gli utenti registrati nella piattaforma.</p>
                    </div>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', fontSize:'20px', cursor:'pointer', width:'40px', height:'40px', borderRadius:'50%'}}>✕</button>
                </div>

                {/* TOOLBAR AVANZATA */}
                <div style={{padding:'15px 25px', background:'#ecf0f1', borderBottom:'1px solid #bdc3c7', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px'}}>
                     {/* SEARCH BAR */}
                     <div style={{flex:1, minWidth:'250px', position:'relative'}}>
                        <input 
                            type="text" 
                            placeholder="🔍 Cerca per nome, email, telefono o ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{width:'100%', padding:'12px 15px', borderRadius:'30px', border:'1px solid #ccc', outline:'none', fontSize:'14px', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.1)'}}
                        />
                     </div>

                     {/* ACTIONS */}
                     <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={handleImportTrigger} style={{background:'#e67e22', color:'white', border:'none', padding:'10px 20px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                            {uploading ? '⏳ Caricamento...' : '📤 IMPORTA CLIENTI'}
                        </button>
                        <input type="file" id="file-upload-users" style={{display:'none'}} accept=".xlsx, .xls" onChange={handleImportUsers} disabled={uploading} />

                        <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                            📥 SCARICA EXCEL
                        </button>
                     </div>
                </div>

                {/* TABELLA SCROLLABILE */}
                <div style={{flex:1, overflowY:'auto', background:'#fff'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
                        <thead style={{position:'sticky', top:0, background:'#fff', zIndex:10, boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                            <tr style={{background:'#f8f9fa', color:'#7f8c8d', textAlign:'left', borderBottom:'2px solid #ecf0f1'}}>
                                {[
                                    { k: 'id', l: 'ID' },
                                    { k: 'nome', l: 'NOME COMPLETO' },
                                    { k: 'email', l: 'EMAIL' },
                                    { k: 'ruolo', l: 'RUOLO' },
                                    { k: 'telefono', l: 'TELEFONO' },
                                    { k: 'indirizzo', l: 'INDIRIZZO' },
                                    { k: 'ristorante_id', l: 'LOCALE ID' },
                                    { k: 'data_registrazione', l: 'REGISTRATO IL' }
                                ].map(col => (
                                    <th key={col.k} onClick={() => handleSort(col.k)} style={{padding:'15px', cursor:'pointer', userSelect:'none'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                            {col.l}
                                            {sortConfig.key === col.k && (
                                                <span style={{fontSize:'10px'}}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan="8" style={{padding:'40px', textAlign:'center', color:'#999'}}>Nessun utente trovato con questi criteri.</td></tr>
                            )}
                            {filteredUsers.map((u, idx) => (
                                <tr key={u.id} style={{borderBottom:'1px solid #ecf0f1', background: idx % 2 === 0 ? 'white' : '#fcfcfc'}}>
                                    <td style={{padding:'12px 15px', color:'#7f8c8d', fontWeight:'bold'}}>#{u.id}</td>
                                    <td style={{padding:'12px 15px', color:'#2c3e50', fontWeight:'600'}}>{u.nome}</td>
                                    <td style={{padding:'12px 15px', color:'#3498db'}}>{u.email}</td>
                                    <td style={{padding:'12px 15px'}}>
                                        <span style={{
                                            background: u.ruolo === 'admin' ? '#c0392b' : (u.ruolo === 'cameriere' ? '#e67e22' : '#3498db'),
                                            color:'white', padding:'4px 10px', borderRadius:'15px', fontSize:'11px', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.5px'
                                        }}>
                                            {u.ruolo || 'CLIENTE'}
                                        </span>
                                    </td>
                                    <td style={{padding:'12px 15px', color:'#555'}}>{u.telefono || '-'}</td>
                                    <td style={{padding:'12px 15px', color:'#555', maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={u.indirizzo}>{u.indirizzo || '-'}</td>
                                    <td style={{padding:'12px 15px', color:'#7f8c8d', fontWeight:'bold'}}>{u.ristorante_id || 'GLOBALE'}</td>
                                    <td style={{padding:'12px 15px', color:'#95a5a6', fontSize:'12px'}}>
                                        {u.data_registrazione ? new Date(u.data_registrazione).toLocaleDateString() + ' ' + new Date(u.data_registrazione).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default SuperAdmin;