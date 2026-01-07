// client/src/Menu.jsx - VERSIONE V41 (BLOCCO PAUSA + SERVIZIO) ⛔
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function Menu() {
  // --- STATI DATI ---
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  
  // --- STATI LOGICI ---
  const [canOrder, setCanOrder] = useState(true); // Servizio Cucina (Aperto/Chiuso)
  const [isSuspended, setIsSuspended] = useState(false); // Blocco Totale (Pausa SuperAdmin)
  
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

        // --- A. CONTROLLO PAUSA TOTALE (SUPER ADMIN) ---
        // Se ordini_abilitati è false, blocchiamo TUTTO.
        if (data.ordini_abilitati === false) {
            setIsSuspended(true);
            setRistorante(data.ristorante); // Mostriamo almeno il nome
            if (data.style) setStyle(data.style); // E lo sfondo
            return; // STOP! Non carichiamo il menu.
        }

        // --- B. CARICAMENTO NORMALE ---
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setRistoranteId(data.id);
        if (data.style) setStyle(data.style);
        
        // --- C. CONTROLLO SERVIZIO CUCINA (ADMIN) ---
        // Se servizio_attivo è false, vedo il menu ma non ordino.
        setCanOrder(data.servizio_attivo);
      })
      .catch(err => {
          console.error("Errore fetch menu:", err);
          setError(true);
      });
  }, [currentSlug]);

  // --- RENDER SCREEN "ATTIVITÀ SOSPESA" ---
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
              <div style={{fontSize: '4rem', marginBottom: '20px'}}>⛔</div>
              <h1 style={{fontSize: '2rem', color: 'red', textTransform: 'uppercase'}}>Attività Sospesa</h1>
              <h2 style={{marginTop: '10px'}}>{ristorante}</h2>
              <p style={{marginTop: '20px', fontSize: '1.2rem', opacity: 0.8}}>
                  Il servizio è momentaneamente non disponibile.<br/>
                  Si prega di contattare l'amministrazione.
              </p>
          </div>
      );
  }

  // --- LOGICA Uscita (BAR = 0) ---
  const getDefaultCourse = (categoria, isBar) => {
      if (isBar) return 0; 
      const cat = categoria.toLowerCase();
      if (cat.includes('antipast') || cat.includes('fritti') || cat.includes('stuzzicheri')) return 1;
      if (cat.includes('dessert') || cat.includes('dolci')) return 3;
      return 2;
  };

  // --- 2. AGGIUNGI AL CARRELLO ---
  const aggiungiAlCarrello = (prodotto) => {
    // BLOCCO AGGIUNTA SE SERVIZIO CHIUSO
    if (!canOrder) {
        return alert("⚠️ LA CUCINA È CHIUSA.\nPuoi solo consultare il menu, ma non ordinare.");
    }
    
    const isBar = !!prodotto.categoria_is_bar;
    const item = { 
        ...prodotto, 
        tempId: Date.now() + Math.random(), 
        categoria: prodotto.categoria || "Varie",
        categoria_posizione: prodotto.categoria_posizione || 999,
        is_bar: isBar,
        is_pizzeria: !!prodotto.categoria_is_pizzeria,
        course: getDefaultCourse(prodotto.categoria || "", isBar) 
    };
    
    setCarrello([...carrello, item]); 
    setSelectedPiatto(null); 
  };

  // --- 3. RIMUOVI ---
  const rimuoviDalCarrello = (tempId) => {
      const nuovoCarrello = carrello.filter(item => item.tempId !== tempId);
      setCarrello(nuovoCarrello);
      if(nuovoCarrello.length === 0) setShowCheckout(false);
  };

  // --- CAMBIA PRIORITÀ ---
  const cambiaUscita = (tempId, delta) => {
      setCarrello(prevCarrello => prevCarrello.map(item => {
          if (item.tempId === tempId && item.course > 0) {
              const newCourse = item.course + delta;
              if (newCourse < 1 || newCourse > 3) return item;
              return { ...item, course: newCourse };
          }
          return item;
      }));
  };

  // --- 4. INVIA ORDINE ---
  const inviaOrdine = async () => { 
     if (!ristoranteId) return alert("Errore: Impossibile identificare il ristorante.");
     
     const totale = carrello.reduce((acc, i) => acc + parseFloat(i.prezzo || 0), 0);
     const prodottiPerBackend = carrello.map(p => ({
         nome: p.nome,
         prezzo: p.prezzo,
         categoria: p.categoria,
         categoria_posizione: p.categoria_posizione,
         is_bar: p.is_bar,
         is_pizzeria: p.is_pizzeria,
         course: p.course 
     }));

     const payload = {
        ristorante_id: ristoranteId, 
        tavolo: numeroTavolo, 
        prodotti: prodottiPerBackend, 
        totale
     };

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
         alert("Errore di connessione. Controlla internet e riprova."); 
     }
  };

  if (error) return <div className="container" style={{padding:'50px', textAlign:'center', color:'white'}}><h1>🚫 Ristorante non trovato (404)</h1></div>;

  const categorieOrdinate = [...new Set(menu.map(p => p.categoria))];

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

  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) { setActiveCategory(null); setActiveSubCategory(null); } 
      else { setActiveCategory(catNome); setActiveSubCategory(null); }
  };
  const toggleSubAccordion = (subName) => setActiveSubCategory(activeSubCategory === subName ? null : subName);

  return (
    <div style={appStyle}> 
      
      {/* HEADER */}
      <header style={{textAlign:'center', marginBottom:'20px'}}>
        {style?.logo ? (
            <img src={style.logo} alt={ristorante} style={{width: '100%', maxWidth: '90%', maxHeight: '150px', objectFit: 'contain'}} />
        ) : (
            <h1 style={{color: titleColor, fontSize:'2.5rem', margin:'0 0 10px 0'}}>{ristorante}</h1>
        )}
        
        {/* BADGE STATO SERVIZIO */}
        {canOrder ? (
            <p style={{color: style?.text || '#ccc'}}>
                Tavolo: <strong style={{fontSize:'1.2rem', color:'white'}}>{numeroTavolo}</strong>
            </p> 
        ) : (
            <div className="badge-digital" style={{background:'red', color:'white', padding:'10px', display:'inline-block', borderRadius:'5px', fontWeight:'bold', fontSize:'14px'}}>
                ⛔ CUCINA CHIUSA (Solo Consultazione)
            </div>
        )}
      </header>

      {/* BARRA CARRELLO (Visibile solo se si può ordinare) */}
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
                                                <div key={prodotto.id} className="card" onClick={() => prodotto.immagine_url ? setSelectedPiatto(prodotto) : null} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '10px', width: '100%', boxSizing: 'border-box', cursor: prodotto.immagine_url ? 'pointer' : 'default', backgroundColor: 'white', marginBottom: '1px', borderRadius: '0' }}>
                                                    {prodotto.immagine_url && <img src={prodotto.immagine_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'5px', flexShrink: 0}} />}
                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 4px 0', fontSize:'16px', color: 'titleColor'}}>{prodotto.nome}</h3>
                                                        {prodotto.descrizione && (<p style={{fontSize:'12px', color:'#666', margin:'0 0 4px 0', lineHeight:'1.2'}}>{prodotto.descrizione}</p>)}
                                                        <div style={{fontSize:'14px', fontWeight:'bold', color: priceColor}}>{prodotto.prezzo} €</div>
                                                    </div>
                                                    
                                                    {/* BOTTONE +: VISIBILE SOLO SE CANORDER È TRUE */}
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

      {/* --- CHECKOUT --- */}
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
                  {carrello.length === 0 && <p style={{color: style?.text, textAlign:'center'}}>Il carrello è vuoto.</p>}
                  
                  {/* --- BLOCCO 1: PIATTI CON PRIORITÀ --- */}
                  {[1, 2, 3].map(courseNum => {
                      const itemsInCourse = carrello.filter(i => !i.is_bar && i.course === courseNum);
                      if (itemsInCourse.length === 0) return null;

                      let courseTitle = "";
                      let courseColor = "";
                      if(courseNum === 1) { courseTitle = "🟢 1ª USCITA (Subito)"; courseColor = "#27ae60"; }
                      if(courseNum === 2) { courseTitle = "🟡 2ª USCITA (A Seguire)"; courseColor = "#f1c40f"; }
                      if(courseNum === 3) { courseTitle = "🔴 3ª USCITA (Dessert)"; courseColor = "#e74c3c"; }

                      return (
                          <div key={courseNum} style={{marginBottom:'20px'}}>
                              <h3 style={{color: courseColor, borderBottom:`1px solid ${courseColor}`, paddingBottom:'5px', fontSize:'14px', textTransform:'uppercase'}}>
                                  {courseTitle}
                              </h3>
                              
                              {itemsInCourse.map((item) => (
                                  <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.1)', padding:'10px', marginBottom:'10px', borderRadius:'8px'}}>
                                      <div style={{flex:1}}>
                                          <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
                                          <div style={{color: '#888', fontSize:'12px'}}>
                                            {item.prezzo} € • {item.is_pizzeria ? '🍕 Pizzeria' : '🍳 Cucina'}
                                          </div>
                                      </div>

                                      <div style={{display:'flex', flexDirection:'column', gap:'5px', marginRight:'10px'}}>
                                          {item.course > 1 && (
                                              <button onClick={() => cambiaUscita(item.tempId, -1)} style={{fontSize:'12px', padding:'2px 8px', background:'rgba(255,255,255,0.2)', color:titleColor, border:'none', borderRadius:'4px', cursor:'pointer'}}>
                                                  ⬆️ Prima
                                              </button>
                                          )}
                                          {item.course < 3 && (
                                              <button onClick={() => cambiaUscita(item.tempId, 1)} style={{fontSize:'12px', padding:'2px 8px', background:'rgba(255,255,255,0.2)', color:titleColor, border:'none', borderRadius:'4px', cursor:'pointer'}}>
                                                  ⬇️ Dopo
                                              </button>
                                          )}
                                      </div>

                                      <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>🗑️</button>
                                  </div>
                              ))}
                          </div>
                      );
                  })}

                  {/* --- BLOCCO 2: BAR --- */}
                  {carrello.some(i => i.is_bar) && (
                      <div style={{marginBottom:'20px', marginTop:'30px', borderTop:'1px dashed #555', paddingTop:'10px'}}>
                           <h3 style={{color: '#3498db', paddingBottom:'5px', fontSize:'14px', textTransform:'uppercase'}}>
                               🍹 BEVANDE & BAR
                           </h3>
                           {carrello.filter(i => i.is_bar).map(item => (
                               <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', marginBottom:'10px', borderRadius:'8px'}}>
                                   <div style={{flex:1}}>
                                       <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
                                       <div style={{color: '#888', fontSize:'12px'}}>{item.prezzo} €</div>
                                   </div>
                                   <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>🗑️</button>
                               </div>
                           ))}
                      </div>
                  )}

              </div>

              <div style={{marginTop:'20px', borderTop:`1px solid ${style?.text||'#ccc'}`, paddingTop:'20px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'20px', color: titleColor, marginBottom:'20px'}}>
                      <span>TOTALE:</span>
                      <strong style={{color: priceColor}}>{carrello.reduce((a,b)=>a+Number(b.prezzo),0).toFixed(2)} €</strong>
                  </div>
                  {carrello.length > 0 && <button onClick={inviaOrdine} className="btn-invia" style={{width:'100%', padding:'15px', fontSize:'18px', background:'#27ae60'}}>CONFERMA E INVIA 🚀</button>}
                  <button onClick={() => setShowCheckout(false)} style={{width:'100%', padding:'15px', marginTop:'10px', background:'transparent', border:`1px solid ${style?.text||'#ccc'}`, color: style?.text||'#ccc', borderRadius:'30px', cursor:'pointer'}}>Torna al Menu</button>
              </div>
          </div>
      )}
    </div>
  );
}

export default Menu;