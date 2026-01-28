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
        
        // Recuperiamo i dati target salvati dal Razzo
        const targetSlug = localStorage.getItem("superadmin_target_slug");
        const targetEmail = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email : "";

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
        // Puliamo il token god mode per evitare loop infiniti se si fa logout
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
             localStorage.removeItem("admin_token"); 
        }

        // Salviamo l'utente reale
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Redirect intelligente
        const dest = redirectSlug ? `/admin/${redirectSlug}` : `/admin/${data.user.slug}`;
        navigate(dest);
      } else {
        setError("Accesso Negato: " + data.error);
        // Se fallisce il god mode, puliamo tutto
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
      background: "#111", color: "white", fontFamily: "sans-serif"
    }}>
      <div style={{
        padding: "40px", background: "#1a1a1a", borderRadius: "12px", 
        border: "1px solid #333", width: "100%", maxWidth: "400px", textAlign: "center"
      }}>
        <h1 style={{ color: "#e74c3c", marginBottom: "20px" }}>🔐 Accesso Area</h1>
        
        {error && <p style={{background: "#c0392b", padding: "10px", borderRadius: "5px", fontSize: "14px"}}>{error}</p>}

        <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
          />
          <button type="submit" style={{
            padding: "15px", background: "#e74c3c", color: "white", 
            border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "16px"
          }}>
            ENTRA
          </button>
        </form>
        
        <p style={{marginTop: "20px", fontSize: "12px", color: "#666"}}>
            Stark Industries Secure Server
        </p>
      </div>
    </div>
  );
}

export default Login;