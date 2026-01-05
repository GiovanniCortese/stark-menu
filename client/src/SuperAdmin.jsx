// client/src/SuperAdmin.jsx - VERSIONE PROTETTA 🔐
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [authorized, setAuthorized] = useState(false); // Per gestire l'accesso
  const navigate = useNavigate();
  
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // 1. CHIEDI LA PASSWORD APPENA ENTRI
    const password = prompt("🔒 Accesso Riservato Stark Enterprise.\nInserisci la Master Key:");
    
    // PASSWORD SEGRETTA (Cambiala con quella che vuoi tu)
    if (password === "tonystark") {
        setAuthorized(true);
        caricaDati();
    } else {
        alert("⛔ Accesso Negato!");
        navigate('/'); // Lo rispediamo alla home
    }
  }, []);

  const caricaDati = () => {
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => {
          // Se il server dà errore (es. database non aggiornato), data potrebbe non essere un array
          if(Array.isArray(data)) {
            setRistoranti(data);
          } else {
            alert("Errore caricamento dati dal server.");
            console.error(data);
          }
      })
      .catch(err => console.error(err));
  };

  const toggleOrdini = async (id, statoAttuale) => {
    const nuovoStato = !statoAttuale;
    
    // Aggiornamento ottimistico (vediamo subito il cambiamento)
    const nuovaLista = ristoranti.map(r => 
        r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r
    );
    setRistoranti(nuovaLista);

    // Salvataggio su server
    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordini_abilitati: nuovoStato })
        });
    } catch(err) {
        alert("Errore di connessione");
        // Se fallisce, ricarichiamo i dati veri
        caricaDati();
    }
  };

  // Se non ha messo la password giusta, mostriamo pagina bianca (o nulla)
  if (!authorized) return null;

  return (
    <div className="container">
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px'}}>
        <h1>🦸‍♂️ Super Admin Control</h1>
        <p>Gestione centralizzata della piattaforma.</p>
        <button onClick={() => navigate('/')} style={{background:'#666', marginTop:'10px'}}>Torna alla Home</button>
      </header>
      
      <div className="card-grid" style={{marginTop: '30px'}}>
        {ristoranti.length === 0 && <p>Caricamento ristoranti in corso (o lista vuota)...</p>}
        
        {ristoranti.map(r => (
            <div key={r.id} className="card" style={{
                borderLeft: r.ordini_abilitati ? '8px solid #2ecc71' : '8px solid #e74c3c',
                background: '#f9f9f9'
            }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                    <div>
                        <h2 style={{margin:'0 0 5px 0'}}>{r.nome}</h2>
                        <code style={{background:'#eee', padding:'2px 5px', borderRadius:'4px'}}>/{r.slug}</code>
                    </div>
                    <div style={{fontSize:'20px'}}>
                        {r.ordini_abilitati ? '🟢' : '🔴'}
                    </div>
                </div>
                
                <hr style={{margin:'15px 0', border:'0', borderTop:'1px solid #ddd'}}/>

                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span style={{fontWeight:'bold', color: r.ordini_abilitati ? 'green' : 'red'}}>
                        {r.ordini_abilitati ? "MODALITÀ ORDINI" : "MODALITÀ VETRINA"}
                    </span>
                    
                    <button 
                        onClick={() => toggleOrdini(r.id, r.ordini_abilitati)}
                        style={{
                            background: r.ordini_abilitati ? '#e74c3c' : '#2ecc71',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            cursor: 'pointer',
                            borderRadius: '5px',
                            fontWeight: 'bold'
                        }}
                    >
                        {r.ordini_abilitati ? "DISABILITA ORDINI 🛑" : "ABILITA ORDINI ✅"}
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default SuperAdmin;