// client/src/Menu.jsx - VERSIONE V80 (GOOGLE INVISIBILE)
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { dictionary, getContent } from './translations'; 

function Menu() {
  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  const [tavoloStaff, setTavoloStaff] = useState("");
  
  // --- LINGUA & GOOGLE TRANSLATE ---
  const [lang, setLang] = useState('it'); 
  const t = dictionary[lang]; // Testi statici dal tuo file translations.js

  // Inizializzazione Script Google (Modalità Invisibile)
  useEffect(() => {
    // Definizione globale init
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement({
            pageLanguage: 'it',
            includedLanguages: 'it,en,de,fr,es',
            autoDisplay: false, // IMPORTANTE: Evita il banner automatico
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          }, 'google_translate_element');
      }
    };

    // Iniezione Script se non esiste
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    }
  }, []);

  // Cambio Lingua "Live"
  const cambiaLingua = (selectedLang) => {
      setLang(selectedLang); // Aggiorna i testi statici

      // Hack per pilotare la select nascosta di Google
      const googleCombo = document.querySelector('.goog-te-combo');
      if (googleCombo) {
          googleCombo.value = selectedLang;
          googleCombo.dispatchEvent(new Event('change'));
      }
  };

  // --- STATI FILE & CARRELLO ---
  const [urlFileAttivo, setUrlFileAttivo] = useState("");
  const [titoloFile, setTitoloFile] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [canOrder, setCanOrder] = useState(true);
  const [carrello, setCarrello] = useState([]); 
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);       
  const [activeSubCategory, setActiveSubCategory] = useState(null); 
  const [selectedPiatto, setSelectedPiatto] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tempVarianti, setTempVarianti] = useState({ rimozioni: [], aggiunte: [] });
  
  const { slug } = useParams();
  const currentSlug = slug || 'pizzeria-stark';
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get('tavolo') || 'Banco';
  const API_URL = "https://stark-backend-gg17.onrender.com";

  const [user, setUser] = useState(null);
  const isStaffQui = user && (user.ruolo === 'cameriere' || user.ruolo === 'admin' || user.ruolo === 'editor') && parseInt(user.ristorante_id) === parseInt(ristoranteId);
  const isStaff = isStaffQui;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ nome:'', email:'', password:'', telefono:'', indirizzo:'' });

  useEffect(() => {
    const savedUser = localStorage.getItem('stark_user');
    if(savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleAuth = async (e) => {
      e.preventDefault();
      const endpoint = isRegistering ? '/api/register' : '/api/auth/login';
      try {
          const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(authData) });
          const data = await res.json();
          if(data.success) {
              setUser(data.user);
              localStorage.setItem('stark_user', JSON.stringify(data.user));
              setShowAuthModal(false);
          } else { alert("Errore: " + (data.error || "Riprova")); }
      } catch(e) { alert("Errore connessione"); }
  };

  const logout = () => { if(confirm("Vuoi uscire?")) { setUser(null); localStorage.removeItem('stark_user'); } };

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then(res => { if(!res.ok) throw new Error("Errore caricamento"); return res.json(); })
      .then(data => {
          setRistoranteId(data.id); setRistorante(data.ristorante); setMenu(data.menu || []); setStyle(data.style || {});
          if(data.subscription_active === false) setIsSuspended(true);
          setCanOrder(data.ordini_abilitati && data.kitchen_active);
          setActiveCategory(null); 
      })
      .catch(err => { console.error("Errore Menu:", err); setError(true); });
  }, [currentSlug]);

  const apriModale = (piatto) => { setSelectedPiatto(piatto); setTempVarianti({ rimozioni: [], aggiunte: [] }); };
  
  const getDefaultCourse = (piatto) => {
      if (piatto.categoria_is_bar) return 0; 
      const nome = (piatto.nome + " " + (piatto.categoria_nome || piatto.categoria)).toLowerCase();
      if (nome.includes('antipast') || nome.includes('fritt') || nome.includes('stuzzich') || nome.includes('bruschet') || nome.includes('tapas')) return 1; 
      if (nome.includes('prim') || nome.includes('pasta') || nome.includes('risott') || nome.includes('zupp')) return 2; 
      if (nome.includes('second') || nome.includes('carn') || nome.includes('pesc') || nome.includes('grigli') || nome.includes('pizz')) return 3; 
      if (nome.includes('dolc') || nome.includes('dessert') || nome.includes('tiramis') || nome.includes('caff')) return 4; 
      return 3; 
  };

  const aggiungiAlCarrello = (piatto) => {
      const tempId = Date.now() + Math.random();
      const item = { ...piatto, tempId, course: getDefaultCourse(piatto) };
      setCarrello([...carrello, item]);
      setSelectedPiatto(null);
      if(navigator.vibrate) navigator.vibrate(50);
  };

  const rimuoviDalCarrello = (tempId) => { setCarrello(carrello.filter(i => i.tempId !== tempId)); };
  
  const cambiaUscita = (tempId, delta) => {
    setCarrello(carrello.map(item => {
        if (item.tempId === tempId) {
            let newCourse = (item.course || 1) + delta;
            if (newCourse < 1) newCourse = 1; if (newCourse > 4) newCourse = 4;
            return { ...item, course: newCourse };
        } return item;
      }));
  };

  const inviaOrdine = async () => {
      if(carrello.length === 0) return;
      let finalUserId = user?.id || user?.user?.id || null;
      if(!canOrder && !isStaff) { alert("La cucina è chiusa per gli ordini online."); return; }
      
      let tavoloFinale = numeroTavolo; 
      if (isStaff) {
          const t = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavolo);
          if (!t) return;
          tavoloFinale = t;
          setTavoloStaff(t); 
      }
      if(!confirm(`${t.confirm}?`)) return;

      const stepPresenti = [...new Set(carrello.filter(c => !c.categoria_is_bar).map(c => c.course))].sort((a,b)=>a-b);
      const mapNuoviCorsi = {};
      stepPresenti.forEach((vecchioCorso, index) => { mapNuoviCorsi[vecchioCorso] = index + 1; });

      const prodottiNormalizzati = carrello.map(p => ({
          id: p.id, nome: p.nome, prezzo: p.prezzo, 
          course: !p.categoria_is_bar ? (mapNuoviCorsi[p.course] || 1) : p.course,
          is_bar: p.categoria_is_bar, is_pizzeria: p.categoria_is_pizzeria,
          stato: 'in_attesa', varianti_scelte: p.varianti_scelte
      }));

      const payload = {
          ristorante_id: ristoranteId, tavolo: tavoloFinale, utente_id: finalUserId,
          cliente: user ? user.nome : "Ospite", cameriere: isStaff ? user.nome : null,
          prodotti: prodottiNormalizzati, totale: carrello.reduce((a,b)=>a+Number(b.prezzo),0)
      };

      try {
          const res = await fetch(`${API_URL}/api/ordine`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
          if(res.ok) { alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloFinale})` : "✅ Ordine Inviato!"); setCarrello([]); setShowCheckout(false); } 
          else { alert("Errore nell'invio dell'ordine."); }
      } catch(e) { alert("Errore connessione server."); }
  };

  const bg = style.bg || '#222'; const text = style.text || '#fff'; const titleColor = style.title || '#fff';
  const priceColor = style.price || '#27ae60'; const font = style.font || 'sans-serif';
  const cardBg = style.card_bg || 'white'; const cardBorder = style.card_border || '#eee';
  const btnBg = style.btn_bg || '#27ae60'; const btnText = style.btn_text || 'white';
  const tavoloBg = style.tavolo_bg || priceColor; const tavoloText = style.tavolo_text || 'white';
  const modalBg = style.colore_modal_bg || cardBg; const modalText = style.colore_modal_text || '#000';
  const footerBtnStyle = { background: 'transparent', border: `1px solid ${style.colore_footer_text || '#888'}`, color: style.colore_footer_text || '#888', boxSizing: 'border-box', width: '100%', maxWidth: '280px', padding: '12px 15px', borderRadius:'30px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '0 auto' };
  
  const categorieUniche = [...new Set(menu.map(p => p.categoria_nome || p.categoria))];
  const toggleAccordion = (catNome) => { if (activeCategory === catNome) { setActiveCategory(null); setActiveSubCategory(null); } else { setActiveCategory(catNome); setActiveSubCategory(null); }};
  const toggleSubAccordion = (subName) => setActiveSubCategory(activeSubCategory === subName ? null : subName);

  if(isSuspended) return <div style={{padding:50, textAlign:'center', color:'red', background: bg, minHeight:'100vh'}}><h1>⛔ SERVIZIO SOSPESO</h1></div>;
  if(error) return <div style={{padding:50, textAlign:'center', color: text, background: bg, minHeight:'100vh'}}><h1>⚠️ Errore Caricamento</h1></div>;

  return (
    <div style={{minHeight:'100vh', background: bg, color: text, fontFamily: font, paddingBottom:80}}>
        {/* CSS INLINE DI SICUREZZA + QUELLO GLOBALE */}
        <style>{`:root { color-scheme: light; } * { box-sizing: border-box; margin: 0; padding: 0; } body, html { background-color: ${bg} !important; color: ${text} !important; overflow-x: hidden; width: 100%; top: 0 !important; }`}</style>
      
      {/* WIDGET GOOGLE NASCOSTO */}
<div id="google_translate_element"></div>
      {!showCheckout && (
      <div style={{ width: '100%', minHeight: '260px', backgroundImage: style.cover ? `url(${style.cover})` : 'none', backgroundColor: '#333', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '30px 20px', overflow: 'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.1))', zIndex: 1 }}></div>
          <div className="notranslate" style={{position:'absolute', top:'20px', right:'20px', zIndex: 100}}>
              {user ? ( <div onClick={logout} style={{ background: 'rgba(255,255,255,0.9)', padding:'6px 12px', borderRadius:'20px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 5px rgba(0,0,0,0.3)', fontSize:'12px', fontWeight:'bold', color:'#333' }}>👤 {user.nome.split(' ')[0]}</div>
              ) : ( <button onClick={() => setShowAuthModal(true)} style={{ background: priceColor, color:'white', border:'none', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.3)', fontSize:'12px' }}>Accedi</button> )}
          </div>
          <div style={{position:'relative', zIndex: 2, display:'flex', flexDirection:'column', alignItems:'center', gap:'15px', width:'100%'}}>
              {style.logo ? ( <div style={{ width: '110px', height: '110px', background: 'white', padding: '5px', borderRadius: '50%', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems:'center', justifyContent:'center', overflow: 'hidden' }}><img src={style.logo} style={{ width:'100%', height:'100%', objectFit:'contain' }} /></div> ) : ( <div style={{fontSize:'40px', background:'white', padding:10, borderRadius:'50%'}}>🍽️</div> )}
              {!style.logo && ( <h1 style={{ margin: 0, color: '#fff', fontSize:'26px', fontWeight:'800', textShadow: '0 2px 4px rgba(0,0,0,0.8)', textAlign: 'center', lineHeight: '1.2' }}>{ristorante}</h1> )}
              <div className="notranslate" style={{ background: tavoloBg, color: tavoloText, padding: '6px 18px', borderRadius: '50px', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 3px 10px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.3)' }}>📍 Tavolo {numeroTavolo}</div>
              
              {/* --- BANDIERINE DI COMANDO --- */}
              <div className="notranslate" style={{display:'flex', gap:'10px', justifyContent:'center', marginTop:'10px'}}>
                <button onClick={()=>cambiaLingua('it')} style={{opacity: lang==='it'?1:0.5, border:'none', background:'none', fontSize:'24px', cursor:'pointer', padding:0}}>🇮🇹</button>
                <button onClick={()=>cambiaLingua('en')} style={{opacity: lang==='en'?1:0.5, border:'none', background:'none', fontSize:'24px', cursor:'pointer', padding:0}}>🇬🇧</button>
                <button onClick={()=>cambiaLingua('de')} style={{opacity: lang==='de'?1:0.5, border:'none', background:'none', fontSize:'24px', cursor:'pointer', padding:0}}>🇩🇪</button>
            </div>
          </div>
      </div>
      )}

      {/* --- MENU --- */}
<div style={{ paddingBottom: '10px', marginTop: '10px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
  {categorieUniche.map(catNome => (
    <div key={catNome} className="accordion-item" style={{ marginBottom: '2px', borderRadius: '5px', overflow: 'hidden', width: '100%' }}>
      <div onClick={() => toggleAccordion(catNome)} style={{ background: activeCategory === catNome ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)', color: titleColor, padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: activeCategory === catNome ? `1px solid ${priceColor}` : 'none' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: titleColor, width: '100%' }}>{catNome}</h2>
        <span style={{ color: titleColor }}>{activeCategory === catNome ? '▼' : '▶'}</span>
      </div>

      {activeCategory === catNome && (
        <div className="accordion-content" style={{ padding: '0', background: 'rgba(0,0,0,0.2)', width: '100%' }}>
          {(() => {
            const piattiCat = menu.filter(p => (p.categoria_nome || p.categoria) === catNome);
            const sottoCats = piattiCat.reduce((acc, p) => {
              const sc = (p.sottocategoria && p.sottocategoria.trim().length > 0) ? p.sottocategoria : "Generale";
              if (!acc[sc]) acc[sc] = [];
              acc[sc].push(p); return acc;
            }, {});
            const subKeys = Object.keys(sottoCats).sort();
            const isSingleGroup = subKeys.length === 1 && subKeys[0] === "Generale";

            return subKeys.map(scKey => (
              <div key={scKey} style={{ width: '100%' }}>
                {!isSingleGroup && (
                  <div onClick={() => toggleSubAccordion(scKey)} style={{ background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${priceColor}`, padding: '10px', margin: '1px 0', width: '100%', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="notranslate" style={{ margin: 0, fontSize: '16px', color: titleColor, textTransform: 'uppercase' }}>{scKey === "Generale" ? t.others : scKey}</h3>
                    <span style={{ color: titleColor, fontWeight: 'bold' }}>{activeSubCategory === scKey ? '▼' : '▶'}</span>
                  </div>
                )}
                {(isSingleGroup || activeSubCategory === scKey) && (
                  <div className="menu-list" style={{ padding: '0', width: '100%' }}>
                    {sottoCats[scKey].map((prodotto) => {
                      const v = typeof prodotto.varianti === 'string' ? JSON.parse(prodotto.varianti || '{}') : (prodotto.varianti || {});
                      const ingStr = (v.base || []).join(', ');
                      const hasVar = (v.base?.length > 0) || (v.aggiunte?.length > 0) || (prodotto.categoria_varianti?.length > 0);

                      return (
                        <div key={prodotto.id} className="card" onClick={() => prodotto.immagine_url ? apriModale(prodotto) : null} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', padding: '10px', width: '100%', boxSizing: 'border-box', cursor: prodotto.immagine_url ? 'pointer' : 'default', backgroundColor: cardBg, borderBottom: `1px solid ${cardBorder}` }}>
                          {prodotto.immagine_url && <img src={prodotto.immagine_url} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />}
                          <div className="info" style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', color: style.text || '#222', lineHeight: '1.2' }}>{prodotto.nome}</h3>
                            {prodotto.descrizione && (<p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px 0', lineHeight: '1.1' }}>{prodotto.descrizione}</p>)}
                            {ingStr && (<p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', margin: '0 0 2px 0', lineHeight: '1.1' }}><span className="notranslate" style={{ fontWeight: 'bold' }}>{t.ingredients}:</span> {ingStr}</p>)}
                            {prodotto.allergeni && prodotto.allergeni.length > 0 && (
                              <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                {prodotto.allergeni.filter(a => !a.includes("❄️")).length > 0 && ( <div className="notranslate" style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase' }}>⚠️ {t.allergens}: {prodotto.allergeni.filter(a => !a.includes("❄️")).join(', ')}</div> )}
                                {prodotto.allergeni.some(a => a.includes("❄️")) && ( <div className="notranslate" style={{ fontSize: '10px', color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase' }}>❄️ {t.frozen}</div> )}
                              </div>
                            )}
                            <div className="notranslate" style={{ fontSize: '14px', fontWeight: 'bold', color: priceColor, marginTop: '2px' }}>{Number(prodotto.prezzo).toFixed(2)} €</div>
                          </div>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            {hasVar && ( <button className="notranslate" onClick={(e) => { e.stopPropagation(); apriModale(prodotto); }} style={{ background: 'transparent', border: '1px solid #ccc', color: '#555', borderRadius: '5px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>{t.modify}✏️</button> )}
                            <button className="notranslate" onClick={(e) => { e.stopPropagation(); aggiungiAlCarrello(prodotto); }} style={{ background: btnBg, color: btnText, borderRadius: '50%', width: '35px', height: '35px', border: 'none', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
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

      {/* --- FOOTER & TASTI FILE (NOTRANSLATE) --- */}
      <div className="notranslate" style={{ textAlign: style.allineamento_footer || 'center', padding: '20px 20px 60px 20px', opacity: 0.9 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
            {style.url_menu_giorno && ( <button onClick={() => { setUrlFileAttivo(style.url_menu_giorno); setTitoloFile("Menù del Giorno 🥗"); setShowFileModal(true); }} style={footerBtnStyle}><span>🥗</span> MENÙ DEL GIORNO</button> )}
            {style.url_menu_pdf && ( <button onClick={() => { setUrlFileAttivo(style.url_menu_pdf); setTitoloFile("Menù Completo 📄"); setShowFileModal(true); }} style={footerBtnStyle}><span>📄</span> MENÙ PDF</button> )}
            {style.url_allergeni && ( <button onClick={() => { setUrlFileAttivo(style.url_allergeni); setTitoloFile("Lista Allergeni ⚠️"); setShowFileModal(true); }} style={{ ...footerBtnStyle, opacity: 0.8 }}><span>⚠️</span> LISTA ALLERGENI</button> )}
        </div>
        {style.info_footer && ( <p style={{ whiteSpace: 'pre-line', marginBottom: '15px', color: style.colore_footer_text || style.text, fontSize: `${style.dimensione_footer || 12}px` }}>{style.info_footer}</p> )}
        <div style={{ marginTop: 15, fontSize: 10, color: style.colore_footer_text || style.text, opacity: 0.5 }}>Powered by StarkMenu</div>
      </div>

      {/* --- MODALE FILE --- */}
      {showFileModal && urlFileAttivo && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.95)', zIndex: 5000, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px' }} onClick={() => setShowFileModal(false)}>
            <div style={{ background: modalBg, color: modalText, width:'100%', maxWidth:'800px', maxHeight:'90vh', borderRadius:'15px', position:'relative', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding:'15px', borderBottom:'1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center', background: 'rgba(0,0,0,0.03)' }}>
                    <h3 style={{margin:0, fontSize:'18px', fontWeight:'bold'}}>{titoloFile}</h3>
                    <button onClick={() => setShowFileModal(false)} style={{background:'transparent', border:'none', fontSize:'24px', cursor:'pointer', color: modalText}}>✕</button>
                </div>
                <div style={{flex:1, overflowY:'auto', background:'#f9f9f9', display:'flex', justifyContent:'center', padding:'10px'}}>
                    {urlFileAttivo.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? ( <img src={urlFileAttivo} style={{maxWidth:'100%', height:'auto', objectFit:'contain', alignSelf:'flex-start'}} /> ) : ( <iframe src={urlFileAttivo} style={{width:'100%', height:'100%', minHeight:'500px', border:'none'}} title="Documento" /> )}
                </div>
            </div>
        </div>
      )}
      
       {showAuthModal && (
          <div className="notranslate" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
              <div style={{background:'white', width:'100%', maxWidth:'400px', borderRadius:10, padding:30, position:'relative'}}>
                  <h2 style={{color:'#333', textAlign:'center', marginTop:0}}>{isRegistering ? "Registrati 📝" : "Accedi 🔐"}</h2>
                  <form onSubmit={handleAuth} style={{display:'flex', flexDirection:'column', gap:15}}>
                      {isRegistering && ( <input type="text" placeholder="Nome" required value={authData.nome} onChange={e=>setAuthData({...authData, nome:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} /> )}
                      <input type="email" placeholder="Email" required value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                      <input type="password" placeholder="Password" required value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} />
                      {isRegistering && ( <> <input type="tel" placeholder="Telefono" required value={authData.telefono} onChange={e=>setAuthData({...authData, telefono:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} /> <input type="text" placeholder="Indirizzo" value={authData.indirizzo} onChange={e=>setAuthData({...authData, indirizzo:e.target.value})} style={{padding:12, borderRadius:5, border:'1px solid #ddd'}} /> </> )}
                      <button style={{background: priceColor, color:'white', padding:15, border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>{isRegistering ? "CREA ACCOUNT" : "ENTRA"}</button>
                  </form>
                  <p style={{textAlign:'center', marginTop:20, color:'#666', fontSize:'14px'}}>{isRegistering ? "Hai già un account?" : "Non hai un account?"} <span onClick={() => setIsRegistering(!isRegistering)} style={{color:'#3498db', fontWeight:'bold', cursor:'pointer', marginLeft:5}}>{isRegistering ? "Accedi" : "Registrati"}</span></p>
                  <button onClick={()=>setShowAuthModal(false)} style={{position:'absolute', top:10, right:10, background:'transparent', border:'none', fontSize:24, cursor:'pointer', color:'#333'}}>✕</button>
              </div>
          </div>
      )}

      {selectedPiatto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding:'10px' }} onClick={() => setSelectedPiatto(null)}>
            {(() => {
                const v = typeof selectedPiatto.varianti === 'string' ? JSON.parse(selectedPiatto.varianti || '{}') : (selectedPiatto.varianti || {});
                const baseList = v.base || [];
                const addList = v.aggiunte?.length > 0 ? v.aggiunte : (selectedPiatto.categoria_varianti || []);
                const extraPrezzo = (tempVarianti?.aggiunte || []).reduce((acc, item) => acc + item.prezzo, 0);
                const prezzoFinale = Number(selectedPiatto.prezzo) + extraPrezzo;
                
                return (
                <div style={{ background: modalBg, color: modalText, borderRadius: '10px', overflow: 'hidden', maxWidth: '600px', width: '100%', maxHeight:'95vh', overflowY:'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position:'relative', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
                    {selectedPiatto.immagine_url && ( <div style={{width:'100%', maxHeight:'250px', overflow:'hidden'}}><img src={selectedPiatto.immagine_url} style={{width:'100%', objectFit:'cover'}} /></div> )}
                    <div style={{padding:'20px'}}>
                        <h2 style={{margin:'0 0 5px 0', fontSize:'1.8rem', color: '#000', fontWeight:'800'}}>{selectedPiatto.nome}</h2>
                        <p style={{color:'#666', fontSize:'1rem', lineHeight:'1.4'}}>{selectedPiatto.descrizione}</p>
                        {selectedPiatto.allergeni && selectedPiatto.allergeni.length > 0 && ( <div className="notranslate" style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}> {selectedPiatto.allergeni.filter(a => !a.includes("❄️")).length > 0 && ( <div style={{ fontSize: '11px', color: '#e74c3c', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>⚠️ {t.allergens}: {selectedPiatto.allergeni.filter(a => !a.includes("❄️")).join(', ')}</div> )} {selectedPiatto.allergeni.some(a => a.includes("❄️")) && ( <div style={{ fontSize: '11px', color: '#3498db', fontWeight: '900', textTransform: 'uppercase' }}>❄️ {t.frozen}</div> )} </div> )}
                        <div style={{marginTop:'20px', borderTop:'1px solid #eee', paddingTop:'15px'}}>
                            {baseList.length > 0 && ( <div style={{marginBottom:'20px'}}><h4 className="notranslate" style={{margin:'0 0 10px 0', color:'#333'}}>{t.ingredients} (Togli)</h4><div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>{baseList.map(ing => { const isRemoved = tempVarianti.rimozioni.includes(ing); return ( <div key={ing} onClick={() => { const newRimozioni = isRemoved ? tempVarianti.rimozioni.filter(i => i !== ing) : [...tempVarianti.rimozioni, ing]; setTempVarianti({...tempVarianti, rimozioni: newRimozioni}); }} style={{ padding:'8px 12px', borderRadius:'20px', fontSize:'0.9rem', cursor:'pointer', background: isRemoved ? '#ffebee' : '#e8f5e9', color: isRemoved ? '#c62828' : '#2e7d32', border: isRemoved ? '1px solid #ef9a9a' : '1px solid #a5d6a7', textDecoration: isRemoved ? 'line-through' : 'none' }}>{isRemoved ? `No ${ing}` : ing}</div> ) })}</div></div> )}
                            {addList.length > 0 && ( <div><h4 className="notranslate" style={{margin:'0 0 10px 0', color:'#333'}}>Extra 😋</h4>{addList.map((extra, idx) => { const isAdded = tempVarianti.aggiunte.some(a => a.nome === extra.nome); return ( <div key={idx} onClick={() => { const newAggiunte = isAdded ? tempVarianti.aggiunte.filter(a => a.nome !== extra.nome) : [...tempVarianti.aggiunte, extra]; setTempVarianti({...tempVarianti, aggiunte: newAggiunte}); }} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', marginBottom:'8px', borderRadius:'8px', cursor:'pointer', background: isAdded ? '#e3f2fd' : '#f9f9f9', border: isAdded ? '1px solid #2196f3' : '1px solid #eee' }}><span style={{fontWeight: isAdded ? 'bold' : 'normal'}}>{isAdded ? '✅' : '⬜'} {extra.nome}</span><span className="notranslate" style={{fontWeight:'bold'}}>+{extra.prezzo.toFixed(2)}€</span></div> ) })}</div> )}
                        </div>
                    </div>
                    <div style={{padding:'20px', background:'#f9f9f9', borderTop:'1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div className="notranslate" style={{fontSize:'1.5rem', fontWeight:'bold', color: '#000'}}>{prezzoFinale.toFixed(2)} €</div>
                        <button className="notranslate" onClick={() => { aggiungiAlCarrello({ ...selectedPiatto, nome: selectedPiatto.nome, prezzo: prezzoFinale, varianti_scelte: tempVarianti }); }} style={{ background: priceColor, color: 'white', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>{canOrder ? t.add : "LISTA"}</button>
                    </div>
                    <button onClick={() => setSelectedPiatto(null)} style={{position:'absolute', top:'15px', right:'15px', background:'white', color:'black', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>✕</button>
                </div>
            ); })()}
        </div>
      )}

      {carrello.length > 0 && !showCheckout && (
        <div className="carrello-bar notranslate" style={{background: style.carrello_bg || 'white', color: style.carrello_text || 'black'}}>
          <div className="totale"><span>{carrello.length} prodotti</span></div>
          <button onClick={() => setShowCheckout(true)} className="btn-invia" style={{background: canOrder ? '#f1c40f' : '#3498db', color: canOrder ? 'black' : 'white'}}>{canOrder ? `${t.see_order} 📝` : `${t.see_order} 👀`}</button>
        </div>
      )}

      {showCheckout && (
          <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background: style.checkout_bg || style.bg || '#222', color: style.checkout_text || style.text || 'white', display:'flex', flexDirection:'column', padding:'20px', overflowY:'auto' }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:`1px solid ${style?.text||'#ccc'}`, paddingBottom:'10px'}}>
                  <h2 className="notranslate" style={{color: titleColor, margin:0}}>{canOrder ? `${t.summary} 📝` : `${t.order_list} 📝`}</h2>
                  <button onClick={() => setShowCheckout(false)} style={{background:'transparent', border:'none', color: titleColor, fontSize:'24px', cursor:'pointer'}}>✕</button>
              </div>
              <div style={{flex:1, overflowY:'auto', maxWidth:'600px', margin:'0 auto', width:'100%'}}>
                  {carrello.length === 0 && <p className="notranslate" style={{color: style?.text || '#fff', textAlign:'center'}}>{t.empty_cart}</p>}
                  {(() => {
                      const itemsCucina = carrello.filter(i => !i.categoria_is_bar);
                      const coursePresenti = [...new Set(itemsCucina.map(i => i.course))].sort();
                      const coloriPortata = ['#27ae60', '#f1c40f', '#e67e22', '#c0392b'];
                      const nomePortata = [null, t.course_1, t.course_2, t.course_3, t.course_4];
                      return coursePresenti.map((courseNum, index) => (
                          <div key={courseNum} style={{marginBottom:'25px'}}>
                              <h3 className="notranslate" style={{ margin:'0 0 10px 0', color: coloriPortata[index] || '#ccc', borderBottom:`2px solid ${coloriPortata[index] || '#ccc'}`, display:'inline-block', paddingRight:20 }}>{nomePortata[courseNum] || `PORTATA ${courseNum}`}</h3>
                              {itemsCucina.filter(i => i.course === courseNum).map(item => {
                                  const v = typeof item.varianti === 'string' ? JSON.parse(item.varianti || '{}') : (item.varianti || {});
                                  return (
                                    <div key={item.tempId} style={{background:'rgba(255,255,255,0.1)', borderRadius:10, padding:15, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <div style={{flex: 1}}>
                                            <div style={{fontWeight:'bold', fontSize:'1.1rem', color: titleColor}}>{item.nome}</div>
                                            {item.descrizione && ( <div style={{fontSize:'12px', color:'#ccc', fontStyle:'italic', marginTop:'4px', lineHeight:'1.2'}}>{item.descrizione}</div> )}
                                            {v.base && v.base.length > 0 && ( <div style={{fontSize:'11px', color:'#999', marginTop:'4px'}}><span className="notranslate">🧂 {t.ingredients}:</span> {v.base.join(', ')}</div> )}
                                            {item.allergeni && item.allergeni.length > 0 && ( <div className="notranslate" style={{ marginTop: '6px' }}>{item.allergeni.filter(a => !a.includes("❄️")).length > 0 && (<div style={{ fontSize: '10px', color: '#ff7675', fontWeight: 'bold', textTransform: 'uppercase' }}>⚠️ {item.allergeni.filter(a => !a.includes("❄️")).join(', ')}</div>)}{item.allergeni.some(a => a.includes("❄️")) && (<div style={{ fontSize: '10px', color: '#74b9ff', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>❄️ {t.frozen}</div>)}</div>)}
                                            {item.varianti_scelte && ( <div style={{marginTop:'8px', display:'flex', flexWrap:'wrap', gap:'5px'}}>{item.varianti_scelte.rimozioni?.map((ing, i) => ( <span key={i} style={{background:'#c0392b', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>NO {ing}</span> ))}{item.varianti_scelte.aggiunte?.map((ing, i) => ( <span key={i} style={{background:'#27ae60', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>+ {ing.nome}</span> ))}</div> )}
                                            <div className="notranslate" style={{color: priceColor, fontSize:'0.9rem', marginTop: '8px', fontWeight: 'bold'}}>{Number(item.prezzo).toFixed(2)} €</div>
                                        </div>
                                        <div className="notranslate" style={{display:'flex', flexDirection:'column', gap:5, marginLeft: '10px'}}>
                                            <div style={{display:'flex', gap:5, marginBottom: 5}}><button onClick={() => cambiaUscita(item.tempId, -1)} style={{background:'#ecf0f1', color:'#333', border: 'none', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px', cursor: 'pointer'}}>⬆️</button><button onClick={() => cambiaUscita(item.tempId, 1)} style={{background:'#ecf0f1', color:'#333', border: 'none', fontSize:'0.8rem', padding:'5px 8px', borderRadius:'4px', cursor: 'pointer'}}>⬇️</button></div>
                                            <button onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', fontSize:'0.8rem', padding:'5px 10px', borderRadius:'4px', border:'none', cursor: 'pointer', fontWeight: 'bold'}}>X</button>
                                        </div>
                                    </div>
                                );
                              })}
                          </div>
                      ));
                  })()}
                  {carrello.some(i => i.categoria_is_bar) && (
                      <div style={{marginBottom:'20px', padding:'10px', border:'1px dashed #555', borderRadius:'10px'}}>
                           <h3 style={{color: '#3498db', margin:'0 0 10px 0', fontSize:'16px', textTransform:'uppercase'}}>🍹 BEVANDE & BAR</h3>
                           {carrello.filter(i => i.categoria_is_bar).map(item => (
                               <div key={item.tempId} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', marginBottom:'5px', borderRadius:'8px'}}>
                                   <div style={{flex:1}}><div style={{color: titleColor, fontWeight:'bold', fontSize:'16px'}}>{item.nome}</div><div className="notranslate" style={{color: '#888', fontSize:'12px'}}>{Number(item.prezzo).toFixed(2)} €</div></div>
                                   <button className="notranslate" onClick={() => rimuoviDalCarrello(item.tempId)} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>✕</button>
                               </div>
                           ))}
                      </div>
                  )}
                  <div className="notranslate" style={{marginTop:'20px', borderTop:`1px solid ${style?.text||'#ccc'}`, paddingTop:'20px'}}>
                      {carrello.length > 0 && (canOrder || isStaffQui) && ( <button onClick={inviaOrdine} style={{ width:'100%', padding:'15px', fontSize:'18px', background: '#159709ff', color:'white', border:`1px solid ${style?.text||'#ccc'}`, borderRadius:'30px', fontWeight:'bold', cursor:'pointer' }}>{isStaffQui ? t.staff_order : t.confirm} 🚀</button> )}
                      <button onClick={() => setShowCheckout(false)} style={{width:'100%', padding:'15px', marginTop:'10px', background:'transparent', border:`1px solid ${style?.text||'#ccc'}`, color: style?.text||'#ccc', borderRadius:'30px', cursor:'pointer'}}>{t.back}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default Menu;