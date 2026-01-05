// client/src/SuperAdmin.jsx
import { useState, useEffect } from 'react';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const API_URL = "https://stark-backend-gg17.onrender.com";

  // Carica la lista di tutti i ristoranti
  useEffect(() => {
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => setRistoranti(data))
      .catch(err => console.error(err));
  }, []);

  // Funzione per cambiare lo stato (Attiva/Disattiva Ordini)
  const toggleOrdini = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale;
    
    // Aggiorniamo subito visivamente (Ottimistico)
    const nuovaLista = ristoranti.map(r => 
        r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r
    );
    setRistoranti(nuovaLista);

    // Salviamo sul server
    await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordini_abilitati: nuovoStato })
    });
  };

  return (
    <div className="container">
      <h1>🦸‍♂️ Super Admin Control</h1>
      <p>Gestione centralizzata della piattaforma.</p>
      
      <div className="card-grid" style={{marginTop: '20px'}}>
        {ristoranti.map(r => (
            <div key={r.id} className="card" style={{borderLeft: r.ordini_abilitati ? '5px solid green' : '5px solid red'}}>
                <h3>{r.nome}</h3>
                <p>Slug: <small>/{r.slug}</small></p>
                
                <div style={{marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span>Modalità Menu:</span>
                    <button 
                        onClick={() => toggleOrdini(r.id, r.ordini_abilitati)}
                        style={{
                            background: r.ordini_abilitati ? 'green' : '#ccc',
                            color: 'white',
                            border: 'none',
                            padding: '10px',
                            cursor: 'pointer',
                            borderRadius: '5px'
                        }}
                    >
                        {r.ordini_abilitati ? "✅ Ordini ATTIVI" : "👁️ Solo VETRINA"}
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default SuperAdmin;