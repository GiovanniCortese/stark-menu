// client/src/SuperAdmin.jsx - VERSIONE V8 (GRAFICA FEDELE ALLA FOTO) 📸
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  
  // STATI MODALE
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
          if(res.ok) { alert(editingId ? "Aggiornato!" : "Creato!"); chiudiModale(); caricaDati(); } 
      } catch(err) { alert("Errore."); }
  };

  const handleElimina = async (id, nome) => {
      if(!confirm(`⚠️ ELIMINARE "${nome}"?\nPerderai tutto.`)) return;
      try { await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'DELETE' }); caricaDati(); } catch(err) { alert("Errore."); }
  };

  // --- AZIONE 1: PAUSA ABBONAMENTO (Blocco Totale) ---
  const toggleSospensione = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale; 
    setRistoranti(ristoranti.map(r => r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r));
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordini_abilitati: nuovoStato }) });
  };

  // --- AZIONE 2: STATO CUCINA (Apre/Chiude ordini) ---
  const toggleServizioCucina = async (id, statoAttuale) => {
      const nuovoStato = !statoAttuale;
      setRistoranti(ristoranti.map(r => r.id === id ? { ...r, servizio_attivo: nuovoStato } : r));
      await fetch(`${API_URL}/api/ristorante/servizio/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servizio_attivo: nuovoStato }) });
  };

  const entraNelPannello = (slug) => { localStorage.setItem(`stark_session_${slug}`, "true"); window.open(`/admin/${slug}`, '_blank'); };
  const logout = () => { localStorage.removeItem("super_admin_logged"); navigate('/'); };

  if (!authorized) return null;

  const inputStyle = { width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '5px', color: '#000', backgroundColor: '#fff', fontSize: '16px' };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily:'sans-serif', color:'#fff'}}>
      
      <header style={{borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div><h1 style={{margin:0}}>🦸‍♂️ J.A.R.V.I.S. Control</h1><p style={{margin:0, opacity:0.7, fontSize:'14px'}}>Super Admin: Gestione Globale</p></div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriModaleNuovo} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>+ NUOVO</button>
            <button onClick={logout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer'}}>ESCI</button>
        </div>
      </header>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
        {ristoranti.map(r => (
            <div key={r.id} style={{
                background: '#fff', borderRadius: '10px', overflow:'hidden', color:'#333',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                
                {/* HEADER CARD */}
                <div style={{padding:'20px', position:'relative'}}>
                    <div style={{position:'absolute', top:'20px', right:'20px', display:'flex', gap:'5px'}}>
                        <button onClick={() => apriModaleModifica(r)} style={{background:'#f39c12', border:'none', borderRadius:'4px', cursor:'pointer', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center'}}>✏️</button>
                        <button onClick={() => handleElimina(r.id, r.nome)} style={{background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center'}}>🗑️</button>
                    </div>

                    <h2 style={{margin:'0 0 5px 0', fontSize:'1.2rem', fontWeight:'bold'}}>{r.nome}</h2>
                    <div style={{background:'#222', color:'#fff', padding:'2px 8px', borderRadius:'4px', fontSize:'0.75rem', display:'inline-block', marginBottom:'15px'}}>/{r.slug}</div>
                    
                    <div style={{fontSize:'0.85rem', color:'#666', lineHeight:'1.6'}}>
                        <div>📧 {r.email || '-'}</div>
                        <div>📞 {r.telefono || '-'}</div>
                    </div>
                </div>
                
                {/* AREA CONTROLLI (GRIGIA) */}
                <div style={{background:'#f5f5f5', padding:'20px', borderTop:'1px solid #eee'}}>
                    
                    {/* SEZIONE 1: STATO ABBONAMENTO (PAUSA) */}
                    <div style={{marginBottom:'20px'}}>
                        <div style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888', textTransform:'uppercase', marginBottom:'8px'}}>STATO ABBONAMENTO</div>
                        <button 
                            onClick={() => toggleSospensione(r.id, r.ordini_abilitati)} 
                            style={{
                                width: '100%', padding:'12px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'14px',
                                background: '#2c3e50', color:'white', 
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                            }}
                        >
                            {r.ordini_abilitati ? "⏸️ METTI IN PAUSA" : "▶️ RIATTIVA ABBONAMENTO"}
                        </button>
                    </div>

                    {/* SEZIONE 2: STATO CUCINA (SOLO SE ATTIVO) */}
                    <div style={{marginBottom:'20px'}}>
                        <div style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888', textTransform:'uppercase', marginBottom:'8px'}}>STATO CUCINA</div>
                        {r.ordini_abilitati ? (
                            <>
                                <button 
                                    onClick={() => toggleServizioCucina(r.id, r.servizio_attivo)} 
                                    style={{
                                        width: '100%', padding:'12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'14px',
                                        border: r.servizio_attivo ? '2px solid #e74c3c' : '2px solid #27ae60',
                                        background: 'white', color: r.servizio_attivo ? '#e74c3c' : '#27ae60',
                                        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                                    }}
                                >
                                    {r.servizio_attivo ? "⛔ CHIUDI CUCINA" : "✅ APRI CUCINA"}
                                </button>
                                <div style={{textAlign:'center', fontSize:'0.75rem', marginTop:'5px', color: r.servizio_attivo ? '#27ae60' : '#e74c3c', fontWeight:'bold'}}>
                                    {r.servizio_attivo ? "Attualmente APERTA" : "Attualmente CHIUSA"}
                                </div>
                            </>
                        ) : (
                            <div style={{background:'#ddd', color:'#777', padding:'10px', textAlign:'center', borderRadius:'6px', fontSize:'0.8rem'}}>🚫 Abbonamento Sospeso</div>
                        )}
                    </div>

                    {/* FOOTER: GESTISCI PANNELLO */}
                    <button onClick={() => entraNelPannello(r.slug)} style={{width:'100%', background: '#3498db', color: 'white', border: 'none', padding: '12px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize:'14px'}}>
                        ⚙️ GESTISCI PANNELLO ↗
                    </button>
                </div>

            </div>
        ))}
      </div>

      {/* MODALE (Stile Nero) */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{background: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth:'90%'}}>
                  <h2 style={{marginTop:0, color:'#333'}}>{editingId ? "Modifica Ristorante" : "Nuovo Ristorante"}</h2>
                  <form onSubmit={handleSalva} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Nome:</label><input required name="nome" value={formData.nome} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Slug:</label><input required name="slug" value={formData.slug} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Email:</label><input name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} /></div>
                      <div><label style={{color:'#333', fontWeight:'bold'}}>Telefono:</label><input name="telefono" value={formData.telefono} onChange={handleInputChange} style={inputStyle} /></div>
                      <div style={{borderTop:'1px solid #eee', paddingTop:'10px'}}><label style={{color:'#333', fontWeight:'bold'}}>Password:</label><input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Invariata" : "Obbligatoria"} style={inputStyle} /></div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="submit" style={{flex:1, background:'#27ae60', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer'}}>SALVA</button>
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