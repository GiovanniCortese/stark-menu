// client/src/App.jsx - VERSIONE FOTO MINIATURA + MODAL INGRANDIMENTO 🖼️
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
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
  
  // STATO PER IL MODAL (PIATTO SELEZIONATO)
  const [selectedPiatto, setSelectedPiatto] = useState(null);

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
    // Opzionale: chiudere il modal dopo l'aggiunta? Per ora lo lascio aperto o puoi mettere setSelectedPiatto(null);
    setSelectedPiatto(null); 
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

  const categorieOrdinate = [...new Set(menu.map(p => p.categoria))];

  // LOGICHE ACCORDION
  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) {
          setActiveCategory(null);
          setActiveSubCategory(null); 
      } else {
          setActiveCategory(catNome);
          setActiveSubCategory(null); 
      }
  };

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

                {/* CONTENUTO CATEGORIA */}
                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '5px 0'}}>
                        {(() => {
                            const piattiCat = menu.filter(p => p.categoria === catNome);
                            
                            const sottoCats = piattiCat.reduce((acc, p) => {
                                const sc = (p.sottocategoria && p.sottocategoria.trim().length > 0) ? p.sottocategoria : "Generale";
                                if(!acc[sc]) acc[sc] = [];
                                acc[sc].push(p);
                                return acc;
                            }, {});

                            const subKeys = Object.keys(sottoCats).sort();
                            const isSingleGroup = subKeys.length === 1 && subKeys[0] === "Generale";

                            return subKeys.map(scKey => (
                                <div key={scKey} style={{marginBottom: '5px'}}>
                                    
                                    {!isSingleGroup && (
                                        <div 
                                            onClick={() => toggleSubAccordion(scKey)}
                                            style={{
                                                background: '#fff3e0', borderLeft: '4px solid #ff9f43', 
                                                padding: '12px', margin: '5px 0', borderRadius: '4px',
                                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
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
                                    {(isSingleGroup || activeSubCategory === scKey) && (
                                        <div className="menu-list" style={{paddingTop: '5px'}}>
                                            {sottoCats[scKey].map((prodotto) => (
                                                <div 
                                                    key={prodotto.id} 
                                                    className="card" 
                                                    // MODIFICA QUI: Al click apri il modal
                                                    onClick={() => setSelectedPiatto(prodotto)}
                                                    style={{
                                                        display: 'flex', // Flexbox per mettere immagine a sinistra
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: '15px',
                                                        padding: '10px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {/* IMMAGINE MINIATURA A SINISTRA */}
                                                    {prodotto.immagine_url && (
                                                        <img 
                                                            src={prodotto.immagine_url} 
                                                            style={{
                                                                width:'80px', 
                                                                height:'80px', 
                                                                objectFit:'cover', 
                                                                borderRadius:'8px',
                                                                flexShrink: 0 // Non rimpicciolire l'immagine
                                                            }} 
                                                        />
                                                    )}

                                                    {/* INFO A DESTRA */}
                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 5px 0', fontSize:'16px'}}>{prodotto.nome}</h3>
                                                        <div style={{fontSize:'14px', fontWeight:'bold', color:'#27ae60'}}>{prodotto.prezzo} €</div>
                                                        {/* Mostriamo un pezzetto di descrizione se c'è */}
                                                        {prodotto.descrizione && (
                                                            <p style={{fontSize:'11px', color:'#777', margin:'5px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                                                {prodotto.descrizione}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Tasto + rapido (opzionale, ma comodo) */}
                                                    {canOrder && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} 
                                                            style={{
                                                                background:'#f0f0f0', color:'#333', 
                                                                borderRadius:'50%', width:'30px', height:'30px', 
                                                                border:'none', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center'
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                    )}
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

      {/* --- MODAL INGRANDIMENTO FOTO & DETTAGLI --- */}
      {selectedPiatto && (
          <div 
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
            }}
            onClick={() => setSelectedPiatto(null)} // Chiudi se clicchi fuori
          >
              <div 
                style={{
                    backgroundColor: 'white', width: '100%', maxWidth: '400px',
                    borderRadius: '15px', overflow: 'hidden', position: 'relative',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()} // Non chiudere se clicchi dentro
              >
                  {/* Tasto Chiudi */}
                  <button 
                    onClick={() => setSelectedPiatto(null)}
                    style={{
                        position:'absolute', top:'10px', right:'10px',
                        background:'rgba(0,0,0,0.5)', color:'white',
                        border:'none', borderRadius:'50%', width:'35px', height:'35px',
                        fontSize:'18px', cursor:'pointer', zIndex: 10
                    }}
                  >
                      ✕
                  </button>

                  {/* Foto Grande */}
                  {selectedPiatto.immagine_url && (
                      <img 
                        src={selectedPiatto.immagine_url} 
                        style={{width:'100%', height:'300px', objectFit:'cover'}} 
                      />
                  )}

                  {/* Contenuto Modal */}
                  <div style={{padding: '20px'}}>
                      <h2 style={{marginTop: 0, fontSize: '24px'}}>{selectedPiatto.nome}</h2>
                      <p style={{fontSize: '18px', fontWeight: 'bold', color: '#27ae60', margin:'10px 0'}}>
                          {selectedPiatto.prezzo} €
                      </p>
                      <p style={{color: '#555', lineHeight: '1.5', fontSize: '14px'}}>
                          {selectedPiatto.descrizione || "Nessuna descrizione disponibile."}
                      </p>

                      {/* Tasto Aggiungi Big */}
                      {canOrder && (
                          <button 
                            onClick={() => aggiungiAlCarrello(selectedPiatto)}
                            className="btn-invia"
                            style={{width: '100%', marginTop: '20px', padding: '15px', fontSize: '18px'}}
                          >
                              AGGIUNGI ALL'ORDINE 🛒
                          </button>
                      )}
                  </div>
              </div>
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
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;