// client/src/features/auth/Login.jsx - VERSIONE V103 (STILE MODERNO & COMPATIBILE) 🔐
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // URL del Backend Cloud (Definito localmente per sicurezza)
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
        
        // Recuperiamo l'email simulata salvata dal SuperAdmin (chiave "user" per compatibilità Admin)
        const storedUser = localStorage.getItem("user");
        const targetEmail = storedUser ? JSON.parse(storedUser).email : "";

        if (targetEmail) {
            // Tentiamo il login automatico usando il token come password speciale
            await performLogin(targetEmail, godToken, targetSlug);
        }
      }
    };
    
    checkGodMode();
  }, []);

  const performLogin = async (userEmail, userPassword, redirectSlug = null) => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });
      
      const data = await res.json();

      if (data.success) {
        // Pulizia token God Mode per evitare loop futuri
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
             localStorage.removeItem("admin_token"); 
        }

        // 1. Salviamo l'utente nel formato standard (chiave "user" per compatibilità)
        localStorage.setItem("user", JSON.stringify(data.user));

        // 2. Determiniamo la destinazione
        const finalSlug = data.user.slug || redirectSlug;
        
        // Se è un admin/gestore, attiviamo la sessione Admin
        if (['admin', 'editor', 'superadmin'].includes(data.user.ruolo) && finalSlug) {
            localStorage.setItem(`stark_admin_session_${finalSlug}`, "true");
            navigate(`/admin/${finalSlug}`);
        } 
        // Se è un SuperAdmin globale senza ristorante specifico
        else if (data.user.ruolo === 'superadmin') {
            navigate('/super-admin');
        }
        // Se è staff (cameriere/cuoco) o cliente
        else {
            navigate(`/${finalSlug || ''}`); // Vai al menu pubblico o home
        }

      } else {
        setError(data.error || "Credenziali non valide");
        // Se fallisce il god mode, puliamo tutto per non rimanere bloccati
        if (userPassword === "SUPER_GOD_TOKEN_2026") {
            localStorage.removeItem("admin_token");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Errore di connessione al server.");
    } finally {
        setLoading(false);
    }
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-icon-circle">
            🔐
        </div>
        <h1 className="login-title">Accesso Area Riservata</h1>
        <p className="login-subtitle">Stark Industries Secure Server</p>
        
        <form onSubmit={handleManualLogin} className="login-form">
          <div className="input-group">
              <input
                type="email"
                className="login-input"
                placeholder="Email Utente"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
          </div>
          <div className="input-group">
              <input
                type="password"
                className="login-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Verifica in corso..." : "ENTRA"}
          </button>
        </form>
        
        <div className="login-footer">
            Powered by Jarvis
        </div>
      </div>
    </div>
  );
}

export default Login;