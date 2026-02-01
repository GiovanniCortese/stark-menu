// client/src/components/menu/AuthModal.jsx
import React from "react";

export default function AuthModal({
  open,
  onClose,
  API_URL,
  priceColor,
  isRegistering,
  setIsRegistering,
  authData,
  setAuthData,
  onAuthSuccess,
}) {
  if (!open) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? "/api/register" : "/api/auth/login";

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      const data = await res.json();

      if (data.success) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        alert("Errore: " + (data.error || "Riprova"));
      }
    } catch (e) {
      alert("Errore connessione");
    }
  };

  return (
    <div
      className="notranslate"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ background: "white", width: "100%", maxWidth: "400px", borderRadius: 10, padding: 30, position: "relative" }}>
        <h2 style={{ color: "#333", textAlign: "center", marginTop: 0 }}>
          {isRegistering ? "Registrati 📝" : "Accedi 🔐"}
        </h2>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {isRegistering && (
            <input
              type="text"
              placeholder="Nome"
              required
              value={authData.nome}
              onChange={(e) => setAuthData({ ...authData, nome: e.target.value })}
              style={{ padding: 12, borderRadius: 5, border: "1px solid #ddd" }}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            required
            value={authData.email}
            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
            style={{ padding: 12, borderRadius: 5, border: "1px solid #ddd" }}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={authData.password}
            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
            style={{ padding: 12, borderRadius: 5, border: "1px solid #ddd" }}
          />

          {isRegistering && (
            <>
              <input
                type="tel"
                placeholder="Telefono"
                required
                value={authData.telefono}
                onChange={(e) => setAuthData({ ...authData, telefono: e.target.value })}
                style={{ padding: 12, borderRadius: 5, border: "1px solid #ddd" }}
              />
              <input
                type="text"
                placeholder="Indirizzo"
                value={authData.indirizzo}
                onChange={(e) => setAuthData({ ...authData, indirizzo: e.target.value })}
                style={{ padding: 12, borderRadius: 5, border: "1px solid #ddd" }}
              />
            </>
          )}

          <button
            style={{
              background: priceColor,
              color: "white",
              padding: 15,
              border: "none",
              borderRadius: 5,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {isRegistering ? "CREA ACCOUNT" : "ENTRA"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: "14px" }}>
          {isRegistering ? "Hai già un account?" : "Non hai un account?"}{" "}
          <span
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ color: "#3498db", fontWeight: "bold", cursor: "pointer", marginLeft: 5 }}
          >
            {isRegistering ? "Accedi" : "Registrati"}
          </span>
        </p>

        <button
          onClick={onClose}
          style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "#333" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
