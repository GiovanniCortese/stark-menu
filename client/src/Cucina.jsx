// client/src/Cucina.jsx - VERSIONE V16 (CATEGORIE ORDINATE + CHECKLIST) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  
  // Stato locale per gestire le spunte (checkbox) dei singoli prodotti
  // Struttura: { "ordineID_prodottoIndex": true/false }
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
      .then(data => setOrdini(data.nuovi_ordini || []))
      .catch(err => console.error("Errore polling:", err));
  };

  useEffect(() => {
    if (infoRistorante && isAuthorized) {
      aggiornaOrdini(); 
      const intervallo = setInterval(aggiornaOrdini, 3000); 
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante, isAuthorized]);

  const segnaComePronto = async (ordineId) => {
    if(!confirm("Confermi che TUTTO l'ordine è completo?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/ordine/completato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordineId })
      });
      if (response.ok) aggiornaOrdini(); 
    } catch (error) { alert("Errore di connessione"); }
  };

  const toggleCheck = (uniqueKey) => {
      setCheckedItems(prev => ({
          ...prev,
          [uniqueKey]: !prev[uniqueKey]
      }));
  };

  // --- FUNZIONE CORE: ORGANIZZA E RAGGRUPPA I PRODOTTI ---
  const renderTicketBody = (ordine) => {
      let listaProdotti = [];

      // 1. Parsing sicuro dei dati
      if (Array.isArray(ordine.prodotti)) listaProdotti = ordine.prodotti;
      else if (typeof ordine.prodotti === 'string') {
          try { listaProdotti = JSON.parse(ordine.prodotti); } 
          catch(e) { listaProdotti = [{ nome: ordine.prodotti, categoria: 'Altro', categoria_posizione: 999 }]; }
      } 
      else if (ordine.dettagli) {
          listaProdotti = [{ nome: ordine.dettagli, categoria: 'Altro', categoria_posizione: 999 }];
      }

      if(!Array.isArray(listaProdotti)) return <p>Errore dati</p>;

      // 2. Raggruppamento per Categoria
      const gruppi = listaProdotti.reduce((acc, item) => {
          // Se l'item è una stringa vecchia, lo normalizziamo
          const nome = typeof item === 'string' ? item : item.nome;
          const cat = (typeof item === 'object' && item.categoria) ? item.categoria : 'Altro';
          const pos = (typeof item === 'object' && item.categoria_posizione) ? item.categoria_posizione : 999;

          if (!acc[cat]) acc[cat] = { prodotti: [], posizione: pos };
          acc[cat].prodotti.push(nome);
          return acc;
      }, {});

      // 3. Ordinamento delle Categorie (Prima Antipasti, poi Pizze, ecc.)
      const categorieOrdinate = Object.keys(gruppi).sort((a, b) => gruppi[a].posizione - gruppi[b].posizione);

      return (
          <div style={{textAlign:'left'}}>
              {categorieOrdinate.map((catName) => (
                  <div key={catName} style={{marginBottom:'15px'}}>
                      <h4 style={{
                          margin:'0 0 5px 0', 
                          borderBottom:'1px solid #ddd', 
                          color:'#555', 
                          textTransform:'uppercase', 
                          fontSize:'0.9rem'
                      }}>
                          {catName}
                      </h4>
                      
                      {gruppi[catName].prodotti.map((prodNome, idx) => {
                          // Chiave univoca per la checkbox: IDOrdine_Categoria_Index
                          const uniqueKey = `${ordine.id}_${catName}_${idx}`;
                          const isChecked = checkedItems[uniqueKey] || false;

                          return (
                              <div 
                                key={uniqueKey} 
                                onClick={() => toggleCheck(uniqueKey)}
                                style={{
                                    display:'flex', 
                                    alignItems:'center', 
                                    padding:'8px 0', 
                                    cursor:'pointer',
                                    opacity: isChecked ? 0.5 : 1,
                                    textDecoration: isChecked ? 'line-through' : 'none'
                                }}
                              >
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => {}} // Gestito dal div padre
                                    style={{transform:'scale(1.5)', marginRight:'10px', cursor:'pointer'}}
                                  />
                                  <span style={{fontSize:'1.1rem', fontWeight: isChecked ? 'normal' : 'bold'}}>
                                      {prodNome}
                                  </span>
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
        <div>
            <h1 style={{margin:0}}>👨‍🍳 Cucina</h1>
            <h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3>
        </div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
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
              {renderTicketBody(ordine)}
              
              {/* Totale opzionale, utile per cassa */}
              {ordine.totale && <div style={{marginTop:'15px', borderTop:'2px dashed #ccc', paddingTop:'10px', textAlign:'right', fontSize:'1.2rem', fontWeight:'bold'}}>Tot: {ordine.totale}€</div>}
            </div>
            
            <button className="btn-completato" onClick={() => segnaComePronto(ordine.id)}>
                ✅ ORDINE COMPLETATO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;