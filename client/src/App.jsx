// client/src/App.jsx - VERSIONE DEFINITIVA (GERARCHIA PERMESSI) 👑
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams, useParams } from 'react-router-dom';
import Cucina from './Cucina';
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; // <--- Importiamo la pagina Super Admin
import './App.css';

// --- COMPONENTE MENU DINAMICO ---
function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  
  // STATO PERMESSI: True solo se SuperAdmin = OK E Admin = OK
  const [canOrder, setCanOrder] = useState(true); 
  
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // Leggiamo lo slug dall'URL
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';

  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  
  // URL BACKEND
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // Scarichiamo Menu + Permessi
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => {
        if(!res.ok) throw new Error("Ristorante non trovato");
        return res.json();
      })
      .then(data => {
        setRistorante(data.ristorante);
        setMenu(data.menu);
        setRistoranteId(data.id);
        
        // --- LOGICA COMBINATA ---
        // 1. Il Super Admin ha abilitato la funzione? (data.ordini_abilitati)
        // 2. Il Ristoratore ha acceso il servizio? (data.servizio_attivo)
        // Si può ordinare solo se ENTRAMBI sono TRUE.
        setCanOrder(data.ordini_abilitati && data.servizio_attivo);
        
        setError(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
      });
  }, [currentSlug]);

  const aggiungiAlCarrello = (prodotto) => {
    // Sicurezza extra: se non si può ordinare, fermiamo tutto.
    if (!canOrder) return alert("Il servizio ordini al tavolo è momentaneamente disabilitato o non attivo.");
    setCarrello([...carrello, prodotto]); 
  };

  const totale = carrello.reduce((acc, item) => acc + parseFloat(item.prezzo), 0);

  const inviaOrdine = async () => {
    if (!ristoranteId) return;

    const ordine = {
      ristorante_id: ristoranteId,
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
        alert(`✅ Ordine inviato a ${ristorante}!`);
        setCarrello([]); 
      } else {
        alert("Errore server: " + data.error);
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
        
        {/* HEADER DINAMICO IN BASE AI PERMESSI */}
        {canOrder ? (
            <p>Tavolo: <strong>{numeroTavolo}</strong></p>
        ) : (
            <div style={{background: '#ffeaa7', color: '#d35400', padding: '10px', borderRadius: '8px', marginTop: '10px'}}>
                <strong>📖 Menu Digitale</strong>
                <br/>
                <small>Servizio ordini tramite app non attivo. Chiedi al personale.</small>
            </div>
        )}
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
              
              {/* BOTTONE VISIBILE SOLO SE canOrder È VERO */}
              {canOrder && (
                <button onClick={() => aggiungiAlCarrello(prodotto)}>Aggiungi +</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CARRELLO VISIBILE SOLO SE canOrder È VERO */}
      {canOrder && carrello.length > 0 && (
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
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* NUOVA ROTTA: SUPER ADMIN */}
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        <Route path="/cucina/:slug" element={<Cucina />} />
        
        {/* ROTTE MENU PUBBLICO */}
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;