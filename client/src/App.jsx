// client/src/App.jsx - AGGIORNATO CON SUPER ADMIN ROUTE E LOGICA VETRINA
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams, useParams } from 'react-router-dom';
import Cucina from './Cucina';
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; // <--- IMPORTA QUESTO
import './App.css';

function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [canOrder, setCanOrder] = useState(true); // <--- NUOVO STATO: Possiamo ordinare?
  
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => { if(!res.ok) throw new Error("No"); return res.json(); })
      .then(data => {
        setRistorante(data.ristorante);
        setMenu(data.menu);
        setRistoranteId(data.id);
        setCanOrder(data.ordini_abilitati); // <--- SALVIAMO L'IMPOSTAZIONE DEL SUPER ADMIN
        setError(false);
      })
      .catch(err => setError(true));
  }, [currentSlug]);

  const aggiungiAlCarrello = (prodotto) => {
    // Se non si può ordinare, la funzione non fa nulla (doppia sicurezza)
    if (!canOrder) return alert("Questo è un menu digitale. Ordina al cameriere!");
    setCarrello([...carrello, prodotto]); 
  };

  const totale = carrello.reduce((acc, item) => acc + parseFloat(item.prezzo), 0);

  const inviaOrdine = async () => {
     /* ... (codice uguale a prima) ... */
     if (!ristoranteId) return;
     const ordine = { ristorante_id: ristoranteId, tavolo: numeroTavolo, prodotti: carrello.map(p => p.nome), totale: totale };
     try {
        const res = await fetch(`${API_URL}/api/ordine`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ordine)});
        const d = await res.json();
        if(d.success) { alert("✅ Ordine inviato!"); setCarrello([]); }
     } catch (e) { alert("Errore"); }
  };

  if (error) return <div className="container"><h1>🚫 404</h1></div>;

  return (
    <div className="container">
      <header>
        <h1>🍕 {ristorante}</h1>
        {/* Mostriamo il tavolo solo se si può ordinare, altrimenti non serve */}
        {canOrder && <p>Tavolo: <strong>{numeroTavolo}</strong></p>}
        {!canOrder && <p style={{background:'#eee', padding:'5px', borderRadius:'5px'}}>📖 Menu Digitale (Ordina al personale)</p>}
      </header>

      <div className="menu-list">
        {menu.map((prodotto) => (
          <div key={prodotto.id} className="card">
            {prodotto.immagine_url && (
              <img src={prodotto.immagine_url} style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom:'10px'}} />
            )}
            <div className="info">
              <h3>{prodotto.nome}</h3>
              <span className="categoria">{prodotto.categoria}</span>
            </div>
            <div className="action">
              <div className="prezzo">{prodotto.prezzo} €</div>
              
              {/* MOSTRIAMO IL BOTTONE SOLO SE canOrder E' TRUE */}
              {canOrder && (
                  <button onClick={() => aggiungiAlCarrello(prodotto)}>Aggiungi +</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MOSTRIAMO IL CARRELLO SOLO SE canOrder E' TRUE */}
      {canOrder && carrello.length > 0 && (
        <div className="carrello-bar">
          <div className="totale"><span>{carrello.length} piatti</span><strong>{totale.toFixed(2)} €</strong></div>
          <button onClick={inviaOrdine} className="btn-invia">INVIA 🚀</button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* NUOVA ROTTA SUPER ADMIN */}
        <Route path="/super-admin" element={<SuperAdmin />} />

        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;