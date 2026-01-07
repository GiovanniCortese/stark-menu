// client/src/Pizzeria.jsx - VERSIONE V33 (NUOVA PAGINA PIZZERIA) 🍕
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Pizzeria() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [passwordInput, setPasswordInput] = useState("");
  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `pizzeria_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
      e.preventDefault();
      if(passwordInput==="tonystark") { 
          setIsAuthorized(true); 
          localStorage.setItem(`pizzeria_session_${slug}`,"true"); 
      } else {
          alert("Password Errata");
      }
  };

  const handleLogout = () => {
      if(confirm("Chiudere la Pizzeria?")) {
        localStorage.removeItem(`pizzeria_session_${slug}`);
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
                
                // 1. FILTRA SOLO PIZZE
                const pizze = prodotti.filter(p => p.is_pizzeria);
                
                // 2. Se vuoto, nascondi ticket
                if (pizze.length === 0) return false;

                // 3. Se TUTTE le pizze sono 'servite', nascondi ticket
                const tutteFiniti = pizze.every(p => p.stato === 'servito');
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

  // One-Way: Una volta servito, non si torna indietro
  const segnaPizzaPronta = async (ordineId, prodottiAttuali, indices) => {
      const nuoviProdotti = [...prodottiAttuali];
      
      // Controlliamo il primo item del gruppo
      const primoItem = nuoviProdotti[indices[0]];

      // 🛑 BLOCCO: Se è già servito, esci subito.
      if (primoItem.stato === 'servito') return;

      const nuovoStato = 'servito';

      // Aggiorniamo TUTTI gli item del gruppo
      indices.forEach(idx => {
          const item = nuoviProdotti[idx];
          item.stato = nuovoStato;
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      });

      // Log per la Cassa
      const qty = indices.length;
      const logMsg = `[PIZZERIA 🍕] HA SFORNATO: ${qty > 1 ? qty + 'x ' : ''}${primoItem.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // HELPER PER RAGGRUPPARE (3x Margherita) E ORDINARE
  const getProdottiRaggruppati = (prodotti) => {
      const gruppi = [];
      
      prodotti.forEach((p, indexOriginale) => {
          // FILTRO: SOLO PIZZE
          if (!p.is_pizzeria) return; 

          const key = `${p.nome}-${p.stato}`;
          const gruppoEsistente = gruppi.find(g => g.key === key);

          if (gruppoEsistente) {
              gruppoEsistente.count += 1;
              gruppoEsistente.indices.push(indexOriginale); 
          } else {
              gruppi.push({ ...p, key: key, count: 1, indices: [indexOriginale] });
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
  
  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Pizzeria...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#c0392b'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center'}}>
              <h1>🍕 Pizzeria</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#e74c3c', border:'none', color:'white', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

  return (
    <div className="cucina-container" style={{minHeight:'100vh', padding:'20px', background:'#c0392b'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h1 style={{margin:0, color:'white'}}>🍕 Pizzeria: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'white', color:'#c0392b', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Esci</button>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}>
                <h2>Il forno è vuoto! 🔥</h2>
            </div>
        )}

        {ordiniPerTavolo.map(gruppo => (
            <div key={gruppo.tavolo} className="ticket" style={{background:'white', borderTop:'5px solid #e74c3c', marginBottom:20, borderRadius:8}}>
                <div className="ticket-header" style={{padding:10, borderBottom:'1px solid #eee', background:'#fceceb'}}>
                    <span style={{fontSize:'1.5rem', color:'#c0392b'}}>Tavolo <strong>{gruppo.tavolo}</strong></span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {gruppo.listaOrdini.map(ord => {
                        const prodottiRaggruppati = getProdottiRaggruppati(ord.prodotti);
                        if(prodottiRaggruppati.length === 0) return null;

                        return (
                            <div key={ord.id} style={{marginBottom: '10px', borderBottom:'2px solid #ddd'}}>
                                <div style={{
                                    fontSize:'0.85rem', 
                                    background:'#fadbd8', 
                                    padding:'4px 10px', 
                                    color:'#c0392b', 
                                    fontWeight:'bold',
                                    display:'flex', justifyContent:'space-between'
                                }}>
                                    <span>Ore {new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>{ord.cameriere}</span>
                                </div>

                                {prodottiRaggruppati.map((gruppoProd) => {
                                    const isServito = gruppoProd.stato === 'servito';
                                    const indiciDaModificare = gruppoProd.indices; 

                                    return (
                                        <div 
                                            key={gruppoProd.key} 
                                            onClick={() => !isServito && segnaPizzaPronta(ord.id, ord.prodotti, indiciDaModificare)}
                                            style={{
                                                padding:'12px 10px', 
                                                borderBottom:'1px dashed #ddd',
                                                cursor: isServito ? 'default' : 'pointer',
                                                background: isServito ? '#e8f5e9' : 'white',
                                                opacity: isServito ? 0.6 : 1,
                                                display: 'flex', justifyContent:'space-between', alignItems:'center'
                                            }}
                                        >
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                <span style={{
                                                    background: isServito ? '#95a5a6' : '#e74c3c',
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

export default Pizzeria;