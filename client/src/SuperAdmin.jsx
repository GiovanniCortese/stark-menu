// client/src/SuperAdmin.jsx - VERSIONE V79 (GOD MODE AUTO-LOGIN 🚀)
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
  
  // STATO CONFIGURAZIONE FORM (ESTESO PER CRM)
  const [formData, setFormData] = useState({ 
      // 1. Accesso & Base
      nome: '', 
      slug: '', 
      email: '', 
      password: '', 
      account_attivo: true,
      data_scadenza: new Date().toISOString().split('T')[0], 
      
      // 2. Contatti & Sedi
      telefono: '', 
      referente: '',
      sede_legale: '', 
      sede_operativa: '', 
      
      // 3. Dati Fiscali
      piva: '', 
      codice_fiscale: '', 
      pec: '', 
      codice_sdi: '',
      note_interne: '',

      // Moduli (Hidden in modal, managed in table)
      modulo_cassa: true,           
      modulo_menu_digitale: true,   
      modulo_ordini_clienti: true,  
      modulo_magazzino: false,      
      modulo_haccp: false,          
      modulo_utenti: false,         
      cassa_full_suite: true
  });

  // STATI MODALE UTENTI GLOBAL
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false); 
  const [editingUser, setEditingUser] = useState(null); 
  const [userFormData, setUserFormData] = useState({ nome: '', email: '', password: '', telefono: '', indirizzo: '', ruolo: 'cliente', ristorante_id: '' });

  // --- STATI RICERCA E ORDINAMENTO (RISTORANTI) ---
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState("");
  const [restaurantSortConfig, setRestaurantSortConfig] = useState({ key: 'id', direction: 'desc' });

  // --- STATI RICERCA E ORDINAMENTO (UTENTI) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // DEFINIZIONE COLONNE MODULI
  const modulesConfig = [
      { label: '📱 Menu', dbField: 'modulo_menu_digitale', dateField: 'scadenza_menu_digitale' },
      { label: '🍽️ Ordini', dbField: 'modulo_ordini_clienti', dateField: 'scadenza_ordini_clienti' },
      { label: '💶 Cassa', dbField: 'modulo_cassa', dateField: 'scadenza_cassa' },
      { label: '👨‍🍳 KDS Suite', dbField: 'cassa_full_suite', dateField: 'scadenza_cassa' }, 
      { label: '📦 Magazzino', dbField: 'modulo_magazzino', dateField: 'scadenza_magazzino' },
      { label: '🛡️ HACCP', dbField: 'modulo_haccp', dateField: 'scadenza_haccp' },
      { label: '👥 Utenti', dbField: 'modulo_utenti', dateField: 'scadenza_utenti' },
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

  // --- LOGICA FILTRO E ORDINAMENTO RISTORANTI ---
  const handleRestaurantSort = (key) => {
    let direction = 'asc';
    if (restaurantSortConfig.key === key && restaurantSortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setRestaurantSortConfig({ key, direction });
  };

  const filteredRistoranti = useMemo(() => {
    let data = [...ristoranti];
    
    // 1. Filtro Ricerca
    if (restaurantSearchTerm) {
        const term = restaurantSearchTerm.toLowerCase();
        data = data.filter(r => 
            (r.nome && r.nome.toLowerCase().includes(term)) ||
            (r.slug && r.slug.toLowerCase().includes(term)) ||
            (r.email && r.email.toLowerCase().includes(term)) ||
            (r.telefono && r.telefono.includes(term)) ||
            (r.piva && r.piva.includes(term)) ||
            (r.sede_operativa && r.sede_operativa.toLowerCase().includes(term))
        );
    }

    // 2. Ordinamento
    if (restaurantSortConfig.key) {
        data.sort((a, b) => {
            let valA = a[restaurantSortConfig.key];
            let valB = b[restaurantSortConfig.key];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return restaurantSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return restaurantSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return data;
  }, [ristoranti, restaurantSearchTerm, restaurantSortConfig]);


  // --- AZIONI SUI RISTORANTI ---
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

  // --- GOD MODE BYPASS LOGIC ---
  const entraNelPannello = (slug) => {
      // 🚀 INIEZIONE TOKEN DI SESSIONE
      // Imposta il token "God Mode" nel localStorage condiviso (same origin)
      // Questo permette di saltare il login nella nuova scheda
      localStorage.setItem("admin_token", "SUPER_GOD_TOKEN_2026");
      
      // Apre il pannello admin specifico
      window.open(`/admin/${slug}`, '_blank');
  };

  // --- GESTIONE MODALE CONFIGURAZIONE (CRM & EDIT) ---
  const avviaModifica = (r) => {
      setEditingId(r.id);
      setFormData({
          // Base
          nome: r.nome || '',
          slug: r.slug || '',
          email: r.email || '',
          password: '',
          account_attivo: r.account_attivo,
          data_scadenza: r.data_scadenza ? r.data_scadenza.split('T')[0] : '',
          
          // CRM Data
          telefono: r.telefono || '',
          referente: r.referente || '',
          piva: r.piva || '',
          codice_fiscale: r.codice_fiscale || '',
          pec: r.pec || '',
          codice_sdi: r.codice_sdi || '',
          sede_legale: r.sede_legale || '',
          sede_operativa: r.sede_operativa || '',
          note_interne: r.note_interne || '',

          // Moduli (Hidden but preserved)
          modulo_cassa: r.modulo_cassa,
          modulo_menu_digitale: r.modulo_menu_digitale,
          modulo_ordini_clienti: r.modulo_ordini_clienti,
          modulo_magazzino: r.modulo_magazzino,
          modulo_haccp: r.modulo_haccp,
          modulo_utenti: r.modulo_utenti,
          cassa_full_suite: r.cassa_full_suite
      });
      setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const apriModaleNuovo = () => { 
      setEditingId(null); 
      setFormData({ 
          nome: '', slug: '', email: '', password: '', 
          telefono: '', referente: '', piva: '', codice_fiscale: '', pec: '', codice_sdi: '',
          sede_legale: '', sede_operativa: '', note_interne: '',
          account_attivo: true,
          data_scadenza: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
          // Default modules
          modulo_cassa: true, modulo_menu_digitale: true, modulo_ordini_clienti: true,
          modulo_magazzino: false, modulo_haccp: false, modulo_utenti: false, cassa_full_suite: true
      }); 
      setShowModal(true); 
  };

  const handleSalva = async (e) => { 
      e.preventDefault(); 
      const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`; 
      const method = editingId ? 'PUT' : 'POST'; 
      try { 
          const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); 
          if(res.ok) { alert("✅ Dati CRM Salvati!"); setShowModal(false); caricaDati(); } 
          else { const data = await res.json(); alert("❌ Errore: " + (data.error || "Sconosciuto")); }
      } catch(err) { alert("❌ Errore di connessione"); } 
  };

  const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(ristoranti);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ristoranti");
      XLSX.writeFile(wb, "Report_SuperAdmin.xlsx");
  };

  const logout = () => { 
      if (confirm("Uscire dal J.A.R.V.I.S.?")) { localStorage.removeItem("super_admin_token"); setAuthorized(false); } 
  };

  // --- LOGICA UTENTI GLOBALI ---
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

  // STILI E LAYOUT
  const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #444', background: '#222', color: 'white', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = {fontSize:11, fontWeight:'bold', color:'#e74c3c', textTransform:'uppercase', marginTop:10, display:'block'};
  const sectionTitleStyle = {fontSize:16, fontWeight:'bold', color:'#3498db', borderBottom:'1px solid #444', paddingBottom:5, marginTop:20, marginBottom:10};

  if (!authorized) return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#000'}}>
        <div style={{background:'#111', padding:'40px', borderRadius:'10px', width:'100%', maxWidth:'400px', border:'1px solid #333', boxShadow:'0 0 20px rgba(255,0,0,0.2)'}}>
            <h1 style={{color:'#e74c3c', textAlign:'center', marginBottom:30, fontFamily:'monospace'}}>🛡️ J.A.R.V.I.S. ACCESS</h1>
            <form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}>
                <input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#222', color:'white'}} />
                <input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#222', color:'white'}} />
                <input type="text" placeholder="Codice Sicurezza 2FA" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#222', color:'white', width:'100%'}} />
                {error && <p style={{color:'#ff4d4d', textAlign:'center', margin:0}}>{error}</p>}
                <button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginTop:10}}>LOGIN</button>
            </form>
        </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh', background:'#111', color:'white', padding:20, fontFamily:'sans-serif'}}>
      <div style={{maxWidth:'1800px', margin:'0 auto'}}>
          
          {/* HEADER DARK */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30, borderBottom:'1px solid #333', paddingBottom:20}}>
              <div>
                  <h1 style={{color:'#e74c3c', margin:0, fontFamily:'monospace'}}>🦸‍♂️ J.A.R.V.I.S. PROTOCOL</h1>
                  <p style={{color:'#7f8c8d', margin:0, fontSize:12}}>Global Control Panel • Stark Industries</p>
              </div>
              <div style={{display:'flex', gap:10}}>
                  <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO</button>
                  <button onClick={() => setShowUsersModal(true)} style={{background:'#3498db', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>👥 UTENTI</button>
                  <button onClick={exportExcel} style={{background:'#8e44ad', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer'}}>📊 EXCEL</button>
                  <button onClick={logout} style={{background:'#c0392b', color:'white', padding:'10px 20px', borderRadius:5, border:'none', cursor:'pointer'}}>ESCI</button>
              </div>
          </div>

          {/* BARRA DI RICERCA RISTORANTI */}
          <div style={{marginBottom: 20, display:'flex', gap:15}}>
              <input 
                  type="text" 
                  placeholder="🔍 Cerca Attività (Nome, P.IVA, Città, Email)..." 
                  value={restaurantSearchTerm}
                  onChange={(e) => setRestaurantSearchTerm(e.target.value)}
                  style={{
                      flex: 1, 
                      padding: '12px 20px', 
                      borderRadius: '8px', 
                      border: '1px solid #444', 
                      background: '#1a1a1a', 
                      color: 'white', 
                      fontSize: '16px'
                  }}
              />
              <div style={{display:'flex', alignItems:'center', color:'#888', fontSize:14}}>
                  Totale: {filteredRistoranti.length}
              </div>
          </div>

          {/* TABELLA RISTORANTI (SCROLLABILE DARK) */}
          <div style={{background:'#1a1a1a', borderRadius:10, border:'1px solid #333', overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', minWidth:'1200px'}}>
                      <thead style={{background:'#000', color:'#e74c3c', borderBottom:'2px solid #333'}}>
                          <tr>
                              <th onClick={() => handleRestaurantSort('id')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>ID ↕</th>
                              <th onClick={() => handleRestaurantSort('nome')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>Ristorante ↕</th>
                              <th onClick={() => handleRestaurantSort('email')} style={{padding:15, textAlign:'left', cursor:'pointer'}}>Contatti ↕</th>
                              
                              {/* HEADER DINAMICO MODULI */}
                              {modulesConfig.map(m => (
                                  <th key={m.dbField} style={{padding:15, textAlign:'center', minWidth:'120px'}}>
                                      {m.label}
                                  </th>
                              ))}
                              
                              <th style={{padding:15, textAlign:'center'}}>Stato</th>
                              <th style={{padding:15, textAlign:'center'}}>Azioni</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredRistoranti.map(r => (
                              <tr key={r.id} style={{borderBottom:'1px solid #333', background: r.account_attivo ? '#222' : '#2c0b0e'}}>
                                  
                                  <td style={{padding:15, color:'#666'}}>#{r.id}</td>

                                  {/* INFO BASE */}
                                  <td style={{padding:15}}>
                                      <div style={{fontWeight:'bold', color:'white', fontSize:'15px'}}>{r.nome}</div>
                                      <div style={{fontSize:11, color:'#7f8c8d', fontFamily:'monospace'}}>{r.slug}</div>
                                      {r.sede_operativa && (
                                          <div style={{fontSize:10, color:'#aaa', marginTop:4}}>📍 {r.sede_operativa}</div>
                                      )}
                                  </td>
                                  <td style={{padding:15}}>
                                      <div style={{fontSize:12, color:'#bdc3c7'}}>{r.email}</div>
                                      <div style={{fontSize:11, color:'#7f8c8d'}}>{r.telefono}</div>
                                      {r.piva && (
                                          <div style={{fontSize:10, color:'#555', marginTop:4}}>P.IVA: {r.piva}</div>
                                      )}
                                  </td>

                                  {/* LOOP MODULI GRANULARI + KDS SUITE */}
                                  {modulesConfig.map(m => {
                                      const fieldBool = m.dbField;
                                      const fieldDate = m.dateField;
                                      const isActive = r[fieldBool];
                                      
                                      let dateVal = "";
                                      if (fieldDate && r[fieldDate]) {
                                          try { dateVal = new Date(r[fieldDate]).toISOString().split('T')[0]; } catch (e) {}
                                      }

                                      return (
                                          <td key={m.dbField} style={{padding:10, textAlign:'center', borderLeft:'1px solid #333'}}>
                                              <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                                                  
                                                  <div 
                                                      onClick={() => toggleModulo(r.id, fieldBool, isActive)}
                                                      title={isActive ? "Disattiva" : "Attiva"}
                                                      style={{
                                                          width: 40, height: 20, 
                                                          background: isActive ? '#27ae60' : '#444',
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
                                                          transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.5)'
                                                      }} />
                                                  </div>

                                                  {isActive && fieldDate ? (
                                                      <input 
                                                          type="date" 
                                                          value={dateVal}
                                                          onChange={(e) => updateDate(r.id, fieldDate, e.target.value)}
                                                          style={{
                                                              fontSize:10, padding:3, borderRadius:4, 
                                                              border:'1px solid #444', width:'100%', maxWidth:'100px',
                                                              background: dateVal && new Date(dateVal) < new Date() ? '#c0392b' : '#333',
                                                              color: 'white'
                                                          }}
                                                      />
                                                  ) : (
                                                      <span style={{fontSize:10, color:'#555', fontStyle:'italic'}}>
                                                          {isActive ? "On" : "Off"}
                                                      </span>
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
                                              background: r.account_attivo ? '#2980b9' : '#c0392b',
                                              color: 'white',
                                              border:'none', padding:'5px 10px', borderRadius:5, fontSize:11, fontWeight:'bold', cursor:'pointer'
                                          }}
                                      >
                                          {r.account_attivo ? "ATTIVO" : "SOSPESO"}
                                      </button>
                                  </td>

                                  {/* AZIONI (ENTRA, MODIFICA, ELIMINA) */}
                                  <td style={{padding:15, textAlign:'center'}}>
                                      <div style={{display:'flex', gap:5, justifyContent:'center'}}>
                                          <button 
                                              onClick={() => entraNelPannello(r.slug)}
                                              style={{background:'#3498db', color:'white', border:'none', width:30, height:30, borderRadius:5, cursor:'pointer', fontSize:14}}
                                              title="Entra nel Pannello"
                                          >
                                              🚀
                                          </button>
                                          <button 
                                              onClick={() => avviaModifica(r)} 
                                              style={{background:'#f39c12', color:'white', border:'none', width:30, height:30, borderRadius:5, cursor:'pointer', fontSize:14}}
                                              title="Modifica Anagrafica"
                                          >
                                              ✏️
                                          </button>
                                          <button 
                                              onClick={() => handleElimina(r.id, r.nome)} 
                                              style={{background:'#c0392b', color:'white', border:'none', width:30, height:30, borderRadius:5, cursor:'pointer', fontSize:14}}
                                              title="Elimina Ristorante"
                                          >
                                              🗑️
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* MODALE COMPLETA (CRM MODE) */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: '#1a1a1a', borderRadius: '15px', width: '900px', maxWidth:'98%', maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', border:'1px solid #444', boxShadow:'0 0 50px rgba(0,0,0,0.8)', color:'white'}}>
                  
                  {/* HEADER MODALE */}
                  <div style={{padding:'20px', background:'#111', borderBottom:'1px solid #333', display:'flex', justifyItems:'space-between'}}>
                      <h2 style={{margin:0, color:'#e74c3c', flex:1}}>{editingId ? `Modifica: ${formData.nome}` : "Nuova Attività"}</h2>
                      <div style={{fontSize:12, color:'#888'}}>CRM Mode</div>
                  </div>

                  <form onSubmit={handleSalva} style={{padding:'25px', display:'flex', flexDirection:'column', gap:10}}>
                      
                      {/* SEZIONE 1: ANAGRAFICA BASE */}
                      <div style={sectionTitleStyle}>1. ANAGRAFICA & ACCESSO</div>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                        <div><label style={labelStyle}>RAGIONE SOCIALE *</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} placeholder="Es. Pizzeria Da Mario Srl" /></div>
                        <div><label style={labelStyle}>SLUG (URL) *</label><input required name="slug" value={formData.slug} onChange={handleInputChange} style={inputStyle} placeholder="pizzeria-da-mario" /></div>
                        <div><label style={labelStyle}>EMAIL AMMINISTRAZIONE *</label><input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} placeholder="admin@locale.it" /></div>
                        <div><label style={labelStyle}>PASSWORD (Lascia vuoto per non cambiare)</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} style={inputStyle} placeholder="Nuova Password..." /></div>
                      </div>

                      {/* SEZIONE 2: DATI FISCALI */}
                      <div style={sectionTitleStyle}>2. DATI FISCALI & LEGALI</div>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:15}}>
                        <div><label style={labelStyle}>PARTITA IVA</label><input name="piva" value={formData.piva} onChange={handleInputChange} style={inputStyle} placeholder="IT00000000000" /></div>
                        <div><label style={labelStyle}>CODICE FISCALE</label><input name="codice_fiscale" value={formData.codice_fiscale} onChange={handleInputChange} style={inputStyle} placeholder="Codice Fiscale" /></div>
                        <div><label style={labelStyle}>CODICE SDI / UNIVOCO</label><input name="codice_sdi" value={formData.codice_sdi} onChange={handleInputChange} style={inputStyle} placeholder="XXXXXXX" /></div>
                      </div>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                         <div><label style={labelStyle}>PEC</label><input name="pec" value={formData.pec} onChange={handleInputChange} style={inputStyle} placeholder="azienda@pec.it" /></div>
                         <div><label style={labelStyle}>REFERENTE / TITOLARE</label><input name="referente" value={formData.referente} onChange={handleInputChange} style={inputStyle} placeholder="Nome e Cognome" /></div>
                      </div>
                      <div>
                          <label style={labelStyle}>SEDE LEGALE COMPLETA</label>
                          <input name="sede_legale" value={formData.sede_legale} onChange={handleInputChange} style={inputStyle} placeholder="Via Roma 1, 00100 Roma (RM)" />
                      </div>

                      {/* SEZIONE 3: OPERATIVITÀ & GEOLOCALIZZAZIONE */}
                      <div style={sectionTitleStyle}>3. OPERATIVITÀ & MAPPA</div>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:15}}>
                         <div><label style={labelStyle}>TELEFONO PUBBLICO</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} style={inputStyle} placeholder="+39 ..." /></div>
                         <div><label style={labelStyle}>SEDE OPERATIVA (Per Mappa)</label><input name="sede_operativa" value={formData.sede_operativa} onChange={handleInputChange} style={inputStyle} placeholder="Via Operativa 10, Milano (MI) - Usato per geolocalizzazione" /></div>
                      </div>
                      <div>
                          <label style={labelStyle}>NOTE INTERNE (Non visibili al cliente)</label>
                          <textarea name="note_interne" value={formData.note_interne} onChange={handleInputChange} style={{...inputStyle, height:60}} placeholder="Note su pagamenti, accordi particolari..." />
                      </div>

                      <div style={{marginTop:20, display:'flex', gap:15}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer', fontSize:16}}>SALVA SCHEDA COMPLETA</button>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex:0.3, background:'#555', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODALE UTENTI (DARK) */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: '#1a1a1a', borderRadius: '12px', width: '1300px', maxWidth:'98%', height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #333'}}>
                <div style={{padding:'20px 25px', background:'#000', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #333'}}>
                    <h2 style={{margin:0, color:'#e74c3c', fontFamily:'monospace'}}>🌍 Database Utenti Centralizzato</h2>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>✕</button>
                </div>
                
                <div style={{padding:'15px', background:'#222', display:'flex', gap:10, flexWrap:'wrap'}}>
                     <input type="text" placeholder="🔍 Cerca utente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex:1, padding:10, borderRadius:5, border:'1px solid #444', background:'#333', color:'white'}} />
                     <button onClick={() => handleOpenUserForm(null)} style={{background:'#2ecc71', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>➕ NUOVO</button>
                     <button onClick={handleImportTrigger} style={{background:'#e67e22', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>{uploading ? '...' : '📤 IMPORTA'}</button>
                     <input type="file" id="file-upload-users" style={{display:'none'}} accept=".xlsx, .xls" onChange={handleImportUsers} />
                     <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer'}}>📥 EXCEL</button>
                </div>

                <div style={{flex:1, overflowY:'auto', background:'#111'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px', color:'white'}}>
                        <thead style={{position:'sticky', top:0, background:'#000', zIndex:10}}>
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
                                <tr key={u.id} style={{borderBottom:'1px solid #333', background: idx%2===0?'#1a1a1a':'#222'}}>
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

      {/* MODALE EDIT UTENTE (DARK) */}
      {showUserForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: '#222', padding: '30px', borderRadius: '10px', width: '450px', boxShadow:'0 10px 40px rgba(0,0,0,0.5)', border:'1px solid #444', color:'white'}}>
                  <h3 style={{marginTop:0}}>{editingUser ? "Modifica Utente" : "Nuovo Utente"}</h3>
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
                          <button type="button" onClick={() => setShowUserForm(false)} style={{flex:1, background:'#555', color:'white', padding:12, borderRadius:5, border:'none', fontWeight:'bold', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default SuperAdmin;