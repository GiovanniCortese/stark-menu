// client/src/SuperAdmin.jsx - VERSIONE V15 (LOGICA INVERTITA SU COLONNE ESISTENTI) 🛠️
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

  // --- AZIONE 1: STATO ABBONAMENTO (PAUSA) ---
  // NOTA: Qui usi 'servizio_attivo' come interruttore dell'abbonamento
  const toggleSospensione = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale; 
    
    // Aggiornamento ottimistico
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, servizio_attivo: nuovoStato } : r));
    
    // Chiamata Server su 'servizio_attivo' (usiamo l'endpoint specifico del servizio, ma qui come super admin usiamo la rotta put servizio)
    // O meglio, usiamo la rotta super admin generica se vogliamo coerenza, ma nel tuo esempio usavi servizio.
    // Qui uso la rotta SUPER ADMIN per essere sicuri che funzioni sempre.
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servizio_attivo: nuovoStato }) 
    });
  };

  // --- AZIONE 2: APRI/CHIUDI CUCINA ---
  // NOTA: Qui usi 'ordini_abilitati' come interruttore della cucina
  const toggleOrdini = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale; 
    
    // Aggiornamento ottimistico
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r));
    
    // Chiamata Server su 'ordini_abilitati'
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordini_abilitati: nuovoStato }) 
    });
  };

  const entraNelPannello = (slug) => { localStorage.setItem(`stark_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { localStorage.removeItem("super_admin_logged"); navigate('/'); };

  if (!authorized) return null;

  const inputStyle = {
      width: '100%', padding: '10px', marginTop: '5px', 
      border: '1px solid #ccc', borderRadius: '5px',
      color: '#000', backgroundColor: '#fff', fontSize: '16px'
  };

  return (
    <div className="container" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
      
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div><h1 style={{margin:0}}>🦸‍♂️ J.A.R.V.I.S. Control</h1><p style={{margin:0, opacity:0.7}}>Super Admin: Gestione Globale</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>➕ NUOVO</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px'}}>
        {ristoranti.map(r => (
            <div key={r.id} style={{
                border: '1px solid #ddd', borderRadius: '12px', overflow:'hidden',
                background: r.servizio_attivo ? '#ffffff' : '#f2f2f2', // Sfondo basato sull'abbonamento (servizio_attivo)
                boxShadow: '0 5px 15px rgba(0,0,0,0.08)', position:'relative',
                display:'flex', flexDirection:'column'
            }}>
                
                {/* HEADER CARD */}
                <div style={{padding:'15px', borderBottom:'1px solid #eee', background: r.servizio_attivo ? '#fff' : '#e0e0e0', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                        <h2 style={{margin:'0 0 5px 0', fontSize:'1.4rem', color:'#333'}}>{r.nome}</h2>
                        <span style={{background:'#333', color:'#fff', padding:'3px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</span>
                    </div>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => apriModaleModifica(r)} title="Modifica" style={{background:'#f39c12', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px', width:'30px', height:'30px'}}>✏️</button>
                        <button onClick={() => handleElimina(r.id, r.nome)} title="Elimina" style={{background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', padding:'5px', width:'30px', height:'30px'}}>🗑️</button>
                    </div>
                </div>

                {/* BODY CARD */}
                <div style={{padding:'15px', color:'#666', fontSize:'0.9rem', flex:1}}>
                    <p style={{margin:'5px 0'}}>📧 {r.email || '-'}</p>
                    <p style={{margin:'5px 0'}}>📞 {r.telefono || '-'}</p>
                </div>
                
                {/* CONTROLS */}
                <div style={{padding:'15px', background:'#f9f9f9', borderTop:'1px solid #eee'}}>
                    
                    {/* A. STATO ABBONAMENTO (Usa toggleSospensione -> servizio_attivo) */}
                    <div style={{marginBottom:'15px'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Stato Abbonamento</div>
                        <button 
                            onClick={() => toggleSospensione(r.id, r.servizio_attivo)} 
                            style={{
                                width: '100%', padding:'10px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold',
                                background: r.servizio_attivo ? '#2c3e50' : '#e67e22', color:'white',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'
                            }}
                        >
                            {r.servizio_attivo ? <span>⏸️ METTI IN PAUSA</span> : <span>▶️ RIATTIVA ACCOUNT</span>}
                        </button>
                    </div>

                    {/* B. STATO CUCINA (Usa toggleOrdini -> ordini_abilitati) */}
                    {/* Mostra i controlli cucina SOLO se l'abbonamento (servizio_attivo) è TRUE */}
                    {r.servizio_attivo ? (
                        <div style={{marginBottom:'15px'}}>
                            <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Stato Cucina</div>
                            <button 
                                onClick={() => toggleOrdini(r.id, r.ordini_abilitati)} 
                                style={{
                                    width: '100%', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold',
                                    border: r.ordini_abilitati ? '2px solid #e74c3c' : '2px solid #27ae60',
                                    background: 'white',
                                    color: r.ordini_abilitati ? '#e74c3c' : '#27ae60',
                                    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'
                                }}
                            >
                                {r.ordini_abilitati ? <span>⛔ CHIUDI CUCINA</span> : <span>✅ APRI CUCINA</span>}
                            </button>
                            <div style={{textAlign:'center', fontSize:'0.8rem', marginTop:'5px', color: r.ordini_abilitati ? '#27ae60' : '#e74c3c'}}>
                                {r.ordini_abilitati ? "Attualmente APERTA" : "Attualmente CHIUSA"}
                            </div>
                        </div>
                    ) : (
                        <div style={{background:'#fceceb', color:'#c0392b', padding:'10px', borderRadius:'5px', textAlign:'center', fontSize:'0.9rem', marginBottom:'15px'}}>
                            🚫 Account Sospeso.<br/>Impossibile gestire la cucina.
                        </div>
                    )}

                    {/* C. LINK PANNELLO */}
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background: '#3498db', color: 'white', border: 'none', padding: '12px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold'}}>
                        ⚙️ GESTISCI PANNELLO ↗
                    </button>
                </div>

            </div>
        ))}
      </div>

      {/* MODALE */}
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
    </div>
  );
}

export default SuperAdmin;