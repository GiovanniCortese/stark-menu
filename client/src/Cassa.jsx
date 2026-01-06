// client/src/Cassa.jsx - VERSIONE V23 (FIX CRASH AVVIO) 💶
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cassa() {
  const { slug } = useParams();
  const [tab, setTab] = useState('attivi'); // 'attivi' o 'storico'
  const [tavoliAttivi, setTavoliAttivi] = useState({}); 
  const [storico, setStorico] = useState([]);
  
  // Inizializziamo a null
  const [infoRistorante, setInfoRistorante] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // Caricamento Dati Ristorante
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => {
          if(data.error) console.error("Ristorante non trovato");
          setInfoRistorante(data);
      })
      .catch(err => console.error("Errore fetch menu:", err));

    // Controllo Sessione
    const sessionKey = `cassa_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === "tonystark") {
      setIsAuthorized(true);
      localStorage.setItem(`cassa_session_${slug}`, "true");
    } else { alert("Password Errata"); }
  };

  // --- LOGICA RAGGRUPPAMENTO TAVOLI ---
  const aggiornaTavoliAttivi = () => {
    if (!infoRistorante?.id) return;
    
    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
        const ordini = data.nuovi_ordini || [];
        const raggruppati = {};

        // Raggruppa gli ordini per numero di tavolo
        ordini.forEach(ordine => {
          const tavolo = ordine.tavolo;
          if (!raggruppati[tavolo]) {
            raggruppati[tavolo] = { ordini: [], totale: 0, ultimo_orario: ordine.data_ora };
          }
          raggruppati[tavolo].ordini.push(ordine);
          // Somma sicura (converte in numero se serve)
          raggruppati[tavolo].totale += Number(ordine.totale || 0);
        });
        setTavoliAttivi(raggruppati);
      })
      .catch(e => console.error("Errore polling cassa", e));
  };

  const caricaStorico = () => {
    if (!infoRistorante?.id) return;
    fetch(`${API_URL}/api/cassa/storico/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => setStorico(data));
  };

  // Polling continuo ogni 3 secondi (SOLO SE DATI CARICATI)
  useEffect(() => {
    if (isAuthorized && infoRistorante && infoRistorante.id) {
      if (tab === 'attivi') {
        aggiornaTavoliAttivi();
        const interval = setInterval(aggiornaTavoliAttivi, 3000);
        return () => clearInterval(interval);
      } else {
        caricaStorico();
      }
    }
  }, [isAuthorized, infoRistorante, tab]);

  const chiudiTavolo = async (tavoloNum) => {
    if (!confirm(`Confermi il pagamento del Tavolo ${tavoloNum}?`)) return;
    
    try {
        await fetch(`${API_URL}/api/cassa/paga-tavolo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ristorante_id: infoRistorante.id, tavolo: tavoloNum })
        });
        aggiornaTavoliAttivi(); // Refresh immediato interfaccia
    } catch(e) {
        alert("Errore di connessione durante il pagamento");
    }
  };

  // --- 1. SCHERMATA CARICAMENTO (FIX CRASH) ---
  // Se infoRistorante è null, aspettiamo e non renderizziamo il resto
  if (!infoRistorante) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50', color:'white'}}>
              <h1>⏳ Caricamento Sistema Cassa...</h1>
          </div>
      );
  }

  // --- 2. SCHERMATA LOGIN ---
  if (!isAuthorized) return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#2c3e50'}}>
        <div style={{background:'white', padding:'40px', borderRadius:'10px', textAlign:'center', minWidth:'300px'}}>
            <h1>💶 Cassa</h1>
            <p>{infoRistorante.ristorante}</p> {/* Qui ora è sicuro leggerlo */}
            <form onSubmit={handleLogin}>
                <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}/>
                <button className="btn-invia" style={{width:'100%'}}>ENTRA</button>
            </form>
        </div>
    </div>
  );

  // --- 3. SCHERMATA DASHBOARD (CASSA ATTIVA) ---
  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', padding:'20px'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div>
            <h1 style={{margin:0, color:'#2c3e50'}}>💶 Cassa Centrale</h1>
            <p style={{margin:0, color:'#7f8c8d'}}>{infoRistorante.ristorante}</p>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setTab('attivi')} style={{background: tab==='attivi'?'#2980b9':'#bdc3c7', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>Tavoli Attivi</button>
            <button onClick={() => setTab('storico')} style={{background: tab==='storico'?'#2980b9':'#bdc3c7', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>Storico</button>
        </div>
      </header>

      {/* --- VISTA TAVOLI ATTIVI --- */}
      {tab === 'attivi' && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
            {Object.keys(tavoliAttivi).length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', fontSize:'20px', color:'#7f8c8d'}}>Nessun tavolo attivo.</p>}
            
            {Object.keys(tavoliAttivi).map(tavolo => {
                const dati = tavoliAttivi[tavolo];
                return (
                    <div key={tavolo} style={{background:'white', borderRadius:'10px', boxShadow:'0 2px 10px rgba(0,0,0,0.1)', overflow:'hidden', display:'flex', flexDirection:'column'}}>
                        <div style={{background:'#27ae60', color:'white', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h2 style={{margin:0, fontSize:'22px'}}>Tavolo {tavolo}</h2>
                            <span style={{fontSize:'22px', fontWeight:'bold'}}>{dati.totale.toFixed(2)} €</span>
                        </div>
                        
                        <div style={{padding:'15px', flex:1, maxHeight:'300px', overflowY:'auto'}}>
                            {dati.ordini.map((ord, idx) => {
                                // Parsing Sicuro
                                let prodotti = [];
                                try { 
                                    prodotti = typeof ord.prodotti === 'string' ? JSON.parse(ord.prodotti) : ord.prodotti; 
                                } catch(e) { prodotti = []; }
                                if (!Array.isArray(prodotti)) prodotti = [];

                                return (
                                    <div key={ord.id} style={{marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px dashed #eee'}}>
                                        <div style={{fontSize:'12px', color:'#999'}}>
                                            Ordine #{ord.id} - {new Date(ord.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                        <ul style={{paddingLeft:'20px', margin:'5px 0'}}>
                                            {prodotti.map((p, i) => (
                                                <li key={i}>
                                                    {p.nome} 
                                                    <span style={{float:'right', fontWeight:'bold'}}>{p.prezzo}€</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button 
                            onClick={() => chiudiTavolo(tavolo)}
                            style={{width:'100%', padding:'20px', background:'#2c3e50', color:'white', border:'none', fontSize:'16px', cursor:'pointer', fontWeight:'bold', marginTop:'auto'}}
                        >
                            💰 PAGA E CHIUDI TAVOLO
                        </button>
                    </div>
                );
            })}
        </div>
      )}

      {/* --- VISTA STORICO --- */}
      {tab === 'storico' && (
          <div style={{background:'white', padding:'20px', borderRadius:'10px'}}>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                      <tr style={{background:'#f9f9f9', textAlign:'left'}}>
                          <th style={{padding:'10px'}}>Data/Ora</th>
                          <th style={{padding:'10px'}}>Tavolo</th>
                          <th style={{padding:'10px'}}>Prodotti</th>
                          <th style={{padding:'10px'}}>Totale</th>
                      </tr>
                  </thead>
                  <tbody>
                      {storico.map(ord => {
                          // Parsing sicuro anche per lo storico
                          let prods = [];
                          try { prods = typeof ord.prodotti === 'string' ? JSON.parse(ord.prodotti) : ord.prodotti; } catch(e){}
                          if(!Array.isArray(prods)) prods = [];

                          return (
                              <tr key={ord.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:'10px'}}>{new Date(ord.data_ora).toLocaleString()}</td>
                                  <td style={{padding:'10px'}}>Tavolo {ord.tavolo}</td>
                                  <td style={{padding:'10px', fontSize:'14px'}}>
                                      {prods.map(p=>p.nome).join(', ')}
                                  </td>
                                  <td style={{padding:'10px', fontWeight:'bold'}}>{ord.totale} €</td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
}

export default Cassa;