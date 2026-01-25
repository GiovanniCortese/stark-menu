// client/src/components/menu/CartBar.jsx
import React from "react";

export default function CartBar({ visible, style, carrelloCount, canOrder, t, onOpenCheckout }) {
  if (!visible) return null;

  return (
    <div
      className="carrello-bar notranslate"
      style={{
        background: style.carrello_bg || "white",
        color: style.carrello_text || "#000",
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 10000,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        transform: "translateZ(0)",
        willChange: "transform",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
      }}
    >
      <div className="totale" style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: style.carrello_text || "#222" }}>
          {carrelloCount} prodotti
        </span>
      </div>

      <button
        onClick={onOpenCheckout}
        className="btn-invia"
        style={{ background: canOrder ? "#f1c40f" : "#3498db", color: canOrder ? "black" : "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}
      >
        {canOrder ? `${t?.see_order || "VEDI ORDINE"} 📝` : `${t?.see_order || "VEDI ORDINE"} 👀`}
      </button>
    </div>
  );
}
