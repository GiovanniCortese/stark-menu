// client/src/Admin.jsx - VERSIONE UPLOAD FILE 📂
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [menu, setMenu] = useState([]);
  const [uploading, setUploading] = useState(false); // Per mostrare "Caricamento..."
  const [nuovoPiatto, setNuovoPiatto] = useState({ 
    nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' 
  });
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  // URL BACKEND
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    if (!user) navigate('/login');
    else caricaMenu();
  }, []);

  const caricaMenu = () => {
    fetch(`${API_URL}/api/menu/${user.slug}`)
      .then(res => res.json())
      .then(data => { if(data.menu) setMenu(data.menu); });
  };

  // --- FUNZIONE MAGICA PER CARICARE FOTO ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true); // Attiva spinner
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        // Cloudinary ci ha dato il link! Lo salviamo nello stato
        setNuovoPiatto({ ...nuovoPiatto, immagine_url: data.url });
      }
    } catch (error) {
      alert("Errore caricamento foto");
    } finally {
      setUploading(false); // Spegni spinner
    }
  };
  // -----------------------------------------

  const handleAggiungi = async (e) => {
    e.preventDefault();
    if(!nuovoPiatto.nome || !nuovoPiatto.prezzo) return alert("Manca nome o prezzo");

    await fetch(`${API_URL}/api/prodotti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuovoPiatto, ristorante_id: user.id })
    });
    
    // Reset form
    setNuovoPiatto({ nome: '', prezzo: '', categoria: 'Pizze', immagine_url: '' });
    caricaMenu();
    alert("Piatto aggiunto!");
  };

  const handleCancella = async (id) => {
    if(confirm("Eliminare?")) {
        await fetch(`${API_URL}/api/prodotti/${id}`, { method: 'DELETE' });
        caricaMenu();
    }
  };

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>📸 Admin Pro</h1>
        <button onClick={() => {localStorage.removeItem('user'); navigate('/login')}} style={{background:'red'}}>Esci</button>
      </header>

      <div className="card" style={{background: '#f8f9fa', border: '2px dashed #ccc'}}>
        <h3>➕ Aggiungi Piatto</h3>
        <form onSubmit={handleAggiungi} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <input placeholder="Nome" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
          <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} />
          
          {/* INPUT FILE PER LA FOTO */}
          <div style={{background: 'white', padding: '10px', borderRadius: '5px'}}>
            <label>Foto Piatto:</label>
            <input type="file" onChange={handleFileChange} accept="image/*" />
            
            {uploading && <p>⏳ Caricamento foto in corso...</p>}
            
            {nuovoPiatto.immagine_url && (
                <div>
                    <p>✅ Foto caricata!</p>
                    <img src={nuovoPiatto.immagine_url} style={{height: '100px', borderRadius: '5px'}} />
                </div>
            )}
          </div>

          <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})}>
            <option>Pizze</option><option>Bibite</option><option>Dolci</option>
          </select>

          <button type="submit" className="btn-invia" disabled={uploading}>
            {uploading ? "Aspetta..." : "SALVA PIATTO"}
          </button>
        </form>
      </div>

      <div className="menu-list">
        {menu.map((p) => (
          <div key={p.id} className="card" style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
             <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                {p.immagine_url && <img src={p.immagine_url} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px'}} />}
                <div><strong>{p.nome}</strong><br/><small>{p.prezzo}€</small></div>
             </div>
             <button onClick={() => handleCancella(p.id)} style={{background:'darkred'}}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Admin;