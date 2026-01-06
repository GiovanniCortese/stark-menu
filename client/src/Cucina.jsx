// client/src/Cucina.jsx - VERSIONE V13 (COMPATIBILE CON NUOVI ORDINI) 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const { slug } = useParams(); 
  
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 1. Identificazione Ristorante
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => {
        setInfoRistorante(data); 
      })
      .catch(err => console.error("Ristorante non trovato:", err));
  }, [slug]);

  // 2. Scaricamento Ordini
  const aggiornaOrdini = () => {
    if (!infoRistorante?.id) return; 

    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => {
          // I dati arrivano dal server già formattati, ma assicuriamoci che l'array esista
          setOrdini(data.nuovi_ordini || []);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  // 3. Polling
  useEffect(() => {
    if (infoRistorante) {
      aggiornaOrdini(); 
      const intervallo = setInterval(aggiornaOrdini, 5000); 
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante]);

  // 4. Segna come Pronto
  const segnaComePronto = async (ordineId) => {
    try {
      const response = await fetch(`${API_URL}/api/ordine/completato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordineId })
      });
      
      if (response.ok) {
        aggiornaOrdini(); 
      }
    } catch (error) {
      console.error("Errore completamento:", error);
      alert("Impossibile aggiornare l'ordine");
    }
  };

  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ In attesa del server...</h1></div>;

  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>👨‍🍳 Cucina</h1>
        <div style={{background: '#222', color: '#fff', padding: '5px 15px', borderRadius: '20px'}}>
            {infoRistorante.ristorante}
        </div>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Tutto pulito! 🧹</h2>
                <p>In attesa di nuovi ordini per {infoRistorante.ristorante}...</p>
            </div>
        )}

        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket">
            <div className="ticket-header">
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              <span className="orario">
                {/* Supporto sia per data_ora (nuovo) che data_creazione (vecchio) */}
                {new Date(ordine.data_ora || ordine.data_creazione).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            <div className="ticket-body" style={{textAlign:'left'}}>
              {/* LOGICA INTELLIGENTE: Se c'è 'prodotti' (nuovo array), usa quello. Altrimenti usa 'dettagli' (vecchio testo) */}
              {Array.isArray(ordine.prodotti) && ordine.prodotti.length > 0 ? (
                  <ul style={{paddingLeft: '20px', margin: '10px 0', fontSize:'1.1rem'}}>
                      {ordine.prodotti.map((item, index) => (
                          <li key={index} style={{marginBottom:'5px'}}>
                              {/* Gestisce sia se item è una stringa ("Margherita") sia se è un oggetto ({nome: "Margherita"}) */}
                              {typeof item === 'string' ? item : item.nome}
                          </li>
                      ))}
                  </ul>
              ) : (
                  <p style={{fontSize:'1.2rem', fontWeight:'bold'}}>{ordine.dettagli || "Nessun dettaglio"}</p>
              )}
            </div>
            
            <button 
                className="btn-completato" 
                onClick={() => segnaComePronto(ordine.id)}
            >
                ✅ PRONTO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;