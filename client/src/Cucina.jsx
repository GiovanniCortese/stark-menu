// client/src/Cucina.jsx - VERSIONE V18 (HIDE ONLY - GESTITO DALLA CASSA) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  // Stato per memorizzare gli ordini "fatti" ma non ancora pagati in cassa
  const [ticketNascosti, setTicketNascosti] = useState([]);
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
      
    const sessionKey = `cucina_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);

    // Recupera lo storico locale dei ticket completati dalla cucina
    const hidden = JSON.parse(localStorage.getItem(`cucina_hidden_${slug}`) || "[]");
    setTicketNascosti(hidden);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
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

  const aggiornaOrdini = () => {
    if (!infoRistorante?.id) return; 
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
          // 1. FILTRO CIBO: Prendi solo ordini che hanno cibo
          const ordiniCucina = (data.nuovi_ordini || []).filter(ordine => {
              let prodotti = [];
              try { prodotti = typeof ordine.prodotti === 'string' ? JSON.parse(ordine.prodotti) : ordine.prodotti; } catch(e){}
              return prodotti.some(p => p.is_bar !== true);
          });

          // 2. FILTRO LOCALE: Nascondi quelli che lo chef ha già cliccato
          // (L'ordine esiste ancora nel DB finché la cassa non paga, ma lo chef non lo vede più)
          const visibili = ordiniCucina.filter(o => !ticketNascosti.includes(o.id));
          
          setOrdini(visibili);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  useEffect(() => {
    if (infoRistorante && isAuthorized) {
      aggiornaOrdini(); 
      // Polling ogni 3 secondi per vedere nuovi ordini
      const intervallo = setInterval(aggiornaOrdini, 3000); 
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante, isAuthorized, ticketNascosti]);

  // NUOVA FUNZIONE: Nasconde solo localmente, non chiama il server
  const nascondiTicket = (ordineId) => {
    if(!confirm("Hai finito di preparare questo ordine? Sparirà dalla schermata.")) return;

    const nuoviNascosti = [...ticketNascosti, ordineId];
    setTicketNascosti(nuoviNascosti);
    // Salviamo nel browser così al refresh non ricompaiono
    localStorage.setItem(`cucina_hidden_${slug}`, JSON.stringify(nuoviNascosti));
    
    // Aggiorniamo la vista subito
    setOrdini(prev => prev.filter(o => o.id !== ordineId));
  };

  const toggleCheck = (uniqueKey) => {
      setCheckedItems(prev => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  };

  // --- RENDERING TICKET (Identico a prima: Filtra cibo e raggruppa) ---
  const renderTicketBody = (ordine) => {
      let listaProdotti = [];

      if (Array.isArray(ordine.prodotti)) listaProdotti = ordine.prodotti;
      else if (typeof ordine.prodotti === 'string') {
          try { listaProdotti = JSON.parse(ordine.prodotti); } 
          catch(e) { listaProdotti = [{ nome: ordine.prodotti, categoria: 'Altro', categoria_posizione: 999 }]; }
      } 
      else if (ordine.dettagli) {
          listaProdotti = [{ nome: ordine.dettagli, categoria: 'Altro', categoria_posizione: 999 }];
      }

      if(!Array.isArray(listaProdotti)) return <p>Errore dati</p>;

      // FILTRO CUCINA: Escludiamo Bar
      const prodottiCucina = listaProdotti.filter(p => p.is_bar !== true);

      if (prodottiCucina.length === 0) return null;

      // Raggruppamento
      const gruppi = prodottiCucina.reduce((acc, item) => {
          const nome = typeof item === 'string' ? item : item.nome;
          const cat = (typeof item === 'object' && item.categoria) ? item.categoria : 'Altro';
          const pos = (typeof item === 'object' && item.categoria_posizione) ? item.categoria_posizione : 999;

          if (!acc[cat]) acc[cat] = { prodotti: [], posizione: pos };
          acc[cat].prodotti.push(nome);
          return acc;
      }, {});

      const categorieOrdinate = Object.keys(gruppi).sort((a, b) => gruppi[a].posizione - gruppi[b].posizione);

      return (
          <div style={{textAlign:'left'}}>
              {categorieOrdinate.map((catName) => (
                  <div key={catName} style={{marginBottom:'15px'}}>
                      <h4 style={{margin:'0 0 5px 0', borderBottom:'1px solid #ddd', color:'#555', textTransform:'uppercase', fontSize:'0.9rem'}}>
                          {catName}
                      </h4>
                      {gruppi[catName].prodotti.map((prodNome, idx) => {
                          const uniqueKey = `${ordine.id}_${catName}_${idx}`;
                          const isChecked = checkedItems[uniqueKey] || false;
                          return (
                              <div key={uniqueKey} onClick={() => toggleCheck(uniqueKey)} style={{display:'flex', alignItems:'center', padding:'8px 0', cursor:'pointer', opacity: isChecked ? 0.5 : 1, textDecoration: isChecked ? 'line-through' : 'none'}}>
                                  <input type="checkbox" checked={isChecked} onChange={() => {}} style={{transform:'scale(1.5)', marginRight:'10px', cursor:'pointer'}} />
                                  <span style={{fontSize:'1.1rem', fontWeight: isChecked ? 'normal' : 'bold'}}>{prodNome}</span>
                              </div>
                          );
                      })}
                  </div>
              ))}
          </div>
      );
  };

  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ Caricamento Ristorante...</h1></div>;

  if (!isAuthorized) {
      return (
          <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
              <div style={{background:'white', padding:'40px', borderRadius:'10px', boxShadow:'0 4px 15px rgba(0,0,0,0.2)', textAlign:'center', maxWidth:'400px', width:'90%'}}>
                  <h1 style={{margin:'0 0 20px 0'}}>👨‍🍳 Accesso Cucina</h1>
                  <h3 style={{color:'#555', marginBottom:'30px'}}>{infoRistorante.ristorante}</h3>
                  <form onSubmit={handleLogin}>
                      <input type="password" placeholder="Password Cucina" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{width:'100%', padding:'15px', fontSize:'18px', marginBottom:'20px', borderRadius:'5px', border:'1px solid #ccc'}} />
                      <button type="submit" className="btn-invia" style={{width:'100%', padding:'15px', fontSize:'18px', background:'#27ae60'}}>ENTRA</button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'20px'}}>
        <div><h1 style={{margin:0}}>👨‍🍳 Cucina</h1><h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3></div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}><h2>Tutto pulito! 🧹</h2><p>Nessun ordine in attesa...</p></div>}

        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket">
            <div className="ticket-header">
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              <span className="orario">{new Date(ordine.data_ora || ordine.data_creazione).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            {/* TASTO MODIFICATO: NASCONDE SOLO LOCALMENTE */}
            <button 
                className="btn-completato" 
                onClick={() => nascondiTicket(ordine.id)}
                style={{background:'#27ae60'}} // Verde
            >
                ✅ ORDINE SERVITO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;