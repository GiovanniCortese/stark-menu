// client/src/Cucina.jsx
import { useState, useEffect } from 'react';

function Cucina() {
  const [ordini, setOrdini] = useState([]);

  // Scarica gli ordini
  const aggiornaOrdini = () => {
    fetch('https://stark-backend-gg17.onrender.com/api/polling/1')
      .then(res => res.json())
      .then(data => setOrdini(data.nuovi_ordini))
      .catch(err => console.error("Errore polling:", err));
  };

  // NUOVO: Gestisce il click su "Pronto"
  const segnaComePronto = async (ordineId) => {
    try {
      const response = await fetch('https://stark-backend-gg17.onrender.com/api/ordine/completato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordineId })
      });
      
      if (response.ok) {
        // Se è andato tutto bene, aggiorniamo subito la lista!
        // Il ticket sparirà perché il server ora ci manda solo quelli 'in_attesa'
        aggiornaOrdini(); 
      }
    } catch (error) {
      console.error("Errore completamento:", error);
      alert("Impossibile aggiornare l'ordine");
    }
  };

  useEffect(() => {
    aggiornaOrdini();
    const intervallo = setInterval(aggiornaOrdini, 5000);
    return () => clearInterval(intervallo);
  }, []);

  return (
    <div className="cucina-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>👨‍🍳 Monitor Cucina</h1>
        <div style={{background: '#222', color: '#fff', padding: '5px 15px', borderRadius: '20px'}}>
            Stark Pizzeria
        </div>
      </header>
      
      <div className="ordini-grid">
        {ordini.length === 0 && (
            <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#888'}}>
                <h2>Tutto tranquillo... 💤</h2>
                <p>Nessun ordine in attesa.</p>
            </div>
        )}

        {ordini.map((ordine) => (
          <div key={ordine.id} className="ticket">
            <div className="ticket-header">
              <span className="tavolo">Tavolo {ordine.tavolo}</span>
              <span className="orario">{new Date(ordine.data_creazione).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="ticket-body">
              <p>{ordine.dettagli}</p>
            </div>
            {/* Al click chiamiamo la funzione segnaComePronto con l'ID dell'ordine */}
            <button 
                className="btn-completato" 
                onClick={() => segnaComePronto(ordine.id)}
            >
                ✅ Clicca per "ORDINE COMPLETATO"
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Cucina;