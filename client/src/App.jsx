// client/src/App.jsx - VERSIONE "TUTTO CHIUSO" E "CLICCA PER CHIUDERE"
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
  
  // STATO PER ACCORDION (Parte null = tutto chiuso)
  const [activeCategory, setActiveCategory] = useState(null);

  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => res.json())
      .then(data => {
        setRistorante(data.ristorante);
        setMenu(data.menu);
        setRistoranteId(data.id);
        setCanOrder(data.ordini_abilitati && data.servizio_attivo);
        // NOTA: Ho rimosso il codice che apriva la prima categoria in automatico.
      })
      .catch(err => setError(true));
  }, [currentSlug]);

  const aggiungiAlCarrello = (prodotto) => {
    if (!canOrder) return alert("Il servizio ordini è chiuso.");
    setCarrello([...carrello, prodotto]); 
  };

  const inviaOrdine = async () => { 
     if (!ristoranteId) return;
     const totale = carrello.reduce((acc, i) => acc + parseFloat(i.prezzo), 0);
     try {
        const res = await fetch(`${API_URL}/api/ordine`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ristorante_id: ristoranteId, tavolo: numeroTavolo, prodotti: carrello.map(p => p.nome), totale})});
        const d = await res.json();
        if(d.success) { alert("✅ Ordine inviato!"); setCarrello([]); }
     } catch (e) { alert("Errore connessione"); }
  };

  if (error) return <div className="container"><h1>🚫 404</h1></div>;

  // RAGGRUPPAMENTO MENU
  const categorieOrdinate = [...new Set(menu.map(p => p.categoria))];

  // MODIFICA QUI: Logica apri/chiudi
  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) {
          setActiveCategory(null); // Se è già aperta, la chiudo
      } else {
          setActiveCategory(catNome); // Altrimenti apro la nuova
      }
  };

  return (
    <div className="container">
      <header>
        <h1>🍕 {ristorante}</h1>
        {canOrder ? <p>Tavolo: <strong>{numeroTavolo}</strong></p> : <div className="badge-digital">📖 Menu Digitale</div>}
      </header>

      {canOrder && carrello.length > 0 && (
        <div className="carrello-bar">
          <div className="totale"><span>{carrello.length} ordini</span><strong>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong></div>
          <button onClick={inviaOrdine} className="btn-invia">INVIA 🚀</button>
        </div>
      )}

      <div style={{paddingBottom: '80px', marginTop: '20px'}}> 
        {categorieOrdinate.map(catNome => (
            <div key={catNome} className="accordion-item">
                
                {/* TITOLO CATEGORIA */}
                <div 
                    onClick={() => toggleAccordion(catNome)}
                    style={{
                        background: activeCategory === catNome ? '#333' : '#f8f9fa',
                        color: activeCategory === catNome ? '#fff' : '#333',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '5px',
                        cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}
                >
                    <h2 style={{margin:0, fontSize:'18px'}}>{catNome}</h2>
                    <span>{activeCategory === catNome ? '▼' : '▶'}</span>
                </div>

                {/* CONTENUTO */}
                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '10px 0'}}>
                        {(() => {
                            const piattiCat = menu.filter(p => p.categoria === catNome);
                            const sottoCats = piattiCat.reduce((acc, p) => {
                                const sc = (p.sottocategoria && p.sottocategoria.trim().length > 0) 
                                           ? p.sottocategoria 
                                           : "Generale";
                                if(!acc[sc]) acc[sc] = [];
                                acc[sc].push(p);
                                return acc;
                            }, {});

                            return Object.keys(sottoCats).sort().map(scKey => (
                                <div key={scKey} style={{marginBottom: '20px'}}>
                                    {(scKey !== "Generale" || Object.keys(sottoCats).length > 1) && (
                                        <h3 style={{
                                            borderLeft: '4px solid #ff9f43', 
                                            paddingLeft: '10px', 
                                            marginLeft: '5px',
                                            color: '#555', 
                                            fontSize: '16px',
                                            textTransform: 'uppercase',
                                            marginTop: '15px'
                                        }}>
                                            {scKey === "Generale" ? "Altri Piatti" : scKey}
                                        </h3>
                                    )}

                                    <div className="menu-list">
                                        {sottoCats[scKey].map((prodotto) => (
                                            <div key={prodotto.id} className="card">
                                                {prodotto.immagine_url && <img src={prodotto.immagine_url} style={{width:'100%', height:'120px', objectFit:'cover', borderRadius:'5px'}} />}
                                                <div className="info">
                                                    <h3>{prodotto.nome}</h3>
                                                    {prodotto.descrizione && <p style={{fontSize:'12px', color:'#777'}}>{prodotto.descrizione}</p>}
                                                </div>
                                                <div className="action">
                                                    <div className="prezzo">{prodotto.prezzo} €</div>
                                                    {canOrder && <button onClick={() => aggiungiAlCarrello(prodotto)}>+</button>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>
        ))}
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