// client/src/SuperAdmin.jsx - VERSIONE V4 (TASTO PAUSA IN TOOLBAR) ⏸️
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

  // --- GESTIONE FORM ---
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

  // --- AZIONI CRUD ---
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

  // 3. TOGGLE ORDINI (PAUSA/PLAY)
  const toggleOrdini = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale;
    // UI Update immediato
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r));
    // Chiamata Server
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordini_abilitati: nuovoStato })
    });
  };

  const entraNelPannello = (slug) => { localStorage.setItem(`stark_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { localStorage.removeItem("super_admin_logged"); navigate('/'); };

  if (!authorized) return null;

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div><h1>🦸‍♂️ J.A.R.V.I.S. Control Center</h1><p>Super Admin: Gestione Globale Attività</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div className="card-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
        {ristoranti.map(r => (
            <div key={r.id} className="card" style={{
                border: '1px solid #ddd', borderRadius: '8px', padding: '20px',
                borderLeft: r.ordini_abilitati ? '8px solid #2ecc71' : '8px solid #e74c3c',
                background: r.ordini_abilitati ? '#fff' : '#fceceb', // Sfondo rossiccio se in pausa
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position:'relative'
            }}>
                
                {/* --- TOOLBAR: PAUSA, MODIFICA, ELIMINA --- */}
                <div style={{position:'absolute', top:'10px', right:'10px', display:'flex', gap:'5px'}}>
                    
                    {/* TASTO PAUSA/PLAY */}
                    <button 
                        onClick={() => toggleOrdini(r.id, r.ordini_abilitati)} 
                        title={r.ordini_abilitati ? "Metti in PAUSA (Blocca Ordini)" : "RIATTIVA Ristorante"}
                        style={{
                            background: r.ordini_abilitati ? '#e67e22' : '#2ecc71', // Arancio se attivo, Verde se bloccato
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px', fontSize:'14px'
                        }}
                    >
                        {r.ordini_abilitati ? "⏸️" : "▶️"}
                    </button>

                    <button onClick={() => apriModaleModifica(r)} title="Modifica Dati" style={{background:'#f1c40f', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px 10px'}}>✏️</button>
                    <button onClick={() => handleElimina(r.id, r.nome)} title="Elimina Definitivamente" style={{background:'#e74c3c', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px 10px'}}>🗑️</button>
                </div>

                <div style={{marginBottom:'15px', paddingRight:'100px'}}>
                    <h2 style={{margin:'0 0 5px 0', fontSize:'1.3rem'}}>{r.nome}</h2>
                    <code style={{background:'#eee', color:'#555', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</code>
                    <div style={{fontSize:'0.85rem', color:'#666', marginTop:'5px'}}>
                        📧 {r.email || 'N/D'} <br/>
                        📞 {r.telefono || 'N/D'}
                    </div>
                </div>
                
                <div style={{background: '#f4f4f4', padding: '8px', borderRadius: '5px', marginBottom: '15px', textAlign:'center', fontSize:'0.9rem'}}>
                    Stato: <strong style={{color: r.ordini_abilitati ? '#27ae60' : '#c0392b'}}>{r.ordini_abilitati ? "APERTO 🟢" : "IN PAUSA 🔴"}</strong>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <button onClick={() => entraNelPannello(r.slug)} style={{background: '#34495e', color: 'white', border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold'}}>
                        ⚙️ GESTISCI PANNELLO ↗
                    </button>
                </div>
            </div>
        ))}
      </div>

      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%'}}>
                  <h2 style={{marginTop:0}}>{editingId ? "Modifica Ristorante" : "Nuovo Ristorante"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                      <div><label>Nome Attività:</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={{width:'100%', padding:'8px', marginTop:'5px'}} /></div>
                      <div><label>Slug (URL):</label><input required name="slug" value={formData.slug} onChange={handleInputChange} placeholder="es. pizzeria-da-mario" style={{width:'100%', padding:'8px', marginTop:'5px', background:'#eee'}} /><small>URL: .../admin/<strong>{formData.slug}</strong></small></div>
                      <div><label>Email:</label><input name="email" value={formData.email} onChange={handleInputChange} style={{width:'100%', padding:'8px', marginTop:'5px'}} /></div>
                      <div><label>Telefono:</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} style={{width:'100%', padding:'8px', marginTop:'5px'}} /></div>
                      <div style={{borderTop:'1px solid #ccc', paddingTop:'10px'}}><label>Password Admin:</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Lascia vuoto per mantenere attuale" : "Obbligatoria"} style={{width:'100%', padding:'8px', marginTop:'5px'}} /></div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:'10px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>SALVA</button>
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