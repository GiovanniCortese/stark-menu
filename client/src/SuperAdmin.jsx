// client/src/SuperAdmin.jsx - VERSIONE V72 (FIX TABLE & GRANULAR DATES) 🚀
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
  
  // STATO CONFIGURAZIONE
  const [formData, setFormData] = useState({ 
      nome: '', 
      slug: '', 
      email: '', 
      telefono: '', 
      password: '', 
      account_attivo: true,
      data_scadenza: new Date().toISOString().split('T')[0], 
      
      // Moduli Boolean
      modulo_cassa: true,           
      modulo_menu_digitale: true,   
      modulo_ordini_clienti: true,  
      modulo_magazzino: false,      
      modulo_haccp: false,          
      modulo_utenti: false,         
      
      // Suite Flag
      cassa_full_suite: true
  });

  // STATI MODALE UTENTI GLOBAL
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false); 
  const [editingUser, setEditingUser] = useState(null); 
  const [userFormData, setUserFormData] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente', ristorante_id: '' });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // DEFINIZIONE COLONNE MODULI (Per generare la tabella dinamicamente)
  const modulesConfig = [
      { key: 'menu_digitale', label: '📱 Menu' },
      { key: 'ordini_clienti', label: '🍽️ Ordini' },
      { key: 'cassa', label: '💶 Cassa' },
      { key: 'magazzino', label: '📦 Magazzino' },
      { key: 'haccp', label: '🛡️ HACCP' },
      { key: 'utenti', label: '👥 Utenti' },
  ];

  useEffect(() => {
    const token = localStorage.getItem("super_admin_token");
    if (token === "SUPER_GOD_TOKEN_2026") {
        setAuthorized(true);
        caricaDati();
    }
  }, []);

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

  // --- AZIONI SUI RISTORANTI ---

  const toggleModulo = async (id, field, currentValue) => {
    const newValue = !currentValue;
    // Aggiornamento Ottimistico UI
    setRistoranti(prev => prev.map(r => r.id === id ? { ...r, [field]: newValue } : r));

    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: newValue })
        });
    } catch (error) {
        console.error("Errore update modulo:", error);
        caricaDati(); // Revert in caso di errore
    }
  };

  const updateDate = async (id, field, value) => {
    // Aggiorna stato locale optimistic
    setRistoranti(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value })
        });
    } catch (error) {
        console.error("Errore update date:", error);
    }
  };

  const handleElimina = async (id, nome) => { 
      if(!confirm(`⚠️ ATTENZIONE: Eliminare definitivamente "${nome}" e tutti i suoi dati?`)) return; 
      try { 
          await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); 
          caricaDati(); 
      } catch(err) { alert("Errore cancellazione"); } 
  };

  // --- GESTIONE MODALE CONFIGURAZIONE ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const apriModaleNuovo = () => { 
      setEditingId(null); 
      setFormData({ 
          nome: '', slug: '', email: '', telefono: '', password: '', 
          account_attivo: true,
          data_scadenza: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
          modulo_cassa: true, 
          modulo_menu_digitale: true,
          modulo_ordini_clienti: true,
          modulo_magazzino: false,
          modulo_haccp: false,
          modulo_utenti: false,
          cassa_full_suite: true
      }); 
      setShowModal(true); 
  };

  const handleSalva = async (e) => { 
      e.preventDefault(); 
      const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`; 
      const method = editingId ? 'PUT' : 'POST'; 
      
      try { 
          const res = await fetch(endpoint, { 
              method, 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify(formData) 
          }); 
          
          if(res.ok) { 
              alert(editingId ? "✅ Configurazione aggiornata!" : "✅ Locale creato con successo!"); 
              setShowModal(false); 
              caricaDati(); 
          } else {
              const data = await res.json(); 
              alert("❌ Errore Salvataggio: " + (data.error || "Errore sconosciuto"));
          }
      } catch(err) { alert("❌ Errore di connessione o Server Offline"); } 
  };

  const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(ristoranti);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ristoranti");
      XLSX.writeFile(wb, "Report_SuperAdmin.xlsx");
  };

  const logout = () => { 
      if (confirm("Uscire dal J.A.R.V.I.S.?")) { 
          localStorage.removeItem("super_admin_token"); 
          setAuthorized(false); 
      } 
  };

  // --- LOGICA UTENTI GLOBALI ---
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
          let res = editingUser 
            ? await fetch(`${API_URL}/api/utenti/${editingUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            : await fetch(`${API_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { alert("Dato salvato!"); setShowUserForm(false); caricaDati(); }
      } catch (err) { alert("Errore connessione"); }
  };

  const handleDeleteUser = async (id, nome) => { if (!confirm(`Vuoi eliminare definitivamente l'utente "${nome}"?`)) return; try { await fetch(`${API_URL}/api/utenti/${id}`, { method: 'DELETE' }); caricaDati(); } catch (err) { alert("Errore"); } };
  
  const handleSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
      let users = [...utentiGlobali];
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          users = users.filter(u => (u.nome && u.nome.toLowerCase().includes(lowerTerm)) || (u.email && u.email.toLowerCase().includes(lowerTerm)) || (u.ruolo && u.ruolo.toLowerCase().includes(lowerTerm)));
      }
      if (sortConfig.key) {
          users.sort((a, b) => {
              let valA = a[sortConfig.key] || ""; let valB = b[sortConfig.key] || "";
              if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase();
              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return users;
  }, [utentiGlobali, searchTerm, sortConfig]);

  const exportUsersExcel = () => { const ws = XLSX.utils.json_to_sheet(filteredUsers); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Utenti Globali"); XLSX.writeFile(wb, "Utenti_JARVIS.xlsx"); };
  const handleImportTrigger = () => document.getElementById('file-upload-users').click();
  const handleImportUsers = async (e) => { const file = e.target.files[0]; if(!file) return; setUploading(true); const fd = new FormData(); fd.append('file', file); try { const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: fd }); if(res.ok) { alert("Importazione completata!"); caricaDati(); } } catch(err) { alert("Errore"); } finally { setUploading(false); e.target.value = null; } };

  // --- STILI CSS ---
  const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };

  if (!authorized) return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#000'}}>
        <div style={{background:'#1a1a1a', padding:'40px', borderRadius:'10px', width:'100%', maxWidth:'400px', border:'1px solid #333'}}>
            <h1 style={{color:'white', textAlign:'center', marginBottom:30}}>🛡️ J.A.R.V.I.S. Access</h1>
            <form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}>
                <input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                <input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                <input type="text" placeholder="Codice Sicurezza 2FA" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white', width:'100%'}} />
                {error && <p style={{color:'#ff4d4d', textAlign:'center', margin:0}}>{error}</p>}
                <button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginTop:10}}>ENTRA</button>
            </form>
        </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh', background:'#f4f6f8', padding:20, fontFamily:'sans-serif'}}>
      <div style={{maxWidth:'1600px', margin:'0 auto'}}>
          
          {/* HEADER */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
              <div>
                  <h1 style={{color:'#2c3e50', margin:0}}>🛠️ SuperAdmin Control Panel</h1>
                  <p style={{color:'#7f8c8d', margin:0}}>Gestione Licenze Granulari & Scadenze</p>
              </div>
              <div style={{display:'flex', gap:10}}>
                  <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO</button>
                  <button onClick={() => setShowUsersModal(true)} style={{background:'#3498db', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>👥 UTENTI</button>
                  <button onClick={exportExcel} style={{background:'#8e44ad', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer'}}>📊 EXCEL</button>
                  <button onClick={logout} style={{background:'#34495e', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer'}}>ESCI</button>
              </div>
          </div>

          {/* TABELLA RISTORANTI (SCROLLABILE) */}
          <div style={{background:'white', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.05)', overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', minWidth:'1200px'}}>
                      <thead style={{background:'#2c3e50', color:'white'}}>
                          <tr>
                              <th style={{padding:15, textAlign:'left'}}>ID / Ristorante</th>
                              <th style={{padding:15, textAlign:'left'}}>Contatti</th>
                              
                              {/* HEADER DINAMICO MODULI */}
                              {modulesConfig.map(m => (
                                  <th key={m.key} style={{padding:15, textAlign:'center', minWidth:'140px'}}>
                                      {m.label}
                                  </th>
                              ))}
                              
                              <th style={{padding:15, textAlign:'center'}}>Stato Globale</th>
                              <th style={{padding:15, textAlign:'center'}}>Azioni</th>
                          </tr>
                      </thead>
                      <tbody>
                          {ristoranti.map(r => (
                              <tr key={r.id} style={{borderBottom:'1px solid #eee', background: r.account_attivo ? 'white' : '#fff5f5'}}>
                                  
                                  {/* INFO BASE */}
                                  <td style={{padding:15}}>
                                      <div style={{fontWeight:'bold', color:'#2c3e50', fontSize:'15px'}}>{r.nome}</div>
                                      <div style={{fontSize:11, color:'#95a5a6', fontFamily:'monospace'}}>{r.slug}</div>
                                  </td>
                                  <td style={{padding:15}}>
                                      <div style={{fontSize:12}}>{r.email}</div>
                                      <div style={{fontSize:11, color:'#7f8c8d'}}>{r.telefono}</div>
                                  </td>

                                  {/* LOOP MODULI GRANULARI */}
                                  {modulesConfig.map(m => {
                                      const fieldBool = `modulo_${m.key}`;
                                      const fieldDate = `scadenza_${m.key}`;
                                      const isActive = r[fieldBool];
                                      
                                      // Gestione sicura della data
                                      let dateVal = "";
                                      if (r[fieldDate]) {
                                          try { dateVal = new Date(r[fieldDate]).toISOString().split('T')[0]; } catch (e) {}
                                      }

                                      return (
                                          <td key={m.key} style={{padding:10, textAlign:'center', borderLeft:'1px dashed #eee'}}>
                                              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                                                  
                                                  {/* SWITCH ATTIVO/DISATTIVO */}
                                                  <div 
                                                      onClick={() => toggleModulo(r.id, fieldBool, isActive)}
                                                      title={isActive ? "Disattiva Modulo" : "Attiva Modulo"}
                                                      style={{
                                                          width: 40, height: 20, 
                                                          background: isActive ? '#2ecc71' : '#bdc3c7',
                                                          borderRadius: 20, 
                                                          position:'relative', 
                                                          cursor:'pointer',
                                                          transition: 'background 0.3s'
                                                      }}
                                                  >
                                                      <div style={{
                                                          width: 16, height: 16, background:'white', borderRadius:'50%', 
                                                          position:'absolute', top:2, 
                                                          left: isActive ? 22 : 2, 
                                                          transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)'
                                                      }} />
                                                  </div>

                                                  {/* DATE PICKER (Solo se attivo) */}
                                                  {isActive ? (
                                                      <input 
                                                          type="date" 
                                                          value={dateVal}
                                                          onChange={(e) => updateDate(r.id, fieldDate, e.target.value)}
                                                          style={{
                                                              fontSize:10, padding:3, borderRadius:4, 
                                                              border:'1px solid #ddd', width:'100%', maxWidth:'100px',
                                                              background: dateVal && new Date(dateVal) < new Date() ? '#fab1a0' : 'white',
                                                              color: '#333'
                                                          }}
                                                      />
                                                  ) : (
                                                      <span style={{fontSize:10, color:'#b2bec3', fontStyle:'italic'}}>Da attivare</span>
                                                  )}
                                              </div>
                                          </td>
                                      );
                                  })}

                                  {/* ACCOUNT ATTIVO GLOBALE */}
                                  <td style={{padding:15, textAlign:'center'}}>
                                      <button 
                                          onClick={() => toggleModulo(r.id, 'account_attivo', r.account_attivo)}
                                          style={{
                                              background: r.account_attivo ? '#dff9fb' : '#ff7979',
                                              color: r.account_attivo ? '#130f40' : 'white',
                                              border:'none', padding:'5px 10px', borderRadius:5, fontSize:11, fontWeight:'bold', cursor:'pointer'
                                          }}
                                      >
                                          {r.account_attivo ? "ATTIVO" : "SOSPESO"}
                                      </button>
                                  </td>

                                  {/* AZIONI */}
                                  <td style={{padding:15, textAlign:'center'}}>
                                      <button onClick={() => handleElimina(r.id, r.nome)} style={{background:'#c0392b', color:'white', border:'none', width:30, height:30, borderRadius:5, cursor:'pointer', fontSize:14}}>🗑️</button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* MODALE RISTORANTE (EDIT/CREATE) */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '0', borderRadius: '15px', width: '600px', maxWidth:'95%', maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column'}}>
                  
                  {/* HEADER MODALE */}
                  <div style={{padding:'20px', background:'#2c3e50', color:'white', borderRadius:'15px 15px 0 0'}}>
                      <h2 style={{margin:0}}>{editingId ? `Configura: ${formData.nome}` : "Nuovo Ristorante"}</h2>
                  </div>

                  <form onSubmit={handleSalva} style={{padding:'20px', display:'flex', flexDirection:'column', gap:20}}>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>NOME ATTIVITÀ</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>SLUG (URL)</label><input required name="slug" value={formData.slug} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>EMAIL</label><input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>PASSWORD</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} style={inputStyle} placeholder="Opzionale" /></div>
                      </div>

                      <div style={{background:'#f8f9fa', padding:15, borderRadius:8, border:'1px solid #ddd'}}>
                          <h4 style={{margin:'0 0 10px 0'}}>Attivazione Iniziale Moduli</h4>
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="modulo_menu_digitale" checked={formData.modulo_menu_digitale} onChange={handleInputChange} /> Menu Digitale</label>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="modulo_ordini_clienti" checked={formData.modulo_ordini_clienti} onChange={handleInputChange} /> Ordini Tavolo</label>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="modulo_cassa" checked={formData.modulo_cassa} onChange={handleInputChange} /> Sistema Cassa</label>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="modulo_magazzino" checked={formData.modulo_magazzino} onChange={handleInputChange} /> Magazzino</label>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="modulo_haccp" checked={formData.modulo_haccp} onChange={handleInputChange} /> HACCP</label>
                             <label style={{display:'flex', alignItems:'center', gap:5}}><input type="checkbox" name="cassa_full_suite" checked={formData.cassa_full_suite} onChange={handleInputChange} /> Full Suite (KDS)</label>
                          </div>
                      </div>

                      <div style={{display:'flex', gap:10}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer'}}>SALVA</button>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODALE UTENTI */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: 'white', borderRadius: '12px', width: '1300px', maxWidth:'98%', height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
                <div style={{padding:'20px 25px', background:'#1a252f', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0}}>🌍 Database Utenti Centralizzato</h2>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>✕</button>
                </div>
                
                {/* TOOLBAR UTENTI */}
                <div style={{padding:'15px', background:'#ecf0f1', display:'flex', gap:10, flexWrap:'wrap'}}>
                     <input type="text" placeholder="🔍 Cerca utente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex:1, padding:10, borderRadius:5, border:'1px solid #ccc'}} />
                     <button onClick={() => handleOpenUserForm(null)} style={{background:'#2ecc71', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>➕ NUOVO</button>
                     <button onClick={handleImportTrigger} style={{background:'#e67e22', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>{uploading ? '...' : '📤 IMPORTA'}</button>
                     <input type="file" id="file-upload-users" style={{display:'none'}} accept=".xlsx, .xls" onChange={handleImportUsers} />
                     <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>📥 EXCEL</button>
                </div>

                <div style={{flex:1, overflowY:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead style={{position:'sticky', top:0, background:'#f8f9fa', zIndex:10}}>
                            <tr>
                                <th onClick={() => handleSort('id')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>ID</th>
                                <th onClick={() => handleSort('nome')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>NOME</th>
                                <th onClick={() => handleSort('email')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>EMAIL</th>
                                <th style={{padding:15, textAlign:'left'}}>RUOLO</th>
                                <th style={{padding:15, textAlign:'left'}}>LOCALE</th>
                                <th style={{padding:15, textAlign:'left'}}>AZIONI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u, idx) => (
                                <tr key={u.id} style={{borderBottom:'1px solid #eee', background: idx%2===0?'#fff':'#fcfcfc'}}>
                                    <td style={{padding:15, color:'#888'}}>#{u.id}</td>
                                    <td style={{padding:15, fontWeight:'bold'}}>{u.nome}</td>
                                    <td style={{padding:15, color:'#3498db'}}>{u.email}</td>
                                    <td style={{padding:15}}><span style={{background: u.ruolo==='admin'?'#c0392b':'#3498db', color:'white', padding:'4px 10px', borderRadius:15, fontSize:10, fontWeight:'bold'}}>{u.ruolo}</span></td>
                                    <td style={{padding:15}}>{ristoranti.find(r => r.id === u.ristorante_id)?.nome || 'GLOBALE'}</td>
                                    <td style={{padding:15}}>
                                        <button onClick={() => handleOpenUserForm(u)} style={{background:'#f1c40f', border:'none', borderRadius:4, padding:'5px 10px', marginRight:5, cursor:'pointer'}}>✏️</button>
                                        <button onClick={() => handleDeleteUser(u.id, u.nome)} style={{background:'#e74c3c', border:'none', color:'white', borderRadius:4, padding:'5px 10px', cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* MODALE EDIT UTENTE */}
      {showUserForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '450px', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
                  <h3>{editingUser ? "Modifica Utente" : "Nuovo Utente"}</h3>
                  <form onSubmit={handleSaveUser} style={{display:'flex', flexDirection:'column', gap:12}}>
                      <div style={{display:'flex', gap:10}}>
                          <select value={userFormData.ruolo} onChange={e=>setUserFormData({...userFormData, ruolo:e.target.value})} style={{...inputStyle, flex:1}}>
                              <option value="cliente">Cliente</option><option value="cameriere">Cameriere</option><option value="editor">Editor</option><option value="admin">Admin</option>
                          </select>
                          <select value={userFormData.ristorante_id} onChange={e=>setUserFormData({...userFormData, ristorante_id:e.target.value})} style={{...inputStyle, flex:1}}>
                              <option value="">-- Globale --</option>
                              {ristoranti.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                          </select>
                      </div>
                      <input placeholder="Nome" value={userFormData.nome} onChange={e=>setUserFormData({...userFormData, nome:e.target.value})} required style={inputStyle} />
                      <input placeholder="Email" value={userFormData.email} onChange={e=>setUserFormData({...userFormData, email:e.target.value})} required style={inputStyle} />
                      <input placeholder="Password" value={userFormData.password} onChange={e=>setUserFormData({...userFormData, password:e.target.value})} style={{...inputStyle, border:'1px solid #e74c3c'}} />
                      <div style={{display:'flex', gap:10, marginTop:10}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:12, borderRadius:5, border:'none', fontWeight:'bold', cursor:'pointer'}}>SALVA</button>
                          <button type="button" onClick={() => setShowUserForm(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:12, borderRadius:5, border:'none', fontWeight:'bold', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default SuperAdmin;