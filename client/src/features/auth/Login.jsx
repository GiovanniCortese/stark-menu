// client/src/Login.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Usiamo un ref per impedire la doppia esecuzione in React Strict Mode
  const godModeAttempted = useRef(false);

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 🚀 GOD MODE CHECK: Controllo Automatico all'avvio
  useEffect(() => {
    const checkGodMode = async () => {
      // Se abbiamo già provato, fermati.
      if (godModeAttempted.current) return;
      godModeAttempted.current = true;

      const godToken = localStorage.getItem("admin_token");
      
      if (godToken === "SUPER_GOD_TOKEN_2026") {
        console.log("🚀 God Mode Rilevato. Avvio procedura...");
        setIsLoading(true);
        
        const storedUser = localStorage.getItem("user");
        const targetEmail = storedUser ? JSON.parse(storedUser).email : "";

        if (!targetEmail) {
            console.warn("Nessuna email trovata per God Mode.");
            setIsLoading(false);
            return;
        }

        // Tentiamo il login
        await performLogin(targetEmail, godToken);
      }
    };
    
    checkGodMode();
  }, []);

  const performLogin = async (userEmail, userPassword, redirectSlug = null) => {
    // Non resettiamo isLoading qui se siamo in god mode automatico per evitare flicker
    if (userPassword !== "SUPER_GOD_TOKEN_2026") setIsLoading(true);
    setError("");

    try {
      const endpoint = `${API_URL}/api/auth/login`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Errore Server (${res.status}): ${errorText.slice(0, 50)}`);
      }
      
      const data = await res.json();

      if (data.success) {
        console.log("Login riuscito! Reindirizzamento in corso...");
        
        // Pulizia God Mode
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
             localStorage.removeItem("admin_token"); 
        }

        localStorage.setItem("user", JSON.stringify(data.user));

        const finalSlug = data.user.slug || redirectSlug;
        if (finalSlug) {
            localStorage.setItem(`stark_admin_session_${finalSlug}`, "true");
        }
        
        // 🛑 IMPORTANTE: Non chiamiamo setIsLoading(false) qui! 
        // Lasciamo che il componente "muoia" mentre carica, per evitare l'errore removeChild.
        
        // Redirect
        if (data.user.role === "superadmin" && !finalSlug) {
            navigate("/super-admin", { replace: true });
        } else if (finalSlug) {
            navigate(`/admin/${finalSlug}`, { replace: true });
        } else {
            navigate("/admin", { replace: true });
        }

      } else {
        // Qui dobbiamo resettare perché l'utente rimane sulla pagina
        setError("Accesso Negato: " + (data.error || "Errore sconosciuto"));
        setIsLoading(false);
        
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
            localStorage.removeItem("admin_token");
        }
      }
    } catch (err) {
      console.error("Errore Login:", err);
      setError(err.message || "Errore di connessione.");
      setIsLoading(false);
      
      if (userPassword === "SUPER_GOD_TOKEN_2026") {
          localStorage.removeItem("admin_token");
      }
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
        <h1 style={{ color: "#e74c3c", marginBottom: "20px", letterSpacing: "1px" }}>
           {isLoading ? "🔄 ACCESSO..." : "🔒 AREA RISERVATA"}
        </h1>
        
        {error && <div style={{
            background: "rgba(192, 57, 43, 0.2)", border: "1px solid #c0392b", 
            color: "#e74c3c", padding: "12px", borderRadius: "5px", fontSize: "13px", marginBottom: "15px",
            textAlign: "left"
        }}>
            ⚠️ {error}
        </div>}

        <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            style={{ padding: "14px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "white", outline: "none" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            style={{ padding: "14px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "white", outline: "none" }}
          />
          <button type="submit" disabled={isLoading} style={{
            padding: "15px", background: isLoading ? "#555" : "#e74c3c", color: "white", 
            border: "none", borderRadius: "6px", fontWeight: "bold", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "16px",
            transition: "0.3s", marginTop: "10px"
          }}>
            {isLoading ? "VERIFICA IN CORSO..." : "ENTRA"}
          </button>
        </form>
        
        <p style={{marginTop: "25px", fontSize: "11px", color: "#555", textTransform: "uppercase"}}>
            Stark Industries Security Protocol v103.5
        </p>
      </div>
    </div>
  );
}

export default Login;