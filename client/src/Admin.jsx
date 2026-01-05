// client/src/Admin.jsx - VERSIONE DEFINITIVA (FOTO + SAAS) 💼
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [menu, setMenu] = useState([]);
  const [uploading, setUploading] = useState(false); // Spinner caricamento
  const [nuovoPiatto, setNuovoPiatto] = useState({ 
    nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' 
  });
  
  const navigate = useNavigate();
  
  // Recuperiamo i dati di chi si è loggato (Stark o Luigi)
  const user = JSON.parse(localStorage.getItem('user'));
  
  // URL BACKEND
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // Se non sei loggato, via!
    if (!user) {
      navigate('/login');
    } else {
      caricaMenu();
    }
  }, []);

  const caricaMenu = () => {
    // Carichiamo il menu specifico di QUESTO ristorante usando lo slug
    fetch(`${API_URL}/api/menu/${user.slug}`)
      .then(res => res.json())
      .then(data => { 
          if(data.menu) setMenu(data.menu); 
      })
      .catch(err => console.error("Errore caricamento menu", err));
  };

  // --- GESTIONE UPLOAD FOTO ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        setNuovoPiatto({ ...nuovoPiatto, immagine_url: data.url });
      }
    } catch (error) {
      alert("Errore caricamento foto");
    } finally {
      setUploading(false);
    }
  };

  const handleAggiungi = async (e) => {
    e.preventDefault();
    if(!nuovoPiatto.nome || !nuovoPiatto.prezzo) return alert("Inserisci almeno Nome e Prezzo");

    try {
        await fetch(`${API_URL}/api/prodotti`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Qui usiamo user.id per assicurarci che il piatto vada al ristorante giusto!
          body: JSON.stringify({ ...nuovoPiatto, ristorante_id: user.id })
        });
        
        // Reset form
        setNuovoPiatto({ nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' });
        alert("✅ Piatto aggiunto al menu!");
        caricaMenu();
    } catch (error) {
        alert("Errore server");
    }
  };

  const handleCancella = async (id) => {
    if(confirm("Sicuro di voler cancellare questo piatto?")) {
        await fetch(`${API_URL}/api/prodotti/${id}`, { method: 'DELETE' });
        caricaMenu();
    }
  };

  const esci = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="container">
      <header>
        {/* Mostriamo il nome del ristorante loggato */}
        <h1>⚙️ Admin: {user.nome}</h1>
        <button onClick={esci} style={{background: 'red', fontSize: '12px'}}>Esci</button>
      </header>

      <div className="card" style={{background: '#f8f9fa', border: '2px dashed #ccc'}}>
        <h3>➕ Aggiungi Piatto</h3>
        <form onSubmit={handleAggiungi} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <input 
            placeholder="Nome Piatto" 
            value={nuovoPiatto.nome} 
            onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} 
          />
          <input 
            type="number" step="0.50" placeholder="Prezzo" 
            value={nuovoPiatto.prezzo} 
            onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} 
          />
          
          {/* SEZIONE FOTO */}
          <div style={{background: 'white', padding: '10px', borderRadius: '5px'}}>
            <label>📸 Foto Piatto:</label>
            <input type="file" onChange={handleFileChange} accept="image/*" />
            
            {uploading && <p>⏳ Caricamento in corso...</p>}
            
            {nuovoPiatto.immagine_url && (
                <div style={{marginTop: '10px'}}>
                    <p>✅ Foto pronta!</p>
                    <img src={nuovoPiatto.immagine_url} style={{height: '100px', borderRadius: '5px', objectFit: 'cover'}} />
                </div>
            )}
          </div>

          <select 
            value={nuovoPiatto.categoria} 
            onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})}
          >
            <option>Pizze</option>
            <option>Bibite</option>
            <option>Dolci</option>
          </select>

          <button type="submit" className="btn-invia" disabled={uploading}>
            {uploading ? "ATTENDI..." : "SALVA NEL MENU"}
          </button>
        </form>
      </div>

      <div className="menu-list">
        {menu.length === 0 && <p>Il menu è vuoto. Aggiungi qualcosa!</p>}
        {menu.map((p) => (
          <div key={p.id} className="card" style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
             <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                {p.immagine_url && <img src={p.immagine_url} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px'}} />}
                <div>
                    <strong>{p.nome}</strong><br/>
                    <small>{p.categoria} - {p.prezzo}€</small>
                </div>
             </div>
             <button onClick={() => handleCancella(p.id)} style={{background:'darkred', padding: '5px 10px'}}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;