// client/src/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // URL del Backend Cloud
  const API_URL = "https://stark-backend-gg17.onrender.com"; 

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