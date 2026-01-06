// client/src/Cassa.jsx - GESTIONE TOTALE & MODIFICHE V30 💶
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const [tavoliAttivi, setTavoliAttivi] = useState({}); 
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(res=>res.json()).then(setInfoRistorante);
    if (localStorage.getItem(`cassa_session_${slug}`) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === "tonystark") { setIsAuthorized(true); localStorage.setItem(`cassa_session_${slug}`, "true"); }
    else alert("Password Errata");
  };

  const aggiornaDati = () => {
    if (!infoRistorante?.id) return;
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
        const ordini = Array.isArray(data.nuovi_ordini) ? data.nuovi_ordini : [];
        const raggruppati = {};
        
        ordini.forEach(ord => {
            const t = ord.tavolo;
            if(!raggruppati[t]) raggruppati[t] = { ordini: [], totale: 0 };
            raggruppati[t].ordini.push(ord);
            raggruppati[t].totale += Number(ord.totale || 0);
        });
        setTavoliAttivi(raggruppati);
      })
      .catch(e => console.error("Errore polling:", e));
  };

  useEffect(() => {
    if (isAuthorized && infoRistorante) {
      aggiornaDati();
      const i = setInterval(aggiornaDati, 2000); // Polling rapido ogni 2 sec
      return () => clearInterval(i);
    }
  }, [isAuthorized, infoRistorante]);

  // --- AZIONI SUI SINGOLI PIATTI ---

  const modificaStatoProdotto = async (ordineId, prodottiAttuali, indexDaModificare, nuovoStato) => {
      // Clona l'array dei prodotti per non mutare lo stato direttamente
      const nuoviProdotti = [...prodottiAttuali];
      // Modifica lo stato dell'elemento specifico
      nuoviProdotti[indexDaModificare].stato = nuovoStato;
      
      // Invia l'aggiornamento al server
      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti })
      });
      aggiornaDati(); // Ricarica subito
  };

  const eliminaProdotto = async (ordineId, prodottiAttuali, indexDaEliminare) => {
      if(!confirm("Eliminare questo piatto dall'ordine?")) return;
      
      // Filtra via il prodotto da eliminare
      const nuoviProdotti = prodottiAttuali.filter((_, idx) => idx !== indexDaEliminare);
      
      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti })
      });
      aggiornaDati();
  };

  const chiudiTavolo = async (t) => {
      if(!confirm(`Incassare e chiudere il Tavolo ${t}?`)) return;
      
      await fetch(`${API_URL}/api/cassa/paga-tavolo`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: t })
      });
      aggiornaDati();
  };

  // --- RENDER ---

  if (!infoRistorante) return <div style={{padding:50, textAlign:'center'}}><h1>⏳ Caricamento...</h1></div>;
  
  if (!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50'}}>
        <div style={{background:'white', padding:'40px', borderRadius:'10px', textAlign:'center', minWidth:'300px'}}>
            <h1>💶 Accesso Cassa</h1>
            <p>{infoRistorante.ristorante}</p>
            <form onSubmit={handleLogin}>
                <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}/>
                <button className="btn-invia" style={{width:'100%', background:'#27ae60', color:'white', padding:'10px', border:'none', borderRadius:'5px'}}>ENTRA</button>
            </form>
        </div>
      </div>
  );

  return (
    <div style={{background:'#eee', minHeight:'100vh', padding:20}}>
      <h1 style={{color:'#333'}}>💶 Cassa: {infoRistorante.ristorante}</h1>
      
      {Object.keys(tavoliAttivi).length === 0 && <p style={{textAlign:'center', fontSize:20, color:'#888', marginTop:50}}>Nessun tavolo attivo al momento.</p>}

      {Object.keys(tavoliAttivi).map(tavolo => (
          <div key={tavolo} style={{background:'white', margin:'20px 0', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex', justifyContent:'space-between', borderBottom:'2px solid #ddd', paddingBottom:10, marginBottom:10}}>
                  <h2 style={{margin:0}}>Tavolo {tavolo}</h2>
                  <h2 style={{margin:0, color:'#27ae60'}}>Totale: {tavoliAttivi[tavolo].totale.toFixed(2)}€</h2>
              </div>

              {tavoliAttivi[tavolo].ordini.map(ord => (
                  <div key={ord.id} style={{marginBottom:15, borderLeft:'4px solid #eee', paddingLeft:10}}>
                      <div style={{fontSize:12, color:'#888', marginBottom:5}}>
                          Ordine #{ord.id} - {new Date(ord.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </div>
                      
                      {/* Lista Prodotti con Controlli */}
                      {ord.prodotti.map((p, idx) => (
                          <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed #f0f0f0'}}>
                              <div style={{flex:1}}>
                                  <span style={{
                                      fontSize:16, 
                                      fontWeight: p.stato === 'servito' ? 'normal' : 'bold',
                                      textDecoration: p.stato === 'servito' ? 'line-through' : 'none', 
                                      color: p.stato === 'servito' ? '#aaa' : '#000'
                                  }}>
                                      {p.nome}
                                  </span>
                                  <span style={{fontSize:12, color:'#888', marginLeft:10}}>
                                      ({p.is_bar ? '🍹 Bar' : '🍽️ Cucina'}) - {p.prezzo}€
                                  </span>
                              </div>
                              
                              <div style={{display:'flex', gap:10}}>
                                  {/* TASTO STATO (Servito/In Attesa) */}
                                  <button 
                                    onClick={() => modificaStatoProdotto(ord.id, ord.prodotti, idx, p.stato === 'servito' ? 'in_attesa' : 'servito')}
                                    style={{
                                        background: p.stato === 'servito' ? '#27ae60' : '#f39c12',
                                        color:'white', border:'none', padding:'5px 12px', borderRadius:5, cursor:'pointer', fontSize:14
                                    }}
                                  >
                                      {p.stato === 'servito' ? '✅ SERVITO' : '⏳ IN ATTESA'}
                                  </button>

                                  {/* TASTO ELIMINA */}
                                  <button 
                                    onClick={() => eliminaProdotto(ord.id, ord.prodotti, idx)}
                                    style={{background:'#e74c3c', color:'white', border:'none', padding:'5px 10px', borderRadius:5, cursor:'pointer', fontSize:14}}
                                    title="Elimina piatto"
                                  >
                                      🗑️
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              ))}

              <button 
                onClick={() => chiudiTavolo(tavolo)} 
                style={{width:'100%', padding:15, background:'#2c3e50', color:'white', border:'none', fontSize:18, marginTop:20, cursor:'pointer', borderRadius:5, fontWeight:'bold'}}
              >
                  💰 INCASSA E CHIUDI TAVOLO
              </button>
          </div>
      ))}
    </div>
  );
}

export default Cassa;