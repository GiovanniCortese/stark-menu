// client/src/components/menu/MenuAccordion.jsx
import React from "react";
import ProductCard from "./ProductCard";
import { getContent } from "../../translations";

export default function MenuAccordion({
  menu,
  lang,
  t,
  style,
  activeCategory,
  setActiveCategory,
  activeSubCategory,
  setActiveSubCategory,
  onOpenDishModal,
  onAddToCart,
  titleColor,
  priceColor,
  cardBg,
  cardBorder,
  btnBg,
  btnText,
}) {
  const categorieUniche = [...new Set(menu.map((p) => p.categoria_nome || p.categoria))];

  const toggleAccordion = (catNome) => {
    if (activeCategory === catNome) {
      setActiveCategory(null);
      setActiveSubCategory(null);
    } else {
      setActiveCategory(catNome);
      setActiveSubCategory(null);
      setTimeout(() => {
        const elem = document.getElementById(`cat-${catNome}`);
        if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const toggleSubAccordion = (subName) => {
    if (activeSubCategory === subName) {
      setActiveSubCategory(null);
    } else {
      setActiveSubCategory(subName);
      setTimeout(() => {
        const safeId = `sub-${subName.replace(/[^a-zA-Z0-9]/g, "")}`;
        const elem = document.getElementById(safeId);
        if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  return (
    <div style={{ paddingBottom: "10px", marginTop: "10px", width: "100%", maxWidth: "600px", margin: "0 auto" }}>
      {categorieUniche.map((catNome) => (
        <div
          key={catNome}
          id={`cat-${catNome}`}
          className="accordion-item"
          style={{ marginBottom: "2px", borderRadius: "5px", overflow: "hidden", width: "100%" }}
        >
          <div
            onClick={() => toggleAccordion(catNome)}
            style={{
              background: activeCategory === catNome ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.1)",
              color: titleColor,
              padding: "15px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: activeCategory === catNome ? `1px solid ${priceColor}` : "none",
            }}
          >
            {(() => {
              const sampleCat = menu.find((p) => (p.categoria_nome || p.categoria) === catNome);
              let catNomeDisplay = catNome;

              if (sampleCat) {
                const objForTrans = {
                  nome: sampleCat.categoria_nome,
                  traduzioni:
                    typeof sampleCat.categoria_traduzioni === "string"
                      ? JSON.parse(sampleCat.categoria_traduzioni || "{}")
                      : sampleCat.categoria_traduzioni || {},
                };
                catNomeDisplay = getContent(objForTrans, "nome", lang) || catNome;
              }

              return <h2 style={{ margin: 0, fontSize: "18px", color: titleColor, width: "100%" }}>{catNomeDisplay}</h2>;
            })()}

            <span style={{ color: titleColor }}>{activeCategory === catNome ? "▼" : "▶"}</span>
          </div>

          {activeCategory === catNome && (
            <div className="accordion-content" style={{ padding: 0, background: "rgba(0,0,0,0.2)", width: "100%" }}>
              {/* descrizione categoria */}
              {(() => {
                const sampleProd = menu.find((p) => (p.categoria_nome || p.categoria) === catNome);
                let catDesc = "";
                if (sampleProd) {
                  const objForTrans = {
                    descrizione: sampleProd.categoria_descrizione,
                    traduzioni:
                      typeof sampleProd.categoria_traduzioni === "string"
                        ? JSON.parse(sampleProd.categoria_traduzioni || "{}")
                        : sampleProd.categoria_traduzioni || {},
                  };
                  catDesc = getContent(objForTrans, "descrizione", lang);
                }

                if (catDesc) {
                  return (
                    <div
                      style={{
                        padding: "15px",
                        fontStyle: "italic",
                        color: style.text,
                        opacity: 0.8,
                        fontSize: "14px",
                        borderBottom: `1px solid ${style.card_border || "#eee"}`,
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {catDesc}
                    </div>
                  );
                }
                return null;
              })()}

              {(() => {
                const piattiCat = menu.filter((p) => (p.categoria_nome || p.categoria) === catNome);

                const sottoCats = piattiCat.reduce((acc, p) => {
                  let sc = "Generale";
                  if (p.sottocategoria && p.sottocategoria.trim().length > 0) {
                    sc = getContent(p, "sottocategoria", lang) || p.sottocategoria;
                  }
                  if (!acc[sc]) acc[sc] = [];
                  acc[sc].push(p);
                  return acc;
                }, {});

                const subKeys = Object.keys(sottoCats);
                subKeys.sort((a, b) => {
                  const minA = Math.min(...sottoCats[a].map((p) => p.posizione || 0));
                  const minB = Math.min(...sottoCats[b].map((p) => p.posizione || 0));
                  return minA - minB;
                });

                const isSingleGroup = subKeys.length === 1 && subKeys[0] === "Generale";

                return subKeys.map((scKey) => (
                  <div key={scKey} style={{ width: "100%" }}>
                    {!isSingleGroup && (
                      <div
                        id={`sub-${scKey.replace(/[^a-zA-Z0-9]/g, "")}`}
                        onClick={() => toggleSubAccordion(scKey)}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          borderLeft: `4px solid ${priceColor}`,
                          padding: "10px",
                          margin: "1px 0",
                          width: "100%",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h3
                          className="notranslate"
                          style={{ margin: 0, fontSize: "16px", color: titleColor, textTransform: "uppercase" }}
                        >
                          {scKey === "Generale" ? t?.others || "Altri Piatti" : scKey}
                        </h3>
                        <span style={{ color: titleColor, fontWeight: "bold" }}>{activeSubCategory === scKey ? "▼" : "▶"}</span>
                      </div>
                    )}

                    {(isSingleGroup || activeSubCategory === scKey) && (
                      <div className="menu-list" style={{ padding: 0, width: "100%" }}>
                        {sottoCats[scKey].map((prodotto) => (
                          <ProductCard
                            key={prodotto.id}
                            prodotto={prodotto}
                            lang={lang}
                            t={t}
                            style={style}
                            onOpenDishModal={onOpenDishModal}
                            onAddToCart={onAddToCart}
                            cardBg={cardBg}
                            cardBorder={cardBorder}
                            btnBg={btnBg}
                            btnText={btnText}
                            priceColor={priceColor}
                          />
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
  );
}
