// client/src/components/menu/ProductCard.jsx
import React from "react";
import { getSafeVariants, getSafeAllergeni, getSafeCatVariants } from "./menuUtils";
import { getContent } from "../../translations";

export default function ProductCard({
  prodotto,
  lang,
  t,
  style,
  onOpenDishModal,
  onAddToCart,
  cardBg,
  cardBorder,
  btnBg,
  btnText,
  priceColor,
}) {
  const vSafe = getSafeVariants(prodotto);
  const allergeniSafe = getSafeAllergeni(prodotto);
  const baseList = vSafe.base;

  const safeCatVars = getSafeCatVariants(prodotto.categoria_varianti);
  const addList = vSafe.aggiunte.length > 0 ? vSafe.aggiunte : safeCatVars;

  let ingStr = "";
  let trads = prodotto.traduzioni;
  if (typeof trads === "string") {
    try {
      trads = JSON.parse(trads);
    } catch (e) {}
  }

  if (
    trads &&
    trads[lang] &&
    trads[lang].ingredienti_base &&
    Array.isArray(trads[lang].ingredienti_base) &&
    trads[lang].ingredienti_base.length > 0
  ) {
    ingStr = trads[lang].ingredienti_base.join(", ");
  } else {
    ingStr = baseList.join(", ");
  }

  const hasBase = baseList.length > 0;
  const hasExtras = addList.length > 0;
  const hasVarianti = hasBase || hasExtras;
  const hasUnit = !!prodotto.unita_misura;

  const nomeProdotto = getContent(prodotto, "nome", lang);
  const descProdotto = getContent(prodotto, "descrizione", lang);

  const simboloEuro = style.nascondi_euro ? "" : "€";
  const unitaMisura = prodotto.unita_misura ? ` ${prodotto.unita_misura}` : "";

  const hasImage = !!prodotto.immagine_url;

  return (
    <div
      key={prodotto.id}
      className="card"
      onClick={() => (hasImage ? onOpenDishModal(prodotto) : null)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "15px",
        padding: "10px",
        width: "100%",
        boxSizing: "border-box",
        cursor: hasImage ? "pointer" : "default",
        backgroundColor: cardBg,
        borderBottom: `1px solid ${cardBorder}`,
      }}
    >
      {prodotto.immagine_url && (
        <img
          src={prodotto.immagine_url}
          style={{
            width: "70px",
            height: "70px",
            objectFit: "cover",
            borderRadius: "5px",
            flexShrink: 0,
            border: "1px solid #ddd",
          }}
          alt={nomeProdotto}
        />
      )}

      <div className="info" style={{ flex: 1 }}>
        <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", color: style.text || "#222", lineHeight: 1.2 }}>
          {nomeProdotto}
        </h3>

        {descProdotto && (
          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 2px 0", lineHeight: 1.1 }}>
            {descProdotto}
          </p>
        )}

        {ingStr && (
          <p style={{ fontSize: "11px", color: "#555", fontStyle: "italic", margin: "0 0 2px 0", lineHeight: 1.1 }}>
            <span className="notranslate" style={{ fontWeight: "bold" }}>
              {t?.ingredients || "Ingredienti"}:
            </span>{" "}
            {ingStr}
          </p>
        )}

        {addList.length > 0 && (
          <p style={{ fontSize: "10px", color: "#2980b9", marginTop: "2px", lineHeight: 1.1 }}>
            <span style={{ fontWeight: "bold" }}>✨ Extra:</span>{" "}
            {(() => {
              let translatedNames = [];
              const useProductVariants = vSafe.aggiunte.length > 0;

              if (useProductVariants) {
                if (trads && trads[lang] && trads[lang].varianti) translatedNames = trads[lang].varianti;
              } else {
                let catTrads = prodotto.categoria_traduzioni;
                if (typeof catTrads === "string") {
                  try {
                    catTrads = JSON.parse(catTrads);
                  } catch (e) {}
                }
                if (catTrads && catTrads[lang] && catTrads[lang].varianti) translatedNames = catTrads[lang].varianti;
              }

              return addList
                .map((a, i) => translatedNames[i] || (a && a.nome ? a.nome : ""))
                .join(", ");
            })()}
          </p>
        )}

        {allergeniSafe.length > 0 && (
          <div style={{ marginTop: "2px", display: "flex", flexDirection: "column", gap: "1px" }}>
            {allergeniSafe.filter((a) => !a.includes("❄️") && !a.includes("Surgelato")).length > 0 && (
              <div className="notranslate" style={{ fontSize: "10px", color: "#e74c3c", fontWeight: "bold", textTransform: "uppercase" }}>
                ⚠️ {t?.allergens || "Allergeni"}:{" "}
                {allergeniSafe.filter((a) => !a.includes("❄️") && !a.includes("Surgelato")).join(", ")}
              </div>
            )}
            {allergeniSafe.some((a) => a.includes("❄️") || a.includes("Surgelato")) && (
              <div className="notranslate" style={{ fontSize: "10px", color: "#3498db", fontWeight: "bold", textTransform: "uppercase" }}>
                ❄️ {t?.frozen || "Surgelato"}
              </div>
            )}
          </div>
        )}

        <div className="notranslate" style={{ fontSize: "14px", fontWeight: "bold", color: priceColor, marginTop: "4px" }}>
          {Number(prodotto.prezzo).toFixed(2)}
          {simboloEuro}
          {unitaMisura}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
        {hasVarianti && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenDishModal(prodotto);
            }}
            className="notranslate"
            style={{ fontSize: "18px", color: "#e67e22", cursor: "pointer", padding: "5px" }}
            title="Personalizza"
          >
            ✏️
          </div>
        )}

        <button
          className="notranslate"
          onClick={(e) => {
            e.stopPropagation();
            if (hasUnit) {
              onOpenDishModal(prodotto);
            } else {
              onAddToCart(prodotto);
            }
          }}
          style={{
            background: btnBg,
            color: btnText,
            borderRadius: "50%",
            width: "35px",
            height: "35px",
            border: "none",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
          aria-label="Aggiungi"
        >
          +
        </button>
      </div>
    </div>
  );
}
