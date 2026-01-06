// client/src/Bar.jsx - VERSIONE V18 (FIX DATA + COMPLETAMENTO BAR) 🍹
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Bar() {
  const [ordini, setOrdini] = useState([]);
  // Stato per nascondere localmente gli ordini completati dal Bar
  const [ordiniCompletatiBar, setOrdiniCompletatiBar] = useState([]); 
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
    
    // Recupera ordini bar completati dalla sessione locale (opzionale)
    const completati = JSON.parse(localStorage.getItem(`bar_completed_${slug}`) || "[]");
    setOrdiniCompletatiBar(completati);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if (passwordInput === "tonystark") { 
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
          // 1. Filtra ordini che hanno prodotti da Bar
          const ordiniBar = (data.nuovi_ordini || []).filter(ordine => {
              let prodotti = [];
              try { prodotti = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti) : ordine.prodotti; } catch(e){}
              return prodotti.some(p => p.is_bar === true);
          });
          
          // 2. Rimuovi quelli che il Barman ha già segnato come completati localmente
          const ordiniAttivi = ordiniBar.filter(o => !ordiniCompletatiBar.includes(o.id));
          
          setOrdini(ordiniAttivi);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  useEffect(() => {
    if (infoRistorante && isAuthorized) {
      aggiornaOrdini(); 
      const intervallo = setInterval(aggiornaOrdini, 3000); 
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante, isAuthorized, ordiniCompletatiBar]);

  const toggleCheck = (uniqueKey) => {
      setCheckedItems(prev => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  };

  // Funzione per completare l'ordine LATO BAR (lo nasconde solo dalla vista bar)
  const completaOrdineBar = (ordineId) => {
      if(!confirm("Hai servito tutte le bevande per questo tavolo?")) return;
      
      const nuoviCompletati = [...ordiniCompletatiBar, ordineId];
      setOrdiniCompletatiBar(nuoviCompletati);
      
      // Salviamo in locale per non perderli al refresh
      localStorage.setItem(`bar_completed_${slug}`, JSON.stringify(nuoviCompletati));
      
      // Aggiorniamo subito la vista
      setOrdini(prev => prev.filter(o => o.id !== ordineId));
  };

  const renderTicketBody = (ordine) => {
      let listaProdotti = [];
      try { listaProdotti = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti) : ordine.prodotti; } catch(e){}

      const prodottiBar = listaProdotti.filter(p => p.is_bar === true);

      if(prodottiBar.length === 0) return null; 

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

  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ Caricamento Bar...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', textAlign:'center', maxWidth:'400px', width:'90%'}}>
              <h1>🍹 Accesso Bar</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}><input type="password" placeholder="Password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}/><button className="btn-invia" style={{width:'100%'}}>ENTRA</button></form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{backgroundColor:'#2c3e50'}}> 
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'20px'}}>
        <div><h1 style={{margin:0, color:'white'}}>🍹 Bar</h1><h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3></div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px'}}>Esci</button>
      </header>
      <div className="ordini-grid">
        {ordini.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Tutto pulito al Bar! 🍺</h2></div>}
        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket" style={{background:'#ecf0f1'}}>
            <div className="ticket-header" style={{background:'#3498db'}}> 
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              {/* FIX DATA: Gestione fallback se data_ora manca */}
              <span className="orario">
                  {new Date(ordine.data_ora || ordine.data_creazione || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            <div className="ticket-body">{renderTicketBody(ordine)}</div>
            
            {/* NUOVO TASTO PER IL BAR */}
            <button 
                className="btn-completato" 
                style={{background:'#2980b9', marginTop:'15px'}} // Colore blu scuro per differenziare
                onClick={() => completaOrdineBar(ordine.id)}
            >
                ✅ ORDINE SERVITO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Bar;