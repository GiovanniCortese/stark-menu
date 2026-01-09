// client/src/Menu.jsx - VERSIONE V55 (LOGO FULL WIDTH + MODIFICA SMART) 💎
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function Menu() {
  // --- STATI DATI ---
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  
  // --- STATI LOGICI ---
  const [isSuspended, setIsSuspended] = useState(false);
  const [canOrder, setCanOrder] = useState(true);
  
  // --- STATI CARRELLO E ORDINE ---
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  
  // --- STATI INTERFACCIA ---
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
  const [selectedPiatto, setSelectedPiatto] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Stato temporaneo per le varianti mentre il modale è aperto
  const [tempVarianti, setTempVarianti] = useState({ rimozioni: [], aggiunte: [] });
  
  // --- PARAMETRI URL ---
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- 1. CARICAMENTO DATI ---
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => {
          if(!res.ok) throw new Error("Errore caricamento");
          return res.json();
      })
      .then(data => {
          setRistoranteId(data.id);
          setRistorante(data.ristorante);
          setMenu(data.menu || []);
          setStyle(data.style || {});
          
          if(data.subscription_active === false) setIsSuspended(true);
          setCanOrder(data.ordini_abilitati);

          if(data.menu && data.menu.length > 0) {
             const uniqueCats = [...new Set(data.menu.map(p => p.categoria_nome || p.categoria))];
             if(uniqueCats.length > 0) setActiveCategory(uniqueCats[0]);
          }
      })
      .catch(err => {
          console.error("Errore Menu:", err);
          setError(true);
      });
  }, [currentSlug]);

  // --- HELPER: APERTURA MODALE PULITO ---
  const apriModale = (piatto) => {
      setSelectedPiatto(piatto);
      setTempVarianti({ rimozioni: [], aggiunte: [] });
  };

  // --- 2. LOGICA "SMART COURSE" ---
  const getDefaultCourse = (piatto) => {
      if (piatto.categoria_is_bar) return 0; 

      const nome = (piatto.nome + " " + (piatto.categoria_nome || piatto.categoria)).toLowerCase();
      
      if (nome.includes('antipast') || nome.includes('fritt') || nome.includes('stuzzich') || nome.includes('bruschet') || nome.includes('tapas') || nome.includes('taglier')) return 1; 
      if (nome.includes('prim') || nome.includes('pasta') || nome.includes('risott') || nome.includes('zupp') || nome.includes('tortell') || nome.includes('spaghett')) return 2; 
      if (nome.includes('second') || nome.includes('carn') || nome.includes('pesc') || nome.includes('grigli') || nome.includes('burger') || nome.includes('pizz')) return 3; 
      if (nome.includes('dolc') || nome.includes('dessert') || nome.includes('tiramis') || nome.includes('caff') || nome.includes('amar')) return 4; 

      return 3; 
  };

  // --- 3. GESTIONE CARRELLO ---
  const aggiungiAlCarrello = (piatto) => {
      if(!canOrder) return alert("Gli ordini sono momentaneamente chiusi.");
      
      const tempId = Date.now() + Math.random();
      const defaultCourse = getDefaultCourse(piatto);

      const item = { 
          ...piatto, 
          tempId, 
          course: defaultCourse 
      };
      
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
              if (newCourse < 1) newCourse = 1;
              if (newCourse > 4) newCourse = 4;
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
              course: p.course, 
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

  // --- STYLE HELPERS ---
  const bg = style.bg || '#222';
  const text = style.text || '#fff';
  const titleColor = style.title || '#fff';
  const priceColor = style.price || '#27ae60';
  const font = style.font || 'sans-serif';

  const categorieUniche = [...new Set(menu.map(p => p.categoria_nome || p.categoria))];
  const piattiFiltrati = menu.filter(p => (p.categoria_nome || p.categoria) === activeCategory);

  const toggleAccordion = (catNome) => {
      if (activeCategory === catNome) { setActiveCategory(null); setActiveSubCategory(null); } 
      else { setActiveCategory(catNome); setActiveSubCategory(null); }
  };
  const toggleSubAccordion = (subName) => setActiveSubCategory(activeSubCategory === subName ? null : subName);

  if(isSuspended) return <div style={{padding:50, textAlign:'center', color:'red', background: bg, minHeight:'100vh'}}><h1>⛔ SERVIZIO SOSPESO</h1><p>Contattare l'amministrazione.</p></div>;
  if(error) return <div style={{padding:50, textAlign:'center', color: text, background: bg, minHeight:'100vh'}}><h1>⚠️ Errore Caricamento</h1></div>;

  return (
    <div style={{minHeight:'100vh', background: bg, color: text, fontFamily: font, paddingBottom:80}}>
      
      {/* HEADER LOGO FULL WIDTH (NUOVO STILE) */}
      <div style={{width:'100%', marginBottom:10, background: bg}}>
          {style.logo ? (
             <img src={style.logo} alt="Logo" style={{width:'100%', display:'block', objectFit:'cover'}} />
          ) : (
             <div style={{padding:20, textAlign:'center'}}>
                 <h1 style={{margin:0, color: titleColor}}>{ristorante}</h1>
             </div>
          )}
          
          <div style={{padding:'10px', textAlign:'center', borderBottom:`1px solid ${priceColor}`}}>
              {canOrder ? (
                  <span style={{color: text, fontSize:'1.1rem'}}>
                      Tavolo: <strong style={{color:'white', background: priceColor, padding:'2px 8px', borderRadius:'5px'}}>{numeroTavolo}</strong>
                  </span>
              ) : (
                <span style={{background:'red', color:'white', padding:'5px 10px', borderRadius:'5px', fontWeight:'bold'}}>⛔ CHIUSO</span>
              )}
          </div>
      </div>

      {/* CATEGORIE */}
      <div style={{display:'flex', overflowX:'auto', gap:10, padding:'10px 20px', paddingBottom:5, scrollbarWidth:'none'}}>
          {categorieUniche.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{
                      background: activeCategory === cat ? priceColor : '#444', color: 'white',
                      border:'none', padding:'10px 20px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0,
                      fontWeight: activeCategory === cat ? 'bold' : 'normal',
                      boxShadow: activeCategory === cat ? '0 4px 10px rgba(0,0,0,0.3)' : 'none'
                  }}
              >{cat}</button>
          ))}
      </div>

      {/* LISTA MENU A FISARMONICA */}
      <div style={{paddingBottom: '80px', marginTop: '10px', width: '100%'}}> 
        {categorieUniche.map(catNome => (
            <div key={catNome} className="accordion-item" style={{marginBottom: '2px', borderRadius: '5px', overflow: 'hidden', width: '100%'}}>
                <div onClick={() => toggleAccordion(catNome)} style={{ background: activeCategory === catNome ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)', color: titleColor, padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: activeCategory === catNome ? `1px solid ${priceColor}` : 'none' }}>
                    <h2 style={{margin:0, fontSize:'18px', color: titleColor, width:'100%'}}>{catNome}</h2>
                    <span style={{color: titleColor}}>{activeCategory === catNome ? '▼' : '▶'}</span>
                </div>

                {activeCategory === catNome && (
                    <div className="accordion-content" style={{padding: '0', background: 'rgba(0,0,0,0.2)', width: '100%'}}>
                        {(() => {
                            const piattiCat = menu.filter(p => (p.categoria_nome || p.categoria) === catNome);
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
                                            {sottoCats[scKey].map((prodotto) => {
                                                // 1. ANALISI VARIANTI
                                                const variantiObj = typeof prodotto.varianti === 'string' ? JSON.parse(prodotto.varianti || '{}') : (prodotto.varianti || {});
                                                const ingredientiStr = (variantiObj.base || []).join(', ');
                                                const hasVarianti = (variantiObj.base && variantiObj.base.length > 0) || (variantiObj.aggiunte && variantiObj.aggiunte.length > 0);

                                                return (
                                                <div key={prodotto.id} className="card"
                                                    // Click su card funziona SOLO se c'è foto
                                                    onClick={() => prodotto.immagine_url ? apriModale(prodotto) : null}
                                                    style={{ 
                                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '10px', width: '100%', boxSizing: 'border-box', 
                                                        cursor: prodotto.immagine_url ? 'pointer' : 'default', 
                                                        backgroundColor: 'white', marginBottom: '1px', borderRadius: '0',
                                                        borderBottom: '1px solid #eee'
                                                    }}
                                                >
                                                    {prodotto.immagine_url && <img src={prodotto.immagine_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'5px', flexShrink: 0}} />}
                                                    
                                                    <div className="info" style={{flex: 1}}>
                                                        <h3 style={{margin:'0 0 4px 0', fontSize:'16px', color: '#222'}}>{prodotto.nome}</h3>
                                                        
                                                        {prodotto.descrizione && (<p style={{fontSize:'12px', color:'#666', margin:'0 0 4px 0', lineHeight:'1.2'}}>{prodotto.descrizione}</p>)}
                                                        
                                                        {/* INGREDIENTI BASE VISIBILI */}
                                                        {ingredientiStr && (
                                                            <p style={{fontSize:'11px', color:'#555', fontStyle:'italic', margin:'0 0 5px 0'}}>
                                                                <span style={{fontWeight:'bold'}}>Ingredienti:</span> {ingredientiStr}
                                                            </p>
                                                        )}

                                                        <div style={{fontSize:'14px', fontWeight:'bold', color: priceColor}}>{Number(prodotto.prezzo).toFixed(2)} €</div>
                                                    </div>
                                                    
                                                    {canOrder && (
                                                        <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                            
                                                            {/* TASTO MODIFICA (SOLO SE CI SONO VARIANTI) */}
                                                            {hasVarianti && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); apriModale(prodotto); }}
                                                                    style={{
                                                                        background:'transparent', border:'1px solid #ccc', color:'#555',
                                                                        borderRadius:'5px', padding:'5px 8px', fontSize:'12px', cursor:'pointer', fontWeight:'bold'
                                                                    }}
                                                                >
                                                                    Modifica ✏️
                                                                </button>
                                                            )}

                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} 
                                                                style={{ 
                                                                    background:'#f0f0f0', color:'#333', borderRadius:'50%', width:'35px', height:'35px', 
                                                                    border:'none', fontSize:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer' 
                                                                }}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
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

      {/* --- MODALE CONFIGURATORE PRODOTTO --- */}
      {selectedPiatto && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding:'10px'
        }} onClick={() => setSelectedPiatto(null)}>
            
            {(() => {
                const variantiData = typeof selectedPiatto.varianti === 'string' 
                    ? JSON.parse(selectedPiatto.varianti || '{}') 
                    : (selectedPiatto.varianti || {});
                
                const baseList = variantiData.base || [];
                const addList = variantiData.aggiunte || [];
                
                const extraPrezzo = (tempVarianti?.aggiunte || []).reduce((acc, item) => acc + item.prezzo, 0);
                const prezzoFinale = Number(selectedPiatto.prezzo) + extraPrezzo;

                return (
                <div style={{
                    background: 'white', color: '#000', borderRadius: '10px', overflow: 'hidden',
                    maxWidth: '600px', width: '100%', maxHeight:'95vh', overflowY:'auto',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position:'relative', display:'flex', flexDirection:'column'
                }} onClick={e => e.stopPropagation()}>
                    
                    {selectedPiatto.immagine_url && (
                        <div style={{width:'100%', maxHeight:'250px', overflow:'hidden'}}>
                            <img src={selectedPiatto.immagine_url} style={{width:'100%', objectFit:'cover'}} />
                        </div>
                    )}

                    <div style={{padding:'20px'}}>
                        <h2 style={{margin:'0 0 5px 0', fontSize:'1.8rem', color: '#000', fontWeight:'800'}}>{selectedPiatto.nome}</h2>
                        <p style={{color:'#666', fontSize:'1rem', lineHeight:'1.4'}}>{selectedPiatto.descrizione}</p>

                        <div style={{marginTop:'20px', borderTop:'1px solid #eee', paddingTop:'15px'}}>
                            {/* RIMOZIONI */}
                            {baseList.length > 0 && (
                                <div style={{marginBottom:'20px'}}>
                                    <h4 style={{margin:'0 0 10px 0', color:'#333'}}>Ingredienti (Togli se non vuoi)</h4>
                                    <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                                        {baseList.map(ing => {
                                            const isRemoved = tempVarianti.rimozioni.includes(ing);
                                            return (
                                                <div key={ing} 
                                                    onClick={() => {
                                                        const newRimozioni = isRemoved 
                                                            ? tempVarianti.rimozioni.filter(i => i !== ing) 
                                                            : [...tempVarianti.rimozioni, ing]; 
                                                        setTempVarianti({...tempVarianti, rimozioni: newRimozioni});
                                                    }}
                                                    style={{
                                                        padding:'8px 12px', borderRadius:'20px', fontSize:'0.9rem', cursor:'pointer',
                                                        background: isRemoved ? '#ffebee' : '#e8f5e9',
                                                        color: isRemoved ? '#c62828' : '#2e7d32',
                                                        border: isRemoved ? '1px solid #ef9a9a' : '1px solid #a5d6a7',
                                                        textDecoration: isRemoved ? 'line-through' : 'none'
                                                    }}
                                                >
                                                    {isRemoved ? `No ${ing}` : ing}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* AGGIUNTE */}
                            {addList.length > 0 && (
                                <div>
                                    <h4 style={{margin:'0 0 10px 0', color:'#333'}}>Aggiungi Extra 😋</h4>
                                    {addList.map((extra, idx) => {
                                        const isAdded = tempVarianti.aggiunte.some(a => a.nome === extra.nome);
                                        return (
                                            <div key={idx} 
                                                onClick={() => {
                                                    const newAggiunte = isAdded 
                                                        ? tempVarianti.aggiunte.filter(a => a.nome !== extra.nome)
                                                        : [...tempVarianti.aggiunte, extra];
                                                    setTempVarianti({...tempVarianti, aggiunte: newAggiunte});
                                                }}
                                                style={{
                                                    display:'flex', justifyContent:'space-between', alignItems:'center',
                                                    padding:'12px', marginBottom:'8px', borderRadius:'8px', cursor:'pointer',
                                                    background: isAdded ? '#e3f2fd' : '#f9f9f9',
                                                    border: isAdded ? '1px solid #2196f3' : '1px solid #eee'
                                                }}
                                            >
                                                <span style={{fontWeight: isAdded ? 'bold' : 'normal'}}>{isAdded ? '✅' : '⬜'} {extra.nome}</span>
                                                <span style={{fontWeight:'bold'}}>+{extra.prezzo.toFixed(2)}€</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{padding:'20px', background:'#f9f9f9', borderTop:'1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={{fontSize:'1.5rem', fontWeight:'bold', color: '#000'}}>
                            {prezzoFinale.toFixed(2)} €
                        </div>
                        <button 
                            onClick={() => {
                                let note = [];
                                if(tempVarianti.rimozioni.length > 0) note.push("No " + tempVarianti.rimozioni.join(", "));
                                if(tempVarianti.aggiunte.length > 0) note.push("+" + tempVarianti.aggiunte.map(a => a.nome).join(", +"));
                                
                                const nomeFinale = note.length > 0 
                                    ? `${selectedPiatto.nome} (${note.join(' / ')})` 
                                    : selectedPiatto.nome;

                                aggiungiAlCarrello({
                                    ...selectedPiatto,
                                    nome: nomeFinale, 
                                    prezzo: prezzoFinale, 
                                    varianti_scelte: tempVarianti 
                                });
                            }}
                            style={{
                                background: priceColor, color:'white', border:'none', 
                                padding:'15px 30px', borderRadius:'30px', fontSize:'1.1rem', 
                                fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'
                            }}
                        >
                            AGGIUNGI AL CARRELLO
                        </button>
                    </div>

                    <button onClick={() => setSelectedPiatto(null)} style={{position:'absolute', top:'15px', right:'15px', background:'white', color:'black', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>✕</button>
                </div>
                );
            })()}
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

      {/* CHECKOUT */}
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

                  {/* CUCINA */}
                  {(() => {
                      const itemsCucina = carrello.filter(i => !i.categoria_is_bar);
                      const coursePresenti = [...new Set(itemsCucina.map(i => i.course))].sort();
                      const coloriPortata = ['#27ae60', '#f1c40f', '#e67e22', '#c0392b']; 
                      
                      return coursePresenti.map((courseNum, index) => (
                          <div key={courseNum} style={{marginBottom:'25px'}}>
                              <h3 style={{
                                  margin:'0 0 10px 0', color: coloriPortata[index] || '#ccc', 
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
                  
                  {/* BEVANDE */}
                  {carrello.some(i => i.categoria_is_bar) && (
                      <div style={{marginBottom:'20px', padding:'10px', border:'1px dashed #555', borderRadius:'10px'}}>
                           <h3 style={{color: '#3498db', margin:'0 0 10px 0', fontSize:'16px', textTransform:'uppercase'}}>
                               🍹 BEVANDE & BAR (Subito)
                           </h3>
                           {carrello.filter(i => i.categoria_is_bar).map(item => (
                               <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', marginBottom:'5px', borderRadius:'8px'}}>
                                   <div style={{flex:1}}>
                                       <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
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