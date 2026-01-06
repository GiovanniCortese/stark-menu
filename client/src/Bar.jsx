// client/src/Bar.jsx - SOLO BIBITE E CAFFÈ ☕🍺
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const [checkedItems, setCheckedItems] = useState({});

  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => setInfoRistorante(data))
      .catch(err => console.error("Ristorante non trovato:", err));
      
    const sessionKey = `bar_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if (passwordInput === "tonystark") { // Stessa pass per ora
          setIsAuthorized(true);
          localStorage.setItem(`bar_session_${slug}`, "true");
      } else {
          alert("⛔ Password Errata!");
      }
  };

  const handleLogout = () => {
      if(confirm("Chiudere il Bar?")) {
          localStorage.removeItem(`bar_session_${slug}`);
          setIsAuthorized(false);
          setOrdini([]);
      }
  };

  const aggiornaOrdini = () => {
    if (!infoRistorante?.id) return; 
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
          // FILTRO AVANZATO: Mostra l'ordine SOLO se contiene almeno un articolo da BAR
          const ordiniBar = (data.nuovi_ordini || []).filter(ordine => {
              let prodotti = [];
              try { prodotti = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti) : ordine.prodotti; } catch(e){}
              // Controlla se c'è roba da bere
              return prodotti.some(p => p.is_bar === true);
          });
          setOrdini(ordiniBar);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  useEffect(() => {
    if (infoRistorante && isAuthorized) {
      aggiornaOrdini(); 
      const intervallo = setInterval(aggiornaOrdini, 3000); 
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante, isAuthorized]);

  const toggleCheck = (uniqueKey) => {
      setCheckedItems(prev => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  };

  const renderTicketBody = (ordine) => {
      let listaProdotti = [];
      try { listaProdotti = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti) : ordine.prodotti; } catch(e){}

      // --- FILTRO BAR: Prendi SOLO le cose da bere ---
      const prodottiBar = listaProdotti.filter(p => p.is_bar === true);

      if(prodottiBar.length === 0) return null; // Non dovrebbe succedere grazie al filtro sopra

      // Raggruppamento
      const gruppi = prodottiBar.reduce((acc, item) => {
          const cat = item.categoria || 'Altro';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item.nome);
          return acc;
      }, {});

      return (
          <div style={{textAlign:'left'}}>
              {Object.keys(gruppi).map((catName) => (
                  <div key={catName} style={{marginBottom:'15px'}}>
                      <h4 style={{margin:'0 0 5px 0', borderBottom:'1px solid #ddd', color:'#555', textTransform:'uppercase', fontSize:'0.9rem'}}>{catName}</h4>
                      {gruppi[catName].map((prodNome, idx) => {
                          const uniqueKey = `${ordine.id}_${catName}_${idx}`;
                          const isChecked = checkedItems[uniqueKey] || false;
                          return (
                              <div key={uniqueKey} onClick={() => toggleCheck(uniqueKey)} style={{display:'flex', alignItems:'center', padding:'8px 0', cursor:'pointer', opacity: isChecked ? 0.5 : 1, textDecoration: isChecked ? 'line-through' : 'none'}}>
                                  <input type="checkbox" checked={isChecked} onChange={()=>{}} style={{transform:'scale(1.5)', marginRight:'10px', cursor:'pointer'}} />
                                  <span style={{fontSize:'1.1rem', fontWeight: isChecked ? 'normal' : 'bold'}}>{prodNome}</span>
                              </div>
                          );
                      })}
                  </div>
              ))}
          </div>
      );
  };

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', textAlign:'center', maxWidth:'400px', width:'90%'}}>
              <h1>🍹 Accesso Bar</h1>
              <h3>{infoRistorante?.ristorante}</h3>
              <form onSubmit={handleLogin}><input type="password" placeholder="Password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}/><button className="btn-invia" style={{width:'100%'}}>ENTRA</button></form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{backgroundColor:'#2c3e50'}}> {/* Sfondo diverso per distinguerlo */}
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'20px'}}>
        <div><h1 style={{margin:0}}>🍹 Bar</h1><h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3></div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>Esci</button>
      </header>
      <div className="ordini-grid">
        {ordini.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Nessuna bevanda in attesa 🍺</h2></div>}
        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket">
            <div className="ticket-header" style={{background:'#3498db'}}> {/* Intestazione blu per Bar */}
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              <span className="orario">{new Date(ordine.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="ticket-body">{renderTicketBody(ordine)}</div>
            {/* Nota: Il Bar NON chiude l'ordine completo, lo fa solo la cucina. Il Bar vede solo la lista. */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Bar;