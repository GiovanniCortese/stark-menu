// client/src/components/menu/FileModal.jsx
import React from "react";

export default function FileModal({ open, url, title, onClose, modalBg, modalText }) {
  if (!open || !url) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 5000,
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
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          borderRadius: "15px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(0,0,0,0.03)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", color: modalText }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#f9f9f9", display: "flex", justifyContent: "center", padding: "10px" }}>
          {url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
            <img src={url} style={{ maxWidth: "100%", height: "auto", objectFit: "contain", alignSelf: "flex-start" }} alt={title} />
          ) : (
            <iframe src={url} style={{ width: "100%", height: "100%", minHeight: "500px", border: "none" }} title="Documento" />
          )}
        </div>
      </div>
    </div>
  );
}
