// client/src/Cucina.jsx - VERSIONE MULTI-RISTORANTE 👨‍🍳
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); // Qui salviamo ID e Nome
  const { slug } = useParams(); // Legge "da-luigi" o "pizzeria-stark" dall'URL
  
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // 1. Appena apri la pagina, scopriamo CHI SIAMO (ID e Nome) basandoci sullo slug
  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(res => res.json())
      .then(data => {
        // data contiene: { id: 1, ristorante: "Pizzeria Stark", ... }
        // Se il server non tornasse l'ID, questo passaggio fallirebbe.
        // Assicurati di aver aggiornato server.js come detto prima!
        setInfoRistorante(data); 
      })
      .catch(err => console.error("Ristorante non trovato:", err));
  }, [slug]);

  // 2. Funzione per scaricare gli ordini (usando l'ID dinamico)
  const aggiornaOrdini = () => {
    if (!infoRistorante?.id) return; // Se non sappiamo ancora chi siamo, non facciamo nulla

    fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
      .then(res => res.json())
      .then(data => setOrdini(data.nuovi_ordini || []))
      .catch(err => console.error("Errore polling:", err));
  };

  // 3. Attiva il Polling solo quando abbiamo le info del ristorante
  useEffect(() => {
    if (infoRistorante) {
      aggiornaOrdini(); // Prima chiamata immediata
      const intervallo = setInterval(aggiornaOrdini, 5000); // Poi ogni 5 sec
      return () => clearInterval(intervallo);
    }
  }, [infoRistorante]);

  // 4. Gestisce il click su "Pronto"
  const segnaComePronto = async (ordineId) => {
    try {
      const response = await fetch(`${API_URL}/api/ordine/completato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordineId })
      });
      
      if (response.ok) {
        aggiornaOrdini(); // Ricarica subito la lista pulita
      }
    } catch (error) {
      console.error("Errore completamento:", error);
      alert("Impossibile aggiornare l'ordine");
    }
  };

  if (!infoRistorante) return <div className="cucina-container" style={{textAlign:'center', padding:'50px'}}><h1>⏳ Identificazione Ristorante...</h1></div>;

  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>👨‍🍳 Cucina</h1>
        <div style={{background: '#222', color: '#fff', padding: '5px 15px', borderRadius: '20px'}}>
            {infoRistorante.ristorante} {/* Nome Dinamico! */}
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
                {new Date(ordine.data_creazione).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="ticket-body">
              <p>{ordine.dettagli}</p>
            </div>
            
            <button 
                className="btn-completato" 
                onClick={() => segnaComePronto(ordine.id)}
            >
                ✅ ORDINE PRONTO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;