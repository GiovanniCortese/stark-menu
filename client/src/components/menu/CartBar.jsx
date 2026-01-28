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
        // Aggiungo padding per sicurezza su iPhone (Home Indicator)
        paddingBottom: "max(10px, env(safe-area-inset-bottom))"
      }}
    >
      <div className="totale" style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: style.carrello_text || "#222" }}>
          {carrelloCount} {carrelloCount === 1 ? (t?.product || "prodotto") : (t?.products || "prodotti")}
        </span>
      </div>

      <button
        onClick={onOpenCheckout}
        className="btn-invia"
        style={{ 
          background: canOrder ? "#f1c40f" : "#3498db", // Giallo se ordini attivi, Blu se Wishlist
          color: canOrder ? "black" : "white", 
          border: "none", 
          padding: "10px 20px", 
          borderRadius: "30px", // Più rotondo per stile app
          fontWeight: "bold", 
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
        }}
      >
        {canOrder 
          ? <>{t?.see_order || "VEDI ORDINE"} 🚀</> 
          : <>{t?.wishlist || "LISTA DESIDERI"} 📝</>
        }
      </button>
    </div>
  );
}