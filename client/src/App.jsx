// client/src/App.jsx - VERSIONE V7 (FULL WIDTH ESTESO + GRAFICA) ↔️
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
  
  // STATO PER LO STILE (Colori e Logo)
  const [style, setStyle] = useState(null);

  const [canOrder, setCanOrder] = useState(true); 
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // STATO PER ACCORDION
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
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
        
        // SALVIAMO LO STILE RICEVUTO DAL DB
        if (data.style) setStyle(data.style);

        setCanOrder(data.ordini_abilitati && data.servizio_attivo);
      })
      .catch(err => setError(true));
  }, [currentSlug]);

  const aggiungiAlCarrello = (prodotto) => {
    if (!canOrder) return alert("Il servizio ordini è chiuso.");
    setCarrello([...carrello, prodotto]); 
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

  // --- STILI DINAMICI (Useremo questi per colorare tutto) ---
  const appStyle = {
      backgroundColor: style?.bg || '#222',
      color: style?.text || '#ccc',
      fontFamily: style?.font || 'sans-serif',
      backgroundImage: style?.cover ? `url(${style.cover})` : 'none',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      
      // FULL WIDTH FIX:
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      padding: '10px', // Solo un piccolo margine ai lati per non toccare il bordo schermo
      boxSizing: 'border-box'
  };

  const titleColor = style?.title || '#fff';
  const priceColor = style?.price || '#27ae60';

  return (
    // RIMOSSO className="container" per evitare che il CSS lo stringa
    <div style={appStyle}> 
      
      <header style={{textAlign:'center', marginBottom:'20px'}}>
        {/* LOGO DINAMICO: Reso molto più grande e largo */}
        {style?.logo ? (
            <img 
                src={style.logo} 
                alt={ristorante} 
                style={{
                    width: '100%',
                    maxWidth: '90%', // Occupa quasi tutta la larghezza
                    maxHeight: '150px', 
                    objectFit: 'contain'
                }} 
            />
        ) : (
            <h1 style={{color: titleColor, fontSize:'2.5rem', margin:'0 0 10px 0'}}>{ristorante}</h1>
        )}
        
        {canOrder ? <p style={{color: style?.text || '#ccc'}}>Tavolo: <strong>{numeroTavolo}</strong></p> : <div className="badge-digital">📖 Menu Digitale</div>}
      </header>

      {canOrder && carrello.length > 0 && (
        <div className="carrello-bar">
          <div className="totale"><span>{carrello.length} ordini</span><strong>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong></div>
          <button onClick={inviaOrdine} className="btn-invia">INVIA 🚀</button>
        </div>
      )}

      {/* FIX SPAZI: Ridotto marginTop a 0 */}
      <div style={{paddingBottom: '80px', marginTop: '0', width: '100%'}}> 
        {categorieOrdinate.map(catNome => (
            // FIX SPAZI: Margine minimo (2px) tra le categorie chiuse
            <div key={catNome} className="accordion-item" style={{marginBottom: '2px', borderRadius: '5px', overflow: 'hidden', width: '100%'}}>
                
                <div 
                    onClick={() => toggleAccordion(catNome)}
                    style={{
                        // Sfondo leggermente diverso se attivo
                        background: activeCategory === catNome ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)',
                        color: titleColor,
                        padding: '15px',
                        cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: activeCategory === catNome ? `1px solid ${priceColor}` : 'none'
                    }}
                >
                    <h2 style={{margin:0, fontSize:'18px', color: titleColor, width:'100%'}}>{catNome}</h2>
                    <span style={{color: titleColor}}>{activeCategory === catNome ? '▼' : '▶'}</span>
                </div>

                {/* CONTENUTO */}
                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '0', background: 'rgba(0,0,0,0.2)', width: '100%'}}>
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
                                <div key={scKey} style={{width: '100%'}}>
                                    
                                    {!isSingleGroup && (
                                        <div 
                                            onClick={() => toggleSubAccordion(scKey)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)', 
                                                borderLeft: `4px solid ${priceColor}`, 
                                                padding: '10px', 
                                                // FIX SPAZI: Margine 1px per separare le sottocategorie
                                                margin: '1px 0', 
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}
                                        >
                                            <h3 style={{margin:0, fontSize:'16px', color: titleColor, textTransform:'uppercase'}}>
                                                {scKey === "Generale" ? "Altri Piatti" : scKey}
                                            </h3>
                                            <span style={{color: titleColor, fontWeight:'bold'}}>
                                                {activeSubCategory === scKey ? '▼' : '▶'}
                                            </span>
                                        </div>
                                    )}

                                    {(isSingleGroup || activeSubCategory === scKey) && (
                                        <div className="menu-list" style={{padding: '0', width: '100%'}}>
                                            {sottoCats[scKey].map((prodotto) => (
                                                <div 
                                                    key={prodotto.id} 
                                                    className="card" 
                                                    onClick={() => prodotto.immagine_url ? setSelectedPiatto(prodotto) : null}
                                                    style={{
                                                        display: 'flex', 
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: '15px',
                                                        padding: '10px',
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        cursor: prodotto.immagine_url ? 'pointer' : 'default',
                                                        // FIX SPAZI: Sfondo bianco pulito per i piatti, margine minimo
                                                        backgroundColor: 'white',
                                                        marginBottom: '1px',
                                                        borderRadius: '0' // Squadrati per sembrare una lista unita
                                                    }}
                                                >
                                                    {prodotto.immagine_url && (
                                                        <img 
                                                            src={prodotto.immagine_url} 
                                                            style={{
                                                                width:'70px', height:'70px', 
                                                                objectFit:'cover', borderRadius:'5px', flexShrink: 0 
                                                            }} 
                                                        />
                                                    )}

                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 4px 0', fontSize:'16px', color:'#333'}}>{prodotto.nome}</h3>
                                                        
                                                        {prodotto.descrizione && (
                                                            <p style={{fontSize:'12px', color:'#666', margin:'0 0 4px 0', lineHeight:'1.2'}}>
                                                                {prodotto.descrizione}
                                                            </p>
                                                        )}

                                                        <div style={{fontSize:'14px', fontWeight:'bold', color: priceColor}}>{prodotto.prezzo} €</div>
                                                    </div>

                                                    {canOrder && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} 
                                                            style={{
                                                                background:'#f0f0f0', color:'#333', 
                                                                borderRadius:'50%', width:'32px', height:'32px', 
                                                                border:'none', fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center',
                                                                cursor: 'pointer'
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
                backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
            }}
            onClick={() => setSelectedPiatto(null)} 
          >
              <div 
                style={{
                    backgroundColor: 'white', width: '100%', maxWidth: '400px',
                    borderRadius: '15px', overflow: 'hidden', position: 'relative',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()} 
              >
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

                  {selectedPiatto.immagine_url && (
                      <img 
                        src={selectedPiatto.immagine_url} 
                        style={{width:'100%', height:'300px', objectFit:'cover'}} 
                      />
                  )}

                  <div style={{padding: '20px'}}>
                      <h2 style={{marginTop: 0, fontSize: '24px', color:'#333'}}>{selectedPiatto.nome}</h2>
                      <p style={{fontSize: '18px', fontWeight: 'bold', color: priceColor, margin:'10px 0'}}>
                          {selectedPiatto.prezzo} €
                      </p>
                      <p style={{color: '#555', lineHeight: '1.5', fontSize: '14px'}}>
                          {selectedPiatto.descrizione || "Nessuna descrizione disponibile."}
                      </p>
                      {canOrder && (
                          <button 
                            onClick={() => aggiungiAlCarrello(selectedPiatto)}
                            className="btn-invia"
                            style={{width: '100%', marginTop: '20px', padding: '15px', fontSize: '18px', backgroundColor: priceColor}}
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