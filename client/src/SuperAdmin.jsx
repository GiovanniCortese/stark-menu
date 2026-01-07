// client/src/SuperAdmin.jsx - VERSIONE V6 (SEPARAZIONE PAUSA/ORDINI + FIX COLORI) 🛠️
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
      .then(data => { if(Array.isArray(data)) setRistoranti(data); })
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

  // --- AZIONE 1: PAUSA GLOBALE (BLOCCA TUTTO) ---
  // Usa il campo 'ordini_abilitati' come flag "Account Attivo/Sospeso"
  const toggleSospensione = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale; // Se true diventa false (Sospeso)
    
    // Aggiornamento ottmistico
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r));
    
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordini_abilitati: nuovoStato }) // Questo blocca l'accesso al menu
    });
  };

  // --- AZIONE 2: ABILITA/DISABILITA ORDINI (APRI/CHIUDI CUCINA) ---
  // Usa il campo 'servizio_attivo'
  const toggleServizioCucina = async (id, statoAttuale) => {
      const nuovoStato = !statoAttuale;
      
      // Aggiornamento ottmistico
      setRistoranti(ristoranti.map(r => r.id === id ? { ...r, servizio_attivo: nuovoStato } : r));

      await fetch(`${API_URL}/api/ristorante/servizio/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servizio_attivo: nuovoStato })
      });
  };

  const entraNelPannello = (slug) => { localStorage.setItem(`stark_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { localStorage.removeItem("super_admin_logged"); navigate('/'); };

  if (!authorized) return null;

  // STILE INPUT (FIXATO: TESTO NERO)
  const inputStyle = {
      width: '100%', 
      padding: '10px', 
      marginTop: '5px', 
      border: '1px solid #ccc', 
      borderRadius: '5px',
      color: '#000000',       // FORZA COLORE NERO
      backgroundColor: '#ffffff', // SFONDO BIANCO
      fontSize: '16px'
  };

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div><h1>🦸‍♂️ J.A.R.V.I.S. Control Center</h1><p>Super Admin: Gestione Globale Attività</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div className="card-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px'}}>
        {ristoranti.map(r => (
            <div key={r.id} className="card" style={{
                border: '1px solid #ddd', borderRadius: '8px', padding: '20px',
                borderLeft: r.ordini_abilitati ? '8px solid #2ecc71' : '8px solid #000', // Verde attivo, Nero sospeso
                background: r.ordini_abilitati ? '#fff' : '#e0e0e0', // Grigio se sospeso
                opacity: r.ordini_abilitati ? 1 : 0.8,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position:'relative'
            }}>
                
                {/* TOOLBAR SUPERIORE */}
                <div style={{position:'absolute', top:'10px', right:'10px', display:'flex', gap:'5px'}}>
                    <button onClick={() => apriModaleModifica(r)} title="Modifica" style={{background:'#f1c40f', border:'none', borderRadius:'4px', cursor:'pointer', padding:'6px 10px'}}>✏️</button>
                    <button onClick={() => handleElimina(r.id, r.nome)} title="Elimina" style={{background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', padding:'6px 10px'}}>🗑️</button>
                </div>

                <div style={{marginBottom:'15px', paddingRight:'100px'}}>
                    <h2 style={{margin:'0 0 5px 0', fontSize:'1.3rem', color:'#333'}}>{r.nome}</h2>
                    <code style={{background:'#eee', color:'#555', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</code>
                </div>
                
                {/* --- SEZIONE CONTROLLI (DIVISA) --- */}
                <div style={{display:'flex', gap:'10px', marginBottom:'15px', flexDirection:'column'}}>
                    
                    {/* 1. PAUSA GLOBALE (Account) */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.05)', padding:'10px', borderRadius:'5px'}}>
                        <span style={{fontSize:'0.9rem', color:'#333'}}>Stato Account:</span>
                        <button 
                            onClick={() => toggleSospensione(r.id, r.ordini_abilitati)} 
                            style={{
                                background: r.ordini_abilitati ? '#2c3e50' : '#e74c3c',
                                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 15px', fontWeight:'bold'
                            }}
                        >
                            {r.ordini_abilitati ? "⏸️ METTI IN PAUSA" : "▶️ RIATTIVA"}
                        </button>
                    </div>

                    {/* 2. SERVIZIO ORDINI (Cucina) - Solo se non è sospeso */}
                    {r.ordini_abilitati && (
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background: r.servizio_attivo ? '#e8f8f5' : '#fdedec', padding:'10px', borderRadius:'5px', border: r.servizio_attivo ? '1px solid #2ecc71' : '1px solid #e74c3c'}}>
                            <span style={{fontSize:'0.9rem', color: r.servizio_attivo ? '#27ae60':'#c0392b'}}>
                                {r.servizio_attivo ? "Cucina APERTA 🟢" : "Cucina CHIUSA ⛔"}
                            </span>
                            <button 
                                onClick={() => toggleServizioCucina(r.id, r.servizio_attivo)} 
                                style={{
                                    background: 'white', 
                                    border: r.servizio_attivo ? '1px solid #e74c3c' : '1px solid #2ecc71',
                                    color: r.servizio_attivo ? '#e74c3c' : '#2ecc71',
                                    borderRadius: '4px', cursor: 'pointer', padding: '5px 10px', fontWeight:'bold', fontSize:'0.8rem'
                                }}
                            >
                                {r.servizio_attivo ? "CHIUDI ORDINI" : "APRI ORDINI"}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <button onClick={() => entraNelPannello(r.slug)} style={{background: '#3498db', color: 'white', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold'}}>
                        ⚙️ VAI AL PANNELLO
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* MODALE CON INPUT FIXATI (NERO) */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
                  <h2 style={{marginTop:0, color:'#333'}}>{editingId ? "Modifica Ristorante" : "Nuovo Ristorante"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                      <div>
                          <label style={{color:'#333', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Nome Attività:</label>
                          <input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} />
                      </div>
                      <div>
                          <label style={{color:'#333', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Slug (URL):</label>
                          <input required name="slug" value={formData.slug} onChange={handleInputChange} placeholder="es. pizzeria-da-mario" style={inputStyle} />
                      </div>
                      <div>
                          <label style={{color:'#333', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Email:</label>
                          <input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} />
                      </div>
                      <div>
                          <label style={{color:'#333', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Telefono:</label>
                          <input name="telefono" value={formData.telefono} onChange={handleInputChange} style={inputStyle} />
                      </div>
                      <div style={{borderTop:'1px solid #eee', paddingTop:'10px'}}>
                          <label style={{color:'#333', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Password Admin:</label>
                          <input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Lascia vuoto per non cambiare" : "Obbligatoria"} style={inputStyle} />
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', fontSize:'16px'}}>SALVA</button>
                          <button type="button" onClick={chiudiModale} style={{flex:1, background:'#95a5a6', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer', fontSize:'16px'}}>ANNULLA</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default SuperAdmin;