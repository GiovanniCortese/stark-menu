// client/src/Cucina.jsx - VERSIONE V15 (LOGIN + NOME RISTORANTE) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); // Stato per il Login
  const [passwordInput, setPasswordInput] = useState("");
  
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 1. Identificazione Ristorante
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => {
        setInfoRistorante(data); 
      })
      .catch(err => console.error("Ristorante non trovato:", err));
      
    // Controllo se siamo già loggati in questa sessione
    const sessionKey = `cucina_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") {
        setIsAuthorized(true);
    }
  }, [slug]);

  // 2. Funzione di Login
  const handleLogin = (e) => {
      e.preventDefault();
      // Qui usiamo la Master Key come nell'Admin (puoi cambiarla se vuoi)
      if (passwordInput === "tonystark") {
          setIsAuthorized(true);
          localStorage.setItem(`cucina_session_${slug}`, "true");
      } else {
          alert("⛔ Password Errata!");
          setPasswordInput("");
      }
  };

  const handleLogout = () => {
      if(confirm("Vuoi uscire dalla cucina?")) {
          localStorage.removeItem(`cucina_session_${slug}`);
          setIsAuthorized(false);
          setOrdini([]);
      }
  };

  // 3. Scaricamento Ordini
  const aggiornaOrdini = () => {
    if (!infoRistorante?.id) return; 

    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
          setOrdini(data.nuovi_ordini || []);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  // 4. Polling (Attivo SOLO se loggati)
  useEffect(() => {
    if (infoRistorante && isAuthorized) {
      aggiornaOrdini(); // Prima chiamata
      const intervallo = setInterval(aggiornaOrdini, 3000); // Aggiorna ogni 3 sec
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante, isAuthorized]);

  // 5. Segna come Pronto
  const segnaComePronto = async (ordineId) => {
    try {
      const response = await fetch(`${API_URL}/api/ordine/completato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordineId })
      });
      
      if (response.ok) {
        aggiornaOrdini(); 
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  // Helper per visualizzare i prodotti
  const renderProdotti = (prodotti) => {
      let lista = [];
      if (Array.isArray(prodotti)) lista = prodotti;
      else if (typeof prodotti === 'string' && prodotti.startsWith('[')) {
          try { lista = JSON.parse(prodotti); } catch(e) { lista = [prodotti]; }
      } 
      else if (prodotti) lista = [prodotti];

      return (
          <ul style={{paddingLeft: '20px', margin: '10px 0', fontSize:'1.1rem', textAlign:'left'}}>
              {lista.map((item, index) => (
                  <li key={index} style={{marginBottom:'5px'}}>
                      {typeof item === 'string' ? item : (item.nome || "Piatto sconosciuto")}
                  </li>
              ))}
          </ul>
      );
  };

  // --- SCHERMATA CARICAMENTO ---
  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ Caricamento Ristorante...</h1></div>;

  // --- SCHERMATA LOGIN ---
  if (!isAuthorized) {
      return (
          <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
              <div style={{background:'white', padding:'40px', borderRadius:'10px', boxShadow:'0 4px 15px rgba(0,0,0,0.2)', textAlign:'center', maxWidth:'400px', width:'90%'}}>
                  <h1 style={{margin:'0 0 20px 0'}}>👨‍🍳 Accesso Cucina</h1>
                  <h3 style={{color:'#555', marginBottom:'30px'}}>{infoRistorante.ristorante}</h3>
                  <form onSubmit={handleLogin}>
                      <input 
                        type="password" 
                        placeholder="Password Cucina" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        style={{width:'100%', padding:'15px', fontSize:'18px', marginBottom:'20px', borderRadius:'5px', border:'1px solid #ccc'}}
                      />
                      <button type="submit" className="btn-invia" style={{width:'100%', padding:'15px', fontSize:'18px', background:'#27ae60'}}>ENTRA</button>
                  </form>
              </div>
          </div>
      );
  }

  // --- SCHERMATA DASHBOARD CUCINA ---
  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'20px'}}>
        <div>
            <h1 style={{margin:0}}>👨‍🍳 Cucina</h1>
            {/* NOME DEL RISTORANTE (ID rimosso) */}
            <h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3>
        </div>
        
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>
            Esci
        </button>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Tutto pulito! 🧹</h2>
                <p>Nessun ordine in attesa...</p>
            </div>
        )}

        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket">
            <div className="ticket-header">
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              <span className="orario">
                {new Date(ordine.data_ora || ordine.data_creazione).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            <div className="ticket-body">
              {renderProdotti(ordine.prodotti || ordine.dettagli)}
              {ordine.totale && <div style={{marginTop:'10px', borderTop:'1px dashed #ccc', paddingTop:'5px', fontWeight:'bold'}}>Tot: {ordine.totale}€</div>}
            </div>
            
            <button 
                className="btn-completato" 
                onClick={() => segnaComePronto(ordine.id)}
            >
                ✅ PRONTO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;