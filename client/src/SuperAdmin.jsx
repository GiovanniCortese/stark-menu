// client/src/SuperAdmin.jsx - VERSIONE V100 (NEW UI + LIDI & PIN MODE) 🚀
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

function SuperAdmin() {
  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- STATI DI NAVIGAZIONE & UI ---
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'ristoranti', 'utenti'
  const [authorized, setAuthorized] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '', code2fa: '' });
  const [error, setError] = useState("");

  // --- DATI ---
  const [ristoranti, setRistoranti] = useState([]);
  const [utentiGlobali, setUtentiGlobali] = useState([]); 
  const [stats, setStats] = useState({ totalRevenue: 0, activeClients: 0, totalUsers: 0 });

  // --- STATI RICERCA & SORTING ---
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  // --- STATI MODALI ---
  // 1. Modale Ristorante (Edit/New)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ 
      nome: '', slug: '', email: '', password: '', account_attivo: true,
      data_scadenza: new Date().toISOString().split('T')[0], 
      tipo_business: 'ristorante', pin_mode: false,             
      telefono: '', referente: '', sede_legale: '', sede_operativa: '', 
      piva: '', codice_fiscale: '', pec: '', codice_sdi: '', note_interne: '',
      modulo_cassa: true, modulo_menu_digitale: true, modulo_ordini_clienti: true,  
      modulo_magazzino: false, modulo_haccp: false, modulo_utenti: false, cassa_full_suite: true
  });

  // 2. Modale Utente (Edit/New)
  const [showUserForm, setShowUserForm] = useState(false); 
  const [editingUser, setEditingUser] = useState(null); 
  const [userFormData, setUserFormData] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente', ristorante_id: '' });

  // --- CONFIGURAZIONI ---
  const modulesConfig = [
      { label: '📱 Menu', dbField: 'modulo_menu_digitale', dateField: 'scadenza_menu_digitale' },
      { label: '🍽️ Ordini', dbField: 'modulo_ordini_clienti', dateField: 'scadenza_ordini_clienti' },
      { label: '💶 Cassa', dbField: 'modulo_cassa', dateField: 'scadenza_cassa' },
      { label: '👨‍🍳 Suite', dbField: 'cassa_full_suite', dateField: 'scadenza_cassa' }, 
      { label: '📦 Magaz.', dbField: 'modulo_magazzino', dateField: 'scadenza_magazzino' },
      { label: '🛡️ HACCP', dbField: 'modulo_haccp', dateField: 'scadenza_haccp' },
      { label: '👥 Utenti', dbField: 'modulo_utenti', dateField: 'scadenza_utenti' },
  ];

  const businessIcons = {
      ristorante: '🍽️', discoteca: '🍾', bar: '🍹', padel: '🎾', parrucchiere: '💇', lido: '🏖️'
  };

  // --- EFFETTI ---
  useEffect(() => {
    const token = localStorage.getItem("super_admin_token");
    if (token === "SUPER_GOD_TOKEN_2026") {
        setAuthorized(true);
        caricaDati();
    }
  }, []);

  const caricaDati = () => {
    // 1. Fetch Ristoranti
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => { 
          if(Array.isArray(data)) {
              setRistoranti(data);
              // Calcolo stats al volo
              setStats(prev => ({
                  ...prev,
                  totalRevenue: data.length * 500, // Esempio calcolo
                  activeClients: data.filter(r => r.account_attivo).length
              }));
          }
      })
      .catch(err => console.error(err));

    // 2. Fetch Utenti
    fetch(`${API_URL}/api/utenti?mode=super`)
      .then(r => r.json())
      .then(data => { 
          if(Array.isArray(data)) {
              setUtentiGlobali(data); 
              setStats(prev => ({ ...prev, totalUsers: data.length }));
          }
      })
      .catch(e => console.error(e));
  };

  // --- AUTH ---
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
          } else { setError(data.error); }
      } catch (err) { setError("Errore di connessione"); }
  };

  const logout = () => { 
      if (confirm("Uscire dal J.A.R.V.I.S.?")) { localStorage.removeItem("super_admin_token"); setAuthorized(false); } 
  };

  // --- LOGICA RISTORANTI ---
  const filteredRistoranti = useMemo(() => {
    let data = [...ristoranti];
    if (restaurantSearchTerm) {
        const term = restaurantSearchTerm.toLowerCase();
        data = data.filter(r => (r.nome?.toLowerCase().includes(term)) || (r.slug?.toLowerCase().includes(term)) || (r.email?.toLowerCase().includes(term)));
    }
    return data.sort((a,b) => b.id - a.id);
  }, [ristoranti, restaurantSearchTerm]);

  const toggleModulo = async (id, field, currentValue) => {
    const newValue = !currentValue;
    setRistoranti(prev => prev.map(r => r.id === id ? { ...r, [field]: newValue } : r));
    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: newValue })
        });
    } catch (error) { console.error("Errore update modulo:", error); caricaDati(); }
  };

  const updateDate = async (id, field, value) => {
    setRistoranti(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value })
        });
    } catch (error) { console.error("Errore update date:", error); }
  };

  const handleElimina = async (id, nome) => { 
      if(!confirm(`⚠️ ATTENZIONE: Eliminare definitivamente "${nome}" e tutti i suoi dati?`)) return; 
      try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); caricaDati(); } catch(err) { alert("Errore cancellazione"); } 
  };

  const entraNelPannello = (r) => {
      localStorage.setItem("admin_token", "SUPER_GOD_TOKEN_2026");
      localStorage.setItem("superadmin_target_id", String(r.id));
      localStorage.setItem("superadmin_target_slug", r.slug);
      localStorage.setItem("superadmin_target_nome", r.nome);
      localStorage.setItem("user", JSON.stringify({
          id: r.id, nome: r.nome, slug: r.slug, email: r.email, ruolo: 'admin', is_god_mode: true
      }));
      window.open(`/login`, "_blank");
  };

  // --- GESTIONE MODALE RISTORANTE ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const apriModaleNuovo = () => { 
      setEditingId(null); 
      setFormData({ 
          nome: '', slug: '', email: '', password: '', telefono: '', referente: '', piva: '', codice_fiscale: '', pec: '', codice_sdi: '',
          sede_legale: '', sede_operativa: '', note_interne: '', account_attivo: true,
          data_scadenza: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
          tipo_business: 'ristorante', pin_mode: false,
          modulo_cassa: true, modulo_menu_digitale: true, modulo_ordini_clienti: true, modulo_magazzino: false, modulo_haccp: false, modulo_utenti: false, cassa_full_suite: true
      }); 
      setShowModal(true); 
  };

  const avviaModifica = (r) => {
      setEditingId(r.id);
      setFormData({
          nome: r.nome || '', slug: r.slug || '', email: r.email || '', password: '', account_attivo: r.account_attivo,
          data_scadenza: r.data_scadenza ? r.data_scadenza.split('T')[0] : '',
          tipo_business: r.tipo_business || 'ristorante', pin_mode: r.pin_mode || false,
          telefono: r.telefono || '', referente: r.referente || '', piva: r.piva || '', codice_fiscale: r.codice_fiscale || '',
          pec: r.pec || '', codice_sdi: r.codice_sdi || '', sede_legale: r.sede_legale || '', sede_operativa: r.sede_operativa || '', note_interne: r.note_interne || '',
          modulo_cassa: r.modulo_cassa, modulo_menu_digitale: r.modulo_menu_digitale, modulo_ordini_clienti: r.modulo_ordini_clienti,
          modulo_magazzino: r.modulo_magazzino, modulo_haccp: r.modulo_haccp, modulo_utenti: r.modulo_utenti, cassa_full_suite: r.cassa_full_suite
      });
      setShowModal(true);
  };

  const handleSalvaRistorante = async (e) => { 
      e.preventDefault(); 
      const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`; 
      const method = editingId ? 'PUT' : 'POST'; 
      try { 
          const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); 
          if(res.ok) { alert("✅ Salvato!"); setShowModal(false); caricaDati(); } 
          else { const data = await res.json(); alert("❌ Errore: " + (data.error || "Sconosciuto")); }
      } catch(err) { alert("❌ Errore di connessione"); } 
  };

  // --- LOGICA UTENTI GLOBALI ---
  const filteredUsers = useMemo(() => {
      let users = [...utentiGlobali];
      if (userSearchTerm) {
          const lowerTerm = userSearchTerm.toLowerCase();
          users = users.filter(u => (u.nome?.toLowerCase().includes(lowerTerm)) || (u.email?.toLowerCase().includes(lowerTerm)));
      }
      return users.sort((a,b) => b.id - a.id);
  }, [utentiGlobali, userSearchTerm]);

  const handleOpenUserForm = (user = null) => {
      if (user) {
          setEditingUser(user);
          setUserFormData({ nome: user.nome || '', email: user.email || '', password: '', telefono: user.telefono || '', indirizzo: user.indirizzo || '', ruolo: user.ruolo || 'cliente', ristorante_id: user.ristorante_id || '' });
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

  const handleDeleteUser = async (id, nome) => { if (!confirm(`Eliminare "${nome}"?`)) return; try { await fetch(`${API_URL}/api/utenti/${id}`, { method: 'DELETE' }); caricaDati(); } catch (err) { alert("Errore"); } };
  
  // EXPORT / IMPORT
  const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(ristoranti);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ristoranti");
      XLSX.writeFile(wb, "Report_SuperAdmin.xlsx");
  };

  const handleImportUsers = async (e) => { 
      const file = e.target.files[0]; if(!file) return; setUploading(true); 
      const fd = new FormData(); fd.append('file', file); 
      try { const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: fd }); 
      if(res.ok) { alert("Importazione completata!"); caricaDati(); } } catch(err) { alert("Errore"); } finally { setUploading(false); e.target.value = null; } 
  };

  // --- UI RENDER COMPONENTS ---

  // 1. LOGIN SCREEN (Se non autorizzato)
  if (!authorized) return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#111', color:'white'}}>
        <div style={{background:'#1a1a1a', padding:'40px', borderRadius:'12px', width:'100%', maxWidth:'400px', border:'1px solid #333', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
            <h1 style={{color:'#e74c3c', textAlign:'center', marginBottom:30, fontFamily:'monospace', fontSize:'2rem'}}>🛡️ J.A.R.V.I.S.</h1>
            <form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}>
                <input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:6, border:'1px solid #333', background:'#222', color:'white'}} />
                <input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:6, border:'1px solid #333', background:'#222', color:'white'}} />
                <input type="text" placeholder="Codice 2FA" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:6, border:'1px solid #333', background:'#222', color:'white'}} />
                {error && <p style={{color:'#ef4444', textAlign:'center', margin:0}}>{error}</p>}
                <button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:6, fontWeight:'bold', cursor:'pointer', marginTop:10}}>ACCEDI AL PROTOCOLLO</button>
            </form>
        </div>
    </div>
  );

  // 2. DASHBOARD LAYOUT (Se autorizzato)
  return (
    <div className="dashboard-container">
      
      {/* SIDEBAR */}
      <div className="sidebar">
          <div className="sidebar-logo">
              🦸‍♂️ J.A.R.V.I.S.
          </div>
          
          <div className={`nav-item ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}>
              📊 Dashboard
          </div>
          <div className={`nav-item ${activeTab==='ristoranti'?'active':''}`} onClick={()=>setActiveTab('ristoranti')}>
              🏢 Clienti Business
          </div>
          <div className={`nav-item ${activeTab==='utenti'?'active':''}`} onClick={()=>setActiveTab('utenti')}>
              👥 Utenti Globali
          </div>

          <div style={{marginTop:'auto', paddingTop:20, borderTop:'1px solid #333'}}>
              <div className="nav-item" onClick={logout} style={{color:'#e74c3c'}}>
                  🚪 Disconnetti
              </div>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
          
          {/* HEADER */}
          <div className="top-header">
              <div className="page-title">
                  {activeTab === 'dashboard' && 'Controllo Centrale'}
                  {activeTab === 'ristoranti' && 'Gestione Clienti & Moduli'}
                  {activeTab === 'utenti' && 'Database Utenti'}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <span style={{fontWeight:'bold', color:'#333'}}>Stark Industries</span>
                  <div style={{width:35, height:35, borderRadius:'50%', background:'#333', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>TS</div>
              </div>
          </div>

          {/* CONTENT AREA */}
          <div className="content-area">
              
              {/* --- VISTA DASHBOARD --- */}
              {activeTab === 'dashboard' && (
                  <>
                    <div className="stats-grid">
                        <div className="stat-card" style={{borderLeftColor:'#e74c3c'}}>
                            <div className="stat-label">Ricavi Stimati</div>
                            <div className="stat-value">€ {stats.totalRevenue}</div>
                        </div>
                        <div className="stat-card" style={{borderLeftColor:'#27ae60'}}>
                            <div className="stat-label">Locali Attivi</div>
                            <div className="stat-value">{stats.activeClients} / {ristoranti.length}</div>
                        </div>
                        <div className="stat-card" style={{borderLeftColor:'#3498db'}}>
                            <div className="stat-label">Utenti Totali</div>
                            <div className="stat-value">{stats.totalUsers}</div>
                        </div>
                    </div>
                    
                    {/* Accesso Rapido */}
                    <div className="card-panel">
                        <h3>⚡ Azioni Rapide</h3>
                        <div style={{display:'flex', gap:15}}>
                            <button className="btn-success" onClick={apriModaleNuovo}>+ Nuovo Cliente</button>
                            <button className="btn-primary" onClick={exportExcel}>Scarica Report</button>
                        </div>
                    </div>
                  </>
              )}

              {/* --- VISTA RISTORANTI --- */}
              {activeTab === 'ristoranti' && (
                  <div className="card-panel" style={{overflowX:'auto'}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                          <input 
                              type="text" 
                              placeholder="🔍 Cerca cliente..." 
                              value={restaurantSearchTerm}
                              onChange={(e)=>setRestaurantSearchTerm(e.target.value)}
                              style={{padding:10, borderRadius:8, border:'1px solid #ccc', width:300}}
                          />
                          <button className="btn-success" onClick={apriModaleNuovo}>+ Aggiungi Cliente</button>
                      </div>

                      <table className="modern-table">
                          <thead>
                              <tr>
                                  <th>ID</th>
                                  <th>Business</th>
                                  <th>Contatti</th>
                                  {modulesConfig.map(m => <th key={m.dbField} style={{textAlign:'center'}}>{m.label}</th>)}
                                  <th>Stato</th>
                                  <th>Azioni</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredRistoranti.map(r => (
                                  <tr key={r.id}>
                                      <td><b>#{r.id}</b></td>
                                      <td>
                                          <div style={{display:'flex', flexDirection:'column'}}>
                                              <span style={{fontWeight:'bold', color:'#333'}}>{businessIcons[r.tipo_business]||'🏢'} {r.nome}</span>
                                              <span style={{fontSize:'0.8rem', color:'#888'}}>{r.slug}</span>
                                              {r.pin_mode && <span className="badge badge-warning" style={{marginTop:2, fontSize:'0.6rem'}}>PIN ACTIVE</span>}
                                          </div>
                                      </td>
                                      <td style={{fontSize:'0.85rem'}}>
                                          <div>{r.email}</div>
                                          <div style={{color:'#666'}}>{r.telefono}</div>
                                      </td>
                                      
                                      {/* MODULI SWITCHES */}
                                      {modulesConfig.map(m => {
                                          const isActive = r[m.dbField];
                                          const dateVal = r[m.dateField] ? new Date(r[m.dateField]).toISOString().split('T')[0] : '';
                                          return (
                                              <td key={m.dbField} style={{textAlign:'center'}}>
                                                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
                                                      <div 
                                                          onClick={() => toggleModulo(r.id, m.dbField, isActive)}
                                                          style={{
                                                              width:36, height:20, borderRadius:20,
                                                              background: isActive ? '#27ae60' : '#e2e8f0',
                                                              position:'relative', cursor:'pointer', transition:'0.2s'
                                                          }}
                                                      >
                                                          <div style={{
                                                              width:16, height:16, borderRadius:'50%', background:'white',
                                                              position:'absolute', top:2, left: isActive ? 18 : 2, transition:'0.2s',
                                                              boxShadow:'0 1px 2px rgba(0,0,0,0.2)'
                                                          }}/>
                                                      </div>
                                                      {isActive && m.dateField && (
                                                          <input 
                                                              type="date" 
                                                              value={dateVal}
                                                              onChange={(e)=>updateDate(r.id, m.dateField, e.target.value)}
                                                              style={{fontSize:'0.7rem', padding:2, border:'1px solid #ddd', borderRadius:4, width:85}}
                                                          />
                                                      )}
                                                  </div>
                                              </td>
                                          );
                                      })}

                                      <td>
                                          <span className={`badge ${r.account_attivo ? 'badge-success' : 'badge-danger'}`} onClick={()=>toggleModulo(r.id, 'account_attivo', r.account_attivo)} style={{cursor:'pointer'}}>
                                              {r.account_attivo ? 'ATTIVO' : 'STOP'}
                                          </span>
                                      </td>
                                      <td>
                                          <div style={{display:'flex', gap:5}}>
                                              <button onClick={()=>entraNelPannello(r)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>🚀</button>
                                              <button onClick={()=>avviaModifica(r)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>✏️</button>
                                              <button onClick={()=>handleElimina(r.id, r.nome)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>🗑️</button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* --- VISTA UTENTI --- */}
              {activeTab === 'utenti' && (
                  <div className="card-panel">
                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10}}>
                          <input 
                              type="text" 
                              placeholder="🔍 Cerca utente..." 
                              value={userSearchTerm}
                              onChange={(e)=>setUserSearchTerm(e.target.value)}
                              style={{padding:10, borderRadius:8, border:'1px solid #ccc', width:300}}
                          />
                          <div style={{display:'flex', gap:10}}>
                              <button className="btn-success" onClick={()=>handleOpenUserForm(null)}>+ Nuovo Utente</button>
                              <label className="btn-primary" style={{cursor:'pointer', display:'inline-flex', alignItems:'center'}}>
                                  {uploading ? '...' : '📥 Importa Excel'}
                                  <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportUsers} />
                              </label>
                          </div>
                      </div>

                      <table className="modern-table">
                          <thead>
                              <tr>
                                  <th>ID</th>
                                  <th>Utente</th>
                                  <th>Email / Login</th>
                                  <th>Ruolo</th>
                                  <th>Locale Collegato</th>
                                  <th>Azioni</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredUsers.map(u => (
                                  <tr key={u.id}>
                                      <td>#{u.id}</td>
                                      <td>
                                          <div style={{fontWeight:'bold'}}>{u.nome}</div>
                                          <div style={{fontSize:'0.8rem', color:'#888'}}>{u.telefono}</div>
                                      </td>
                                      <td>
                                          <div style={{color:'#0984e3'}}>{u.email}</div>
                                          <span className="badge badge-info" style={{fontSize:'0.7rem'}}>Pass: {u.password}</span>
                                      </td>
                                      <td>
                                          <span className="badge" style={{
                                              background: u.ruolo === 'admin' ? '#ffeaa7' : '#dfe6e9',
                                              color: u.ruolo === 'admin' ? '#d63031' : '#2d3436'
                                          }}>{u.ruolo.toUpperCase()}</span>
                                      </td>
                                      <td>
                                          {u.nome_ristorante_collegato || ristoranti.find(r=>r.id===u.ristorante_id)?.nome || <span style={{color:'#bbb'}}>GLOBALE</span>}
                                      </td>
                                      <td>
                                          <button onClick={()=>handleOpenUserForm(u)} style={{marginRight:5, border:'none', background:'none', cursor:'pointer'}}>✏️</button>
                                          <button onClick={()=>handleDeleteUser(u.id, u.nome)} style={{border:'none', background:'none', cursor:'pointer'}}>🗑️</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </div>

      {/* --- MODALE EDIT RISTORANTE (DARK STYLE PER CONTRASTO O LIGHT) --- 
          Mantengo lo stile dark "PRO" della V82 per la modale, ma pulito */}
      {showModal && (
          <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{background:'#1e293b', padding:30, borderRadius:12, width:'900px', maxWidth:'95%', maxHeight:'90vh', overflowY:'auto', color:'white', boxShadow:'0 20px 50px rgba(0,0,0,0.5)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                      <h2 style={{margin:0, color:'#ff9f43'}}>{editingId ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
                      <button onClick={()=>setShowModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
                  </div>
                  
                  <form onSubmit={handleSalvaRistorante} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
                      {/* COLONNA SX */}
                      <div style={{display:'flex', flexDirection:'column', gap:15}}>
                          <h4 style={{borderBottom:'1px solid #444', paddingBottom:5, color:'#aaa'}}>1. Dati Principali</h4>
                          <input name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Ragione Sociale *" required style={modalInput} />
                          <input name="slug" value={formData.slug} onChange={handleInputChange} placeholder="URL Slug (es. pizzeria-mario)" required style={modalInput} />
                          <select name="tipo_business" value={formData.tipo_business} onChange={handleInputChange} style={modalInput}>
                              <option value="ristorante">🍽️ Ristorante</option>
                              <option value="bar">🍹 Bar</option>
                              <option value="discoteca">🍾 Discoteca</option>
                              <option value="lido">🏖️ Lido</option>
                              <option value="padel">🎾 Padel</option>
                              <option value="parrucchiere">💇 Parrucchiere</option>
                          </select>
                          <label style={{display:'flex', gap:10, alignItems:'center', cursor:'pointer'}}>
                              <input type="checkbox" name="pin_mode" checked={formData.pin_mode} onChange={handleInputChange} />
                              Richiedi PIN Tavolo (Sicurezza)
                          </label>

                          <h4 style={{borderBottom:'1px solid #444', paddingBottom:5, color:'#aaa', marginTop:10}}>2. Accesso</h4>
                          <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Amministratore *" required style={modalInput} />
                          <input name="password" value={formData.password} onChange={handleInputChange} placeholder="Password (lascia vuoto se invariata)" style={modalInput} />
                      </div>

                      {/* COLONNA DX */}
                      <div style={{display:'flex', flexDirection:'column', gap:15}}>
                          <h4 style={{borderBottom:'1px solid #444', paddingBottom:5, color:'#aaa'}}>3. Dettagli Fiscali</h4>
                          <input name="piva" value={formData.piva} onChange={handleInputChange} placeholder="Partita IVA" style={modalInput} />
                          <input name="codice_sdi" value={formData.codice_sdi} onChange={handleInputChange} placeholder="Codice SDI" style={modalInput} />
                          <input name="pec" value={formData.pec} onChange={handleInputChange} placeholder="PEC" style={modalInput} />
                          <input name="referente" value={formData.referente} onChange={handleInputChange} placeholder="Nome Referente" style={modalInput} />
                          
                          <h4 style={{borderBottom:'1px solid #444', paddingBottom:5, color:'#aaa', marginTop:10}}>4. Sedi</h4>
                          <input name="sede_operativa" value={formData.sede_operativa} onChange={handleInputChange} placeholder="Sede Operativa (Città)" style={modalInput} />
                          <input name="telefono" value={formData.telefono} onChange={handleInputChange} placeholder="Telefono" style={modalInput} />
                          
                          <textarea name="note_interne" value={formData.note_interne} onChange={handleInputChange} placeholder="Note interne..." style={{...modalInput, height:60}} />
                      </div>
                      
                      <div style={{gridColumn:'span 2', marginTop:20, display:'flex', gap:10}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', padding:15, borderRadius:8, border:'none', color:'white', fontWeight:'bold', cursor:'pointer'}}>SALVA CLIENTE</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODALE EDIT UTENTE --- */}
      {showUserForm && (
          <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{background:'#1e293b', padding:30, borderRadius:12, width:'400px', color:'white'}}>
                  <h3 style={{marginTop:0}}>{editingUser ? 'Modifica Utente' : 'Nuovo Utente'}</h3>
                  <form onSubmit={handleSaveUser} style={{display:'flex', flexDirection:'column', gap:15}}>
                      <select value={userFormData.ristorante_id} onChange={e=>setUserFormData({...userFormData, ristorante_id:e.target.value})} style={modalInput}>
                          <option value="">-- Globale (Nessun Ristorante) --</option>
                          {ristoranti.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                      </select>
                      <select value={userFormData.ruolo} onChange={e=>setUserFormData({...userFormData, ruolo:e.target.value})} style={modalInput}>
                          <option value="cliente">Cliente</option>
                          <option value="cameriere">Cameriere</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                      </select>
                      <input placeholder="Nome" value={userFormData.nome} onChange={e=>setUserFormData({...userFormData, nome:e.target.value})} required style={modalInput} />
                      <input placeholder="Email" value={userFormData.email} onChange={e=>setUserFormData({...userFormData, email:e.target.value})} required style={modalInput} />
                      <input placeholder="Password" value={userFormData.password} onChange={e=>setUserFormData({...userFormData, password:e.target.value})} style={modalInput} />
                      
                      <div style={{display:'flex', gap:10, marginTop:10}}>
                          <button type="submit" className="btn-success" style={{flex:1, padding:10, border:'none', borderRadius:6, cursor:'pointer'}}>Salva</button>
                          <button type="button" onClick={()=>setShowUserForm(false)} style={{flex:1, background:'#666', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>Annulla</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}

const modalInput = {
    width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px'
};

export default SuperAdmin;