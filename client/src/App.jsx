// client/src/App.jsx - VERSIONE SUB-ACCORDION (MATRIOSKA)
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
  
  // STATO PER ACCORDION
  const [activeCategory, setActiveCategory] = useState(null);       // Livello 1: Categoria (es. Vini)
  const [activeSubCategory, setActiveSubCategory] = useState(null); // Livello 2: Sottocategoria (es. Rossi)

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

  // LOGICA LIVELLO 1: Categorie Principali
  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) {
          setActiveCategory(null);
          setActiveSubCategory(null); // Chiudo anche le sub
      } else {
          setActiveCategory(catNome);
          setActiveSubCategory(null); // Reset sub quando cambio categoria
      }
  };

  // LOGICA LIVELLO 2: Sottocategorie
  const toggleSubAccordion = (subName) => {
      if (activeSubCategory === subName) {
          setActiveSubCategory(null);
      } else {
          setActiveSubCategory(subName);
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
                
                {/* TITOLO CATEGORIA (LIVELLO 1) */}
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

                {/* CONTENUTO CATEGORIA */}
                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '5px 0'}}>
                        {(() => {
                            const piattiCat = menu.filter(p => p.categoria === catNome);
                            
                            // Raggruppa per sottocategoria
                            const sottoCats = piattiCat.reduce((acc, p) => {
                                const sc = (p.sottocategoria && p.sottocategoria.trim().length > 0) 
                                           ? p.sottocategoria 
                                           : "Generale";
                                if(!acc[sc]) acc[sc] = [];
                                acc[sc].push(p);
                                return acc;
                            }, {});

                            const subKeys = Object.keys(sottoCats).sort();
                            // Se c'è solo "Generale", non mostriamo il livello intermedio
                            const isSingleGroup = subKeys.length === 1 && subKeys[0] === "Generale";

                            return subKeys.map(scKey => (
                                <div key={scKey} style={{marginBottom: '5px'}}>
                                    
                                    {/* TITOLO SOTTOCATEGORIA (LIVELLO 2) - Cliccabile come Accordion */}
                                    {/* Lo mostriamo solo se NON è il caso unico "Generale" */}
                                    {!isSingleGroup && (
                                        <div 
                                            onClick={() => toggleSubAccordion(scKey)}
                                            style={{
                                                background: '#fff3e0', // Colore diverso per distinguere
                                                borderLeft: '4px solid #ff9f43', 
                                                padding: '12px', 
                                                margin: '5px 0',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}
                                        >
                                            <h3 style={{margin:0, fontSize:'16px', color:'#d35400', textTransform:'uppercase'}}>
                                                {scKey === "Generale" ? "Altri Piatti" : scKey}
                                            </h3>
                                            <span style={{color:'#d35400', fontWeight:'bold'}}>
                                                {activeSubCategory === scKey ? '▼' : '▶'}
                                            </span>
                                        </div>
                                    )}

                                    {/* LISTA PIATTI */}
                                    {/* Visibile se: è il gruppo unico "Generale" OPPURE se la sottocategoria è aperta */}
                                    {(isSingleGroup || activeSubCategory === scKey) && (
                                        <div className="menu-list" style={{paddingTop: '5px'}}>
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
                                    )}
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