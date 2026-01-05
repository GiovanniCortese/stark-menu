// client/src/App.jsx - VERSIONE SAAS MULTI-RISTORANTE 🌍
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams, useParams } from 'react-router-dom';
import Cucina from './Cucina';
import Login from './Login';
import Admin from './Admin';
import './App.css';

// --- COMPONENTE MENU DINAMICO ---
function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // 1. LEGGIAMO LO SLUG DALL'URL (es. "da-luigi")
  const { slug } = useParams();
  // Se non c'è slug nell'URL, usiamo "pizzeria-stark" come default
  const currentSlug = slug || 'pizzeria-stark';

  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  
  // URL BACKEND
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // 2. CHIEDIAMO IL MENU SPECIFICO
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => {
        if(!res.ok) throw new Error("Ristorante non trovato");
        return res.json();
      })
      .then(data => {
        setRistorante(data.ristorante);
        setMenu(data.menu);
        setError(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
      });
  }, [currentSlug]); // Si aggiorna se cambia lo slug

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
      // Nota: Per perfezione dovremmo mandare anche l'ID ristorante, 
      // ma il backend lo recupera dallo slug o lo fissiamo per ora.
      // Per questo test rapido, il backend userà l'ID di Stark di default se non modificato,
      // ma per la visualizzazione menu questo funziona già!
      const response = await fetch(`${API_URL}/api/ordine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordine)
      });
      const data = await response.json();
      if(data.success) {
        alert(`✅ Ordine inviato a ${ristorante}!`);
        setCarrello([]); 
      }
    } catch (error) {
      alert("❌ Errore di connessione");
    }
  };

  if (error) return <div className="container"><h1>🚫 404</h1><p>Ristorante inesistente.</p></div>;

  return (
    <div className="container">
      <header>
        <h1>🍕 {ristorante}</h1>
        <p>Tavolo: <strong>{numeroTavolo}</strong></p>
      </header>

      <div className="menu-list">
        {menu.map((prodotto) => (
          <div key={prodotto.id} className="card">
            {/* FOTO */}
            {prodotto.immagine_url && (
              <img 
                src={prodotto.immagine_url} 
                alt={prodotto.nome} 
                style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom:'10px'}} 
              />
            )}

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
          <button onClick={inviaOrdine} className="btn-invia">INVIA 🚀</button>
        </div>
      )}
    </div>
  );
}

// --- GESTIONE ROTTE ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Le pagine speciali vanno PRIMA delle rotte dinamiche */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/cucina" element={<Cucina />} />
        
        {/* Rotta Dinamica: cattura qualsiasi cosa dopo lo slash */}
        {/* Esempio: /da-luigi attiverà Menu con slug="da-luigi" */}
        <Route path="/:slug" element={<Menu />} />
        
        {/* Rotta Base: se non scrivi nulla, vai al default (Stark) */}
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;