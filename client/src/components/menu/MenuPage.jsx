// client/src/components/menu/MenuPage.jsx - VERSIONE V86 (SINGLE QR & PIN LOGIN) 🔑
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { dictionary, getContent, flags } from "../../translations";
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
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.9)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div style={{background:'white', padding:30, borderRadius:15, width:'100%', maxWidth:350, textAlign:'center', boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
                <div style={{fontSize:40, marginBottom:10}}>🔐</div>
                <h2 style={{margin:0, color:'#2c3e50'}}>Codice Tavolo</h2>
                <p style={{color:'#7f8c8d', fontSize:14, marginBottom:20}}>Inserisci il codice che ti ha fornito lo staff per sbloccare l'ordine.</p>
                
                <input 
                    type="tel" 
                    maxLength="4"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="____"
                    style={{
                        fontSize: '30px', letterSpacing: '10px', textAlign: 'center', 
                        width: '100%', padding: '10px', borderRadius: '8px', 
                        border: '2px solid #3498db', marginBottom: '20px', fontWeight:'bold'
                    }}
                    autoFocus
                />
                
                {errorMsg && <p style={{color:'#e74c3c', fontWeight:'bold', marginTop:-10, marginBottom:15}}>⚠️ {errorMsg}</p>}

                <button 
                    onClick={() => onVerify(code)}
                    style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:8, fontSize:16, fontWeight:'bold', cursor:'pointer'}}
                >
                    SBLOCCA TAVOLO 🔓
                </button>
                <button 
                    onClick={onClose}
                    style={{marginTop:15, background:'transparent', border:'none', color:'#999', textDecoration:'underline', cursor:'pointer'}}
                >
                    Chiudi e guarda solo il menu
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
  
  // Tavolo URL (Opzionale se usiamo Single QR)
  const numeroTavoloUrl = searchParams.get("tavolo"); 

  const API_URL = "https://stark-backend-gg17.onrender.com";

  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  const [tavoloStaff, setTavoloStaff] = useState("");
  
  // --- STATI PIN & SICUREZZA ---
  const [pinMode, setPinMode] = useState(false);
  const [activeTableSession, setActiveTableSession] = useState(null); // Tavolo sbloccato col PIN
  const [activePinSession, setActivePinSession] = useState(null);     // PIN sbloccato
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");

  const [lang, setLang] = useState("it");
  const t = dictionary[lang] || dictionary["it"];
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [availableLangs, setAvailableLangs] = useState(["it"]);
  const [urlFileAttivo, setUrlFileAttivo] = useState("");
  const [titoloFile, setTitoloFile] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);

  // STATI DI BLOCCO
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

  // Auth & Staff check
  const [user, setUser] = useState(null);
  const isStaffQui = user && ["cameriere","admin","editor"].includes(user.ruolo) && parseInt(user.ristorante_id) === parseInt(ristoranteId);
  const isStaff = isStaffQui;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({ nome: "", email: "", password: "", telefono: "", indirizzo: "" });

  useEffect(() => {
    const savedUser = localStorage.getItem("stark_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Recupera sessione tavolo salvata (Se l'utente ricarica la pagina)
    const savedTable = localStorage.getItem("session_table");
    const savedPin = localStorage.getItem("session_pin");
    if(savedTable && savedPin) {
        setActiveTableSession(savedTable);
        setActivePinSession(savedPin);
    }
  }, []);

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

        // 2. Impostazioni PIN
        if (data.pin_mode === true) setPinMode(true);

        // 3. Permessi Ordine
        const moduloSaaSAttivo = data.moduli ? (data.moduli.ordini_clienti !== false) : true;
        let switchLocaleAttivo = data.ordini_abilitati;
        if (switchLocaleAttivo === null || switchLocaleAttivo === undefined) switchLocaleAttivo = (data.cucina_super_active !== false);
        setCanOrder(moduloSaaSAttivo && switchLocaleAttivo);
        
        setActiveCategory(null);
        
        const pageTitle = `${data.ristorante} | Menu Digitale`;
        updateMetaTags(pageTitle, data?.style?.logo || "", "Menu Digitale");

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

  // --- FUNZIONE DI VERIFICA PIN ---
  const handleVerifyPin = async (inputPin) => {
      setPinError("");
      try {
          const res = await fetch(`${API_URL}/api/tavolo/check-pin`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ristorante_id: ristoranteId, pin: inputPin })
          });
          const data = await res.json();
          
          if (data.success) {
              // PIN CORRETTO! SALVA SESSIONE
              setActiveTableSession(data.tavolo);
              setActivePinSession(inputPin);
              
              localStorage.setItem("session_table", data.tavolo);
              localStorage.setItem("session_pin", inputPin);
              
              setShowPinModal(false);
              alert(`✅ Benvenuto al Tavolo ${data.tavolo}! Ora puoi ordinare.`);
          } else {
              setPinError(data.error || "Codice non valido.");
          }
      } catch (e) {
          setPinError("Errore di connessione.");
      }
  };

  const inviaOrdine = async () => {
    if (!canOrder && !isStaff) { alert("Gli ordini sono disabilitati. Mostra questa lista al cameriere."); return; }
    if (carrello.length === 0) return;

    // --- LOGICA GESTIONE TAVOLO ---
    // 1. Se Staff: Chiede sempre o usa staff table
    // 2. Se Cliente + PinMode: Usa activeTableSession
    // 3. Se Cliente + URL: Usa numeroTavoloUrl
    
    let tavoloFinale = null;
    let pinFinale = null;

    if (isStaff) {
        const tPrompt = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavoloUrl || "");
        if (!tPrompt) return;
        tavoloFinale = tPrompt;
        setTavoloStaff(tPrompt);
    } 
    else if (pinMode) {
        // Se siamo in PIN MODE, dobbiamo avere una sessione attiva
        if (!activeTableSession) {
            setShowPinModal(true); // Apri modale e FERMATI
            return;
        }
        tavoloFinale = activeTableSession;
        pinFinale = activePinSession;
    } 
    else {
        // Modo Classico (QR univoco)
        tavoloFinale = numeroTavoloUrl || "Banco/Asporto";
    }

    const totaleProdotti = carrello.reduce((a, b) => a + Number(b.prezzo) * (b.qty || 1), 0);
    const costoCoperto = (style.prezzo_coperto || 0) * numCoperti;
    const totaleOrdine = totaleProdotti + costoCoperto;

    if (!confirm(`${t?.confirm || "CONFERMA E INVIA"}?`)) return;

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
      tavolo: tavoloFinale, 
      utente_id: user?.id || null,
      cliente: user ? user.nome : "Ospite", 
      cameriere: isStaff ? user.nome : null,
      prodotti: prodottiNormalizzati, 
      totale: totaleOrdine, 
      coperti: numCoperti,
      pin_tavolo: pinFinale 
    };

    try {
      const res = await fetch(`${API_URL}/api/ordine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const risp = await res.json();

      if (res.ok && risp.success) { 
          alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloFinale})` : "✅ Ordine Inviato con Successo! 🚀"); 
          setCarrello([]); setShowCheckout(false); 
      } 
      else { 
          // Se l'errore è "PIN Scaduto", resettiamo la sessione
          if (risp.error && risp.error.includes("PIN")) {
              setActiveTableSession(null);
              setActivePinSession(null);
              localStorage.removeItem("session_table");
              localStorage.removeItem("session_pin");
              setShowPinModal(true); // Riapri modale
          }
          alert("❌ ERRORE: " + (risp.error || "Impossibile inviare ordine.")); 
      }
    } catch (e) { alert("Errore connessione server."); }
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
      <Checkout open={showCheckout} onClose={() => setShowCheckout(false)} carrello={carrello} style={style} t={t} lang={lang} titleColor={titleColor} priceColor={priceColor} canOrder={canOrder} isStaffQui={isStaffQui} numCoperti={numCoperti} setNumCoperti={setNumCoperti} onChangeCourse={cambiaUscita} onRemoveItem={rimuoviDalCarrello} onSendOrder={inviaOrdine} />
    </div>
  );
}