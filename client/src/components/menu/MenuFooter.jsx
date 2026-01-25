// client/src/components/menu/MenuFooter.jsx
import React from "react";

export default function MenuFooter({ style, footerBtnStyle, setUrlFileAttivo, setTitoloFile, setShowFileModal }) {
  return (
    <div
      className="notranslate"
      style={{
        textAlign: style.allineamento_footer || "center",
        padding: "20px 20px 60px 20px",
        opacity: 0.9,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
        {style.url_menu_giorno && (
          <button
            onClick={() => {
              setUrlFileAttivo(style.url_menu_giorno);
              setTitoloFile("Menù del Giorno 🥗");
              setShowFileModal(true);
            }}
            style={footerBtnStyle}
          >
            <span>🥗</span> MENÙ DEL GIORNO
          </button>
        )}

        {style.url_menu_pdf && (
          <button
            onClick={() => {
              setUrlFileAttivo(style.url_menu_pdf);
              setTitoloFile("Menù Completo 📄");
              setShowFileModal(true);
            }}
            style={footerBtnStyle}
          >
            <span>📄</span> MENÙ PDF
          </button>
        )}

        {style.url_allergeni && (
          <button
            onClick={() => {
              setUrlFileAttivo(style.url_allergeni);
              setTitoloFile("Lista Allergeni ⚠️");
              setShowFileModal(true);
            }}
            style={{ ...footerBtnStyle, opacity: 0.8 }}
          >
            <span>⚠️</span> LISTA ALLERGENI
          </button>
        )}
      </div>

      {style.info_footer && (
        <p
          style={{
            whiteSpace: "pre-line",
            marginBottom: "15px",
            color: style.colore_footer_text || style.text,
            fontSize: `${style.dimensione_footer || 12}px`,
          }}
        >
          {style.info_footer}
        </p>
      )}

      <div style={{ marginTop: 15, fontSize: 10, color: style.colore_footer_text || style.text, opacity: 0.8 }}>
        <a
          href="https://www.cosaedovemangiare.it"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none", fontWeight: "bold" }}
        >
          Powered by COSAEDOVEMANGIARE.IT
        </a>
      </div>
    </div>
  );
}
