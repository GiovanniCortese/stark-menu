// client/src/components/menu/Checkout.jsx
import React from "react";
import { getSafeAllergeni } from "./menuUtils";
import { getContent } from "../../../translations";

export default function Checkout({
  open,
  onClose,
  carrello,
  style,
  t,
  lang,
  titleColor,
  priceColor,
  canOrder,
  isStaffQui,
  numCoperti,
  setNumCoperti,
  onChangeCourse,
  onRemoveItem,
  onSendOrder,
}) {
  if (!open) return null;

  const canSend = canOrder || isStaffQui;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: style.checkout_bg || style.bg || "#222",
        color: style.checkout_text || style.text || "white",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        overflowY: "auto",
        zIndex: 2000,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: `1px solid ${style?.text || "#ccc"}`,
          paddingBottom: "10px",
        }}
      >
        <h2 className="notranslate" style={{ color: titleColor, margin: 0 }}>
          {/* Se non si può ordinare, cambiamo il titolo in Lista Desideri */}
          {canSend ? t?.summary || "Riepilogo Ordine" : t?.wishlist || "Lista Desideri"} 📝
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: titleColor,
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "600px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* GESTIONE COPERTI (Solo se si può ordinare) */}
        {style.prezzo_coperto > 0 && carrello.length > 0 && canSend && (
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                👥 Numero persone al tavolo
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setNumCoperti((n) => Math.max(1, n - 1))}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                -
              </button>
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>{numCoperti}</span>
              <button
                onClick={() => setNumCoperti((n) => n + 1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* CUCINA (per portate) */}
        {(() => {
          const itemsCucina = carrello.filter((i) => !i.categoria_is_bar);
          const coursePresenti = [...new Set(itemsCucina.map((i) => i.course))].sort();
          const coloriPortata = ["#27ae60", "#f1c40f", "#e67e22", "#c0392b"];
          const nomePortata = [
            null,
            t?.course_1 || "1ª PORTATA",
            t?.course_2 || "2ª PORTATA",
            t?.course_3 || "3ª PORTATA",
            t?.course_4 || "DESSERT",
          ];

          return coursePresenti.map((courseNum, index) => (
            <div key={courseNum} style={{ marginBottom: "25px" }}>
              <h3
                className="notranslate"
                style={{
                  margin: "0 0 10px 0",
                  color: coloriPortata[index] || "#ccc",
                  borderBottom: `2px solid ${coloriPortata[index] || "#ccc"}`,
                  display: "inline-block",
                  paddingRight: 20,
                }}
              >
                {nomePortata[courseNum] || `PORTATA ${courseNum}`}
              </h3>

              {itemsCucina
                .filter((i) => i.course === courseNum)
                .map((item) => {
                  const v =
                    typeof item.varianti === "string"
                      ? JSON.parse(item.varianti || "{}")
                      : item.varianti || {};
                  const allergeniItem = getSafeAllergeni(item);

                  const qtaLabel =
                    item.qty > 1 ? `x ${item.qty} ${item.unita_misura || ""}` : "";
                  const totaleRiga = Number(item.prezzo) * (item.qty || 1);

                  return (
                    <div
                      key={item.tempId}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: 15,
                        marginBottom: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            color: titleColor,
                          }}
                        >
                          {getContent(item, "nome", lang)}{" "}
                          {qtaLabel && (
                            <span style={{ color: priceColor, fontSize: "0.9rem" }}>
                              ({qtaLabel})
                            </span>
                          )}
                        </div>

                        {v.base && v.base.length > 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#999",
                              marginTop: "4px",
                            }}
                          >
                            <span className="notranslate">
                              🧂 {t?.ingredients || "Ingredienti"}:
                            </span>{" "}
                            {(() => {
                              let ingStr = v.base.join(", ");
                              let trads = item.traduzioni;
                              if (typeof trads === "string") {
                                try {
                                  trads = JSON.parse(trads);
                                } catch (e) {}
                              }
                              if (trads && trads[lang] && trads[lang].ingredienti_base) {
                                ingStr = trads[lang].ingredienti_base.join(", ");
                              }
                              return ingStr;
                            })()}
                          </div>
                        )}

                        {allergeniItem.length > 0 && (
                          <div className="notranslate" style={{ marginTop: "6px" }}>
                            {allergeniItem.filter((a) => !a.includes("❄️")).length > 0 && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#ff7675",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                }}
                              >
                                ⚠️ {t?.allergens || "Allergeni"}:{" "}
                                {allergeniItem.filter((a) => !a.includes("❄️")).join(", ")}
                              </div>
                            )}
                            {allergeniItem.some((a) => a.includes("❄️")) && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#74b9ff",
                                  fontWeight: "bold",
                                  marginTop: "2px",
                                  textTransform: "uppercase",
                                }}
                              >
                                ❄️ {t?.frozen || "Surgelato"}
                              </div>
                            )}
                          </div>
                        )}

                        {item.varianti_scelte && (
                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "5px",
                            }}
                          >
                            {item.varianti_scelte.rimozioni?.map((ing, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#c0392b",
                                  color: "white",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                }}
                              >
                                NO {ing}
                              </span>
                            ))}
                            {item.varianti_scelte.aggiunte?.map((ing, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#27ae60",
                                  color: "white",
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: "bold",
                                }}
                              >
                                + {ing.nome}
                              </span>
                            ))}
                          </div>
                        )}

                        <div
                          className="notranslate"
                          style={{
                            color: priceColor,
                            fontSize: "0.9rem",
                            marginTop: "8px",
                            fontWeight: "bold",
                          }}
                        >
                          {totaleRiga.toFixed(2)}€
                        </div>
                      </div>

                      <div
                        className="notranslate"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          marginLeft: "10px",
                        }}
                      >
                        <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                          <button
                            onClick={() => onChangeCourse(item.tempId, -1)}
                            style={{
                              background: "#ecf0f1",
                              color: "#333",
                              border: "none",
                              fontSize: "0.8rem",
                              padding: "5px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            ⬆️
                          </button>
                          <button
                            onClick={() => onChangeCourse(item.tempId, 1)}
                            style={{
                              background: "#ecf0f1",
                              color: "#333",
                              border: "none",
                              fontSize: "0.8rem",
                              padding: "5px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            ⬇️
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.tempId)}
                          style={{
                            background: "#e74c3c",
                            color: "white",
                            fontSize: "0.8rem",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ));
        })()}

        {/* BAR */}
        {carrello.some((i) => i.categoria_is_bar) && (
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              border: "1px dashed #555",
              borderRadius: "10px",
            }}
          >
            <h3
              style={{
                color: "#3498db",
                margin: "0 0 10px 0",
                fontSize: "16px",
                textTransform: "uppercase",
              }}
            >
              🍹 BEVANDE & BAR
            </h3>

            {carrello
              .filter((i) => i.categoria_is_bar)
              .map((item) => (
                <div
                  key={item.tempId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    padding: "10px",
                    marginBottom: "5px",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: titleColor,
                        fontWeight: "bold",
                        fontSize: "16px",
                      }}
                    >
                      {item.nome}{" "}
                      {item.qty > 1 && <span style={{ fontSize: "0.8em" }}>x{item.qty}</span>}
                    </div>
                    <div className="notranslate" style={{ color: "#888", fontSize: "12px" }}>
                      {(Number(item.prezzo) * (item.qty || 1)).toFixed(2)}€
                    </div>
                  </div>

                  <button
                    className="notranslate"
                    onClick={() => onRemoveItem(item.tempId)}
                    style={{
                      background: "#e74c3c",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Footer checkout: quando ordini sono chiusi NON mostriamo nulla */}
        <div
          className="notranslate"
          style={{
            marginTop: "20px",
            borderTop: `1px solid ${style?.text || "#ccc"}`,
            paddingTop: "20px",
          }}
        >
          {/* ✅ Bottone invio SOLO se si può ordinare */}
          {carrello.length > 0 && canSend && (
            <button
              onClick={onSendOrder}
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "18px",
                background: "#159709ff",
                color: "white",
                border: `1px solid ${style?.text || "#ccc"}`,
                borderRadius: "30px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {isStaffQui ? "INVIA ORDINE STAFF 🚀" : (t?.confirm || "CONFERMA E INVIA") + " 🚀"}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "15px",
              marginTop: "10px",
              background: "transparent",
              border: `1px solid ${style?.text || "#ccc"}`,
              color: style?.text || "#ccc",
              borderRadius: "30px",
              cursor: "pointer",
            }}
          >
            {t?.back || "Torna al Menu"}
          </button>
        </div>
      </div>
    </div>
  );
}
