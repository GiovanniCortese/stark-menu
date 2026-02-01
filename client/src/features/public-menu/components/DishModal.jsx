// client/src/components/menu/DishModal.jsx
import React, { useMemo, useState } from "react";
import { getSafeVariants, getSafeAllergeni, getSafeCatVariants } from "./menuUtils";
import { getContent } from "../../translations";

export default function DishModal({ piatto, lang, t, style, canOrder, onClose, onAddToCart }) {
  const [tempVarianti, setTempVarianti] = useState({ rimozioni: [], aggiunte: [] });
  const [qtyModal, setQtyModal] = useState(1);

  // reset quando cambia piatto
  React.useEffect(() => {
    if (!piatto) return;
    setTempVarianti({ rimozioni: [], aggiunte: [] });
    setQtyModal(piatto.qta_minima ? parseFloat(piatto.qta_minima) : 1);
  }, [piatto?.id]); // eslint-disable-line

  const modalData = useMemo(() => {
    if (!piatto) return null;

    const vSafe = getSafeVariants(piatto);
    const allergeniSafe = getSafeAllergeni(piatto);

    let baseList = vSafe.base;
    let trads = piatto.traduzioni;
    if (typeof trads === "string") {
      try {
        trads = JSON.parse(trads);
      } catch (e) {}
    }

    if (trads && trads[lang] && trads[lang].ingredienti_base && Array.isArray(trads[lang].ingredienti_base)) {
      baseList = trads[lang].ingredienti_base;
    }

    const useProductVariants = vSafe.aggiunte.length > 0;
    const safeCatVars = getSafeCatVariants(piatto.categoria_varianti);
    const rawAddList = useProductVariants ? vSafe.aggiunte : safeCatVars;

    let translatedNames = [];
    if (useProductVariants) {
      if (trads && trads[lang] && trads[lang].varianti) translatedNames = trads[lang].varianti;
    } else {
      let catTrads = piatto.categoria_traduzioni;
      if (typeof catTrads === "string") {
        try {
          catTrads = JSON.parse(catTrads);
        } catch (e) {}
      }
      if (catTrads && catTrads[lang] && catTrads[lang].varianti) translatedNames = catTrads[lang].varianti;
    }

    const addList = rawAddList.map((item, idx) => ({ ...item, nome: translatedNames[idx] || item.nome }));

    const extraPrezzoUnitario = (tempVarianti?.aggiunte || []).reduce((acc, item) => acc + item.prezzo, 0);
    const prezzoBaseUnitario = Number(piatto.prezzo);
    const prezzoTotalePiatto = (prezzoBaseUnitario + extraPrezzoUnitario) * qtyModal;

    return {
      nome: getContent(piatto, "nome", lang),
      desc: getContent(piatto, "descrizione", lang),
      minimo: piatto.qta_minima ? parseFloat(piatto.qta_minima) : 1,
      allergeni: allergeniSafe,
      baseList,
      addList,
      prezzoTotale: prezzoTotalePiatto,
      prezzoBase: prezzoBaseUnitario,
      extraSingle: extraPrezzoUnitario,
    };
  }, [piatto, lang, qtyModal, tempVarianti]);

  if (!piatto || !modalData) return null;

  const cardBg = style.card_bg || "white";
  const modalBg = style.colore_modal_bg || cardBg || "#fff";
  const modalText = style.colore_modal_text || "#000";
  const priceColor = style.price || "#27ae60";

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: modalBg,
          color: modalText,
          borderRadius: "15px",
          overflow: "hidden",
          maxWidth: "600px",
          width: "100%",
          height: "90vh",
          maxHeight: "800px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* FOTO FISSA */}
        {piatto.immagine_url && (
          <div style={{ width: "100%", height: "220px", flexShrink: 0, overflow: "hidden", position: "relative" }}>
            <img src={piatto.immagine_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={modalData.nome} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }} />
          </div>
        )}

        {/* CHIUDI */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "white",
            color: "black",
            border: "2px solid black",
            borderRadius: "50%",
            width: "35px",
            height: "35px",
            cursor: "pointer",
            zIndex: 10,
            fontSize: "18px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
          }}
        >
          ✕
        </button>

        {/* HEADER INFO */}
        <div style={{ padding: "20px 20px 10px 20px", flexShrink: 0, background: modalBg, borderBottom: "1px solid #f0f0f0", zIndex: 2 }}>
          <h2 style={{ margin: "0 0 5px 0", fontSize: "1.6rem", color: "#000", fontWeight: "800", lineHeight: 1.2 }}>
            {modalData.nome}
          </h2>

          <p style={{ color: "#666", fontSize: "0.95rem", lineHeight: 1.4, marginBottom: "10px" }}>
            {modalData.desc}
          </p>

          {/* Quantità (unità misura) */}
          {piatto.unita_misura && (
            <div
              style={{
                marginBottom: "10px",
                padding: "10px",
                background: "#e1f5fe",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#0277bd", textTransform: "uppercase" }}>
                  Quantità ({piatto.unita_misura})
                </div>
                <div style={{ fontSize: "10px", color: "#555" }}>Minimo: {modalData.minimo}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => setQtyModal((q) => Math.max(modalData.minimo, q - 1))}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "white", color: "#0277bd", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}
                  disabled={qtyModal <= modalData.minimo}
                >
                  -
                </button>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: "#0277bd" }}>{qtyModal}</span>
                <button
                  onClick={() => setQtyModal((q) => q + 1)}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "white", color: "#0277bd", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Allergeni */}
          {modalData.allergeni.length > 0 && (
            <div className="notranslate" style={{ padding: "8px", background: "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
              {modalData.allergeni.filter((a) => !a.includes("❄️")).length > 0 && (
                <div style={{ fontSize: "11px", color: "#e74c3c", fontWeight: "900", textTransform: "uppercase", marginBottom: "2px" }}>
                  ⚠️ {t?.allergens || "Allergeni"}: {modalData.allergeni.filter((a) => !a.includes("❄️")).join(", ")}
                </div>
              )}
              {modalData.allergeni.some((a) => a.includes("❄️")) && (
                <div style={{ fontSize: "11px", color: "#3498db", fontWeight: "900", textTransform: "uppercase" }}>
                  ❄️ {t?.frozen || "Surgelato"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CORPO SCROLL */}
        <div style={{ padding: "10px 20px 20px 20px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ marginTop: "10px" }}>
            {modalData.baseList.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 className="notranslate" style={{ margin: "0 0 10px 0", color: "#333" }}>
                  {t?.ingredients || "Ingredienti"} (Togli)
                </h4>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {modalData.baseList.map((ing, idx) => {
                    const isRemoved = tempVarianti.rimozioni.includes(ing);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const newRimozioni = isRemoved
                            ? tempVarianti.rimozioni.filter((i) => i !== ing)
                            : [...tempVarianti.rimozioni, ing];
                          setTempVarianti({ ...tempVarianti, rimozioni: newRimozioni });
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "20px",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          background: isRemoved ? "#ffebee" : "#e8f5e9",
                          color: isRemoved ? "#c62828" : "#2e7d32",
                          border: isRemoved ? "1px solid #ef9a9a" : "1px solid #a5d6a7",
                          textDecoration: isRemoved ? "line-through" : "none",
                        }}
                      >
                        {isRemoved ? `No ${ing}` : ing}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {modalData.addList.length > 0 && (
              <div style={{ paddingBottom: "20px" }}>
                <h4 className="notranslate" style={{ margin: "0 0 10px 0", color: "#333" }}>
                  Extra 😋
                </h4>

                {modalData.addList.map((extra, idx) => {
                  const extraName = extra.nome;
                  const isAdded = tempVarianti.aggiunte.some((a) => a.nome === extraName);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        const newAggiunte = isAdded
                          ? tempVarianti.aggiunte.filter((a) => a.nome !== extraName)
                          : [...tempVarianti.aggiunte, extra];
                        setTempVarianti({ ...tempVarianti, aggiunte: newAggiunte });
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "15px",
                        marginBottom: "8px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        background: isAdded ? "#e3f2fd" : "white",
                        border: isAdded ? "2px solid #2196f3" : "1px solid #eee",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: isAdded ? "5px solid #2196f3" : "2px solid #ccc",
                            background: "white",
                          }}
                        />
                        <span style={{ fontWeight: isAdded ? "bold" : "500", fontSize: "15px" }}>{extraName}</span>
                      </div>
                      <span className="notranslate" style={{ fontWeight: "bold", color: priceColor }}>
                        +{Number(extra.prezzo).toFixed(2)}€
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER FISSO */}
        <div
          style={{
            padding: "15px 20px",
            background: "white",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            boxShadow: "0 -5px 15px rgba(0,0,0,0.05)",
            zIndex: 20,
          }}
        >
          <div className="notranslate" style={{ fontSize: "1.5rem", fontWeight: "800", color: "#2c3e50" }}>
            {modalData.prezzoTotale.toFixed(2)}€
          </div>

          <button
            className="notranslate"
            onClick={() => {
              const prezzoFinaleUnitario = modalData.prezzoBase + (modalData.extraSingle || 0);
              onAddToCart(piatto, {
                qty: qtyModal,
                nome: modalData.nome,
                prezzo: prezzoFinaleUnitario,
                varianti_scelte: tempVarianti,
              });
              onClose();
            }}
            style={{
              background: priceColor,
              color: "white",
              padding: "12px 30px",
              borderRadius: "30px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            }}
          >
            {canOrder ? t?.add || "AGGIUNGI" : "LISTA"}
          </button>
        </div>
      </div>
    </div>
  );
}
