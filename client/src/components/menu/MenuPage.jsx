// client/src/components/menu/MenuPage.jsx - VERSIONE V92 (SILENT CHECK & AUTO-CLEAN) 🧹
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { dictionary, flags } from "../../translations";
import { updateMetaTags } from "./menuUtils";

import MenuHeaderCover from "./MenuHeaderCover";
import MenuAccordion from "./MenuAccordion";
import MenuFooter from "./MenuFooter";
import FileModal from "./FileModal";
import AuthModal from "./AuthModal";
import DishModal from "./DishModal";
import CartBar from "./CartBar";
import Checkout from "./Checkout";

// --- COMPONENTE INTERNO: MODALE PIN ---
const PinLoginModal = ({ show, onClose, onVerify, errorMsg }) => {
    const [code, setCode] = useState("");
    if (!show) return null;

    return (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.95)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div style={{background:'white', padding:30, borderRadius:15, width:'100%', maxWidth:350, textAlign:'center', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
                <div style={{fontSize:40, marginBottom:10}}>🔒</div>
                <h2 style={{margin:0, color:'#2c3e50'}}>Sblocco Tavolo</h2>
                <p style={{color:'#7f8c8d', fontSize:14, marginBottom:20}}>Inserisci il codice PIN fornito dal cameriere per ordinare.</p>
                
                <input 
                    type="tel" 
                    maxLength="4"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PIN"
                    style={{
                        fontSize: '30px', letterSpacing: '5px', textAlign: 'center', 
                        width: '100%', padding: '15px', borderRadius: '10px', 
                        border: '2px solid #3498db', marginBottom: '20px', fontWeight:'bold',
                        background: '#f8f9fa'
                    }}
                    autoFocus
                />
                
                {errorMsg && <p style={{color:'#e74c3c', fontWeight:'bold', marginTop:-10, marginBottom:15}}>⚠️ {errorMsg}</p>}

                <button 
                    onClick={() => onVerify(code)}
                    style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:10, fontSize:16, fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(39, 174, 96, 0.3)'}}
                >
                    SBLOCCA E INVIA 🚀
                </button>
            </div>
        </div>
    );
};

export default function MenuPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const currentSlug = slug || "pizzeria-stark";
  const [searchParams] = useSearchParams();
  const numeroTavoloUrl = searchParams.get("tavolo"); 

  const API_URL = "https://stark-backend-gg17.onrender.com";

  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  const [tavoloStaff, setTavoloStaff] = useState("");
  
  // --- STATI PIN & SICUREZZA ---
  const [pinMode, setPinMode] = useState(false);
  
  const [activeTableSession, setActiveTableSession] = useState(null); // ID o Numero Tavolo
  const [activePinSession, setActivePinSession] = useState(null);     // PIN usato
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");

  const [lang, setLang] = useState("it");
  const t = dictionary[lang] || dictionary["it"];
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLangs, setAvailableLangs] = useState(["it"]);
  const [urlFileAttivo, setUrlFileAttivo] = useState("");
  const [titoloFile, setTitoloFile] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);

  const [isSuspended, setIsSuspended] = useState(false);
  const [isMenuDisabled, setIsMenuDisabled] = useState(false);
  const [canOrder, setCanOrder] = useState(true);
  const [error, setError] = useState(false);
  
  const [carrello, setCarrello] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [selectedPiatto, setSelectedPiatto] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [numCoperti, setNumCoperti] = useState(1);

  const [user, setUser] = useState(null);
  const isStaffQui = user && ["cameriere","admin","editor"].includes(user.ruolo) && parseInt(user.ristorante_id) === parseInt(ristoranteId);
  const isStaff = isStaffQui;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ nome: "", email: "", password: "", telefono: "", indirizzo: "" });

  // 1. CARICAMENTO UTENTE E SESSIONE AL MOUNT (CON SILENT CHECK)
  useEffect(() => {
    const savedUser = localStorage.getItem("stark_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Ripristina sessione SPECIFICA per questo slug
    const savedSession = localStorage.getItem(`session_${currentSlug}`);
    if (savedSession) {
        try {
            const parsed = JSON.parse(savedSession);
            if(parsed.tavolo && parsed.pin) {
                // Impostiamo temporaneamente, poi il fetchMenu verificherà se è valido
                setActiveTableSession(parsed.tavolo);
                setActivePinSession(parsed.pin);
            }
        } catch(e) { 
            // Se corrotta, pulisci
            localStorage.removeItem(`session_${currentSlug}`); 
        }
    }
  }, [currentSlug]);

  // 2. FETCH DATI RISTORANTE E VALIDAZIONE SESSIONE SILENZIOSA
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then((res) => { if (!res.ok) throw new Error("Errore caricamento"); return res.json(); })
      .then((data) => {
        setRistoranteId(data.id);
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setStyle(data.style || {});

        if (data.subscription_active === false) setIsSuspended(true);
        if (data.moduli && data.moduli.menu_digitale === false) setIsMenuDisabled(true);

        if (data.pin_mode === true) {
            setPinMode(true);
            
            // --- SILENT CHECK SESSIONE ---
            const savedSession = localStorage.getItem(`session_${currentSlug}`);
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                // Verifichiamo silenziosamente se il PIN è ancora valido nel DB
                fetch(`${API_URL}/api/menu/verify-pin`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ ristorante_id: data.id, pin: parsed.pin })
                })
                .then(r => r.json())
                .then(check => {
                    if (!check.success) {
                        console.log("Sessione scaduta o non valida. Pulizia automatica.");
                        localStorage.removeItem(`session_${currentSlug}`);
                        setActiveTableSession(null);
                        setActivePinSession(null);
                    } else {
                        console.log("Sessione recuperata e valida.");
                    }
                })
                .catch(() => {
                    // Se errore server, nel dubbio non cancellare, lascia riprovare l'utente
                });
            }
        }

        const moduloSaaSAttivo = data.moduli ? (data.moduli.ordini_clienti !== false) : true;
        let switchLocaleAttivo = data.ordini_abilitati;
        if (switchLocaleAttivo === null || switchLocaleAttivo === undefined) switchLocaleAttivo = (data.cucina_super_active !== false);
        setCanOrder(moduloSaaSAttivo && switchLocaleAttivo);
        
        setActiveCategory(null);
        updateMetaTags(`${data.ristorante} | Menu`, data?.style?.logo || "", "Menu Digitale");

        const foundLangs = new Set(["it"]);
        if (data.menu && data.menu.length > 0) {
          data.menu.forEach((p) => {
            if (p.traduzioni) {
              let trads = p.traduzioni;
              if (typeof trads === "string") { try { trads = JSON.parse(trads); } catch (e) {} }
              Object.keys(trads || {}).forEach((k) => foundLangs.add(k));
            }
          });
        }
        setAvailableLangs(Array.from(foundLangs));
      })
      .catch((err) => { console.error("Errore Menu:", err); setError(true); });
  }, [currentSlug]);

  const cambiaLingua = (l) => { setLang(l); setShowLangMenu(false); };
  const getDefaultCourse = (p) => (p.categoria_is_bar ? 0 : 1);

  const aggiungiAlCarrello = (piatto, override = null) => {
    const qtySpecific = override?.qty ?? 1;
    let finalQty = qtySpecific;
    if (qtySpecific === 1 && piatto.qta_minima > 1) finalQty = parseFloat(piatto.qta_minima);

    const tempId = Date.now() + Math.random();
    const item = {
      ...piatto, tempId, course: getDefaultCourse(piatto), qty: finalQty,
      ...(override ? { nome: override.nome ?? piatto.nome, prezzo: override.prezzo ?? piatto.prezzo, varianti_scelte: override.varianti_scelte } : {}),
    };
    setCarrello((prev) => [...prev, item]);
    setSelectedPiatto(null);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const rimuoviDalCarrello = (tempId) => setCarrello((prev) => prev.filter((i) => i.tempId !== tempId));
  
  const cambiaUscita = (tempId, delta) => {
    setCarrello((prev) => prev.map((item) => {
        if (item.tempId === tempId) {
          let newCourse = (item.course || 1) + delta;
          if (newCourse < 1) newCourse = 1; if (newCourse > 4) newCourse = 4;
          return { ...item, course: newCourse };
        }
        return item;
      })
    );
  };

  // ============================================================
  // 🔥 CORE LOGIC: INVIO ORDINE CENTRALIZZATO
  // ============================================================
  
  const eseguiInvioOrdine = async (tavoloDest, pinUsato) => {
      // 1. Validazione base
      if (carrello.length === 0) return;

      // 2. Calcoli
      const totaleProdotti = carrello.reduce((a, b) => a + Number(b.prezzo) * (b.qty || 1), 0);
      const costoCoperto = (style.prezzo_coperto || 0) * numCoperti;
      const totaleOrdine = totaleProdotti + costoCoperto;

      // 3. Normalizzazione
      const stepPresenti = [...new Set(carrello.filter((c) => !c.categoria_is_bar).map((c) => c.course))].sort((a, b) => a - b);
      const mapNuoviCorsi = {};
      stepPresenti.forEach((vecchioCorso, index) => { mapNuoviCorsi[vecchioCorso] = index + 1; });

      const prodottiNormalizzati = carrello.map((p) => ({
          id: p.id, nome: p.qty > 1 ? `${p.nome} (x${p.qty}${p.unita_misura})` : p.nome,
          prezzo: Number(p.prezzo) * (p.qty || 1),
          course: !p.categoria_is_bar ? mapNuoviCorsi[p.course] || 1 : p.course,
          is_bar: p.categoria_is_bar, is_pizzeria: p.categoria_is_pizzeria,
          stato: "in_attesa", varianti_scelte: p.varianti_scelte, unita_misura: p.unita_misura, qty_originale: p.qty,
      }));

      const payload = {
          ristorante_id: ristoranteId, 
          tavolo: tavoloDest, 
          utente_id: user?.id || null,
          cliente: user ? user.nome : "Ospite", 
          cameriere: isStaff ? user.nome : null,
          prodotti: prodottiNormalizzati, 
          totale: totaleOrdine, 
          coperti: numCoperti,
          pin_tavolo: pinUsato 
      };

      try {
          const res = await fetch(`${API_URL}/api/ordine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const risp = await res.json();

          if (res.ok && risp.success) { 
              alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloDest})` : "✅ Ordine Inviato! 🚀"); 
              setCarrello([]); setShowCheckout(false); 
          } 
          else { 
              if (risp.error && (risp.error.includes("PIN") || risp.error.includes("Scaduto") || risp.error.includes("Errato"))) {
                  // Se errore PIN, resetta sessione e riapri modale
                  setActiveTableSession(null); setActivePinSession(null);
                  localStorage.removeItem(`session_${currentSlug}`);
                  setPinError("Sessione scaduta. Reinserisci il PIN.");
                  setShowPinModal(true); 
              } else {
                  alert("❌ ERRORE: " + (risp.error || "Impossibile inviare ordine."));
              }
          }
      } catch (e) { alert("Errore connessione server."); }
  };

  // --- FUNZIONE DI VERIFICA PIN + INVIO AUTOMATICO ---
  const handleVerifyPin = async (inputPin) => {
      setPinError("");
      try {
          // NOTA: Usa la rotta corretta definita nel Backend
          const res = await fetch(`${API_URL}/api/menu/verify-pin`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ristorante_id: ristoranteId, pin: inputPin })
          });
          const data = await res.json();
          
          if (data.success) {
              // PIN CORRETTO!
              const tavoloInfo = data.tavolo.numero; 
              
              setActiveTableSession(tavoloInfo);
              setActivePinSession(inputPin);
              
              // SALVA SESSIONE LOCALE
              localStorage.setItem(`session_${currentSlug}`, JSON.stringify({
                  tavolo: tavoloInfo,
                  pin: inputPin,
                  timestamp: Date.now()
              }));

              setShowPinModal(false);
              
              // 🚀 INVIO IMMEDIATO
              eseguiInvioOrdine(tavoloInfo, inputPin);
          } else {
              setPinError(data.error || "Codice errato.");
          }
      } catch (e) { setPinError("Errore connessione."); }
  };

  // --- PULSANTE PRINCIPALE "INVIA ORDINE" ---
  const handleCheckoutClick = () => {
      if (!canOrder && !isStaff) { alert("Gli ordini sono disabilitati."); return; }
      if (carrello.length === 0) return;

      // 1. Chiedi conferma GENERICA PRIMA di tutto
      if (!confirm(`${t?.confirm || "CONFERMA E INVIA"}?`)) return;

      // 2. Controllo Staff (Override PIN)
      if (isStaff) {
          const tPrompt = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavoloUrl || "");
          if (!tPrompt) return;
          setTavoloStaff(tPrompt);
          eseguiInvioOrdine(tPrompt, null);
          return;
      }

      // 3. Controllo PIN MODE
      if (pinMode) {
          // Se ho già una sessione attiva, invio diretto
          if (activeTableSession && activePinSession) {
              eseguiInvioOrdine(activeTableSession, activePinSession);
          } else {
              // Se non ho sessione, apro la modale (che poi invierà da sola)
              setShowPinModal(true);
          }
          return;
      }

      // 4. Controllo Standard (No PIN)
      eseguiInvioOrdine(numeroTavoloUrl || "Banco/Asporto", null);
  };

  const bg = style.bg || "#222";
  const text = style.text || "#fff";
  const titleColor = style.title || "#fff";
  const priceColor = style.price || "#27ae60";
  const font = style.font || "sans-serif";
  const cardBg = style.card_bg || "white";
  const cardBorder = style.card_border || "#eee";
  const btnBg = style.btn_bg || "#27ae60";
  const btnText = style.btn_text || "white";
  const tavoloBg = style.tavolo_bg || priceColor;
  const tavoloText = style.tavolo_text || "white";
  const modalBg = style.colore_modal_bg || cardBg || "#fff";
  const modalText = style.colore_modal_text || "#000";

  const footerBtnStyle = { background: "transparent", border: `1px solid ${style.colore_footer_text || "#888"}`, color: style.colore_footer_text || "#888", width: "100%", maxWidth: "280px", padding: "12px 15px", borderRadius: "30px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", margin: "0 auto" };

  if (isSuspended) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background: bg, color: text }}><h1 style={{fontSize:'4rem', margin:0}}>⛔</h1><h2 style={{color:'#e74c3c'}}>SERVIZIO SOSPESO</h2></div>;
  if (isMenuDisabled) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background: bg, color: text }}><h1 style={{fontSize:'4rem', margin:0}}>📴</h1><h2 style={{color:'#e74c3c'}}>MENU NON ATTIVO</h2></div>;
  if (error) return <div style={{ padding: 50, textAlign: "center", color: text, background: bg, minHeight: "100vh" }}><h1>⚠️ Errore Caricamento</h1></div>;

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: font, paddingBottom: 80 }}>
      <style>{`:root { color-scheme: light; } * { box-sizing: border-box; margin: 0; padding: 0; } body, html { background-color: ${bg} !important; color: ${text} !important; overflow-x: hidden; width: 100%; top: 0 !important; }`}</style>

      {/* --- PIN MODAL --- */}
      <PinLoginModal show={showPinModal} onClose={()=>setShowPinModal(false)} onVerify={handleVerifyPin} errorMsg={pinError} />

      <MenuHeaderCover showCheckout={showCheckout} style={style} ristorante={ristorante} numeroTavolo={activeTableSession || numeroTavoloUrl} user={user} navigateToDashboard={() => navigate("/dashboard")} onShowAuth={() => setShowAuthModal(true)} lang={lang} t={t} priceColor={priceColor} tavoloBg={tavoloBg} tavoloText={tavoloText} showLangMenu={showLangMenu} setShowLangMenu={setShowLangMenu} availableLangs={availableLangs} cambiaLingua={cambiaLingua} flags={flags} dictionary={dictionary} />
      
      {/* BOTTONE MANUALE PIN (Se siamo in pin mode ma non loggati) */}
      {pinMode && !activeTableSession && !showCheckout && (
          <div style={{textAlign:'center', marginBottom:10}}>
              <button onClick={()=>setShowPinModal(true)} style={{background:'#3498db', color:'white', border:'none', padding:'10px 20px', borderRadius:20, fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                  🔑 INSERISCI CODICE TAVOLO
              </button>
          </div>
      )}

      <MenuAccordion menu={menu} lang={lang} t={t} style={style} activeCategory={activeCategory} setActiveCategory={setActiveCategory} activeSubCategory={activeSubCategory} setActiveSubCategory={setActiveSubCategory} onOpenDishModal={(p) => setSelectedPiatto(p)} onAddToCart={(p) => aggiungiAlCarrello(p)} titleColor={titleColor} priceColor={priceColor} cardBg={cardBg} cardBorder={cardBorder} btnBg={btnBg} btnText={btnText} canOrder={canOrder} />
      
      <MenuFooter style={style} footerBtnStyle={footerBtnStyle} setUrlFileAttivo={setUrlFileAttivo} setTitoloFile={setTitoloFile} setShowFileModal={setShowFileModal} />
      <FileModal open={showFileModal} url={urlFileAttivo} title={titoloFile} onClose={() => setShowFileModal(false)} modalBg={modalBg} modalText={modalText} />
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} API_URL={API_URL} priceColor={priceColor} isRegistering={isRegistering} setIsRegistering={setIsRegistering} authData={authData} setAuthData={setAuthData} onAuthSuccess={(u) => { setUser(u); localStorage.setItem("stark_user", JSON.stringify(u)); }} />
      <DishModal piatto={selectedPiatto} lang={lang} t={t} style={style} canOrder={canOrder} onClose={() => setSelectedPiatto(null)} onAddToCart={(piatto, override) => aggiungiAlCarrello(piatto, override)} />
      
      <CartBar visible={carrello.length > 0 && !showCheckout && !selectedPiatto} style={style} carrelloCount={carrello.length} canOrder={canOrder} t={t} onOpenCheckout={() => setShowCheckout(true)} />
      
      <Checkout 
          open={showCheckout} 
          onClose={() => setShowCheckout(false)} 
          carrello={carrello} 
          style={style} 
          t={t} 
          lang={lang} 
          titleColor={titleColor} 
          priceColor={priceColor} 
          canOrder={canOrder} 
          isStaffQui={isStaffQui} 
          numCoperti={numCoperti} 
          setNumCoperti={setNumCoperti} 
          onChangeCourse={cambiaUscita} 
          onRemoveItem={rimuoviDalCarrello} 
          onSendOrder={handleCheckoutClick} 
      />
    </div>
  );
}