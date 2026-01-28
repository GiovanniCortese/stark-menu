// client/src/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 🚀 GOD MODE CHECK: Controllo Automatico all'avvio
  useEffect(() => {
    const godToken = localStorage.getItem("admin_token");
    if (godToken !== "SUPER_GOD_TOKEN_2026") return;

    // ✅ recupero target dal SuperAdmin (ristorante scelto col 🚀)
    const targetSlug = localStorage.getItem("superadmin_target_slug") || "";
    const targetIdRaw = localStorage.getItem("superadmin_target_id") || "";
    const targetNome = localStorage.getItem("superadmin_target_nome") || "Tony Stark (God Mode)";
    const targetId = Number(targetIdRaw);

    // Se manca il target, almeno non rompiamo: vai alla dashboard generica
    const goTo = targetSlug ? `/admin/${targetSlug}` : "/admin";

    console.log("🚀 God Mode Detected:", { targetId, targetSlug });

    // ✅ user nel formato compatibile col nuovo login (tabella utenti)
    const godUser = {
      id: Number.isFinite(targetId) && targetId > 0 ? targetId : 9999, // ID ristorante (compatibilità dashboard)
      user_id: 0, // opzionale, ma utile se fai check
      nome: targetNome,
      email: "jarvis@stark.com",
      ruolo: "admin",
      slug: targetSlug,
    };

    localStorage.setItem("user", JSON.stringify(godUser));
    navigate(goTo);
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        alert("Benvenuto Boss! 🕶️");

        // ✅ se esiste target slug (es. arrivato dal 🚀), vai direttamente lì
        const targetSlug = localStorage.getItem("superadmin_target_slug");
        navigate(targetSlug ? `/admin/${targetSlug}` : "/admin");
      } else {
        alert("❌ Accesso Negato: " + data.error);
      }
    } catch (err) {
      alert("Errore di connessione");
    }
  };

  return (
    <div className="container">
      <h1>🔐 Area Riservata</h1>
      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="email"
          placeholder="Email Titolare"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password Segreta"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn-invia">
          ENTRA
        </button>
      </form>
    </div>
  );
}

export default Login;
