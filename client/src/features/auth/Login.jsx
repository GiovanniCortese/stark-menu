// client/src/features/auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../../config"; // Nota: siamo scesi di 3 livelli

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // --- GOD MODE CHECK ---
  useEffect(() => {
    const checkGodMode = async () => {
      const godToken = localStorage.getItem("admin_token");
      if (godToken === "SUPER_GOD_TOKEN_2026") {
        const storedUser = localStorage.getItem("user");
        const targetEmail = storedUser ? JSON.parse(storedUser).email : "";
        if (targetEmail) await performLogin(targetEmail, godToken);
      }
    };
    checkGodMode();
  }, []);

  const performLogin = async (userEmail, userPassword) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("stark_user", JSON.stringify(data.user));
        
        // Reindirizzamento intelligente in base al ruolo
        if (data.user.ruolo === 'superadmin') navigate('/super-admin');
        else navigate(`/admin/${data.user.ristorante_id}`); // O usa lo slug se preferisci
      } else {
        setError(data.error || "Credenziali errate");
      }
    } catch (e) {
      setError("Errore di connessione al server");
    }
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="login-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#1a1a1a", color: "white" }}>
      <div style={{ background: "#222", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", textAlign: "center", border: "1px solid #333" }}>
        <h1 style={{ color: "#e74c3c", marginBottom: "20px" }}>JARVIS V70</h1>
        
        {error && <p style={{ background: "#c0392b", padding: "10px", borderRadius: "5px", fontSize: "14px" }}>{error}</p>}

        <form onSubmit={handleManualLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#333", color: "white" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#333", color: "white" }}
          />
          <button type="submit" style={{ padding: "15px", background: "#e74c3c", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>
            ENTRA
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;