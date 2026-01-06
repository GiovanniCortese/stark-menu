// client/src/App.jsx - VERSIONE V22 (FULL STACK INTEGRATION) 🛒
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import Cucina from './Cucina';
import Bar from './Bar'; 
import Cassa from './Cassa'; 
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; 
import './App.css';

function Menu() {
  // --- STATI DATI ---
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState(null);
  
  // --- STATI CARRELLO E ORDINE ---
  const [canOrder, setCanOrder] = useState(true); 
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // --- STATI INTERFACCIA (ACCORDION & MODAL) ---
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
  const [selectedPiatto, setSelectedPiatto] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // --- PARAMETRI URL ---
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  
  // URL SERVER (Assicurati che sia quello giusto)
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- 1. CARICAMENTO MENU ---
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => res.json())
      .then(data => {
        if(data.error) { 
            console.error("Ristorante non trovato"); 
            setError(true); 
            return; 
        }
        
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setRistoranteId(data.id); // FONDAMENTALE PER INVIARE L'ORDINE
        
        if (data.style) setStyle(data.style);
        setCanOrder(data.ordini_abilitati && data.servizio_attivo);
      })
      .catch(err => {
          console.error("Errore fetch menu:", err);
          setError(true);
      });
  }, [currentSlug]);

  // --- 2. AGGIUNGI AL CARRELLO (Con Logica Bar) ---
  const aggiungiAlCarrello = (prodotto) => {
    if (!canOrder) return alert("Il servizio ordini è momentaneamente chiuso.");
    
    // Creiamo l'oggetto per il carrello
    const item = { 
        ...prodotto, 
        tempId: Date.now() + Math.random(), // ID univoco per il frontend
        categoria: prodotto.categoria || "Varie",
        categoria_posizione: prodotto.categoria_posizione || 999,
        // QUI CATTURIAMO IL FLAG DAL DB: Se la categoria è Bar, il prodotto è Bar
        is_bar: !!prodotto.categoria_is_bar 
    };
    
    setCarrello([...carrello, item]); 
    setSelectedPiatto(null); // Chiude il modale se aperto
  };

  // --- 3. RIMUOVI DAL CARRELLO ---
  const rimuoviDalCarrello = (tempId) => {
      const nuovoCarrello = carrello.filter(item => item.tempId !== tempId);
      setCarrello(nuovoCarrello);
      if(nuovoCarrello.length === 0) setShowCheckout(false);
  };

  // --- 4. INVIA ORDINE AL SERVER ---
  const inviaOrdine = async () => { 
     if (!ristoranteId) return alert("Errore: Impossibile identificare il ristorante. Ricarica la pagina.");
     
     const totale = carrello.reduce((acc, i) => acc + parseFloat(i.prezzo || 0), 0);
     
     // Puliamo i dati per il backend (mandiamo solo ciò che serve)
     const prodottiPerBackend = carrello.map(p => ({
         nome: p.nome,
         prezzo: p.prezzo,
         categoria: p.categoria,
         categoria_posizione: p.categoria_posizione,
         is_bar: p.is_bar // CRUCIALE: Questo dice al server "sono una bibita"
     }));

     const payload = {
        ristorante_id: ristoranteId, 
        tavolo: numeroTavolo, 
        prodotti: prodottiPerBackend, 
        totale
     };

     console.log("📤 Invio Ordine...", payload);

     try {
        const res = await fetch(`${API_URL}/api/ordine`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(payload)
        });
        
        const d = await res.json();
        
        if(d.success) { 
            alert("✅ Ordine inviato con successo!"); 
            setCarrello([]); 
            setShowCheckout(false);
        } else {
            alert("❌ Errore dal server: " + (d.error || "Sconosciuto"));
        }
     } catch (e) { 
         console.error("Errore di rete:", e);
         alert("Errore di connessione. Controlla internet e riprova."); 
     }
  };

  if (error) return <div className="container" style={{padding:'50px', textAlign:'center', color:'white'}}><h1>🚫 Ristorante non trovato (404)</h1></div>;

  // --- LOGICA UI (Accordion) ---
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
      setActiveSubCategory(activeSubCategory === subName ? null : subName);
  };

  // --- STILI DINAMICI ---
  const appStyle = {
      backgroundColor: style?.bg || '#222',
      color: style?.text || '#ccc',
      fontFamily: style?.font || 'sans-serif',
      backgroundImage: style?.cover ? `url(${style.cover})` : 'none',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      padding: '10px',
      boxSizing: 'border-box'
  };

  const titleColor = style?.title || '#fff';
  const priceColor = style?.price || '#27ae60';

  return (
    <div style={appStyle}> 
      
      {/* HEADER */}
      <header style={{textAlign:'center', marginBottom:'20px'}}>
        {style?.logo ? (
            <img src={style.logo} alt={ristorante} style={{width: '100%', maxWidth: '90%', maxHeight: '150px', objectFit: 'contain'}} />
        ) : (
            <h1 style={{color: titleColor, fontSize:'2.5rem', margin:'0 0 10px 0'}}>{ristorante}</h1>
        )}
        
        {canOrder ? (
            <p style={{color: style?.text || '#ccc'}}>
                Tavolo: <strong style={{fontSize:'1.2rem', color:'white'}}>{numeroTavolo}</strong>
            </p> 
        ) : (
            <div className="badge-digital" style={{background:'red', color:'white', padding:'5px 10px', display:'inline-block', borderRadius:'5px'}}>
                ⛔ Servizio Chiuso
            </div>
        )}
      </header>

      {/* BARRA CARRELLO FLOTTANTE */}
      {canOrder && carrello.length > 0 && !showCheckout && (
        <div className="carrello-bar">
          <div className="totale">
              <span>{carrello.length} prodotti</span>
              <strong>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong>
          </div>
          <button onClick={() => setShowCheckout(true)} className="btn-invia" style={{background:'#f1c40f', color:'black'}}>
              VEDI ORDINE 📝
          </button>
        </div>
      )}

      {/* LISTA MENU (ACCORDION) */}
      <div style={{paddingBottom: '80px', marginTop: '0', width: '100%'}}> 
        {categorieOrdinate.map(catNome => (
            <div key={catNome} className="accordion-item" style={{marginBottom: '2px', borderRadius: '5px', overflow: 'hidden', width: '100%'}}>
                
                {/* Header Categoria */}
                <div 
                    onClick={() => toggleAccordion(catNome)}
                    style={{
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

                {/* Contenuto Categoria */}
                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '0', background: 'rgba(0,0,0,0.2)', width: '100%'}}>
                        {(() => {
                            // Filtro e Raggruppamento Sottocategorie
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
                                    
                                    {/* Header Sottocategoria (se esiste) */}
                                    {!isSingleGroup && (
                                        <div 
                                            onClick={() => toggleSubAccordion(scKey)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)', 
                                                borderLeft: `4px solid ${priceColor}`, 
                                                padding: '10px', 
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

                                    {/* Lista Piatti */}
                                    {(isSingleGroup || activeSubCategory === scKey) && (
                                        <div className="menu-list" style={{padding: '0', width: '100%'}}>
                                            {sottoCats[scKey].map((prodotto) => (
                                                <div 
                                                    key={prodotto.id} 
                                                    className="card" 
                                                    onClick={() => prodotto.immagine_url ? setSelectedPiatto(prodotto) : null}
                                                    style={{
                                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '10px',
                                                        width: '100%', boxSizing: 'border-box', cursor: prodotto.immagine_url ? 'pointer' : 'default',
                                                        backgroundColor: 'white', marginBottom: '1px', borderRadius: '0'
                                                    }}
                                                >
                                                    {prodotto.immagine_url && (
                                                        <img src={prodotto.immagine_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'5px', flexShrink: 0}} />
                                                    )}

                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 4px 0', fontSize:'16px', color:'#333'}}>{prodotto.nome}</h3>
                                                        {prodotto.descrizione && (<p style={{fontSize:'12px', color:'#666', margin:'0 0 4px 0', lineHeight:'1.2'}}>{prodotto.descrizione}</p>)}
                                                        <div style={{fontSize:'14px', fontWeight:'bold', color: priceColor}}>{prodotto.prezzo} €</div>
                                                    </div>

                                                    {canOrder && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} 
                                                            style={{
                                                                background:'#f0f0f0', color:'#333', borderRadius:'50%', width:'32px', height:'32px', 
                                                                border:'none', fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer'
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

      {/* --- SCHERMATA RIEPILOGO (CHECKOUT) --- */}
      {showCheckout && (
          <div style={{
              position:'fixed', top:0, left:0, right:0, bottom:0, 
              background: appStyle.backgroundColor, zIndex:2000, 
              display:'flex', flexDirection:'column', padding:'20px', overflowY:'auto'
          }}>
              
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:`1px solid ${style?.text||'#ccc'}`, paddingBottom:'10px'}}>
                  <h2 style={{color: titleColor, margin:0}}>Riepilogo Ordine</h2>
                  <button onClick={() => setShowCheckout(false)} style={{background:'transparent', border:'none', color: titleColor, fontSize:'24px', cursor:'pointer'}}>✕</button>
              </div>

              <div style={{flex:1, overflowY:'auto'}}>
                  {carrello.map((item) => (
                      <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.1)', padding:'10px', marginBottom:'10px', borderRadius:'8px'}}>
                          <div>
                              <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
                              <div style={{color: '#888', fontSize:'12px'}}>
                                {item.categoria} {item.is_bar ? '🍹 (Bar)' : '🍽️ (Cucina)'}
                              </div>
                              <div style={{color: priceColor}}>{item.prezzo} €</div>
                          </div>
                          <button 
                            onClick={() => rimuoviDalCarrello(item.tempId)}
                            style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 12px', borderRadius:'5px', cursor:'pointer'}}
                          >
                            Elimina 🗑️
                          </button>
                      </div>
                  ))}
                  {carrello.length === 0 && <p style={{color: style?.text, textAlign:'center'}}>Il carrello è vuoto.</p>}
              </div>

              <div style={{marginTop:'20px', borderTop:`1px solid ${style?.text||'#ccc'}`, paddingTop:'20px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'20px', color: titleColor, marginBottom:'20px'}}>
                      <span>TOTALE:</span>
                      <strong style={{color: priceColor}}>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong>
                  </div>
                  
                  {carrello.length > 0 && (
                      <button onClick={inviaOrdine} className="btn-invia" style={{width:'100%', padding:'15px', fontSize:'18px', background:'#27ae60'}}>
                          CONFERMA E INVIA 🚀
                      </button>
                  )}
                  <button onClick={() => setShowCheckout(false)} style={{width:'100%', padding:'15px', marginTop:'10px', background:'transparent', border:`1px solid ${style?.text||'#ccc'}`, color: style?.text||'#ccc', borderRadius:'30px', cursor:'pointer'}}>
                      Torna al Menu
                  </button>
              </div>
          </div>
      )}

      {/* --- MODAL DETTAGLI PIATTO --- */}
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

// --- ROTTE PRINCIPALI ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/:slug" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* ROTTE GESTIONALI */}
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/bar/:slug" element={<Bar />} />
        <Route path="/cassa/:slug" element={<Cassa />} />
        
        {/* ROTTA MENU CLIENTE */}
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;