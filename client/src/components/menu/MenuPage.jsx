// client/src/components/menu/MenuPage.jsx
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
  
  // Se ordini disabilitati, canOrder diventa false, ma la Wishlist funziona
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
  const isStaffQui =
    user &&
    (user.ruolo === "cameriere" || user.ruolo === "admin" || user.ruolo === "editor") &&
    parseInt(user.ristorante_id) === parseInt(ristoranteId);
  const isStaff = isStaffQui;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authData, setAuthData] = useState({
    nome: "",
    email: "",
    password: "",
    telefono: "",
    indirizzo: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("stark_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${currentSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Errore caricamento");
        return res.json();
      })
      .then((data) => {
        setRistoranteId(data.id);
        setRistorante(data.ristorante);
        setMenu(data.menu || []);
        setStyle(data.style || {});

        // 1. Controllo Scadenza Abbonamento Globale
        if (data.subscription_active === false) setIsSuspended(true);
        
        // 2. Controllo Modulo Menu Digitale (Se spento dal SuperAdmin, non si vede nulla)
        if (data.moduli && data.moduli.menu_digitale === false) {
            setIsMenuDisabled(true);
        }

        // 3. Controllo Ordini (Modulo SuperAdmin + Interruttore Ristoratore + Cucina)
        // Se false, attiva modalità Wishlist
        const moduloOrdiniAttivo = data.moduli ? (data.moduli.ordini_clienti !== false) : true;
        const adminLocaleAttivo = data.ordini_abilitati; // Flag del ristoratore
        const kitchenAttiva = data.kitchen_active; // Flag storico
        
        setCanOrder(moduloOrdiniAttivo && adminLocaleAttivo && kitchenAttiva);
        
        setActiveCategory(null);

        // SEO
        const pageTitle = `${data.ristorante} | Menu Digitale`;
        const pageDesc = "Sfoglia il nostro menu, ordina comodamente dal tavolo e scopri le nostre specialità!";
       const pageImage = data?.style?.logo || data?.style?.cover || "";
updateMetaTags(pageTitle, pageImage, pageDesc);

        // Lingue disponibili
        const foundLangs = new Set(["it"]);
        if (data.menu && data.menu.length > 0) {
          data.menu.forEach((p) => {
            if (p.traduzioni) {
              let trads = p.traduzioni;
              if (typeof trads === "string") {
                try { trads = JSON.parse(trads); } catch (e) {}
              }
              Object.keys(trads || {}).forEach((k) => foundLangs.add(k));
            }
          });
        }
        setAvailableLangs(Array.from(foundLangs));
      })
      .catch((err) => {
        console.error("Errore Menu:", err);
        setError(true);
      });
  }, [currentSlug]);

  const cambiaLingua = (selectedLang) => {
    setLang(selectedLang);
    setShowLangMenu(false);
  };

  const getDefaultCourse = (piatto) => {
    if (piatto.categoria_is_bar) return 0;
    return 1;
  };

  const aggiungiAlCarrello = (piatto, override = null) => {
    // MODIFICA CRUCIALE: Rimosso il blocco if (!canOrder) return;
    // Ora permettiamo di aggiungere al carrello anche se è solo una Wishlist.

    const qtySpecific = override?.qty ?? 1;
    let finalQty = qtySpecific;
    if (qtySpecific === 1 && piatto.qta_minima > 1) finalQty = parseFloat(piatto.qta_minima);

    const tempId = Date.now() + Math.random();
    const item = {
      ...piatto,
      tempId,
      course: getDefaultCourse(piatto),
      qty: finalQty,
      ...(override
        ? {
            nome: override.nome ?? piatto.nome,
            prezzo: override.prezzo ?? piatto.prezzo,
            varianti_scelte: override.varianti_scelte,
          }
        : {}),
    };

    setCarrello((prev) => [...prev, item]);
    setSelectedPiatto(null);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const rimuoviDalCarrello = (tempId) => {
    setCarrello((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const cambiaUscita = (tempId, delta) => {
    setCarrello((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          let newCourse = (item.course || 1) + delta;
          if (newCourse < 1) newCourse = 1;
          if (newCourse > 4) newCourse = 4;
          return { ...item, course: newCourse };
        }
        return item;
      })
    );
  };

  const inviaOrdine = async () => {
    // Protezione finale: se non puoi ordinare e non sei staff, non invia nulla.
    if (!canOrder && !isStaff) {
        alert("Gli ordini sono momentaneamente disabilitati. Mostra questa lista al cameriere.");
        return; 
    }
    
    if (carrello.length === 0) return;

    const finalUserId = user?.id || user?.user?.id || null;

    let tavoloFinale = numeroTavolo;
    if (isStaff) {
      const tPrompt = prompt("Inserisci il numero del tavolo:", tavoloStaff || numeroTavolo || "");
      if (!tPrompt) return;
      tavoloFinale = tPrompt;
      setTavoloStaff(tPrompt);
    }

    if (!tavoloFinale && !isStaff) {
      tavoloFinale = "Banco/Asporto";
    }

    const totaleProdotti = carrello.reduce((a, b) => a + Number(b.prezzo) * (b.qty || 1), 0);
    const costoCoperto = (style.prezzo_coperto || 0) * numCoperti;
    const totaleOrdine = totaleProdotti + costoCoperto;

    const confirmMsg = `${t?.confirm || "CONFERMA E INVIA"}?`;
    if (!confirm(confirmMsg)) return;

    const stepPresenti = [...new Set(carrello.filter((c) => !c.categoria_is_bar).map((c) => c.course))].sort(
      (a, b) => a - b
    );
    const mapNuoviCorsi = {};
    stepPresenti.forEach((vecchioCorso, index) => {
      mapNuoviCorsi[vecchioCorso] = index + 1;
    });

    const prodottiNormalizzati = carrello.map((p) => ({
      id: p.id,
      nome: p.qty > 1 ? `${p.nome} (x${p.qty}${p.unita_misura})` : p.nome,
      prezzo: Number(p.prezzo) * (p.qty || 1),
      course: !p.categoria_is_bar ? mapNuoviCorsi[p.course] || 1 : p.course,
      is_bar: p.categoria_is_bar,
      is_pizzeria: p.categoria_is_pizzeria,
      stato: "in_attesa",
      varianti_scelte: p.varianti_scelte,
      unita_misura: p.unita_misura,
      qty_originale: p.qty,
    }));

    const payload = {
      ristorante_id: ristoranteId,
      tavolo: tavoloFinale,
      utente_id: finalUserId,
      cliente: user ? user.nome : "Ospite",
      cameriere: isStaff ? user.nome : null,
      prodotti: prodottiNormalizzati,
      totale: totaleOrdine,
      coperti: numCoperti,
    };

    try {
      const res = await fetch(`${API_URL}/api/ordine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(isStaff ? `✅ Ordine inviato (Tavolo ${tavoloFinale})` : "✅ Ordine Inviato!");
        setCarrello([]);
        setShowCheckout(false);
      } else {
        alert("Errore nell'invio dell'ordine.");
      }
    } catch (e) {
      alert("Errore connessione server.");
    }
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

  const footerBtnStyle = {
    background: "transparent",
    border: `1px solid ${style.colore_footer_text || "#888"}`,
    color: style.colore_footer_text || "#888",
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "280px",
    padding: "12px 15px",
    borderRadius: "30px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    margin: "0 auto",
  };

  // SCHERMATE DI ERRORE O SOSPENSIONE
  if (isSuspended) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background: bg, color: text }}>
        <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
        <h2 style={{color:'#e74c3c', textTransform:'uppercase'}}>SERVIZIO SOSPESO</h2>
        <p style={{fontSize:'1.2rem', opacity:0.8}}>Contatta l'amministrazione del locale.</p>
      </div>
    );
  }

  if (isMenuDisabled) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background: bg, color: text }}>
        <h1 style={{fontSize:'4rem', margin:0}}>📴</h1>
        <h2 style={{color:'#e74c3c', textTransform:'uppercase'}}>MENU NON ATTIVO</h2>
        <p style={{fontSize:'1.2rem', opacity:0.8}}>Il menu digitale non è abilitato per questo locale.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 50, textAlign: "center", color: text, background: bg, minHeight: "100vh" }}>
        <h1>⚠️ Errore Caricamento</h1>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: font, paddingBottom: 80 }}>
      <style>{`:root { color-scheme: light; } * { box-sizing: border-box; margin: 0; padding: 0; } body, html { background-color: ${bg} !important; color: ${text} !important; overflow-x: hidden; width: 100%; top: 0 !important; }`}</style>

      <MenuHeaderCover
        showCheckout={showCheckout}
        style={style}
        ristorante={ristorante}
        numeroTavolo={numeroTavolo}
        user={user}
        navigateToDashboard={() => navigate("/dashboard")}
        onShowAuth={() => setShowAuthModal(true)}
        lang={lang}
        t={t}
        priceColor={priceColor}
        tavoloBg={tavoloBg}
        tavoloText={tavoloText}
        showLangMenu={showLangMenu}
        setShowLangMenu={setShowLangMenu}
        availableLangs={availableLangs}
        cambiaLingua={cambiaLingua}
        flags={flags}
        dictionary={dictionary}
      />

      <MenuAccordion
        menu={menu}
        lang={lang}
        t={t}
        style={style}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeSubCategory={activeSubCategory}
        setActiveSubCategory={setActiveSubCategory}
        onOpenDishModal={(p) => setSelectedPiatto(p)}
        onAddToCart={(p) => aggiungiAlCarrello(p)}
        titleColor={titleColor}
        priceColor={priceColor}
        cardBg={cardBg}
        cardBorder={cardBorder}
        btnBg={btnBg}
        btnText={btnText}
        canOrder={canOrder} // Passiamo lo stato per cambiare icona (Razzo vs Lista)
      />

      <MenuFooter
        style={style}
        footerBtnStyle={footerBtnStyle}
        setUrlFileAttivo={setUrlFileAttivo}
        setTitoloFile={setTitoloFile}
        setShowFileModal={setShowFileModal}
      />

      <FileModal
        open={showFileModal}
        url={urlFileAttivo}
        title={titoloFile}
        onClose={() => setShowFileModal(false)}
        modalBg={modalBg}
        modalText={modalText}
      />

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        API_URL={API_URL}
        priceColor={priceColor}
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        authData={authData}
        setAuthData={setAuthData}
        onAuthSuccess={(u) => {
          setUser(u);
          localStorage.setItem("stark_user", JSON.stringify(u));
        }}
      />

      <DishModal
        piatto={selectedPiatto}
        lang={lang}
        t={t}
        style={style}
        canOrder={canOrder} 
        onClose={() => setSelectedPiatto(null)}
        onAddToCart={(piatto, override) => aggiungiAlCarrello(piatto, override)}
      />

      {/* CartBar visibile ANCHE se canOrder è false (Modalità Wishlist) */}
      <CartBar
        visible={carrello.length > 0 && !showCheckout && !selectedPiatto}
        style={style}
        carrelloCount={carrello.length}
        canOrder={canOrder} // Determina se giallo/razzo o blu/lista
        t={t}
        onOpenCheckout={() => setShowCheckout(true)}
      />

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
        onSendOrder={inviaOrdine}
      />
    </div>
  );
}