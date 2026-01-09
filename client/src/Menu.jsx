// client/src/Menu.jsx - VERSIONE V51 (FIX DEFINITIVO) ✨
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function Menu() {
  // --- STATI DATI ---
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  
  // --- STATI LOGICI ---
  const [isSuspended, setIsSuspended] = useState(false); // ABBONAMENTO SCADUTO
  const [canOrder, setCanOrder] = useState(true);        // CUCINA APERTA/CHIUSA
  
  // --- STATI CARRELLO E ORDINE ---
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // --- STATI INTERFACCIA ---
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
  const [selectedPiatto, setSelectedPiatto] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // --- PARAMETRI URL ---
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  
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

        // 1. CONTROLLO ABBONAMENTO
        if (data.subscription_active === false) {
            setIsSuspended(true);
            setRistorante(data.ristorante);
            if (data.style) setStyle(data.style);
            return;
        }

        // 2. CONTROLLO CUCINA
        setCanOrder(data.ordini_abilitati);

        // 3. CARICAMENTO DATI NORMALE
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setRistoranteId(data.id);
        if (data.style) setStyle(data.style);
      })
      .catch(err => {
          console.error("Errore fetch menu:", err);
          setError(true);
      });
  }, [currentSlug]);

  // --- SCHERMATA BLOCCO (Se Abbonamento Scaduto) ---
  if (isSuspended) {
      return (
          <div style={{
              backgroundColor: style?.bg || '#222',
              color: style?.text || '#fff',
              fontFamily: style?.font || 'sans-serif',
              minHeight: '100vh',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '20px', textAlign: 'center'
          }}>
              <div style={{fontSize: '5rem', marginBottom: '20px'}}>⛔</div>
              <h1 style={{fontSize: '2rem', color: '#e74c3c', textTransform: 'uppercase', margin: 0}}>Attività Sospesa</h1>
              <h2 style={{marginTop: '10px', fontSize: '1.5rem', color: style?.title || '#fff'}}>{ristorante}</h2>
              <p style={{marginTop: '20px', fontSize: '1.2rem', opacity: 0.8, maxWidth:'500px'}}>
                  Il servizio menu digitale non è al momento disponibile per questa attività.
              </p>
          </div>
      );
  }

  // --- 2. LOGICA "SMART COURSE" ---
  const getDefaultCourse = (piatto) => {
      if (piatto.categoria_is_bar) return 0; // Bar separato
      
      const nome = (piatto.nome + " " + (piatto.categoria_nome || piatto.categoria)).toLowerCase();
      
      // Riconoscimento automatico:
      if (nome.includes('antipast') || nome.includes('fritt') || nome.includes('stuzzich') || nome.includes('bruschet') || nome.includes('tapas') || nome.includes('taglier')) return 1; 
      if (nome.includes('prim') || nome.includes('pasta') || nome.includes('risott') || nome.includes('zupp') || nome.includes('tortell') || nome.includes('spaghett')) return 2; 
      if (nome.includes('second') || nome.includes('carn') || nome.includes('pesc') || nome.includes('grigli') || nome.includes('burger') || nome.includes('pizz')) return 3; 
      if (nome.includes('dolc') || nome.includes('dessert') || nome.includes('tiramis') || nome.includes('caff') || nome.includes('amar')) return 4; 

      return 3; // Default (es. contorni vanno col secondo)
  };

  // --- 3. GESTIONE CARRELLO ---
  const aggiungiAlCarrello = (piatto) => {
      if(!canOrder) return alert("Gli ordini sono momentaneamente chiusi.");
      
      const tempId = Date.now() + Math.random();
      const defaultCourse = getDefaultCourse(piatto);

      const item = { ...piatto, tempId, course: defaultCourse };
      
      setCarrello([...carrello, item]);
      setSelectedPiatto(null);
      if(navigator.vibrate) navigator.vibrate(50);
  };

  const rimuoviDalCarrello = (tempId) => {
      setCarrello(carrello.filter(i => i.tempId !== tempId));
  };

  const cambiaUscita = (tempId, delta) => {
      setCarrello(carrello.map(item => {
          if (item.tempId === tempId) {
              let newCourse = item.course + delta;
              if (newCourse < 1) newCourse = 1; // Minimo Antipasto
              if (newCourse > 4) newCourse = 4; // Massimo Dolce
              return { ...item, course: newCourse };
          }
          return item;
      }));
  };

  const inviaOrdine = async () => {
      if(carrello.length === 0) return;
      if(!confirm(`Confermi l'ordine per il tavolo ${numeroTavolo}?`)) return;

      const payload = {
          ristorante_id: ristoranteId,
          tavolo: numeroTavolo,
          prodotti: carrello.map(p => ({
              id: p.id,
              nome: p.nome,
              prezzo: p.prezzo,
              course: p.course, // Manda 1, 2, 3 o 4
              is_bar: p.categoria_is_bar,
              is_pizzeria: p.categoria_is_pizzeria,
              stato: 'in_attesa'
          })),
          totale: carrello.reduce((a,b)=>a+Number(b.prezzo),0)
      };

      try {
          const res = await fetch(`${API_URL}/api/ordine`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.success) {
              alert("✅ Ordine Inviato! Arriva subito.");
              setCarrello([]);
              setShowCheckout(false);
          } else {
              alert("Errore invio ordine.");
          }
      } catch(e) { alert("Errore connessione server."); }
  };

  if (error) return <div style={{padding:'50px', textAlign:'center', color:'white', background:'#222'}}><h1>🚫 Ristorante non trovato (404)</h1></div>;

  const categorieOrdinate = [...new Set(menu.map(p => p.categoria))];

  // --- Accordion handlers ---
  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) { setActiveCategory(null); setActiveSubCategory(null); } 
      else { setActiveCategory(catNome); setActiveSubCategory(null); }
  };
  const toggleSubAccordion = (subName) => setActiveSubCategory(activeSubCategory === subName ? null : subName);

  // --- STILI BASE ---
  const appStyle = {
      backgroundColor: style?.bg || '#222',
      color: style?.text || '#ccc',
      fontFamily: style?.font || 'sans-serif',
      backgroundImage: style?.cover ? `url(${style.cover})` : 'none',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      minHeight: '100vh', width: '100%', maxWidth: '100%', margin: 0, padding: '10px', boxSizing: 'border-box'
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
            <div className="badge-digital" style={{background:'red', color:'white', padding:'10px', display:'inline-block', borderRadius:'5px', fontWeight:'bold', fontSize:'14px'}}>
                ⛔ ORDINI CHIUSI (Ordinare tramite il Cameriere)
            </div>
        )}
      </header>

      {/* --- MODALE SCHEDA PIATTO DETTAGLIATA --- */}
      {selectedPiatto && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding:'10px'
        }} onClick={() => setSelectedPiatto(null)}>
            <div style={{
                background: 'white', color: '#000', borderRadius: '10px', overflow: 'hidden',
                maxWidth: '600px', width: '100%', maxHeight:'95vh', overflowY:'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position:'relative'
            }} onClick={e => e.stopPropagation()}>
                
                {selectedPiatto.immagine_url && (
                    <div style={{width:'100%', background:'#000', textAlign:'center'}}>
                        <img 
                            src={selectedPiatto.immagine_url} 
                            alt={selectedPiatto.nome} 
                            style={{maxWidth:'100%', maxHeight:'50vh', objectFit:'contain', display:'block', margin:'0 auto'}} 
                        />
                    </div>
                )}

                <div style={{padding:'25px'}}>
                    <h2 style={{margin:'0 0 10px 0', fontSize:'1.8rem', color: '#000', fontWeight:'800'}}>
                        {selectedPiatto.nome}
                    </h2>
                    <p style={{color:'#000', fontSize:'1.1rem', lineHeight:'1.6', marginBottom:'25px'}}>
                        {selectedPiatto.descrizione || "Nessuna descrizione disponibile."}
                    </p>
                    
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #ddd', paddingTop:'20px'}}>
                        <div style={{fontSize:'1.8rem', fontWeight:'bold', color: '#000'}}>
                            {selectedPiatto.prezzo} €
                        </div>
                        {canOrder && (
                            <button 
                                onClick={() => aggiungiAlCarrello(selectedPiatto)}
                                style={{
                                    background: priceColor, color:'white', border:'none', 
                                    padding:'15px 30px', borderRadius:'30px', fontSize:'1.1rem', 
                                    fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'
                                }}
                            >
                                AGGIUNGI
                            </button>
                        )}
                    </div>
                </div>

                <button 
                    onClick={() => setSelectedPiatto(null)}
                    style={{
                        position:'absolute', top:'15px', right:'15px', 
                        background:'white', color:'black', border:'none', 
                        borderRadius:'50%', width:'40px', height:'40px', 
                        cursor:'pointer', fontSize:'20px', boxShadow:'0 2px 10px rgba(0,0,0,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center'
                    }}
                >✕</button>
            </div>
        </div>
      )}

      {/* BARRA CARRELLO */}
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

      {/* LISTA MENU */}
      <div style={{paddingBottom: '80px', marginTop: '0', width: '100%'}}> 
        {categorieOrdinate.map(catNome => (
            <div key={catNome} className="accordion-item" style={{marginBottom: '2px', borderRadius: '5px', overflow: 'hidden', width: '100%'}}>
                <div onClick={() => toggleAccordion(catNome)} style={{ background: activeCategory === catNome ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)', color: titleColor, padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: activeCategory === catNome ? `1px solid ${priceColor}` : 'none' }}>
                    <h2 style={{margin:0, fontSize:'18px', color: titleColor, width:'100%'}}>{catNome}</h2>
                    <span style={{color: titleColor}}>{activeCategory === catNome ? '▼' : '▶'}</span>
                </div>

                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '0', background: 'rgba(0,0,0,0.2)', width: '100%'}}>
                        {(() => {
                            const piattiCat = menu.filter(p => p.categoria === catNome);
                            const sottoCats = piattiCat.reduce((acc, p) => {
                                const sc = (p.sottocategoria && p.sottocategoria.trim().length > 0) ? p.sottocategoria : "Generale";
                                if(!acc[sc]) acc[sc] = [];
                                acc[sc].push(p); return acc;
                            }, {});

                            const subKeys = Object.keys(sottoCats).sort();
                            const isSingleGroup = subKeys.length === 1 && subKeys[0] === "Generale";

                            return subKeys.map(scKey => (
                                <div key={scKey} style={{width: '100%'}}>
                                    {!isSingleGroup && (
                                        <div onClick={() => toggleSubAccordion(scKey)} style={{ background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${priceColor}`, padding: '10px', margin: '1px 0', width: '100%', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{margin:0, fontSize:'16px', color: titleColor, textTransform:'uppercase'}}>{scKey === "Generale" ? "Altri Piatti" : scKey}</h3>
                                            <span style={{color: titleColor, fontWeight:'bold'}}>{activeSubCategory === scKey ? '▼' : '▶'}</span>
                                        </div>
                                    )}

                                    {(isSingleGroup || activeSubCategory === scKey) && (
                                        <div className="menu-list" style={{padding: '0', width: '100%'}}>
                                            {sottoCats[scKey].map((prodotto) => (
                                                <div key={prodotto.id} 
                                                    className="card" 
                                                    onClick={() => prodotto.immagine_url ? setSelectedPiatto(prodotto) : null} 
                                                    style={{ 
                                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '10px', width: '100%', boxSizing: 'border-box', 
                                                        cursor: prodotto.immagine_url ? 'pointer' : 'default', 
                                                        backgroundColor: 'white', marginBottom: '1px', borderRadius: '0' 
                                                    }}
                                                >
                                                    {prodotto.immagine_url && <img src={prodotto.immagine_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'5px', flexShrink: 0}} />}
                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 4px 0', fontSize:'16px', color: titleColor, color: '#222'}}>{prodotto.nome}</h3>
                                                        {prodotto.descrizione && (<p style={{fontSize:'12px', color:'#666', margin:'0 0 4px 0', lineHeight:'1.2'}}>{prodotto.descrizione}</p>)}
                                                        <div style={{fontSize:'14px', fontWeight:'bold', color: priceColor}}>{prodotto.prezzo} €</div>
                                                    </div>
                                                    
                                                    {canOrder && (
                                                        <button onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} style={{ background:'#f0f0f0', color:'#333', borderRadius:'50%', width:'32px', height:'32px', border:'none', fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer' }}>+</button>
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

{/* --- CHECKOUT (LOGICA DINAMICA INTELLIGENTE) --- */}
      {showCheckout && (
          <div style={{
              position:'fixed', top:0, left:0, right:0, bottom:0, 
              background: style.bg || '#222', zIndex:2000, 
              display:'flex', flexDirection:'column', padding:'20px', overflowY:'auto'
          }}>
              
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:`1px solid ${style?.text||'#ccc'}`, paddingBottom:'10px'}}>
                  <h2 style={{color: titleColor, margin:0}}>Riepilogo Ordine 📝</h2>
                  <button onClick={() => setShowCheckout(false)} style={{background:'transparent', border:'none', color: titleColor, fontSize:'24px', cursor:'pointer'}}>✕</button>
              </div>

              <div style={{flex:1, overflowY:'auto'}}>
                  {carrello.length === 0 && <p style={{color: style?.text || '#fff', textAlign:'center'}}>Il carrello è vuoto.</p>}

                  {/* --- BLOCCO 1: CUCINA INTELLIGENTE (SMART SORTING) --- */}
                  {(() => {
                      // Trova quali portate ci sono e le ordina
                      const itemsCucina = carrello.filter(i => !i.categoria_is_bar);
                      const coursePresenti = [...new Set(itemsCucina.map(i => i.course))].sort();
                      const coloriPortata = ['#27ae60', '#f1c40f', '#e67e22', '#c0392b']; // Verde, Giallo, Arancio, Rosso
                      
                      return coursePresenti.map((courseNum, index) => (
                          <div key={courseNum} style={{marginBottom:'25px'}}>
                              {/* LABEL DINAMICA: Usa l'indice (index+1) per scrivere "1ª PORTATA" */}
                              <h3 style={{
                                  margin:'0 0 10px 0', 
                                  color: coloriPortata[index] || '#ccc', 
                                  borderBottom:`2px solid ${coloriPortata[index] || '#ccc'}`,
                                  display:'inline-block', paddingRight:20
                              }}>
                                  {index + 1}ª PORTATA 
                                  <span style={{fontSize:'0.8rem', marginLeft:10, color:'#888', fontWeight:'normal'}}>
                                      ({courseNum === 1 ? 'Antipasti' : courseNum === 2 ? 'Primi' : courseNum === 3 ? 'Secondi/Pizze' : 'Dessert'})
                                  </span>
                              </h3>

                              {itemsCucina.filter(i => i.course === courseNum).map(item => (
                                  <div key={item.tempId} style={{background:'rgba(255,255,255,0.1)', borderRadius:10, padding:15, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                      <div>
                                          <div style={{fontWeight:'bold', fontSize:'1.1rem', color: titleColor}}>{item.nome}</div>
                                          <div style={{color:'#aaa', fontSize:'0.9rem'}}>
                                              {/* FIX QUI SOTTO: Number() */}
                                              {Number(item.prezzo).toFixed(2)} € • {item.categoria_is_pizzeria ? '🍕 Pizza' : '🍳 Cucina'}
                                          </div>
                                      </div>
                                      <div style={{display:'flex', flexDirection:'column', gap:5}}>
                                          <div style={{display:'flex', gap:5}}>
                                              <button onClick={() => cambiaUscita(item.tempId, -1)} style={{background:'#ecf0f1', color:'#333', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px', cursor:'pointer'}}>⬆️</button>
                                              <button onClick={() => cambiaUscita(item.tempId, 1)} style={{background:'#ecf0f1', color:'#333', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px', cursor:'pointer'}}>⬇️</button>
                                          </div>
                                          <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', fontSize:'0.8rem', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', border:'none'}}>ELIMINA</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ));
                  })()}
                  
                  {/* --- BLOCCO 2: BEVANDE (BAR) - IN FONDO --- */}
                  {carrello.some(i => i.categoria_is_bar) && (
                      <div style={{marginBottom:'20px', padding:'10px', border:'1px dashed #555', borderRadius:'10px'}}>
                           <h3 style={{color: '#3498db', margin:'0 0 10px 0', fontSize:'16px', textTransform:'uppercase'}}>
                               🍹 BEVANDE & BAR (Subito)
                           </h3>
                           {carrello.filter(i => i.categoria_is_bar).map(item => (
                               <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', marginBottom:'5px', borderRadius:'8px'}}>
                                   <div style={{flex:1}}>
                                       <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
                                       {/* FIX QUI SOTTO: Number() */}
                                       <div style={{color: '#888', fontSize:'12px'}}>{Number(item.prezzo).toFixed(2)} €</div>
                                   </div>
                                   <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>✕</button>
                               </div>
                           ))}
                      </div>
                  )}

              </div>

              <div style={{marginTop:'20px', borderTop:`1px solid ${style?.text||'#ccc'}`, paddingTop:'20px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'20px', color: titleColor, marginBottom:'20px'}}>
                      <span>TOTALE:</span>
                      {/* FIX QUI SOTTO: Number() */}
                      <strong style={{color: priceColor}}>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong>
                  </div>
                  {carrello.length > 0 && <button onClick={inviaOrdine} style={{width:'100%', padding:'15px', fontSize:'18px', background: '#159709ff', color:'white', border:`1px solid ${style?.text||'#ccc'}`, borderRadius:'30px', fontWeight:'bold', cursor:'pointer'}}>CONFERMA E INVIA 🚀</button>}
                  <button onClick={() => setShowCheckout(false)} style={{width:'100%', padding:'15px', marginTop:'10px', background:'transparent', border:`1px solid ${style?.text||'#ccc'}`, color: style?.text||'#ccc', borderRadius:'30px', cursor:'pointer'}}>Torna al Menu</button>
              </div>
          </div>
      )}
    </div>
  );
}

export default Menu;