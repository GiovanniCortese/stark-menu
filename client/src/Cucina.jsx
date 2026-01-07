// client/src/Cucina.jsx - VERSIONE V30 (REAL-TIME SYNC CON CASSA) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `cucina_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`cucina_session_${slug}`,"true"); 
      } else {
          alert("Password Errata");
      }
  };

  const handleLogout = () => {
      if(confirm("Uscire dalla cucina?")) {
        localStorage.removeItem(`cucina_session_${slug}`);
        setIsAuthorized(false);
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
            const tuttiOrdini = data.nuovi_ordini || [];

            // LOGICA V30:
            // 1. Prendiamo solo gli ordini che hanno cibi (no solo bibite)
            // 2. Se tutti i cibi sono già stati serviti (dalla Cassa o dalla Cucina), nascondiamo il ticket.
            
            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                // Filtra solo Cibo (no Bar)
                const cibi = prodotti.filter(p => !p.is_bar);
                
                // Se non ci sono cibi, nascondi ticket
                if (cibi.length === 0) return false;

                // Se TUTTI i cibi sono 'serviti', nascondi ticket
                const tuttiFiniti = cibi.every(p => p.stato === 'servito');
                return !tuttiFiniti;
            });

            setOrdini(ordiniDaMostrare);
        })
        .catch(e => console.error("Polling error:", e));
  };

  useEffect(() => { 
      if(isAuthorized && infoRistorante) { 
          aggiorna(); 
          const i = setInterval(aggiorna, 2000); // Sync ogni 2 sec
          return () => clearInterval(i); 
      } 
  }, [isAuthorized, infoRistorante]);

// Funzione per marcare un singolo piatto come servito + LOG STORICO
  const segnaPiattoServito = async (ordineId, prodottiAttuali, indexReale) => {
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
      const logMsg = `[CUCINA 👨‍🍳] ${azione}: ${item.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };
  
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
              <h1>👨‍🍳 Cucina</h1>
              <h3 style={{color:'#666'}}>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', fontSize:'16px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#27ae60', border:'none', color:'white', fontSize:'16px', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container">
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', marginBottom:'20px', borderRadius:'8px'}}>
          <h1 style={{margin:0, color:'#333'}}>👨‍🍳 Cucina: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Nessuna comanda in attesa 👨‍🍳</h2>
                <p>Tutto pulito!</p>
            </div>
        )}

        {ordini.map(ord => {
            // Nota: ord.prodotti contiene tutto (bar + cucina). 
            // Dobbiamo visualizzare solo cucina, ma mantenere l'indice corretto per aggiornare il DB.
            return (
                <div key={ord.id} className="ticket" style={{borderTop: '5px solid #d35400'}}>
                    <div className="ticket-header">
                        <span style={{fontSize:'1.2rem'}}>Tavolo <strong>{ord.tavolo}</strong></span>
                        <span style={{fontSize:'1rem'}}>{new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="ticket-body" style={{textAlign:'left'}}>
                        {ord.prodotti.map((p, idx) => {
                            if (p.is_bar) return null; // Salta bibite

                            const isServito = p.stato === 'servito';

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => segnaPiattoServito(ord.id, ord.prodotti, idx)}
                                    style={{
                                        padding:'12px 10px', 
                                        borderBottom:'1px dashed #ddd',
                                        cursor:'pointer',
                                        background: isServito ? '#e8f5e9' : 'transparent',
                                        display: 'flex', justifyContent:'space-between', alignItems:'center'
                                    }}
                                >
                                    <span style={{
                                        fontSize:'1.1rem', 
                                        fontWeight: isServito ? 'normal' : 'bold',
                                        textDecoration: isServito ? 'line-through' : 'none',
                                        color: isServito ? '#aaa' : '#000'
                                    }}>
                                        {p.nome}
                                    </span>
                                    {isServito && <span>✅</span>}
                                </div>
                            );
                        })}
                    </div>
                    {/* NESSUN TOTALE VISIBILE QUI */}
                </div>
            );
        })}
      </div>
    </div>
  );
}

// client/src/Cucina.jsx - VERSIONE V32 (RAGGRUPPAMENTO, 3X, BLOCCO CLICK) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `cucina_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`cucina_session_${slug}`,"true"); 
      } else {
          alert("Password Errata");
      }
  };

  const handleLogout = () => {
      if(confirm("Uscire dalla cucina?")) {
        localStorage.removeItem(`cucina_session_${slug}`);
        setIsAuthorized(false);
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
            const tuttiOrdini = data.nuovi_ordini || [];

            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                // 1. Filtra solo cose della Cucina (tutto ciò che NON è bar)
                const cibi = prodotti.filter(p => !p.is_bar);
                
                // 2. Se vuoto, nascondi ticket
                if (cibi.length === 0) return false;

                // 3. Se TUTTI i cibi sono 'serviti', nascondi ticket
                const tuttiFiniti = cibi.every(p => p.stato === 'servito');
                return !tuttiFiniti;
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

  // Versione "One-Way": Una volta servito, non si torna indietro
  const segnaPiattoServito = async (ordineId, prodottiAttuali, indices) => {
      const nuoviProdotti = [...prodottiAttuali];
      
      // Controlliamo il primo item del gruppo
      const primoItem = nuoviProdotti[indices[0]];

      // 🛑 BLOCCO: Se è già servito, esci subito. Non permettiamo modifiche.
      if (primoItem.stato === 'servito') return;

      const nuovoStato = 'servito';

      // Aggiorniamo TUTTI gli item del gruppo (es. tutte e 3 le carbonare)
      indices.forEach(idx => {
          const item = nuoviProdotti[idx];
          item.stato = nuovoStato;
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      });

      // Messaggio Log per la Cassa
      const qty = indices.length;
      const logMsg = `[CUCINA 👨‍🍳] HA SERVITO: ${qty > 1 ? qty + 'x ' : ''}${primoItem.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // HELPER PER RAGGRUPPARE (3x Carbonara) E ORDINARE
  const getProdottiRaggruppati = (prodotti) => {
      const gruppi = [];
      
      prodotti.forEach((p, indexOriginale) => {
          if (p.is_bar) return; // Ignora cose del Bar

          // Chiave unica: Nome + Stato
          const key = `${p.nome}-${p.stato}`;
          
          const gruppoEsistente = gruppi.find(g => g.key === key);

          if (gruppoEsistente) {
              gruppoEsistente.count += 1;
              gruppoEsistente.indices.push(indexOriginale); 
          } else {
              gruppi.push({
                  ...p,
                  key: key,
                  count: 1,
                  indices: [indexOriginale]
              });
          }
      });

      // Ordina: Prima "in_attesa", poi "servito"
      return gruppi.sort((a, b) => {
          if (a.stato === b.stato) return 0;
          return a.stato === 'in_attesa' ? -1 : 1;
      });
  };

  // Raggruppa gli ordini per tavolo
  const ordiniPerTavolo = Object.values(ordini.reduce((acc, ordine) => {
      if (!acc[ordine.tavolo]) {
          acc[ordine.tavolo] = { tavolo: ordine.tavolo, listaOrdini: [] };
      }
      acc[ordine.tavolo].listaOrdini.push(ordine);
      return acc;
  }, {}));

  
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
              <h1>👨‍🍳 Cucina</h1>
              <h3 style={{color:'#666'}}>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', fontSize:'16px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#27ae60', border:'none', color:'white', fontSize:'16px', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container">
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', background:'#fff', marginBottom:'20px', borderRadius:'8px'}}>
          <h1 style={{margin:0, color:'#333'}}>👨‍🍳 Cucina: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Nessuna comanda in attesa 👨‍🍳</h2>
                <p>Tutto pulito!</p>
            </div>
        )}

        {ordiniPerTavolo.map(gruppo => (
            <div key={gruppo.tavolo} className="ticket" style={{borderTop: '5px solid #d35400'}}>
                <div className="ticket-header">
                    <span style={{fontSize:'1.5rem'}}>Tavolo <strong>{gruppo.tavolo}</strong></span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {gruppo.listaOrdini.map(ord => {
                        // Raggruppiamo i piatti (es. 3x Carbonara)
                        const prodottiRaggruppati = getProdottiRaggruppati(ord.prodotti);
                        if(prodottiRaggruppati.length === 0) return null;

                        return (
                            <div key={ord.id} style={{marginBottom: '10px', borderBottom:'2px solid #ddd'}}>
                                {/* Intestazione con Ora e Cameriere */}
                                <div style={{
                                    fontSize:'0.85rem', 
                                    background:'#fdebd0', // Arancio chiaro per cucina
                                    padding:'4px 10px', 
                                    color:'#d35400', 
                                    fontWeight:'bold',
                                    display:'flex', justifyContent:'space-between'
                                }}>
                                    <span>Ore {new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>{ord.cameriere}</span>
                                </div>

                                {prodottiRaggruppati.map((gruppoProd) => {
                                    const isServito = gruppoProd.stato === 'servito';
                                    
                                    // PRENDIAMO TUTTI GLI INDICI DEL GRUPPO
                                    const indiciDaModificare = gruppoProd.indices; 

                                    return (
                                        <div 
                                            key={gruppoProd.key} 
                                            // BLOCCO CLICK: Se già servito, non fa nulla
                                            onClick={() => !isServito && segnaPiattoServito(ord.id, ord.prodotti, indiciDaModificare)}
                                            style={{
                                                padding:'12px 10px', 
                                                borderBottom:'1px dashed #ddd',
                                                // CURSORE: Freccia se servito, manina se attivo
                                                cursor: isServito ? 'default' : 'pointer',
                                                background: isServito ? '#e8f5e9' : 'white',
                                                opacity: isServito ? 0.6 : 1,
                                                display: 'flex', justifyContent:'space-between', alignItems:'center'
                                            }}
                                        >
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                {/* Badge Quantità */}
                                                <span style={{
                                                    background: isServito ? '#95a5a6' : '#e67e22',
                                                    color:'white', padding:'4px 8px', borderRadius:'50%',
                                                    fontWeight:'bold', fontSize:'0.9rem', minWidth:'30px', textAlign:'center'
                                                }}>
                                                    {gruppoProd.count}x
                                                </span>
                                                <span style={{
                                                    fontSize:'1.1rem', 
                                                    fontWeight: isServito ? 'normal' : 'bold',
                                                    textDecoration: isServito ? 'line-through' : 'none',
                                                    color: isServito ? '#aaa' : '#000'
                                                }}>
                                                    {gruppoProd.nome}
                                                </span>
                                            </div>
                                            {isServito && <span>✅</span>}
                                        </div>
                                    );
                                })}
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

export default Cucina;