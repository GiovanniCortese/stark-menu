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
    maxWidth: "600px",           // ✅ come MenuAccordion (su PC non è 100%)
    margin: "0 auto",            // ✅ centrato
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
    borderRadius: "12px",        // ✅ look “card”
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)", // ✅ shadow
    overflow: "visible",         // ✅ resta come prima per non tagliare la lingua
  }}
>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.1))",
          zIndex: 1,
        }}
      />

      {/* Badge user / login */}
      <div
        className="notranslate"
        style={{ position: "absolute", top: "20px", right: "20px", zIndex: 100 }}
      >
        {user ? (
          <div
            onClick={navigateToDashboard}
            style={{
              background: "rgba(255,255,255,0.9)",
              padding: "6px 12px",
              borderRadius: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            👤 {(user.nome || "Utente").split(" ")[0]} (Area Personale)
          </div>
        ) : (
          <button
            onClick={onShowAuth}
            style={{
              background: priceColor,
              color: "white",
              border: "none",
              padding: "8px 15px",
              borderRadius: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              fontSize: "12px",
            }}
          >
            Accedi
          </button>
        )}
      </div>

      {/* Logo / titolo / tavolo / lingua */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px",
          width: "100%",
          marginTop: "50px",
        }}
      >
        {style.logo ? (
          <div
            style={{
              width: "110px",
              height: "110px",
              background: "white",
              padding: "5px",
              borderRadius: "50%",
              boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={style.logo}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              alt="logo"
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: "40px",
              background: "white",
              padding: 10,
              borderRadius: "50%",
            }}
          >
            🍽️
          </div>
        )}

        {/* prima: il nome si vedeva solo se NON c'è il logo */}
        {!style.logo && (
          <h1
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "26px",
              fontWeight: "800",
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {ristorante}
          </h1>
        )}

        {/* tavolo SOLO se presente */}
        {numeroTavolo && (
          <div
            className="notranslate"
            style={{
              background: tavoloBg,
              color: tavoloText,
              padding: "6px 18px",
              borderRadius: "50px",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            📍 Tavolo {numeroTavolo}
          </div>
        )}

        {/* lingua */}
        <div
          className="notranslate"
          style={{
            position: "relative",
            marginTop: "10px",
            // ✅ unico fix: tutto ciò che riguarda la lingua deve stare sopra a tutto
            zIndex: 999999,
          }}
        >
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "50%",
              width: "45px",
              height: "45px",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              transition: "transform 0.2s",
            }}
            aria-label="Cambia lingua"
          >
            {dictionary?.[lang] ? (flags?.[lang] || "🇮🇹") : "🇮🇹"}
          </button>

          {showLangMenu && (
            <div
              style={{
                position: "absolute",
                top: "55px", // ✅ come prima: apre verso il basso
                left: "50%",
                transform: "translateX(-50%)",
                background: "white",
                borderRadius: "10px",
                padding: "10px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
                minWidth: "120px",
                // ✅ fix: sopra a TUTTO
                zIndex: 999999,
              }}
            >
              {availableLangs.map((l) => (
                <button
                  key={l}
                  onClick={() => cambiaLingua(l)}
                  style={{
                    background: lang === l ? "#e3f2fd" : "transparent",
                    border: lang === l ? "1px solid #2196f3" : "1px solid #eee",
                    borderRadius: "5px",
                    padding: "5px",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                >
                  {flags?.[l] || "🏳️"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
