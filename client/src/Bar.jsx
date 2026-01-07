// client/src/Bar.jsx - VERSIONE V31 (RAGGRUPPAMENTO + ORDINAMENTO) 🍹
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

            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                // 1. Filtra solo cose del Bar
                const bibite = prodotti.filter(p => p.is_bar);
                
                // 2. Se vuoto, nascondi
                if (bibite.length === 0) return false;

                // 3. Se TUTTE le bibite sono 'servite', nascondi il ticket
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

  // LOGICA DI UPDATE
  const segnaBibitaServita = async (ordineId, prodottiAttuali, indexReale) => {
      const nuoviProdotti = [...prodottiAttuali];
      const item = nuoviProdotti[indexReale];

      // Calcola nuovo stato
      const nuovoStato = item.stato === 'servito' ? 'in_attesa' : 'servito';
      item.stato = nuovoStato;

      if (nuovoStato === 'servito') {
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
          delete item.ora_servizio;
      }

      const azione = nuovoStato === 'servito' ? 'HA SERVITO' : 'HA RIMESSO IN ATTESA';
      const logMsg = `[BAR 🍹] ${azione}: ${item.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // HELPER PER RAGGRUPPARE (3x Coca Cola) E ORDINARE
  const getProdottiRaggruppati = (prodotti) => {
      const gruppi = [];
      
      prodotti.forEach((p, indexOriginale) => {
          if (!p.is_bar) return; // Ignora cucina

          // Chiave unica per raggruppare: Nome + Stato
          // (Es. Coca Cola in_attesa è diversa da Coca Cola servito)
          const key = `${p.nome}-${p.stato}`;
          
          const gruppoEsistente = gruppi.find(g => g.key === key);

          if (gruppoEsistente) {
              gruppoEsistente.count += 1;
              gruppoEsistente.indices.push(indexOriginale); // Salviamo l'indice reale per gestirlo al click
          } else {
              gruppi.push({
                  ...p,
                  key: key,
                  count: 1,
                  indices: [indexOriginale]
              });
          }
      });
      
// Raggruppa gli ordini per tavolo (V32)
  const ordiniPerTavolo = Object.values(ordini.reduce((acc, ordine) => {
      if (!acc[ordine.tavolo]) {
          acc[ordine.tavolo] = { tavolo: ordine.tavolo, listaOrdini: [] };
      }
      acc[ordine.tavolo].listaOrdini.push(ordine);
      return acc;
  }, {}));

      // Ordina: Prima "in_attesa", poi "servito"
      return gruppi.sort((a, b) => {
          if (a.stato === b.stato) return 0;
          return a.stato === 'in_attesa' ? -1 : 1;
      });
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

   {ordiniPerTavolo.map(gruppo => (
            <div key={gruppo.tavolo} className="ticket" style={{background:'#ecf0f1', borderTop:'5px solid #3498db'}}>
                <div className="ticket-header" style={{background:'#2980b9', color:'white', padding:'10px'}}>
                    <span style={{fontSize:'1.5rem'}}>Tavolo <strong>{gruppo.tavolo}</strong></span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {gruppo.listaOrdini.map(ord => {
                        // Usiamo la funzione helper creata prima per raggruppare i prodotti di QUESTO ordine
                        const prodottiRaggruppati = getProdottiRaggruppati(ord.prodotti);
                        if(prodottiRaggruppati.length === 0) return null;

                        return (
                            <div key={ord.id} style={{marginBottom: '10px', borderBottom:'2px solid #bdc3c7'}}>
                                {/* Intestazione dell'ordine specifico (Orario) */}
                                <div style={{
                                    fontSize:'0.85rem', 
                                    background:'#d6eaf8', 
                                    padding:'4px 10px', 
                                    color:'#2980b9', 
                                    fontWeight:'bold',
                                    display:'flex', justifyContent:'space-between'
                                }}>
                                    <span>Ore {new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>{ord.cameriere}</span>
                                </div>

                                {/* Lista Prodotti */}
                                {prodottiRaggruppati.map((gruppoProd) => {
                                    const isServito = gruppoProd.stato === 'servito';
                                    const indiceDaModificare = gruppoProd.indices[0]; 

                                    return (
                                        <div 
                                            key={gruppoProd.key} 
                                            onClick={() => segnaBibitaServita(ord.id, ord.prodotti, indiceDaModificare)}
                                            style={{
                                                padding:'12px 10px', 
                                                borderBottom:'1px dashed #ecf0f1',
                                                cursor:'pointer',
                                                background: isServito ? '#d4efdf' : 'white',
                                                opacity: isServito ? 0.6 : 1,
                                                display: 'flex', justifyContent:'space-between', alignItems:'center'
                                            }}
                                        >
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
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
                                                    color: isServito ? '#7f8c8d' : '#2c3e50'
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

export default Bar;