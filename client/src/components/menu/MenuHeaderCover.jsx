// client/src/components/menu/MenuHeaderCover.jsx
import React from "react";

export default function MenuHeaderCover({
  showCheckout,
  style,
  ristorante,
  numeroTavolo,
  user,
  navigateToDashboard,
  onShowAuth,
  lang,
  t,
  priceColor,
  tavoloBg,
  tavoloText,
  showLangMenu,
  setShowLangMenu,
  availableLangs,
  cambiaLingua,
  flags,
  dictionary,
}) {
  if (showCheckout) return null;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "260px",
        backgroundImage: style.cover ? `url(${style.cover})` : "none",
        backgroundColor: "#333",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "30px 20px",
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.1))",
          zIndex: 1,
        }}
      />

      {/* Badge user / login */}
      <div
        className="notranslate"
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          zIndex: 5,
        }}
      >
        {!user ? (
          <button
            onClick={onShowAuth}
            style={{
              background: "#e74c3c",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            }}
          >
            {t?.login || "Accedi"}
          </button>
        ) : (
          <button
            onClick={navigateToDashboard}
            style={{
              background: "rgba(0,0,0,0.55)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.35)",
              padding: "8px 12px",
              borderRadius: "16px",
              cursor: "pointer",
            }}
            title="Dashboard"
          >
            👤
          </button>
        )}
      </div>

      {/* LOGO */}
      {style.logo && (
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <img
            src={style.logo}
            alt={ristorante || "Logo"}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "4px solid white",
              background: "white",
              boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
            }}
          />
        </div>
      )}

      {/* TAVOLO */}
      {!!numeroTavolo && (
        <div
          className="notranslate"
          style={{
            position: "relative",
            zIndex: 3,
            background: tavoloBg || "rgba(0,0,0,0.55)",
            color: tavoloText || "white",
            padding: "8px 14px",
            borderRadius: "18px",
            fontWeight: "bold",
            border: `1px solid ${style?.border || "rgba(255,255,255,0.25)"}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            marginBottom: "12px",
          }}
        >
          {t?.table || "Tavolo"}: {numeroTavolo}
        </div>
      )}

      {/* LINGUA */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginBottom: "8px",
        }}
      >
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.8)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            transition: "transform 0.2s",
          }}
          aria-label="Cambia lingua"
        >
          {dictionary?.[lang] ? flags?.[lang] || "🇮🇹" : "🇮🇹"}
        </button>

        {showLangMenu && (
          <div
            style={{
              position: "absolute",
              // ✅ PRIMA: top: "55px" (apriva sotto)
              // ✅ ORA: apri sopra
              top: "auto",
              bottom: "55px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              borderRadius: "10px",
              padding: "10px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
              zIndex: 9999,
              minWidth: "120px",
            }}
          >
            {availableLangs.map((l) => (
              <button
                key={l}
                onClick={() => {
                  cambiaLingua(l);
                  setShowLangMenu(false);
                }}
                style={{
                  background: l === lang ? "#111" : "#f2f2f2",
                  color: l === lang ? "white" : "#111",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "18px" }}>{flags?.[l] || "🏳️"}</span>
                <span style={{ fontSize: "12px", textTransform: "uppercase" }}>{l}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Titolo ristorante */}
      {ristorante && (
        <div
          className="notranslate"
          style={{
            position: "relative",
            zIndex: 3,
            color: style?.title || "white",
            fontSize: "22px",
            fontWeight: "bold",
            textShadow: "0 2px 10px rgba(0,0,0,0.45)",
            marginBottom: "6px",
            textAlign: "center",
          }}
        >
          {ristorante}
        </div>
      )}

      {/* Piccolo testo sotto */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          color: "rgba(255,255,255,0.85)",
          fontSize: "12px",
          marginBottom: "2px",
          textAlign: "center",
        }}
      >
        {t?.tap_to_order || ""}
      </div>
    </div>
  );
}
