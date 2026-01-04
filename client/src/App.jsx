// client/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams } from 'react-router-dom'; // <--- AGGIUNTO useSearchParams
import Cucina from './Cucina'; 
import './App.css';

// --- COMPONENTE MENU AGGIORNATO ---
function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [carrello, setCarrello] = useState([]); 
  
  // NUOVO: Leggiamo il parametro ?tavolo=X dall'URL
  const [searchParams] = useSearchParams();
  // Se non c'è scritto nulla, usiamo "Banco" come default
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';

  // Sostituisci con il TUO IP locale (es. 192.168.1.50)
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
      tavolo: numeroTavolo, // <--- ORA È DINAMICO!
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
        <p>Tavolo: <strong>{numeroTavolo}</strong></p> {/* Mostriamo dove si trova il cliente */}
        <Link to="/cucina" style={{fontSize: '10px', color: '#666'}}>Vai in Cucina</Link>
      </header>

      {/* ... Il resto del codice (menu-list) rimane UGUALE a prima ... */}
      <div className="menu-list">
        {menu.map((prodotto) => (
          <div key={prodotto.id} className="card">
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

// ... Il resto del file (function App) rimane UGUALE ...
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/cucina" element={<Cucina />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;