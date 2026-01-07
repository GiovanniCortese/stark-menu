// client/src/Cucina.jsx - VERSIONE V34 (RAGGRUPPAMENTO PER TAVOLO & LOG) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const { slug } = useParams();
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(res=>res.json()).then(setInfoRistorante);
    if (localStorage.getItem(`cucina_session_${slug}`) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === "tonystark") { 
        setIsAuthorized(true); 
        localStorage.setItem(`cucina_session_${slug}`, "true"); 
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
    if (!infoRistorante?.id) return;
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
        // Prendiamo i dati grezzi, il raggruppamento lo facciamo visivamente dopo
        const grezzi = Array.isArray(data.nuovi_ordini) ? data.nuovi_ordini : [];
        setOrdini(grezzi);
      })
      .catch(e => console.error(e));
  };

  useEffect(() => {
    if (isAuthorized && infoRistorante) {
      aggiorna();
      const i = setInterval(aggiorna, 2000); // Sync ogni 2 secondi
      return () => clearInterval(i);
    }
  }, [isAuthorized, infoRistorante]);

  // --- LOGICA DI RAGGRUPPAMENTO VISIVO ---
  // Unisce ordini diversi dello stesso tavolo in un unico blocco visivo
  const ordiniRaggruppati = ordini.reduce((acc, ordine) => {
      const tavolo = ordine.tavolo;
      
      // Se è la prima volta che incontriamo questo tavolo, creiamo il contenitore
      if (!acc[tavolo]) {
          acc[tavolo] = {
              tavolo: tavolo,
              timestamp: ordine.data_ora, // Usiamo l'orario del primo ordine
              items: [] 
          };
      }

      // Aggiungiamo i piatti di QUESTO ordine alla lista del tavolo
      ordine.prodotti.forEach((prod, index) => {
          if (!prod.is_bar) { // FILTRO: Solo CUCINA (niente bibite)
              acc[tavolo].items.push({
                  ...prod,
                  originalOrderId: ordine.id, // Fondamentale: ricordiamo da quale ordine viene
                  originalIndex: index
              });
          }
      });
      return acc;
  }, {});

  // Convertiamo l'oggetto in array e ordiniamo per orario (i tavoli che aspettano da più tempo in cima)
  const listaTavoli = Object.values(ordiniRaggruppati)
        .filter(t => t.items.length > 0) // Nascondiamo tavoli che hanno solo bibite
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // --- AZIONE: SEGNA COME SERVITO ---
  const segnaPiattoServito = async (piatto) => {
      // 1. Troviamo l'ordine originale nei dati grezzi
      const ordineOriginale = ordini.find(o => o.id === piatto.originalOrderId);
      if (!ordineOriginale) return;

      // 2. Creiamo una copia dei prodotti per modificarla
      const nuoviProdotti = [...ordineOriginale.prodotti];
      const itemReale = nuoviProdotti[piatto.originalIndex];

      // 3. Cambiamo stato
      const nuovoStato = itemReale.stato === 'servito' ? 'in_attesa' : 'servito';
      itemReale.stato = nuovoStato;
      
      // 4. Aggiorniamo orario servizio
      if (nuovoStato === 'servito') {
          itemReale.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else {
          delete itemReale.ora_servizio;
      }

      // 5. Generiamo il LOG per la cassa
      const logMsg = `[CUCINA 👨‍🍳] ${nuovoStato === 'servito' ? 'HA SERVITO' : 'HA RIMESSO IN ATTESA'}: ${itemReale.nome}`;

      // 6. Inviamo al server
      await fetch(`${API_URL}/api/ordine/${piatto.originalOrderId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg })
      });
      aggiorna(); // Ricarica immediata
  };

  if (!infoRistorante) return <div style={{padding:50, textAlign:'center'}}><h1>⏳ Caricamento...</h1></div>;
  
  if (!isAuthorized) return (
      <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#eee'}}>
        <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.1)', maxWidth:'400px', width:'90%'}}>
            <h1>👨‍🍳 Cucina</h1>
            <h3 style={{color:'#666'}}>{infoRistorante.ristorante}</h3>
            <form onSubmit={handleLogin}>
                <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', fontSize:'16px', boxSizing:'border-box'}}/>
                <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#27ae60', border:'none', color:'white', fontSize:'16px', borderRadius:'5px', cursor:'pointer'}}>ENTRA</button>
            </form>
        </div>
      </div>
  );

  return (
    <div style={{background:'#2c3e50', minHeight:'100vh', padding:20, color:'white'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', background:'white', padding:'10px 20px', borderRadius:'8px'}}>
          <h1 style={{margin:0, color:'#333'}}>👨‍🍳 Cucina: {infoRistorante.ristorante}</h1>
          <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
        {listaTavoli.length === 0 && (
            <div style={{textAlign:'center', gridColumn:'1/-1', color:'#ccc', marginTop:'50px'}}>
                <h2>Nessuna comanda in attesa 👨‍🍳</h2>
                <p>Tutto pulito!</p>
            </div>
        )}
        
        {listaTavoli.map((tavoloData) => (
            <div key={tavoloData.tavolo} style={{background:'white', color:'#333', borderRadius:'10px', overflow:'hidden', boxShadow:'0 5px 15px rgba(0,0,0,0.3)'}}>
                
                {/* INTESTAZIONE TAVOLO UNIFICATA */}
                <div style={{background:'#d35400', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2 style={{margin:0, fontSize:'22px'}}>Tavolo {tavoloData.tavolo}</h2>
                    <span style={{fontSize:'14px', background:'rgba(0,0,0,0.2)', padding:'3px 8px', borderRadius:'4px'}}>
                        {new Date(tavoloData.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                </div>

                {/* LISTA PIATTI UNIFICATA */}
                <div style={{padding:'10px'}}>
                    {tavoloData.items.map((piatto, idx) => (
                        <div key={`${piatto.originalOrderId}_${idx}`} 
                             onClick={() => segnaPiattoServito(piatto)}
                             style={{
                                display:'flex', justifyContent:'space-between', alignItems:'center',
                                padding:'12px', marginBottom:'5px', borderRadius:'5px', cursor:'pointer',
                                background: piatto.stato === 'servito' ? '#e8f5e9' : '#fff',
                                borderBottom: '1px dashed #eee',
                                opacity: piatto.stato === 'servito' ? 0.6 : 1,
                                transition: 'all 0.2s'
                             }}
                        >
                            <div style={{display:'flex', flexDirection:'column'}}>
                                <strong style={{
                                    fontSize:'18px', 
                                    textDecoration: piatto.stato === 'servito' ? 'line-through' : 'none',
                                    color: piatto.stato === 'servito' ? '#aaa' : '#000'
                                }}>
                                    {piatto.nome}
                                </strong>
                                {/* Mostra note se presenti */}
                                {(piatto.descrizione || piatto.note) && (
                                    <span style={{fontSize:'12px', color:'#666', fontStyle:'italic'}}>
                                        {piatto.descrizione || piatto.note}
                                    </span>
                                )}
                            </div>
                            
                            <div style={{fontSize:'20px'}}>
                                {piatto.stato === 'servito' ? '✅' : '🔥'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;