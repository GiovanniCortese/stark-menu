// client/src/Admin.jsx - CON GESTIONE INTERRUTTORE 🎚️
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [menu, setMenu] = useState([]);
  const [config, setConfig] = useState({ ordini_abilitati: false, servizio_attivo: false });
  const [uploading, setUploading] = useState(false);
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' });
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    caricaDati();
  }, []);

  const caricaDati = () => {
    // 1. Carica Menu
    fetch(`${API_URL}/api/menu/${user.slug}`)
      .then(res => res.json())
      .then(data => { if(data.menu) setMenu(data.menu); });

    // 2. Carica Configurazione Fresca (Permessi e Stato)
    fetch(`${API_URL}/api/ristorante/config/${user.id}`)
      .then(res => res.json())
      .then(data => setConfig(data)) // { ordini_abilitati: true/false, servizio_attivo: true/false }
      .catch(err => console.error(err));
  };

  // Funzione per l'Admin che vuole spegnere/accendere il servizio
  const toggleServizio = async () => {
    const nuovoStato = !config.servizio_attivo;
    
    // Aggiornamento ottimistico
    setConfig({ ...config, servizio_attivo: nuovoStato });

    await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servizio_attivo: nuovoStato })
    });
  };

  /* ... GESTIONE FOTO E PRODOTTI RIMANE UGUALE ... */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return; setUploading(true);
    const formData = new FormData(); formData.append('photo', file);
    try { const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData }); const data = await res.json(); if (data.url) setNuovoPiatto({ ...nuovoPiatto, immagine_url: data.url }); } 
    catch (error) { alert("Errore foto"); } finally { setUploading(false); }
  };
  const handleAggiungi = async (e) => {
    e.preventDefault();
    if(!nuovoPiatto.nome || !nuovoPiatto.prezzo) return alert("Dati mancanti");
    await fetch(`${API_URL}/api/prodotti`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nuovoPiatto, ristorante_id: user.id }) });
    setNuovoPiatto({ nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' }); caricaDati(); alert("Fatto!");
  };
  const handleCancella = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, { method: 'DELETE' }); caricaDati(); } };

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => navigate(`/${user.slug}`)} style={{background:'#333'}}>Vedi Menu</button>
            <button onClick={() => {localStorage.removeItem('user'); navigate('/login')}} style={{background:'red'}}>Esci</button>
        </div>
      </header>

      {/* --- PANNELLO CONTROLLO ORDINI --- */}
      <div className="card" style={{border: '2px solid #333', background: '#fff3cd'}}>
        <h3>🚦 Stato Servizio</h3>
        
        {/* LOGICA VISUALIZZAZIONE */}
        {!config.ordini_abilitati ? (
            // CASO 1: Super Admin ha detto NO
            <p style={{color: 'red'}}>🚫 <strong>Funzionalità non attiva nel tuo piano.</strong> Contatta l'assistenza per abilitare gli ordini al tavolo.</p>
        ) : (
            // CASO 2: Super Admin ha detto SI -> Mostriamo l'interruttore
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <p>Gestisci la ricezione degli ordini in tempo reale:</p>
                <button 
                    onClick={toggleServizio}
                    style={{
                        background: config.servizio_attivo ? '#2ecc71' : '#e74c3c',
                        color: 'white', fontWeight: 'bold', padding: '10px 20px', fontSize: '16px', borderRadius: '30px'
                    }}
                >
                    {config.servizio_attivo ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}
                </button>
            </div>
        )}
      </div>

      <div className="card" style={{background: '#f8f9fa', border: '2px dashed #ccc'}}>
        <h3>➕ Aggiungi Piatto</h3>
        <form onSubmit={handleAggiungi} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <input placeholder="Nome" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
          <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} />
          <div style={{background:'white', padding:'10px'}}><input type="file" onChange={handleFileChange} />{uploading && "Caricamento..."}{nuovoPiatto.immagine_url && "✅ Foto OK"}</div>
          <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})}><option>Pizze</option><option>Bibite</option><option>Dolci</option></select>
          <button type="submit" className="btn-invia">SALVA</button>
        </form>
      </div>

      <div className="menu-list">
        {menu.map((p) => (
          <div key={p.id} className="card" style={{flexDirection:'row', justifyContent:'space-between'}}>
             <span>{p.nome} ({p.prezzo}€)</span>
             <button onClick={() => handleCancella(p.id)} style={{background:'darkred'}}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Admin;