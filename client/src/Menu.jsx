// client/src/Menu.jsx - VERSIONE V63 (NO TOTALE + DESCRIZIONI NEL RIEPILOGO) 📝
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function Menu() {
  // --- STATI DATI ---
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  const [tavoloStaff, setTavoloStaff] = useState("");
 
  
  // --- STATI LOGICI ---
  const [isSuspended, setIsSuspended] = useState(false);
  const [canOrder, setCanOrder] = useState(true); // Se false -> Modalità Wish List
  
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

  // --- STATI UTENTE (AUTH) ---
const [user, setUser] = useState(null);

// Definiamo isStaffQui con il controllo incrociato dell'ID ristorante
const isStaffQui = user && 
                  (user.ruolo === 'cameriere' || user.ruolo === 'admin' || user.ruolo === 'editor') && 
                  parseInt(user.ristorante_id) === parseInt(ristoranteId);

// Questa riga serve per far funzionare la funzione inviaOrdine senza cambiare tutto il codice interno
const isStaff = isStaffQui;

// Usa isStaffQui per decidere se ignorare il blocco canOrder
const puoOrdinareSempre = isStaffQui;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ nome:'', email:'', password:'', telefono:'', indirizzo:'' });

  // RECUPERO UTENTE SALVATO ALL'AVVIO
  useEffect(() => {
    const savedUser = localStorage.getItem('stark_user');
    if(savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // FUNZIONE LOGIN / REGISTRAZIONE
  const handleAuth = async (e) => {
      e.preventDefault();
      const endpoint = isRegistering ? '/api/register' : '/api/auth/login';
      
      try {
          const res = await fetch(`${API_URL}${endpoint}`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(authData)
          });
          const data = await res.json();
          
          if(data.success) {
              setUser(data.user);
              localStorage.setItem('stark_user', JSON.stringify(data.user));
              setShowAuthModal(false);
              alert(isRegistering ? "Benvenuto! Registrazione completata." : "Bentornato!");
          } else {
              alert("Errore: " + (data.error || "Riprova"));
          }
      } catch(e) { alert("Errore connessione"); }
  };

  // FUNZIONE LOGOUT
  const logout = () => {
      if(confirm("Vuoi uscire?")) {
          setUser(null);
          localStorage.removeItem('stark_user');
      }
  };

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
          
          setCanOrder(data.ordini_abilitati && data.kitchen_active);

          // MODIFICA: Rimuoviamo il blocco che settava setActiveCategory(uniqueCats[0])
          // In questo modo activeCategory rimane null e l'accordion è chiuso.
          setActiveCategory(null); 
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

  // --- 3. GESTIONE CARRELLO (WISH LIST) ---
  const aggiungiAlCarrello = (piatto) => {
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
            let newCourse = (item.course || 1) + delta;
            // Permette il range completo da 1 a 4
            if (newCourse < 1) newCourse = 1;
            if (newCourse > 4) newCourse = 4;
            return { ...item, course: newCourse };
        }
        return item;
      }));
  };

// --- INCOLLA QUESTO IN MENU.JSX AL POSTO DI inviaOrdine ---
  const inviaOrdine = async () => {
      if(carrello.length === 0) return;

      // --- LOG DI CONTROLLO (Premi F12 nel browser per vederlo) ---
      console.log("Stato Utente al momento dell'ordine:", user);
      
      // Controllo robusto dell'ID
      let finalUserId = null;
      if (user && user.id) {
          finalUserId = user.id;
      } else if (user && user.user && user.user.id) {
          // A volte capita che l'oggetto sia annidato (es: {user: {id: 1, ...}})
          finalUserId = user.user.id;
      }
      
      // --- MODIFICA STAFF: Lo staff ignora il blocco canOrder ---
      if(!canOrder && !isStaff) {
          alert("La cucina è chiusa per gli ordini online.");
          return;
      }

      // --- MODIFICA STAFF: Gestione numero tavolo dinamico ---
      let tavoloFinale = numeroTavolo; // Prende quello dell'URL/QR di default
      if (isStaff) {
          const t = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavolo);
          if (!t) return; // Annulla l'invio se il cameriere preme annulla
          tavoloFinale = t;
          setTavoloStaff(t); // Lo salva per l'ordine successivo (comodità)
      }

      if(!confirm(`Confermi l'ordine per il tavolo ${tavoloFinale}?`)) return;

      // 1. Logica normalizzazione corsi (quella che avevi tu)
      const stepPresenti = [...new Set(carrello.filter(c => !c.categoria_is_bar).map(c => c.course))].sort((a,b)=>a-b);
      const mapNuoviCorsi = {};
      stepPresenti.forEach((vecchioCorso, index) => {
          mapNuoviCorsi[vecchioCorso] = index + 1;
      });

      const prodottiNormalizzati = carrello.map(p => {
          let courseFinale = p.course;
          if (!p.categoria_is_bar) {
              courseFinale = mapNuoviCorsi[p.course] || 1; 
          }
          return {
              id: p.id, nome: p.nome, prezzo: p.prezzo,
              course: courseFinale,
              is_bar: p.categoria_is_bar,
              is_pizzeria: p.categoria_is_pizzeria,
              stato: 'in_attesa',
              varianti_scelte: p.varianti_scelte
          };
      });

      // 2. Creazione Payload con campo 'cameriere'
      const payload = {
          ristorante_id: ristoranteId, 
          tavolo: tavoloFinale, 
          utente_id: finalUserId, // <--- USA QUESTA VARIABILE SICURA
          cliente: user ? user.nome : "Ospite",
          cameriere: isStaff ? user.nome : null, // <--- Qui passiamo il nome del cameriere
          prodotti: prodottiNormalizzati, 
          totale: carrello.reduce((a,b)=>a+Number(b.prezzo),0)
      };

      try {
          const res = await fetch(`${API_URL}/api/ordine`, { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify(payload) 
          });
          
          if(res.ok) {
              alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloFinale})` : "✅ Ordine Inviato!"); 
              setCarrello([]); 
              setShowCheckout(false);
          } else {
              alert("Errore nell'invio dell'ordine.");
          }
      } catch(e) { 
          alert("Errore connessione server."); 
      }
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
      
{/* HEADER LOGO FULL WIDTH + LOGIN */}
      <div style={{width:'100%', background: bg, marginBottom: 10, position:'relative'}}>
          
          {/* TASTO LOGIN/PROFILO (IN ALTO A DESTRA) */}
          <div style={{position:'absolute', top:10, right:10, zIndex:100}}>
              {user ? (
                  <div onClick={logout} style={{background: priceColor, padding:'5px 10px', borderRadius:'20px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 5px rgba(0,0,0,0.3)'}}>
                      <span style={{fontSize:'12px', fontWeight:'bold', color:'white'}}>👤 {user.nome}</span>
                  </div>
              ) : (
                  <button onClick={() => setShowAuthModal(true)} style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.3)'}}>
                      Accedi / Registrati
                  </button>
              )}
          </div>

          <div style={{maxWidth: '600px', margin: '0 auto', width: '100%'}}>
              {style.logo ? (
                 <img src={style.logo} alt="Logo" style={{width:'100%', display:'block', objectFit:'cover'}} />
              ) : (
                 <div style={{padding:20, textAlign:'center'}}><h1 style={{margin:0, color: titleColor}}>{ristorante}</h1></div>
              )}
              
              <div style={{padding:'10px', textAlign:'center', borderBottom:`1px solid ${priceColor}`}}>
                  <span style={{color: text, fontSize:'1.1rem'}}>
                      Tavolo: <strong style={{
    background: style?.colore_tavolo_bg || style?.price || '#27ae60', // NUOVO
    color: style?.colore_tavolo_text || 'white', // NUOVO
    padding:'2px 8px', borderRadius:'5px'
}}>
    {numeroTavolo}
</strong>
                  </span>
              </div>
          </div>
      </div>
      {/* --- FINE DEL BLOCCO INCOLLATO --- */}

      {/* LISTA MENU A FISARMONICA */}
      <div style={{paddingBottom: '80px', marginTop: '10px', width: '100%', maxWidth: '600px', margin: '0 auto'}}> 
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
                                            const variantiObj = typeof prodotto.varianti === 'string' ? JSON.parse(prodotto.varianti || '{}') : (prodotto.varianti || {});
                                            const varPiatto = variantiObj.aggiunte || [];
                                            const varCategoria = prodotto.categoria_varianti || [];
                                            const activeVarianti = varPiatto.length > 0 ? varPiatto : varCategoria;
                                            const ingredientiStr = (variantiObj.base || []).join(', ');
                                            const hasVarianti = (variantiObj.base && variantiObj.base.length > 0) || (activeVarianti.length > 0);
                                                return (
<div key={prodotto.id} className="card"
    onClick={() => prodotto.immagine_url ? apriModale(prodotto) : null}
    style={{
        background: style?.colore_card || 'white', 
        border: `1px solid ${style?.colore_border || '#eee'}`,
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: prodotto.immagine_url ? 'pointer' : 'default'
    }}>
    
    {/* Immagine se c'è */}
    {prodotto.immagine_url && (
        <img src={prodotto.immagine_url} style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'8px', marginRight:'15px'}} alt={prodotto.nome} />
    )}

    <div style={{flex:1}}>
        <div style={{
            fontSize: '1.1rem', fontWeight: 'bold', 
            color: style?.colore_titolo || '#333', 
            fontFamily: style?.font_style
        }}>
            {prodotto.nome}
        </div>
        <div style={{
            fontSize: '0.9rem', color: style?.colore_testo || '#666', 
            marginTop: '4px', fontFamily: style?.font_style, lineHeight: '1.2'
        }}>
            {prodotto.descrizione}
        </div>
        
        {/* Ingredienti (se presenti) */}
        {ingredientiStr && (
            <p style={{fontSize:'11px', color: style?.colore_testo || '#555', fontStyle:'italic', margin:'4px 0 0 0', opacity:0.8}}>
                <span style={{fontWeight:'bold'}}>Ingr:</span> {ingredientiStr}
            </p>
        )}

        <div style={{
            marginTop: '8px', fontWeight: 'bold', fontSize: '1.1rem',
            color: style?.colore_prezzo || '#e67e22'
        }}>
            € {Number(prodotto.prezzo).toFixed(2)}
        </div>
    </div>
    
    {/* TASTI AZIONE */}
    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
        {hasVarianti && (
             <button 
                onClick={(e) => { e.stopPropagation(); apriModale(prodotto); }}
                style={{
                    background:'transparent', 
                    border:`1px solid ${style?.colore_border || '#ccc'}`, 
                    color: style?.colore_testo || '#555',
                    borderRadius:'5px', padding:'5px 8px', fontSize:'12px', cursor:'pointer', fontWeight:'bold'
                }}
            >
                Modifica
            </button>
        )}
    
        <button 
            onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }}
            style={{
                background: style?.colore_btn || '#27ae60',
                color: style?.colore_btn_text || 'white',
                border: 'none',
                borderRadius: '50%', width: '40px', height: '40px',
                fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                cursor: 'pointer'
            }}
        >
            +
        </button>
    </div>
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

{/* --- MODALE LOGIN / REGISTRAZIONE --- */}
      {showAuthModal && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
              <div style={{background:'white', width:'100%', maxWidth:'400px', borderRadius:10, padding:30, position:'relative'}}>
                  <h2 style={{color:'#333', textAlign:'center', marginTop:0}}>{isRegistering ? "Registrati 📝" : "Accedi 🔐"}</h2>
                  
                  <form onSubmit={handleAuth} style={{display:'flex', flexDirection:'column', gap:15}}>
                      {isRegistering && (
                          <input type="text" placeholder="Nome e Cognome" required value={authData.nome} onChange={e=>setAuthData({...authData, nome:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                      )}
                      <input type="email" placeholder="Email" required value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                      <input type="password" placeholder="Password" required value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                      
                      {isRegistering && (
                          <>
                            <input type="tel" placeholder="Telefono" required value={authData.telefono} onChange={e=>setAuthData({...authData, telefono:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                            <input type="text" placeholder="Indirizzo (Opzionale)" value={authData.indirizzo} onChange={e=>setAuthData({...authData, indirizzo:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                          </>
                      )}

                      <button style={{background: priceColor, color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>
                          {isRegistering ? "CREA ACCOUNT" : "ENTRA"}
                      </button>
                  </form>

                  <p style={{textAlign:'center', marginTop:20, color:'#666', fontSize:'14px'}}>
                      {isRegistering ? "Hai già un account?" : "Non hai un account?"} 
                      <span onClick={() => setIsRegistering(!isRegistering)} style={{color:'#3498db', fontWeight:'bold', cursor:'pointer', marginLeft:5}}>
                          {isRegistering ? "Accedi" : "Registrati"}
                      </span>
                  </p>

                  <button onClick={()=>setShowAuthModal(false)} style={{position:'absolute', top:10, right:10, background:'transparent', border:'none', fontSize:24, cursor:'pointer', color:'#333'}}>✕</button>
              </div>
          </div>
      )}

      {/* --- MODALE CONFIGURATORE PRODOTTO --- */}
      {selectedPiatto && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding:'10px'
        }} onClick={() => setSelectedPiatto(null)}>
            
            {(() => {
// --- DENTRO IL MODALE ---
const variantiData = typeof selectedPiatto.varianti === 'string' ? JSON.parse(selectedPiatto.varianti || '{}') : (selectedPiatto.varianti || {});
const baseList = variantiData.base || [];

// Recupera le due liste
const addListPiatto = variantiData.aggiunte || [];
const addListCategoria = selectedPiatto.categoria_varianti || [];

// APPLICA LA PRECEDENZA ANCHE QUI
// Se il piatto ha varianti specifiche, mostra SOLO quelle.
const addList = addListPiatto.length > 0 ? addListPiatto : addListCategoria;
                
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

                    {/* FOOTER AZIONE */}
                    <div style={{padding:'20px', background:'#f9f9f9', borderTop:'1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div style={{fontSize:'1.5rem', fontWeight:'bold', color: '#000'}}>
                            {prezzoFinale.toFixed(2)} €
                        </div>
                        <button 
    onClick={() => {
        // --- MODIFICA: NON MODIFICHIAMO PIÙ IL NOME ---
        // Prima creavamo 'nomeFinale', ora usiamo direttamente selectedPiatto.nome
        
        aggiungiAlCarrello({
            ...selectedPiatto,
            nome: selectedPiatto.nome, // NESSUNA AGGIUNTA DI TESTO QUI
            prezzo: prezzoFinale, 
            varianti_scelte: tempVarianti 
        });
    }}
    style={{ /* ...stili esistenti... */ }}
>
    {canOrder ? "AGGIUNGI" : "LISTA"}
</button>
                    </div>

                    <button onClick={() => setSelectedPiatto(null)} style={{position:'absolute', top:'15px', right:'15px', background:'white', color:'black', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>✕</button>
                </div>
                );
            })()}
        </div>
      )}

      {/* BARRA CARRELLO */}
      {carrello.length > 0 && !showCheckout && (
       <div className="carrello-bar" style={{
    background: style?.colore_carrello_bg || '#222', // NUOVO
    borderTop: `2px solid ${style?.colore_prezzo || '#ff9f43'}`,
    color: style?.colore_carrello_text || 'white' // NUOVO
}}>
    <div className="totale" style={{color: style?.colore_carrello_text || 'white'}}>
        <span>{carrello.length} prodotti</span>
    </div>
          <button onClick={() => setShowCheckout(true)} className="btn-invia" style={{background: canOrder ? '#f1c40f' : '#3498db', color: canOrder ? 'black' : 'white'}}>
              {canOrder ? "VEDI ORDINE 📝" : "VEDI LA TUA LISTA 👀"}
          </button>
        </div>
      )}

      {/* CHECKOUT */}
      {showCheckout && (
    <div style={{
        position:'fixed', top:0, left:0, right:0, bottom:0, 
        background: style?.colore_checkout_bg || style?.bg || '#222', // NUOVO
        color: style?.colore_checkout_text || style?.text || 'white', // NUOVO
        zIndex:2000, 
        display:'flex', flexDirection:'column', padding:'20px', overflowY:'auto'
    }}>
              
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:`1px solid ${style?.text||'#ccc'}`, paddingBottom:'10px'}}>
                  <h2 style={{color: titleColor, margin:0}}>{canOrder ? "Riepilogo Ordine 📝" : "Lista per Cameriere 📝"}</h2>
                  <button onClick={() => setShowCheckout(false)} style={{background:'transparent', border:'none', color: titleColor, fontSize:'24px', cursor:'pointer'}}>✕</button>
              </div>

              <div style={{flex:1, overflowY:'auto', maxWidth:'600px', margin:'0 auto', width:'100%'}}>
                  {carrello.length === 0 && <p style={{color: style?.text || '#fff', textAlign:'center'}}>Il carrello è vuoto.</p>}

                  {/* LISTA PIATTI (CUCINA) */}
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
                              </h3>

                              {itemsCucina.filter(i => i.course === courseNum).map(item => {
                                  // PARSING INGREDIENTI BASE (PER IL RIEPILOGO)
                                  const variantiObj = typeof item.varianti === 'string' ? JSON.parse(item.varianti || '{}') : (item.varianti || {});
                                  const ingredientiStr = (variantiObj.base || []).join(', ');

                                  return (
<div key={item.tempId} style={{background:'rgba(255,255,255,0.1)', borderRadius:10, padding:15, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
    <div style={{flex: 1}}>
        <div style={{fontWeight:'bold', fontSize:'1.1rem', color: titleColor}}>{item.nome}</div>
        
        {/* 1. DESCRIZIONE DEL PIATTO */}
        {item.descrizione && (
            <div style={{fontSize:'12px', color:'#ccc', fontStyle:'italic', marginTop:'4px', lineHeight:'1.2'}}>
                {item.descrizione}
            </div>
        )}

        {/* 2. INGREDIENTI BASE (RECUPERATI DAL JSON) */}
        {(() => {
            const v = typeof item.varianti === 'string' ? JSON.parse(item.varianti || '{}') : (item.varianti || {});
            if (v.base && v.base.length > 0) {
                return (
                    <div style={{fontSize:'11px', color:'#999', marginTop:'4px'}}>
                        🧂 Ingredienti: {v.base.join(', ')}
                    </div>
                );
            }
        })()}

        {/* 3. MODIFICHE SPECIFICHE (RIMOZIONI E AGGIUNTE) */}
        {item.varianti_scelte && (
            <div style={{marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'5px'}}>
                {item.varianti_scelte.rimozioni?.map((ing, i) => (
                    <span key={i} style={{background:'#c0392b', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>
                        NO {ing}
                    </span>
                ))}
                {item.varianti_scelte.aggiunte?.map((ing, i) => (
                    <span key={i} style={{background:'#27ae60', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>
                        + {ing.nome}
                    </span>
                ))}
            </div>
        )}

        <div style={{color: priceColor, fontSize:'0.9rem', marginTop: '8px', fontWeight: 'bold'}}>
            {Number(item.prezzo).toFixed(2)} € • {item.categoria_is_pizzeria ? '🍕 Pizza' : '🍳 Cucina'}
        </div>
    </div>

    {/* Bottoni laterali per cambio uscita e rimozione rimangono invariati */}
    <div style={{display:'flex', flexDirection:'column', gap:5, marginLeft: '10px'}}>
        <div style={{display:'flex', gap:5}}>
            <button onClick={() => cambiaUscita(item.tempId, -1)} style={{background:'#ecf0f1', color:'#333', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px'}}>⬆️</button>
            <button onClick={() => cambiaUscita(item.tempId, 1)} style={{background:'#ecf0f1', color:'#333', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px'}}>⬇️</button>
        </div>
        <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', fontSize:'0.8rem', padding:'5px 10px', borderRadius:'4px', border:'none'}}>ELIMINA</button>
    </div>
</div>
                                  )
                              })}
                          </div>
                      ));
                  })()}
                  
                  {/* LISTA BEVANDE */}
                  {carrello.some(i => i.categoria_is_bar) && (
                      <div style={{marginBottom:'20px', padding:'10px', border:'1px dashed #555', borderRadius:'10px'}}>
                           <h3 style={{color: '#3498db', margin:'0 0 10px 0', fontSize:'16px', textTransform:'uppercase'}}>
                               🍹 BEVANDE & BAR (Subito)
                           </h3>
                           {carrello.filter(i => i.categoria_is_bar).map(item => (
                               <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', marginBottom:'5px', borderRadius:'8px'}}>
                                   <div style={{flex:1}}>
                                       <div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div>
                                       
                                       {/* PREZZO BEVANDA SEMPRE VISIBILE */}
                                       <div style={{color: '#888', fontSize:'12px'}}>{Number(item.prezzo).toFixed(2)} €</div>
                                   </div>
                                   <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>✕</button>
                               </div>
                           ))}
                      </div>
                  )}

                  <div style={{marginTop:'20px', borderTop:`1px solid ${style?.text||'#ccc'}`, paddingTop:'20px'}}>
                      
                      {/* --- TOTALE RIMOSSO DEFINITIVAMENTE --- */}
                      
{/* Mostra il tasto se la cucina è aperta OPPURE se l'utente è dello staff AUTORIZZATO */}
{carrello.length > 0 && (canOrder || isStaffQui) && (
    <button 
        onClick={inviaOrdine} 
        style={{
            width:'100%', padding:'15px', fontSize:'18px', 
            background: '#159709ff', color:'white', 
            border:`1px solid ${style?.text||'#ccc'}`, 
            borderRadius:'30px', fontWeight:'bold', cursor:'pointer'
        }}
    >
        {isStaffQui ? "INVIA ORDINE STAFF 🚀" : "CONFERMA E INVIA 🚀"}
    </button>
)}
                      
                      <button onClick={() => setShowCheckout(false)} style={{width:'100%', padding:'15px', marginTop:'10px', background:'transparent', border:`1px solid ${style?.text||'#ccc'}`, color: style?.text||'#ccc', borderRadius:'30px', cursor:'pointer'}}>Torna al Menu</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default Menu;