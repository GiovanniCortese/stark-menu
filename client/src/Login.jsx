// client/src/Login.jsx
import { useState, useEffect } from 'react'; // <--- Aggiunto useEffect
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com"; 

  // 🚀 GOD MODE CHECK: Controllo Automatico all'avvio
  useEffect(() => {
    // 1. Cerco il token speciale iniettato dal SuperAdmin
    const godToken = localStorage.getItem("admin_token");

    // 2. Se il token corrisponde, simulo il login immediato
    if (godToken === "SUPER_GOD_TOKEN_2026") {
        console.log("🚀 God Mode Detected: Accesso Immediato.");
        
        // Creo un utente "finto" ma valido per la Dashboard, altrimenti si rompe
        const godUser = {
            id: 9999,
            nome: "Tony Stark (God Mode)",
            email: "jarvis@stark.com",
            ruolo: "admin" // Importante per i permessi
        };

        // Salvo l'utente come se avessi fatto il login normale
        localStorage.setItem('user', JSON.stringify(godUser));
        
        // Reindirizzo subito
        navigate('/admin');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        // Salviamo l'utente nella memoria del browser (localStorage)
        localStorage.setItem('user', JSON.stringify(data.user));
        alert("Benvenuto Boss! 🕶️");
        navigate('/admin'); // Andremo alla dashboard
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
      <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <input 
          type="email" 
          placeholder="Email Titolare" 
          value={email} onChange={e => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Password Segreta" 
          value={password} onChange={e => setPassword(e.target.value)} 
        />
        <button type="submit" className="btn-invia">ENTRA</button>
      </form>
    </div>
  );
}

export default Login;