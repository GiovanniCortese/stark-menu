// client/src/components/menu/MenuPage.jsx - VERSIONE V84 (FIX FLAG CUCINA + PIN) 🛠️
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

export default function MenuPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const currentSlug = slug || "pizzeria-stark";
  const [searchParams] = useSearchParams();
  const numeroTavolo = searchParams.get("tavolo");
  const API_URL = "https://stark-backend-gg17.onrender.com";

  const [menu, setMenu] = useState([]);
  const [ristorante, setRistorante] = useState("");
  const [ristoranteId, setRistoranteId] = useState(null);
  const [style, setStyle] = useState({});
  const [tavoloStaff, setTavoloStaff] = useState("");
  
  // --- STATI PIN & SICUREZZA ---
  const [pinMode, setPinMode] = useState(false); // Se true, chiede il PIN
  const [pinTavolo, setPinTavolo] = useState(""); // Il PIN digitato

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
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then((res) => { if (!res.ok) throw new Error("Errore caricamento"); return res.json(); })
      .then((data) => {
        setRistoranteId(data.id);
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setStyle(data.style || {});

        // 1. Controllo Modulo SuperAdmin
        if (data.subscription_active === false) setIsSuspended(true);
        if (data.moduli && data.moduli.menu_digitale === false) setIsMenuDisabled(true);

        // 2. Impostazioni PIN
        if (data.pin_mode === true) {
            setPinMode(true);
            console.log("🛡️ PIN MODE ATTIVO");
        }

        // 3. --- FIX LOGICA ORDINI ---
        // Il modulo deve essere attivo
        const moduloSaaSAttivo = data.moduli ? (data.moduli.ordini_clienti !== false) : true;
        
        // Controllo switch locale (Supporta sia il vecchio 'cucina_super_active' che il nuovo 'ordini_abilitati')
        // Se ordini_abilitati è null/undefined, usa cucina_super_active.
        const switchLocaleAttivo = (data.ordini_abilitati !== null && data.ordini_abilitati !== undefined)
            ? data.ordini_abilitati
            : (data.cucina_super_active !== false);

        console.log(`🔍 DEBUG PERMESSI ORDINE:
          - Modulo SaaS: ${moduloSaaSAttivo}
          - Switch Ordini (New): ${data.ordini_abilitati}
          - Switch Cucina (Old): ${data.cucina_super_active}
          - FALLBACK USATO: ${switchLocaleAttivo}
        `);

        setCanOrder(moduloSaaSAttivo && switchLocaleAttivo);
        
        setActiveCategory(null);
        
        // SEO
        const pageTitle = `${data.ristorante} | Menu Digitale`;
        updateMetaTags(pageTitle, data?.style?.logo || "", "Menu Digitale");

        // Lingue
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

  const inviaOrdine = async () => {
    if (!canOrder && !isStaff) { alert("Gli ordini sono disabilitati. Mostra questa lista al cameriere."); return; }
    if (carrello.length === 0) return;

    let tavoloFinale = numeroTavolo;
    if (isStaff) {
      const tPrompt = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavolo || "");
      if (!tPrompt) return;
      tavoloFinale = tPrompt;
      setTavoloStaff(tPrompt);
    }
    if (!tavoloFinale && !isStaff) tavoloFinale = "Banco/Asporto";

    // --- CONTROLLO PIN (Nuova Logica) ---
    // Se PinMode è attivo E non sono staff, chiedo il PIN.
    let codicePinInserito = null;
    if (pinMode && !isStaff) {
        codicePinInserito = prompt("🔒 SICUREZZA: Inserisci il PIN del tavolo presente sullo scontrino/bigliettino:");
        if (!codicePinInserito) return; // Annulla se non inserisce nulla
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
      pin_tavolo: codicePinInserito // Invio PIN al backend
    };

    try {
      const res = await fetch(`${API_URL}/api/ordine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const risp = await res.json();

      if (res.ok && risp.success) { 
          alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloFinale})` : "✅ Ordine Inviato con Successo! 🚀"); 
          setCarrello([]); setShowCheckout(false); 
      } 
      else { 
          // Gestione Errori (es. PIN Errato)
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

      <MenuHeaderCover showCheckout={showCheckout} style={style} ristorante={ristorante} numeroTavolo={numeroTavolo} user={user} navigateToDashboard={() => navigate("/dashboard")} onShowAuth={() => setShowAuthModal(true)} lang={lang} t={t} priceColor={priceColor} tavoloBg={tavoloBg} tavoloText={tavoloText} showLangMenu={showLangMenu} setShowLangMenu={setShowLangMenu} availableLangs={availableLangs} cambiaLingua={cambiaLingua} flags={flags} dictionary={dictionary} />
      
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