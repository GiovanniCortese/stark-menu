// client/src/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 🚀 GOD MODE CHECK: Controllo Automatico all'avvio
  useEffect(() => {
    const checkGodMode = async () => {
      const godToken = localStorage.getItem("admin_token");
      
      // Se troviamo il token speciale salvato dal SuperAdmin
      if (godToken === "SUPER_GOD_TOKEN_2026") {
        console.log("🚀 God Mode Rilevato. Tentativo accesso automatico...");
        
        // Recuperiamo i dati target salvati
        const targetSlug = localStorage.getItem("superadmin_target_slug");
        const storedUser = localStorage.getItem("user");
        const targetEmail = storedUser ? JSON.parse(storedUser).email : "";

        if (targetEmail) {
            // Tentiamo il login automatico usando il token come password
            await performLogin(targetEmail, godToken, targetSlug);
        }
      }
    };
    
    checkGodMode();
  }, []);

  const performLogin = async (userEmail, userPassword, redirectSlug = null) => {
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });
      
      const data = await res.json();

      if (data.success) {
        // 🧹 Pulizia: se l'accesso avviene tramite God Mode, rimuoviamo il token per sicurezza
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
             localStorage.removeItem("admin_token"); 
        }

        // 1. Salviamo i dati dell'utente loggato
        localStorage.setItem("user", JSON.stringify(data.user));

        // ⚡ FIX DOPPIO LOGIN: Creiamo il passaporto per Admin.jsx
        // Determiniamo lo slug (priorità ai dati del server, poi al redirect salvato)
        const finalSlug = data.user.slug || redirectSlug;
        
        if (finalSlug) {
            localStorage.setItem(`stark_admin_session_${finalSlug}`, "true");
        }
        
        // 🎯 LOGICA REDIRECT INTELLIGENTE
        if (data.user.role === "superadmin" && !finalSlug) {
            navigate("/super-admin");
        } else if (finalSlug) {
            navigate(`/admin/${finalSlug}`);
        } else {
            navigate("/admin");
        }

      } else {
        setError("Accesso Negato: " + data.error);
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
            localStorage.removeItem("admin_token");
            alert("Errore God Mode: " + data.error);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Errore di connessione al server.");
    }
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div style={{
      height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", 
      background: "#0a0a0a", color: "white", fontFamily: "sans-serif"
    }}>
      <div style={{
        padding: "40px", background: "#151515", borderRadius: "12px", 
        border: "1px solid #333", width: "100%", maxWidth: "400px", textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        <h1 style={{ color: "#e74c3c", marginBottom: "20px", letterSpacing: "1px" }}>🔒 AREA RISERVATA</h1>
        
        {error && <p style={{background: "#c0392b", padding: "12px", borderRadius: "5px", fontSize: "14px", marginBottom: "15px"}}>{error}</p>}

        <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "14px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "white", outline: "none" }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "14px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "white", outline: "none" }}
            required
          />
          <button type="submit" style={{
            padding: "15px", background: "#e74c3c", color: "white", 
            border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "16px",
            transition: "0.3s", marginTop: "10px"
          }}>
            ENTRA
          </button>
        </form>
        
        <p style={{marginTop: "25px", fontSize: "11px", color: "#555", textTransform: "uppercase"}}>
            Stark Industries Security Protocol v103.2
        </p>
      </div>
    </div>
  );
}

export default Login;