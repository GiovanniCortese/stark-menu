// client/src/SuperAdmin.jsx - VERSIONE V67 (AGGIUNTO MODULO CASSA) 🗓️
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
  
  // STATO CONFIGURAZIONE (Inclusi i nuovi flag)
  const [formData, setFormData] = useState({ 
      nome: '', 
      slug: '', 
      email: '', 
      telefono: '', 
      password: '', // Password Admin Ristorante
      account_attivo: true,
      data_scadenza: new Date().toISOString().split('T')[0], 
      
      // --- MODULI (Checkboxes) ---
      modulo_cassa: true,           // 💰 NUOVO: Cassa Opzionale
      modulo_menu_digitale: true,   // Menu QR
      modulo_ordini_clienti: true,  // Ricezione ordini da tavolo/asporto
      modulo_magazzino: false,      // Gestione scorte
      modulo_haccp: false,          // Registro temperature/etichette
      modulo_utenti: false,         // CRM Clienti
      
      // --- MODALITÀ CASSA ---
      // FALSE = Solo Cassa (Scontrino veloce, no reparti)
      // TRUE = Suite Completa (Invia comande a Bar/Cucina/Pizzeria)
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
  // NOTA: Sostituisci con il tuo URL reale se diverso
  const API_URL = "https://stark-backend-gg17.onrender.com";

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

  // --- GESTIONE RISTORANTI ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // FUNZIONE CALCOLO RAPIDO DATE
  const aggiungiMesi = (mesi) => {
      const oggi = new Date();
      const futura = new Date(oggi.setMonth(oggi.getMonth() + mesi));
      setFormData({ ...formData, data_scadenza: futura.toISOString().split('T')[0] });
  };

  const apriModaleNuovo = () => { 
      setEditingId(null); 
      setFormData({ 
          nome: '', slug: '', email: '', telefono: '', password: '', 
          account_attivo: true,
          data_scadenza: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
          modulo_cassa: true, // Default ON
          modulo_menu_digitale: true,
          modulo_ordini_clienti: true,
          modulo_magazzino: false,
          modulo_haccp: false,
          modulo_utenti: false,
          cassa_full_suite: true
      }); 
      setShowModal(true); 
  };

  const avviaModifica = (r) => {
      setEditingId(r.id);
      setFormData({
          nome: r.nome,
          slug: r.slug,
          email: r.email || '',
          telefono: r.telefono || '',
          password: '', 
          account_attivo: r.account_attivo !== false,
          data_scadenza: r.data_scadenza ? r.data_scadenza.split('T')[0] : '',
          
          // Mappatura flag DB -> Form
          modulo_cassa: r.modulo_cassa ?? true, // Default true se manca nel DB vecchio
          modulo_menu_digitale: r.modulo_menu_digitale ?? true,
          modulo_ordini_clienti: r.modulo_ordini_clienti ?? true,
          modulo_magazzino: r.modulo_magazzino ?? false,
          modulo_haccp: r.modulo_haccp ?? false,
          modulo_utenti: r.modulo_utenti ?? false,
          cassa_full_suite: r.cassa_full_suite ?? true
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
          
          const data = await res.json(); // Leggiamo sempre la risposta JSON

          if(res.ok) { 
              alert(editingId ? "✅ Configurazione aggiornata!" : "✅ Locale creato con successo!"); 
              setShowModal(false); 
              caricaDati(); 
          } else {
              // QUI ORA VEDRAI L'ERRORE REALE DEL SERVER
              console.error("Errore Backend:", data);
              alert("❌ Errore Salvataggio: " + (data.error || "Errore sconosciuto"));
          }
      } catch(err) { 
          console.error("Errore Fetch:", err);
          alert("❌ Errore di connessione o Server Offline"); 
      } 
  };

  const toggleSospensione = async (id, statoAttuale) => {
      const nuovoStato = !statoAttuale;
      setRistoranti(ristoranti.map(r => r.id === id ? { ...r, account_attivo: nuovoStato } : r));
      await fetch(`${API_URL}/api/super/ristoranti/${id}`, { 
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ account_attivo: nuovoStato }) 
      });
  };

  const handleElimina = async (id, nome) => { if(!confirm(`Eliminare "${nome}"?`)) return; try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); caricaDati(); } catch(err) { alert("Errore"); } };
  const entraNelPannello = (slug) => { localStorage.setItem(`stark_admin_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { if (confirm("Uscire dal J.A.R.V.I.S.?")) { localStorage.removeItem("super_admin_token"); setAuthorized(false); navigate('/'); } };

  // --- LOGICA UTENTI E IMPORT/EXPORT ---
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
  const exportUsersExcel = () => { const ws = XLSX.utils.json_to_sheet(filteredUsers); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Utenti Globali"); XLSX.writeFile(wb, "Utenti_J.A.R.V.I.S.xlsx"); };
  const handleImportTrigger = () => document.getElementById('file-upload-users').click();
  const handleImportUsers = async (e) => { const file = e.target.files[0]; if(!file) return; setUploading(true); const fd = new FormData(); fd.append('file', file); try { const res = await fetch(`${API_URL}/api/utenti/import/excel`, { method: 'POST', body: fd }); if(res.ok) { alert("Importazione completata!"); caricaDati(); } } catch(err) { alert("Errore"); } finally { setUploading(false); e.target.value = null; } };

  // --- STILI CSS-IN-JS ---
  const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const moduleCardStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #eee', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' };
  const labelSwitchStyle = { fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };

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
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div><h1 style={{margin:0}}>🦸‍♂️ J.A.R.V.I.S. Control</h1><p style={{margin:0, opacity:0.7}}>Stark Enterprise - Global Admin</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO LOCALE</button>
            <button onClick={() => setShowUsersModal(true)} style={{background:'#3498db', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>👥 DATABASE UTENTI</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      {/* LISTA RISTORANTI */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px'}}>
        {ristoranti.map(r => (
            <div key={r.id} style={{border: '1px solid #ddd', borderRadius: '12px', overflow:'hidden', background: r.account_attivo !== false ? '#fff' : '#f2f2f2', boxShadow: '0 5px 15px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column', opacity: r.account_attivo ? 1 : 0.7}}>
                <div style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', background: r.account_attivo ? 'white' : '#ffebee'}}>
                    <div><h2 style={{margin:0, fontSize:'1.4rem'}}>{r.nome}</h2><span style={{background:'#2c3e50', color:'#fff', padding:'3px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</span></div>
                    <div style={{display:'flex', gap:5}}>
                        <button onClick={() => avviaModifica(r)} style={{background:'#f39c12', border:'none', borderRadius:4, padding:8, cursor:'pointer'}}>⚙️</button>
                        <button onClick={() => handleElimina(r.id, r.nome)} style={{background:'#c0392b', color:'white', border:'none', borderRadius:4, padding:8, cursor:'pointer'}}>🗑️</button>
                    </div>
                </div>
                <div style={{padding:15, flex:1}}>
                    <p style={{margin:'5px 0'}}>📅 Scadenza: <b style={{color: new Date(r.data_scadenza) < new Date() ? 'red' : 'green'}}>{r.data_scadenza ? new Date(r.data_scadenza).toLocaleDateString() : 'N/D'}</b></p>
                    <div style={{display:'flex', flexWrap:'wrap', gap:5, marginTop:10}}>
                        {r.modulo_cassa && <span style={{fontSize:10, padding:'3px 6px', background:'#eaf2f8', color:'#2980b9', borderRadius:4, border:'1px solid #2980b9'}}>CASSA</span>}
                        {r.modulo_menu_digitale && <span style={{fontSize:10, padding:'3px 6px', background:'#e8f8f5', color:'#27ae60', borderRadius:4, border:'1px solid #27ae60'}}>MENU</span>}
                        {r.modulo_ordini_clienti && <span style={{fontSize:10, padding:'3px 6px', background:'#eafaf1', color:'#2ecc71', borderRadius:4, border:'1px solid #2ecc71'}}>ORDINI</span>}
                        {r.modulo_magazzino && <span style={{fontSize:10, padding:'3px 6px', background:'#fef9e7', color:'#f1c40f', borderRadius:4, border:'1px solid #f1c40f'}}>MAGAZZINO</span>}
                        {r.modulo_haccp && <span style={{fontSize:10, padding:'3px 6px', background:'#e8f6f3', color:'#16a085', borderRadius:4, border:'1px solid #16a085'}}>HACCP</span>}
                        {r.cassa_full_suite ? 
                            <span style={{fontSize:10, padding:'3px 6px', background:'#ebf5fb', color:'#3498db', borderRadius:4, border:'1px solid #3498db'}}>FULL SUITE</span> :
                            <span style={{fontSize:10, padding:'3px 6px', background:'#f4ecf7', color:'#9b59b6', borderRadius:4, border:'1px solid #9b59b6'}}>SOLO CASSA</span>
                        }
                    </div>
                </div>
                <div style={{padding:15, background:'#f9f9f9', borderTop:'1px solid #eee', display:'flex', gap:10}}>
                    <button onClick={() => toggleSospensione(r.id, r.account_attivo)} style={{flex:1, padding:10, background: r.account_attivo !== false ? '#e67e22':'#27ae60', color:'white', borderRadius:6, border:'none', fontWeight:'bold', cursor:'pointer'}}>
                        {r.account_attivo !== false ? "⏸️ SOSPENDI" : "▶️ RIATTIVA"}
                    </button>
                    <button onClick={() => entraNelPannello(r.slug)} style={{flex:1, background:'#3498db', color:'white', border:'none', padding:10, borderRadius:6, fontWeight:'bold', cursor:'pointer'}}>ACCEDI ↗</button>
                </div>
            </div>
        ))}
      </div>

      {/* MODALE RISTORANTE (EDIT/CREATE) */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '0', borderRadius: '15px', width: '600px', maxWidth:'95%', maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column'}}>
                  
                  {/* HEADER MODALE */}
                  <div style={{padding:'20px', background:'#2c3e50', color:'white', borderRadius:'15px 15px 0 0'}}>
                      <h2 style={{margin:0}}>{editingId ? `Configura: ${formData.nome}` : "Nuovo Ristorante"}</h2>
                      <p style={{margin:0, fontSize:12, opacity:0.8}}>Gestione Moduli e Abbonamento</p>
                  </div>

                  <form onSubmit={handleSalva} style={{padding:'20px', display:'flex', flexDirection:'column', gap:20}}>
                      
                      {/* 1. INFO BASE */}
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>NOME ATTIVITÀ</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>SLUG (URL)</label><input required name="slug" value={formData.slug} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>EMAIL</label><input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} /></div>
                        <div><label style={{fontSize:11, fontWeight:'bold'}}>PASSWORD (Reset)</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} style={inputStyle} placeholder="Opzionale" /></div>
                      </div>

                      <hr style={{margin:0, border:'none', borderTop:'1px solid #eee'}} />

                      {/* 2. CALENDARIO ABBONAMENTO */}
                      <div>
                          <label style={{fontSize:12, fontWeight:'bold', color:'#e67e22', display:'block', marginBottom:5}}>📅 SCADENZA LICENZA</label>
                          <div style={{display:'flex', gap:10, alignItems:'center'}}>
                              <input type="date" name="data_scadenza" value={formData.data_scadenza} onChange={handleInputChange} style={{padding:10, borderRadius:6, border:'1px solid #ddd', flex:1}} />
                              <button type="button" onClick={()=>aggiungiMesi(1)} style={{padding:'8px 12px', background:'#ecf0f1', border:'1px solid #ccc', borderRadius:5, cursor:'pointer', fontSize:12}}>+1 Mese</button>
                              <button type="button" onClick={()=>aggiungiMesi(3)} style={{padding:'8px 12px', background:'#ecf0f1', border:'1px solid #ccc', borderRadius:5, cursor:'pointer', fontSize:12}}>+3 Mesi</button>
                              <button type="button" onClick={()=>aggiungiMesi(12)} style={{padding:'8px 12px', background:'#ecf0f1', border:'1px solid #ccc', borderRadius:5, cursor:'pointer', fontSize:12}}>+1 Anno</button>
                          </div>
                          <p style={{fontSize:11, color:'#7f8c8d', marginTop:5}}>*Se la data viene superata, il software va automaticamente in PAUSA.</p>
                      </div>

                      <hr style={{margin:0, border:'none', borderTop:'1px solid #eee'}} />

                      {/* 3. MODULI E FUNZIONALITÀ */}
                      <div>
                          <h3 style={{fontSize:14, margin:'0 0 10px 0', color:'#3498db'}}>📦 CONFIGURAZIONE PACCHETTO</h3>
                          
                          {/* MODALITÀ CASSA */}
                          <div style={{...moduleCardStyle, background: '#ebf5fb', border: '1px solid #aed6f1'}}>
                              <div style={{flex:1}}>
                                  <span style={{fontWeight:'bold', fontSize:14, color:'#2980b9'}}>Tipologia Sistema</span>
                                  <p style={{margin:0, fontSize:11, color:'#555'}}>{formData.cassa_full_suite ? "SUITE COMPLETA (Cucina + Bar + Pizzeria)" : "SOLO CASSA (Scontrino Veloce)"}</p>
                              </div>
                              <label className="switch">
                                  <input type="checkbox" name="cassa_full_suite" checked={formData.cassa_full_suite} onChange={handleInputChange} />
                                  <span style={{fontSize:20, cursor:'pointer'}}>{formData.cassa_full_suite ? '🏢' : '📠'}</span>
                              </label>
                          </div>

                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                              
                              {/* --- NUOVO: MODULO CASSA --- */}
                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>💰 Modulo Cassa</label>
                                  <input type="checkbox" name="modulo_cassa" checked={formData.modulo_cassa} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>

                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>📱 Menu Digitale</label>
                                  <input type="checkbox" name="modulo_menu_digitale" checked={formData.modulo_menu_digitale} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>
                              
                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>🍽️ Ordini al Tavolo</label>
                                  <input type="checkbox" name="modulo_ordini_clienti" checked={formData.modulo_ordini_clienti} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>

                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>📦 Magazzino</label>
                                  <input type="checkbox" name="modulo_magazzino" checked={formData.modulo_magazzino} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>

                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>❄️ HACCP & Sicurezza</label>
                                  <input type="checkbox" name="modulo_haccp" checked={formData.modulo_haccp} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>

                              <div style={moduleCardStyle}>
                                  <label style={labelSwitchStyle}>👥 Gestione Utenti</label>
                                  <input type="checkbox" name="modulo_utenti" checked={formData.modulo_utenti} onChange={handleInputChange} style={{transform:'scale(1.3)'}} />
                              </div>
                          </div>
                      </div>

                      <div style={{display:'flex', gap:10, marginTop:10}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer', fontSize:16}}>SALVA MODIFICHE</button>
                          <button type="button" onClick={() => setShowModal(false)} style={{flex:1, background:'#95a5a6', color:'white', padding:15, borderRadius:8, border:'none', fontWeight:'bold', cursor:'pointer', fontSize:16}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODALE DATABASE UTENTI (Stesso codice precedente) --- */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: 'white', borderRadius: '12px', width: '1300px', maxWidth:'98%', height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
                <div style={{padding:'20px 25px', background:'#1a252f', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0}}>🌍 Database Utenti Centralizzato ({filteredUsers.length})</h2>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>✕</button>
                </div>
                <div style={{padding:'15px 25px', background:'#ecf0f1', display:'flex', justifyContent:'space-between', gap:15}}>
                     <input type="text" placeholder="🔍 Cerca per nome, email, ruolo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{flex:1, padding:12, borderRadius:30, border:'1px solid #ccc'}} />
                     <button onClick={() => handleOpenUserForm(null)} style={{background:'#2ecc71', color:'white', padding:'10px 20px', borderRadius:6, border:'none', fontWeight:'bold', cursor:'pointer'}}>➕ NUOVO UTENTE</button>
                     <button onClick={handleImportTrigger} style={{background:'#e67e22', color:'white', padding:'10px 20px', borderRadius:6, border:'none', fontWeight:'bold', cursor:'pointer'}}>{uploading ? '...' : '📤 IMPORTA'}</button>
                     <input type="file" id="file-upload-users" style={{display:'none'}} accept=".xlsx, .xls" onChange={handleImportUsers} />
                     <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', padding:'10px 20px', borderRadius:6, border:'none', fontWeight:'bold', cursor:'pointer'}}>📥 EXCEL</button>
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
                                    <td style={{padding:15}}><span style={{background: u.ruolo==='admin'?'#c0392b':'#3498db', color:'white', padding:'4px 10px', borderRadius:15, fontSize:10, fontWeight:'bold'}}>{u.ruolo || 'cliente'}</span></td>
                                    <td style={{padding:15}}>{ristoranti.find(r => r.id === u.ristorante_id)?.nome || 'GLOBALE'}</td>
                                    <td style={{padding:15}}>
                                        <button onClick={() => handleOpenUserForm(u)} style={{background:'#f1c40f', border:'none', borderRadius:4, padding:5, marginRight:5, cursor:'pointer'}}>✏️</button>
                                        <button onClick={() => handleDeleteUser(u.id, u.nome)} style={{background:'#e74c3c', border:'none', color:'white', borderRadius:4, padding:5, cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* MODALE UTENTE (CREATE/EDIT) */}
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
                      <input placeholder="Nome Completo" value={userFormData.nome} onChange={e=>setUserFormData({...userFormData, nome:e.target.value})} required style={inputStyle} />
                      <input placeholder="Email" value={userFormData.email} onChange={e=>setUserFormData({...userFormData, email:e.target.value})} required style={inputStyle} />
                      <input placeholder="Password" value={userFormData.password} onChange={e=>setUserFormData({...userFormData, password:e.target.value})} required style={{...inputStyle, border:'2px solid #e74c3c'}} />
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