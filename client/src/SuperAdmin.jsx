// client/src/SuperAdmin.jsx - VERSIONE GOD MODE ⚡️
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SuperAdmin() {
  const [ristoranti, setRistoranti] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    // PROTEZIONE INGRESSO
    const password = prompt("🔒 Accesso Riservato Stark Enterprise.\nInserisci la Master Key:");
    
    if (password === "tonystark") {
        setAuthorized(true);
        caricaDati();
    } else {
        alert("⛔ Accesso Negato!");
        navigate('/'); 
    }
  }, []);

  const caricaDati = () => {
    fetch(`${API_URL}/api/super/ristoranti`)
      .then(res => res.json())
      .then(data => {
          if(Array.isArray(data)) {
            setRistoranti(data);
          } else {
            console.error("Formato dati imprevisto:", data);
          }
      })
      .catch(err => console.error(err));
  };

  const toggleOrdini = async (id, statoAttuale) => {
    // 1. Aggiornamento Visivo Immediato (Optimistic UI)
    const nuovoStato = !statoAttuale;
    const nuovaLista = ristoranti.map(r => 
        r.id === id ? { ...r, ordini_abilitati: nuovoStato } : r
    );
    setRistoranti(nuovaLista);

    // 2. Aggiornamento Server
    try {
        await fetch(`${API_URL}/api/super/ristoranti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordini_abilitati: nuovoStato })
        });
    } catch(err) {
        alert("Errore di connessione, ripristino stato...");
        caricaDati(); // Ricarica il vero stato se fallisce
    }
  };

  // --- NUOVA FUNZIONE: IMPERSONIFICAZIONE ---
  const entraNelPannello = (slug) => {
    // Qui facciamo una magia: diciamo al browser che siamo già loggati per QUESTO ristorante.
    // IMPORTANTE: Assicurati che la chiave 'stark_session_...' corrisponda a quella che usa il tuo Admin.jsx
    // Se nel tuo Admin.jsx controlli una chiave diversa, cambiala qui sotto.
    localStorage.setItem(`stark_session_${slug}`, "true");
    
    // Ora navighiamo e il pannello ci lascerà entrare senza password
    navigate(`/admin/${slug}`);
  };

  if (!authorized) return null;

  return (
    <div className="container" style={{maxWidth: '1000px', margin: '0 auto', padding: '20px'}}>
      <header style={{borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
            <h1>🦸‍♂️ J.A.R.V.I.S. Control Center</h1>
            <p>Super Admin: Gestione Globale Attività</p>
        </div>
        <button onClick={() => navigate('/')} style={{padding:'10px 20px', cursor:'pointer'}}>Esci</button>
      </header>
      
      <div className="card-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
        {ristoranti.map(r => (
            <div key={r.id} className="card" style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                borderLeft: r.ordini_abilitati ? '8px solid #2ecc71' : '8px solid #e74c3c',
                background: '#fff',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                {/* INTESTAZIONE CARD */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'15px'}}>
                    <div>
                        <h2 style={{margin:'0 0 5px 0', fontSize:'1.2rem'}}>{r.nome}</h2>
                        <code style={{background:'#eee', color:'#555', padding:'2px 6px', borderRadius:'4px', fontSize:'0.8rem'}}>/{r.slug}</code>
                    </div>
                    <div style={{fontSize:'24px'}} title={r.ordini_abilitati ? "Aperti" : "Chiusi"}>
                        {r.ordini_abilitati ? '🟢' : '🔴'}
                    </div>
                </div>
                
                {/* CORPO CARD - STATO */}
                <div style={{background: '#f4f4f4', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign:'center'}}>
                    <small>Stato Attuale:</small><br/>
                    <strong style={{color: r.ordini_abilitati ? '#27ae60' : '#c0392b'}}>
                        {r.ordini_abilitati ? "ORDINI APERTI" : "SOLO VETRINA"}
                    </strong>
                </div>

                {/* PULSANTIERA DI CONTROLLO */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    
                    {/* 1. Tasto per entrare nel pannello (GOD MODE) */}
                    <button 
                        onClick={() => entraNelPannello(r.slug)}
                        style={{
                            background: '#34495e',
                            color: 'white',
                            border: 'none',
                            padding: '10px',
                            cursor: 'pointer',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '8px'
                        }}
                    >
                        ⚙️ GESTISCI PANNELLO
                    </button>

                    {/* 2. Tasto Toggle Rapido */}
                    <button 
                        onClick={() => toggleOrdini(r.id, r.ordini_abilitati)}
                        style={{
                            background: 'white',
                            border: r.ordini_abilitati ? '2px solid #e74c3c' : '2px solid #2ecc71',
                            color: r.ordini_abilitati ? '#e74c3c' : '#2ecc71',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {r.ordini_abilitati ? "Chiudi Ordini 🔒" : "Apri Ordini 🔓"}
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default SuperAdmin;