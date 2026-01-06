// client/src/Cucina.jsx - VERSIONE V14 (PARSING SICURO + DEBUG) 👨‍🍳
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
          console.log("Ordini ricevuti:", data.nuovi_ordini);
          setOrdini(data.nuovi_ordini || []);
      })
      .catch(err => console.error("Errore polling:", err));
  };

  // 3. Polling (ogni 3 secondi per essere più reattivi)
  useEffect(() => {
    if (infoRistorante) {
      aggiornaOrdini(); 
      const intervallo = setInterval(aggiornaOrdini, 3000); 
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
      alert("Errore di connessione");
    }
  };

  // Helper per leggere i prodotti in qualsiasi formato arrivino
  const renderProdotti = (prodotti) => {
      let lista = [];
      
      // Se è già un array, lo usiamo
      if (Array.isArray(prodotti)) {
          lista = prodotti;
      } 
      // Se è una stringa che sembra un array JSON, la parsiamo
      else if (typeof prodotti === 'string' && prodotti.startsWith('[')) {
          try {
              lista = JSON.parse(prodotti);
          } catch(e) {
              lista = [prodotti]; // Fallback testo semplice
          }
      } 
      // Se è testo semplice
      else if (prodotti) {
          lista = [prodotti];
      }

      return (
          <ul style={{paddingLeft: '20px', margin: '10px 0', fontSize:'1.1rem', textAlign:'left'}}>
              {lista.map((item, index) => (
                  <li key={index} style={{marginBottom:'5px'}}>
                      {typeof item === 'string' ? item : (item.nome || "Piatto sconosciuto")}
                  </li>
              ))}
          </ul>
      );
  };

  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ Caricamento Ristorante...</h1></div>;

  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>👨‍🍳 Cucina</h1>
        <div style={{textAlign:'right'}}>
            <div style={{background: '#222', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontWeight:'bold'}}>
                {infoRistorante.ristorante}
            </div>
            <small style={{color:'#666', fontSize:'10px'}}>ID: {infoRistorante.id}</small>
        </div>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Tutto pulito! 🧹</h2>
                <p>Nessun ordine in attesa per l'ID <strong>{infoRistorante.id}</strong></p>
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
              {/* Usiamo l'helper intelligente che legge sia 'prodotti' che 'dettagli' */}
              {renderProdotti(ordine.prodotti || ordine.dettagli)}
              
              {ordine.totale && <div style={{marginTop:'10px', borderTop:'1px dashed #ccc', paddingTop:'5px', fontWeight:'bold'}}>Tot: {ordine.totale}€</div>}
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