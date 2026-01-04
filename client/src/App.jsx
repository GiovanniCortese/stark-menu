// client/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import Cucina from './Cucina';
import Login from './Login';
import Admin from './Admin';
import './App.css';

// --- COMPONENTE MENU AGGIORNATO CON FOTO ---
function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [carrello, setCarrello] = useState([]); 
  
  // Leggiamo il parametro ?tavolo=X dall'URL
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';

  // URL del Backend Cloud (Render)
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/pizzeria-stark`)
      .then(res => res.json())
      .then(data => {
        setRistorante(data.ristorante);
        setMenu(data.menu);
      });
  }, []);

  const aggiungiAlCarrello = (prodotto) => {
    setCarrello([...carrello, prodotto]); 
  };

  const totale = carrello.reduce((acc, item) => acc + parseFloat(item.prezzo), 0);

  const inviaOrdine = async () => {
    const ordine = {
      tavolo: numeroTavolo,
      prodotti: carrello.map(p => p.nome),
      totale: totale
    };

    try {
      const response = await fetch(`${API_URL}/api/ordine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordine)
      });
      const data = await response.json();
      if(data.success) {
        alert(`✅ Ordine inviato per Tavolo ${numeroTavolo}!`);
        setCarrello([]); 
      }
    } catch (error) {
      alert("❌ Errore di connessione");
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🍕 {ristorante}</h1>
        <p>Tavolo: <strong>{numeroTavolo}</strong></p>
        <Link to="/cucina" style={{fontSize: '10px', color: '#666'}}>Vai in Cucina</Link>
      </header>

      <div className="menu-list">
        {menu.map((prodotto) => (
          <div key={prodotto.id} className="card">
            
            {/* --- NUOVO: SEZIONE FOTO --- */}
            {/* Se il prodotto ha un link immagine, la mostriamo */}
            {prodotto.immagine_url && (
              <img 
                src={prodotto.immagine_url} 
                alt={prodotto.nome} 
                style={{
                  width: '100%', 
                  height: '150px', 
                  objectFit: 'cover', 
                  borderRadius: '8px',
                  marginBottom: '10px'
                }} 
              />
            )}
            {/* --------------------------- */}

            <div className="info">
              <h3>{prodotto.nome}</h3>
              <span className="categoria">{prodotto.categoria}</span>
            </div>
            <div className="action">
              <div className="prezzo">{prodotto.prezzo} €</div>
              <button onClick={() => aggiungiAlCarrello(prodotto)}>Aggiungi +</button>
            </div>
          </div>
        ))}
      </div>

      {carrello.length > 0 && (
        <div className="carrello-bar">
          <div className="totale">
            <span>Ordini: {carrello.length}</span>
            <strong>Tot: {totale.toFixed(2)} €</strong>
          </div>
          <button onClick={inviaOrdine} className="btn-invia">INVIA ORDINE 🚀</button>
        </div>
      )}
    </div>
  );
}

// --- ROTTE DELL'APP ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/cucina" element={<Cucina />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;