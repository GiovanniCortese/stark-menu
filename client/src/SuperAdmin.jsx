// client/src/SuperAdmin.jsx - VERSIONE V41 (MODALE UTENTI + EXCEL) 🌍
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx'; // Assicurati di aver installato: npm install xlsx

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [utentiGlobali, setUtentiGlobali] = useState([]); 
  const [authorized, setAuthorized] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '', code2fa: '' });
  const [error, setError] = useState("");
  
  // STATI PER IL MODALE RISTORANTE
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ nome: '', slug: '', email: '', telefono: '', password: '' });

  // STATI PER IL MODALE UTENTI (NUOVO)
  const [showUsersModal, setShowUsersModal] = useState(false);

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

  // --- FUNZIONE EXPORT EXCEL ---
  const exportUsersExcel = () => {
      const ws = XLSX.utils.json_to_sheet(utentiGlobali);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Utenti Globali");
      XLSX.writeFile(wb, "Utenti_Globali_Stark.xlsx");
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const apriModaleNuovo = () => {
      setEditingId(null);
      setFormData({ nome: '', slug: '', email: '', telefono: '', password: '' });
      setShowModal(true);
  };

  const apriModaleModifica = (r) => {
      setEditingId(r.id);
      setFormData({ nome: r.nome, slug: r.slug, email: r.email || '', telefono: r.telefono || '', password: '' });
      setShowModal(true);
  };

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
      if(!confirm(`⚠️ ATTENZIONE ⚠️\nStai per eliminare definitivamente "${nome}".\nTutti i dati verranno persi.\n\nSei sicuro?`)) return;
      try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); alert("Eliminato."); caricaDati(); } 
      catch(err) { alert("Errore eliminazione."); }
  };

  const toggleSospensione = async (id, statoAttuale) => {
    const isAttivo = statoAttuale !== false; 
    const nuovoStato = !isAttivo; 
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, account_attivo: nuovoStato } : r));
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_attivo: nuovoStato }) 
    });
  };

  const toggleMasterCucina = async (id, statoAttualeSuper) => {
    const isMasterActive = statoAttualeSuper !== false; 
    const nuovoStato = !isMasterActive; 
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, cucina_super_active: nuovoStato } : r));
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cucina_super_active: nuovoStato }) 
    });
  };

  const entraNelPannello = (slug) => { 
      localStorage.setItem(`stark_admin_session_${slug}`, "true"); 
      window.open(`/admin/${slug}`, '_blank'); 
  };
  
  const logout = () => {
    if (confirm("Vuoi uscire dal pannello Super Admin?")) {
        localStorage.removeItem("super_admin_token"); 
        localStorage.removeItem("super_admin_logged");
        setAuthorized(false);
        navigate('/'); 
    }
  };

  if (!authorized) {
    return (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#000'}}>
            <div style={{background:'#1a1a1a', padding:'40px', borderRadius:'10px', width:'100%', maxWidth:'400px', border:'1px solid #333'}}>
                <h1 style={{color:'white', textAlign:'center', marginBottom:30}}>🛡️ Super Admin Access</h1>
                <form onSubmit={handleSuperLogin} style={{display:'flex', flexDirection:'column', gap:15}}>
                    <input type="email" placeholder="Email" required onChange={e => setLoginData({...loginData, email: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                    <input type="password" placeholder="Password" required onChange={e => setLoginData({...loginData, password: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white'}} />
                    <div style={{borderTop:'1px solid #333', marginTop:10, paddingTop:10}}>
                        <label style={{color:'#888', fontSize:12}}>AUTENTICAZIONE 2 FATTORI (2FA)</label>
                        <input type="text" placeholder="Codice Sicurezza" required onChange={e => setLoginData({...loginData, code2fa: e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #333', background:'#000', color:'white', width:'100%', marginTop:5}} />
                    </div>
                    {error && <p style={{color:'#ff4d4d', textAlign:'center', margin:0}}>{error}</p>}
                    <button style={{background:'#e74c3c', color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', marginTop:10}}>VERIFICA IDENTITÀ</button>
                </form>
            </div>
        </div>
    );
  }

  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px', color: '#000', backgroundColor: '#fff', fontSize: '16px' };

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div><h1 style={{margin:0}}>🦸‍♂️ J.A.R.V.I.S. Control</h1><p style={{margin:0, opacity:0.7}}>Super Admin: Gestione Globale</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO LOCALE</button>
            <button onClick={() => setShowUsersModal(true)} style={{background:'#3498db', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>👥 UTENTI GLOBALI ({utentiGlobali.length})</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
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
                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Stato Abbonamento</div>
                        <button onClick={() => toggleSospensione(r.id, r.account_attivo)} style={{width: '100%', padding:'10px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold', background: isAbbonamentoAttivo ? '#2c3e50' : '#e67e22', color:'white', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                            {isAbbonamentoAttivo ? <span>⏸️ METTI IN PAUSA</span> : <span>▶️ RIATTIVA ACCOUNT</span>}
                        </button>
                    </div>
                    {isAbbonamentoAttivo ? (
                        <div style={{marginBottom:'15px'}}>
                            <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Permessi Cucina (Master)</div>
                            <button onClick={() => toggleMasterCucina(r.id, r.cucina_super_active)} style={{width: '100%', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', border: isMasterCucinaAttivo ? '2px solid #27ae60' : '2px solid #e74c3c', background: 'white', color: isMasterCucinaAttivo ? '#27ae60' : '#e74c3c', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                                {isMasterCucinaAttivo ? <span>✅ CUCINA ABILITATA</span> : <span>⛔ CUCINA BLOCCATA (Master)</span>}
                            </button>
                        </div>
                    ) : (
                        <div style={{background:'#fceceb', color:'#c0392b', padding:'10px', borderRadius:'5px', textAlign:'center', fontSize:'0.9rem', marginBottom:'15px'}}>🚫 Account Sospeso.<br/>Impossibile gestire la cucina.</div>
                    )}
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background: '#3498db', color: 'white', border: 'none', padding: '12px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold'}}>⚙️ GESTISCI PANNELLO ↗</button>
                </div>
            </div>
            );
        })}
      </div>
      
      {/* MODALE NUOVO/MODIFICA RISTORANTE */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
                  <h2 style={{marginTop:0, color:'#333'}}>{editingId ? "Modifica Ristorante" : "Nuovo Ristorante"}</h2>
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

      {/* --- MODALE UTENTI GLOBALI (NUOVO) --- */}
      {showUsersModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{background: 'white', borderRadius: '10px', width: '900px', maxWidth:'95%', height:'80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
                
                {/* HEADER MODALE */}
                <div style={{padding:'20px', background:'#2c3e50', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                        <h2 style={{margin:0, fontSize:'1.5rem'}}>🌍 Utenti Globali Registrati</h2>
                        <span style={{opacity:0.8}}>Database centralizzato ({utentiGlobali.length} utenti totali)</span>
                    </div>
                    <button onClick={() => setShowUsersModal(false)} style={{background:'transparent', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>✕</button>
                </div>

                {/* TOOLBAR */}
                <div style={{padding:'15px', borderBottom:'1px solid #eee', background:'#f9f9f9', display:'flex', justifyContent:'flex-end'}}>
                     <button onClick={exportUsersExcel} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}>
                        📥 SCARICA EXCEL
                    </button>
                </div>

                {/* TABELLA SCROLLABILE */}
                <div style={{flex:1, overflowY:'auto', padding:'20px'}}>
                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead style={{position:'sticky', top:-20, background:'white', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                            <tr style={{background:'#ecf0f1', color:'#2c3e50', textAlign:'left'}}>
                                <th style={{padding:15}}>ID</th>
                                <th style={{padding:15}}>Nome</th>
                                <th style={{padding:15}}>Email</th>
                                <th style={{padding:15}}>Ruolo</th>
                                <th style={{padding:15}}>Locale ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {utentiGlobali.map(u => (
                                <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:15, color:'#7f8c8d'}}>{u.id}</td>
                                    <td style={{padding:15, fontWeight:'bold', color:'#2c3e50'}}>{u.nome}</td>
                                    <td style={{padding:15}}>{u.email}</td>
                                    <td style={{padding:15}}>
                                        <span style={{
                                            background: u.ruolo === 'admin' ? '#2c3e50' : (u.ruolo === 'cameriere' ? '#e67e22' : '#3498db'),
                                            color:'white', padding:'3px 8px', borderRadius:'10px', fontSize:'0.8rem', textTransform:'uppercase'
                                        }}>
                                            {u.ruolo}
                                        </span>
                                    </td>
                                    <td style={{padding:15}}>{u.ristorante_id || '-'}</td>
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