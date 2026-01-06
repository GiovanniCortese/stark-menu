// client/src/Bar.jsx - VERSIONE V30 (REAL-TIME SYNC BAR) 🍹
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `bar_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`bar_session_${slug}`,"true"); 
      } else {
          alert("Password Errata");
      }
  };

  const handleLogout = () => {
      if(confirm("Chiudere il Bar?")) {
          localStorage.removeItem(`bar_session_${slug}`);
          setIsAuthorized(false);
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
            const tuttiOrdini = data.nuovi_ordini || [];

            // LOGICA BAR V30:
            // 1. Prendiamo solo gli ordini che hanno bibite (is_bar = true)
            // 2. Se tutte le bibite sono 'servite', nascondiamo il ticket.

            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                // Filtra solo Bar
                const bibite = prodotti.filter(p => p.is_bar);
                
                // Se non ci sono bibite, nascondi ticket
                if (bibite.length === 0) return false;

                // Se TUTTE le bibite sono 'servite', nascondi ticket
                const tutteFiniti = bibite.every(p => p.stato === 'servito');
                return !tutteFiniti;
            });

            setOrdini(ordiniDaMostrare);
        })
        .catch(e => console.error("Polling error:", e));
  };

  useEffect(() => { 
      if(isAuthorized && infoRistorante) { 
          aggiorna(); 
          const i = setInterval(aggiorna, 2000); 
          return () => clearInterval(i); 
      } 
  }, [isAuthorized, infoRistorante]);

  // Toggle stato bibita + LOG STORICO
  const segnaBibitaServita = async (ordineId, prodottiAttuali, indexReale) => {
      const nuoviProdotti = [...prodottiAttuali];
      const item = nuoviProdotti[indexReale];

      // Calcola il nuovo stato
      const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito';
      item.stato = nuovoStato;

      // Gestione orario
      if (nuovoStato === 'servito') {
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
          delete item.ora_servizio;
      }

      // CREIAMO IL MESSAGGIO DI LOG PER LA CASSA
      const azione = nuovoStato === 'servito' ? 'HA SERVITO' : 'HA RIMESSO IN ATTESA';
      const logMsg = `[BAR 🍹] ${azione}: ${item.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Bar...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#2c3e50'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center'}}>
              <h1>🍹 Accesso Bar</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#2980b9', border:'none', color:'white', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{backgroundColor:'#2c3e50', minHeight:'100vh', padding:'20px'}}> 
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div><h1 style={{margin:0, color:'white'}}>🍹 Bar</h1><h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3></div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>

      <div className="ordini-grid">
        {ordini.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Tutto pulito al Bar! 🍺</h2></div>}

        {ordini.map(ord => (
            <div key={ord.id} className="ticket" style={{background:'#ecf0f1', borderTop:'5px solid #3498db'}}>
                <div className="ticket-header" style={{background:'#2980b9', color:'white'}}>
                    <span style={{fontSize:'1.2rem'}}>Tavolo <strong>{ord.tavolo}</strong></span>
                    <span style={{fontSize:'1rem'}}>{new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left'}}>
                    {ord.prodotti.map((p, idx) => {
                        if (!p.is_bar) return null; // Salta piatti cucina

                        const isServito = p.stato === 'servito';

                        return (
                            <div 
                                key={idx} 
                                onClick={() => segnaBibitaServita(ord.id, ord.prodotti, idx)}
                                style={{
                                    padding:'12px 10px', 
                                    borderBottom:'1px dashed #bdc3c7',
                                    cursor:'pointer',
                                    background: isServito ? '#d4efdf' : 'transparent',
                                    display: 'flex', justifyContent:'space-between', alignItems:'center'
                                }}
                            >
                                <span style={{
                                    fontSize:'1.1rem', 
                                    fontWeight: isServito ? 'normal' : 'bold',
                                    textDecoration: isServito ? 'line-through' : 'none',
                                    color: isServito ? '#7f8c8d' : '#2c3e50'
                                }}>
                                    {p.nome}
                                </span>
                                {isServito && <span>✅</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default Bar;