// client/src/Admin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const [menu, setMenu] = useState([]);
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: 'Pizze' });
  const navigate = useNavigate();
  
  // Recuperiamo l'utente salvato
  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // Se non sei loggato, ti calcio via
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      caricaMenu();
    }
  }, []);

  const caricaMenu = () => {
    // Usiamo lo slug dell'utente loggato
    fetch(`${API_URL}/api/menu/${user.slug}`)
      .then(res => res.json())
      .then(data => setMenu(data.menu));
  };

  const handleAggiungi = async (e) => {
    e.preventDefault();
    if(!nuovoPiatto.nome || !nuovoPiatto.prezzo) return;

    await fetch(`${API_URL}/api/prodotti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuovoPiatto, ristorante_id: user.id })
    });
    
    setNuovoPiatto({ nome: '', prezzo: '', categoria: 'Pizze' }); // Resetta form
    caricaMenu(); // Ricarica la lista
  };

  const handleCancella = async (id) => {
    if(!confirm("Sicuro di voler cancellare questo piatto?")) return;
    
    await fetch(`${API_URL}/api/prodotti/${id}`, { method: 'DELETE' });
    caricaMenu();
  };

  const esci = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>⚙️ Pannello Admin</h1>
        <p>Ciao, {user.nome}</p>
        <button onClick={esci} style={{background: 'red', fontSize: '12px'}}>Esci</button>
      </header>

      {/* FORM AGGIUNTA */}
      <div className="card" style={{background: '#f0f0f0', border: '2px dashed #ccc'}}>
        <h3>➕ Aggiungi Piatto</h3>
        <form onSubmit={handleAggiungi} style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
          <input 
            placeholder="Nome Piatto (es. Carbonara)" 
            value={nuovoPiatto.nome}
            onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})}
          />
          <input 
            type="number" step="0.50" placeholder="Prezzo" 
            value={nuovoPiatto.prezzo}
            onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})}
          />
          <select 
            value={nuovoPiatto.categoria}
            onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})}
          >
            <option>Pizze</option>
            <option>Bibite</option>
            <option>Dolci</option>
          </select>
          <button type="submit" className="btn-invia" style={{background: '#28a745'}}>AGGIUNGI</button>
        </form>
      </div>

      {/* LISTA PIATTI ESISTENTI */}
      <h3>📋 Menu Attuale</h3>
      <div className="menu-list">
        {menu.map((p) => (
          <div key={p.id} className="card" style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <strong>{p.nome}</strong>
              <div style={{fontSize: '12px', color: '#666'}}>{p.categoria} - {p.prezzo}€</div>
            </div>
            <button onClick={() => handleCancella(p.id)} style={{background: 'darkred', padding: '5px 10px'}}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;