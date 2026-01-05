// client/src/App.jsx - VERSIONE CON DESCRIZIONI PUBBLICHE 📱
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useSearchParams, useParams } from 'react-router-dom';
import Cucina from './Cucina';
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; 
import './App.css';

function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [canOrder, setCanOrder] = useState(true); 
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
        setCanOrder(data.ordini_abilitati && data.servizio_attivo);
        setError(false);
      })
      .catch(err => setError(true));
  }, [currentSlug]);

  const aggiungiAlCarrello = (prodotto) => {
    if (!canOrder) return alert("Il servizio ordini è momentaneamente disabilitato.");
    setCarrello([...carrello, prodotto]); 
  };

  const totale = carrello.reduce((acc, item) => acc + parseFloat(item.prezzo), 0);
  const inviaOrdine = async () => {
     if (!ristoranteId) return;
     const ordine = { ristorante_id: ristoranteId, tavolo: numeroTavolo, prodotti: carrello.map(p => p.nome), totale: totale };
     try {
        const res = await fetch(`${API_URL}/api/ordine`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ordine)});
        const d = await res.json();
        if(d.success) { alert("✅ Ordine inviato!"); setCarrello([]); } else { alert(d.error); }
     } catch (e) { alert("Errore connessione"); }
  };

  if (error) return <div className="container"><h1>🚫 404</h1></div>;

  // ESTRIAMO LE CATEGORIE UNICHE CON LA LORO DESCRIZIONE
  // Usiamo un array per mantenere l'ordine, ma controlliamo i duplicati
  const categorieUniche = menu.reduce((acc, curr) => {
    if (!acc.find(c => c.categoria === curr.categoria)) {
        acc.push({ 
            nome: curr.categoria, 
            descrizione: curr.categoria_descrizione // Questa arriva dal server!
        });
    }
    return acc;
  }, []);

  return (
    <div className="container">
      <header>
        <h1>🍕 {ristorante}</h1>
        {canOrder ? <p>Tavolo: <strong>{numeroTavolo}</strong></p> : 
        <div style={{background:'#ffeaa7', color:'#d35400', padding:'10px', borderRadius:'8px'}}>📖 Menu Digitale</div>}
      </header>

      {canOrder && carrello.length > 0 && (
        <div className="carrello-bar">
          <div className="totale"><span>{carrello.length} piatti</span><strong>{totale.toFixed(2)} €</strong></div>
          <button onClick={inviaOrdine} className="btn-invia">INVIA 🚀</button>
        </div>
      )}

      <div style={{paddingBottom: '80px'}}> 
        {categorieUniche.map(cat => (
            <div key={cat.nome} style={{marginBottom: '30px'}}>
                {/* INTESTAZIONE CATEGORIA + DESCRIZIONE */}
                <div style={{borderBottom: '2px solid #ff9f43', paddingBottom: '5px', marginTop:'20px'}}>
                    <h2 style={{color: '#333', margin:0}}>{cat.nome}</h2>
                    {cat.descrizione && <p style={{margin:'5px 0 0 0', color:'#666', fontStyle:'italic', fontSize:'14px'}}>{cat.descrizione}</p>}
                </div>
                
                <div className="menu-list">
                    {menu.filter(p => p.categoria === cat.nome).map((prodotto) => (
                        <div key={prodotto.id} className="card">
                            {prodotto.immagine_url && (
                              <img src={prodotto.immagine_url} style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom:'10px'}} />
                            )}
                            
                            <div className="info">
                                <h3>{prodotto.nome}</h3>
                                {/* DESCRIZIONE PIATTO */}
                                {prodotto.descrizione && (
                                    <p style={{fontSize:'13px', color:'#777', marginTop:'5px', lineHeight:'1.4'}}>
                                        {prodotto.descrizione}
                                    </p>
                                )}
                            </div>
                            
                            <div className="action">
                                <div className="prezzo">{prodotto.prezzo} €</div>
                                {canOrder && <button onClick={() => aggiungiAlCarrello(prodotto)}>Aggiungi +</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
        {menu.length === 0 && <p style={{textAlign:'center', marginTop:'20px'}}>Menu in fase di caricamento o vuoto...</p>}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;