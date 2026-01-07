// client/src/SuperAdmin.jsx - VERSIONE V13 (BASE V3 + DOPPIO COMANDO) 🛠️
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  
  // STATI PER IL MODALE
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ nome: '', slug: '', email: '', telefono: '', password: '' });

  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    const isLogged = localStorage.getItem("super_admin_logged");
    if (isLogged === "true") {
        setAuthorized(true);
        caricaDati();
    } else {
        const password = prompt("🔒 Accesso Riservato Stark Enterprise.\nInserisci la Master Key:");
        if (password === "tonystark") {
            setAuthorized(true);
            localStorage.setItem("super_admin_logged", "true");
            caricaDati();
        } else {
            alert("⛔ Accesso Negato!");
            navigate('/'); 
        }
    }
  }, []);

  const caricaDati = () => {
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => {
          if(Array.isArray(data)) setRistoranti(data);
      })
      .catch(err => console.error(err));
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

  // --- AZIONI CRUD BASE ---
  const handleSalva = async (e) => {
      e.preventDefault();
      const endpoint = editingId ? `${API_URL}/api/super/ristoranti/${editingId}` : `${API_URL}/api/super/ristoranti`;             
      const method = editingId ? 'PUT' : 'POST';

      try {
          const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
          if(res.ok) { alert(editingId ? "Dati aggiornati!" : "Creato!"); chiudiModale(); caricaDati(); } 
      } catch(err) { alert("Errore connessione."); }
  };

  const handleElimina = async (id, nome) => {
      if(!confirm(`⚠️ ELIMINARE "${nome}"?\nPerderai tutto.`)) return;
      try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); caricaDati(); } catch(err) { alert("Errore."); }
  };

  // ---------------------------------------------------------
  // 1. COMANDO CUCINA (Usa il tuo codice V3: ordini_abilitati)
  // ---------------------------------------------------------
  const toggleCucina = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale;
    // UI Optimistic
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r));
    // Server Call
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordini_abilitati: nuovoStato })
    });
  };

  // ---------------------------------------------------------
  // 2. COMANDO ABBONAMENTO (Usa il nuovo campo: account_attivo)
  // ---------------------------------------------------------
  const toggleSospensione = async (id, statoAttualeAccount) => {
    // Se è undefined (vecchi record), consideralo true
    const attuale = statoAttualeAccount !== false; 
    const nuovoStato = !attuale; 
    
    // UI Optimistic
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, account_attivo: nuovoStato } : r));
    
    // Server Call (campo account_attivo)
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_attivo: nuovoStato })
    });
  };

  // 4. GOD MODE
  const entraNelPannello = (slug) => { localStorage.setItem(`stark_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { localStorage.removeItem("super_admin_logged"); navigate('/'); };

  if (!authorized) return null;

  // Stile Input
  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '16px' };

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily:'sans-serif'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div><h1>🦸‍♂️ J.A.R.V.I.S. Control</h1><p>Super Admin: Gestione Globale</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>+ NUOVO</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div className="card-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px'}}>
        {ristoranti.map(r => {
            const isAccountAttivo = r.account_attivo !== false; // Default true

            return (
            <div key={r.id} className="card" style={{
                background: '#fff', borderRadius: '10px', overflow:'hidden', 
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '1px solid #ddd'
            }}>
                
                {/* HEADER CARD */}
                <div style={{padding:'20px', position:'relative'}}>
                    <div style={{position:'absolute', top:'15px', right:'15px', display:'flex', gap:'5px'}}>
                        <button onClick={() => apriModaleModifica(r)} style={{background:'#f39c12', border:'none', borderRadius:'4px', cursor:'pointer', width:'30px', height:'30px'}}>✏️</button>
                        <button onClick={() => handleElimina(r.id, r.nome)} style={{background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', width:'30px', height:'30px'}}>🗑️</button>
                    </div>

                    <h2 style={{margin:'0 0 5px 0', fontSize:'1.4rem', color:'#333'}}>{r.nome}</h2>
                    <code style={{background:'#333', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</code>
                    <div style={{fontSize:'0.9rem', color:'#666', marginTop:'10px'}}>
                        <div>📧 {r.email || '-'}</div>
                        <div>📞 {r.telefono || '-'}</div>
                    </div>
                </div>
                
                {/* AREA CONTROLLI (GRIGIA) */}
                <div style={{background:'#f5f5f5', padding:'20px', borderTop:'1px solid #eee'}}>
                    
                    {/* TASTO 1: STATO ABBONAMENTO (Blocco Totale) */}
                    <div style={{marginBottom:'20px'}}>
                        <div style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888', marginBottom:'5px'}}>STATO ABBONAMENTO</div>
                        <button onClick={() => toggleSospensione(r.id, r.account_attivo)} style={{
                            width: '100%', padding:'10px', borderRadius:'5px', border:'none', cursor:'pointer', fontWeight:'bold',
                            background: isAccountAttivo ? '#2c3e50' : '#e67e22', color:'white'
                        }}>
                            {isAccountAttivo ? "⏸️ METTI IN PAUSA" : "▶️ RIATTIVA ABBONAMENTO"}
                        </button>
                    </div>

                    {/* TASTO 2: STATO CUCINA (Il tuo codice V3) */}
                    <div style={{marginBottom:'20px'}}>
                        <div style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888', marginBottom:'5px'}}>STATO CUCINA</div>
                        {isAccountAttivo ? (
                            <button onClick={() => toggleCucina(r.id, r.ordini_abilitati)} style={{
                                width: '100%', padding:'10px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold',
                                border: r.ordini_abilitati ? '2px solid #e74c3c' : '2px solid #27ae60',
                                background: 'white', 
                                color: r.ordini_abilitati ? '#e74c3c' : '#27ae60'
                            }}>
                                {r.ordini_abilitati ? "⛔ CHIUDI CUCINA" : "✅ APRI CUCINA"}
                            </button>
                        ) : (
                            <div style={{background:'#ddd', color:'#777', padding:'10px', textAlign:'center', borderRadius:'5px', fontSize:'0.8rem'}}>
                                🚫 Abbonamento Sospeso
                            </div>
                        )}
                    </div>

                    {/* LINK */}
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background: '#3498db', color: 'white', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold'}}>
                        ⚙️ GESTISCI PANNELLO ↗
                    </button>
                </div>
            </div>
        )})}
      </div>

      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%'}}>
                  <h2 style={{marginTop:0}}>{editingId ? "Modifica" : "Nuovo"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                      <input required name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Nome" style={inputStyle} />
                      <input required name="slug" value={formData.slug} onChange={handleInputChange} placeholder="Slug" style={inputStyle} />
                      <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" style={inputStyle} />
                      <input name="telefono" value={formData.telefono} onChange={handleInputChange} placeholder="Telefono" style={inputStyle} />
                      <input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Password (opzionale)" style={inputStyle} />
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:'10px', borderRadius:'5px', cursor:'pointer'}}>SALVA</button>
                          <button type="button" onClick={chiudiModale} style={{flex:1, background:'#777', color:'white', border:'none', padding:'10px', borderRadius:'5px', cursor:'pointer'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default SuperAdmin;