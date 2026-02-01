// client/src/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Nuovo stato per feedback visivo
  const navigate = useNavigate();

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 🚀 GOD MODE CHECK: Controllo Automatico all'avvio
  useEffect(() => {
    const checkGodMode = async () => {
      const godToken = localStorage.getItem("admin_token");
      
      // Se troviamo il token speciale
      if (godToken === "SUPER_GOD_TOKEN_2026") {
        console.log("🚀 God Mode Rilevato. Tentativo accesso automatico...");
        setIsLoading(true);
        
        // Recuperiamo l'email salvata. 
        // NOTA: Se sei SuperAdmin e non stai impersonando nessuno, assicurati che ci sia un'email valida qui.
        const storedUser = localStorage.getItem("user");
        let targetEmail = storedUser ? JSON.parse(storedUser).email : "";

        // FALLBACK: Se non c'è email salvata ma c'è il token, prova con un'email di default o ferma il god mode
        if (!targetEmail) {
            console.warn("God Mode presente ma nessuna email trovata nel localStorage.");
            // Opzionale: Se hai una mail superadmin fissa, potresti usarla qui come fallback
            // targetEmail = "tony@stark.com"; 
            setIsLoading(false);
            return;
        }

        if (targetEmail) {
            // Tentiamo il login automatico
            await performLogin(targetEmail, godToken);
        }
      }
    };
    
    checkGodMode();
  }, []);

  const performLogin = async (userEmail, userPassword, redirectSlug = null) => {
    setIsLoading(true);
    setError(""); // Resetta errori precedenti

    try {
      console.log(`Tentativo login verso: ${API_URL}/api/login`);
      
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });

      // Controlliamo se la risposta è ok PRIMA di convertire in JSON
      // Questo evita l'errore "Unexpected token <" se il server risponde con HTML (errore 500/404)
      if (!res.ok) {
        const errorText = await res.text(); // Leggiamo come testo per vedere l'errore reale
        throw new Error(`Errore Server (${res.status}): ${errorText.slice(0, 100)}`); // Mostra i primi 100 caratteri dell'errore
      }
      
      const data = await res.json();

      if (data.success) {
        console.log("Login riuscito!");
        
        // 🧹 Pulizia God Mode post-login
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
             localStorage.removeItem("admin_token"); 
        }

        // 1. Salviamo l'utente
        localStorage.setItem("user", JSON.stringify(data.user));

        // ⚡ FIX PASSAPORTO: Usiamo lo slug corretto
        const finalSlug = data.user.slug || redirectSlug;
        if (finalSlug) {
            // Importante: Admin.jsx (in features/admin) controllerà questa chiave
            localStorage.setItem(`stark_admin_session_${finalSlug}`, "true");
        }
        
        // 3. Redirect Intelligente
        setIsLoading(false);
        if (data.user.role === "superadmin" && !finalSlug) {
            navigate("/super-admin");
        } else if (finalSlug) {
            navigate(`/admin/${finalSlug}`);
        } else {
            navigate("/admin");
        }

      } else {
        // Errore logico (es. password errata)
        setError("Accesso Negato: " + data.error);
        setIsLoading(false);
        
        // Se fallisce il god mode, distruggiamolo per evitare loop
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
            console.error("God Mode fallito. Rimozione token.");
            localStorage.removeItem("admin_token");
        }
      }
    } catch (err) {
      console.error("Errore Fetch:", err);
      // Mostriamo l'errore specifico a video invece del generico "Errore connessione"
      setError(err.message || "Errore di connessione al server.");
      setIsLoading(false);
      
      // Se è un errore di rete durante il God Mode, meglio pulire per non bloccare l'app
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
            Stark Industries Security Protocol v103.3
        </p>
      </div>
    </div>
  );
}

export default Login;