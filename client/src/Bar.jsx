// client/src/Bar.jsx - VERSIONE V6 (FIX SUITE CHECK & VARIANTI) 🍹
import { io } from "socket.io-client";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Aggiunto useNavigate

function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 

  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  // STATO BLOCCO (Suite Disattivata)
  const [isSuiteDisabled, setIsSuiteDisabled] = useState(false);

  const { slug } = useParams(); 
  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`)
      .then(r => r.json())
      .then(data => {
          setInfoRistorante(data);
          
          // --- 🔒 CONTROLLO DI SICUREZZA: SUITE ATTIVA? ---
          const isSuiteActive = data.cucina_super_active !== false; 
          if (!isSuiteActive) {
              setIsSuiteDisabled(true);
          }
      })
      .catch(err => console.error(err));

    const sessionKey = `bar_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

  // --- LOGIN (API) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if(!infoRistorante?.id) return;
    
    setLoadingLogin(true);
    setLoginError(false);
    
    try {
        const res = await fetch(`${API_URL}/api/auth/station`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                ristorante_id: infoRistorante.id, 
                role: 'bar', 
                password: passwordInput 
            })
        });
        const data = await res.json();
        if(data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`bar_session_${slug}`, "true");
        } else { 
            setLoginError(true);
        }
    } catch(err) { alert("Errore connessione"); } 
    finally { setLoadingLogin(false); }
  };

  const handleLogout = () => {
      if(confirm("Chiudere il Bar?")) {
          localStorage.removeItem(`bar_session_${slug}`);
          setIsAuthorized(false);
          setPasswordInput("");
      }
  };

  const aggiorna = () => {
      if(!infoRistorante?.id) return;
      fetch(`${API_URL}/api/polling/${infoRistorante.id}`)
        .then(r=>r.json())
        .then(data => {
            const nuoviOrdini = (data.nuovi_ordini || []).filter(o => o.stato !== 'in_arrivo');
            
            // Pre-processamento per calcolare flag come 'chiuso_da_cassa'
            const ordiniProcessati = nuoviOrdini.map(ord => ({
                ...ord,
                prodotti: Array.isArray(ord.prodotti) ? ord.prodotti.map(p => ({
                    ...p,
                    // Logica Proxy: se è servito ma non ha l'orario servizio salvato (o logica specifica backend)
                    chiuso_da_cassa: p.stato === 'servito' && !p.ora_servizio 
                })) : []
            }));

            const ordiniDaMostrare = ordiniProcessati.filter(o => {
                const bibite = o.prodotti.filter(p => p.is_bar);
                if (bibite.length === 0) return false;
                const tutteFiniti = bibite.every(p => p.stato === 'servito');
                return !tutteFiniti;
            });
            
            setOrdini(ordiniDaMostrare);
        })
        .catch(e => console.error("Polling error:", e));
  };


  useEffect(() => {
    // 1. Controllo di sicurezza
    if (!isAuthorized || !infoRistorante?.id) return;

    console.log("🔌 Inizializzazione Socket Bar:", infoRistorante.id);
    aggiorna();

    const socket = io(API_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true
    });

    socket.on('connect', () => {
        console.log("✅ Socket Bar Connesso!");
        socket.emit('join_room', String(infoRistorante.id));
    });

    socket.on('connect_error', (err) => {
        console.error("❌ Errore connessione Socket:", err.message);
    });

    socket.on('refresh_ordini', () => {
        console.log("🔥 Aggiornamento ordini Bar...");
        aggiorna();
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    });

    return () => {
        socket.off('connect');
        socket.off('refresh_ordini');
        socket.off('connect_error');
        socket.disconnect();
    };
  }, [isAuthorized, infoRistorante?.id]);

  const segnaBibitaServita = async (ordineId, prodottiAttuali, indices) => {
      // FIX ATOMICO: Aggiorniamo ogni bibita singolarmente
      const promises = indices.map(idx => {
          return fetch(`${API_URL}/api/ordine/${ordineId}/patch-item`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  index: idx,
                  stato: 'servito',
                  operatore: 'BAR 🍹'
              })
          });
      });

      try {
          await Promise.all(promises);
          aggiorna(); 
      } catch (error) {
          console.error("Errore Bar:", error);
          alert("Errore di connessione.");
      }
  };

  // --- HELPER CHIAVE VARIANTI ---
  const getVariantKey = (v) => {
      if(!v) return "";
      const r = (v.rimozioni || []).sort().join('_');
      const a = (v.aggiunte || []).map(x => x.nome).sort().join('_');
      return `${r}|${a}`;
  };

  // --- RAGGRUPPAMENTO BAR ---
  const getProdottiRaggruppati = (prodotti) => {
      const gruppi = [];
      
      prodotti.forEach((p, indexOriginale) => {
          if (!p.is_bar) return; 

          // *** CHIAVE UNICA (Include riaperto per separare gli stati) ***
          const variantKey = getVariantKey(p.varianti_scelte);
          const key = `${p.nome}-${p.stato}-${p.riaperto}-${variantKey}`;
          
          const gruppoEsistente = gruppi.find(g => g.key === key);

          if (gruppoEsistente) {
              gruppoEsistente.count += 1;
              gruppoEsistente.indices.push(indexOriginale); 
          } else {
              gruppi.push({
                  ...p,
                  key: key,
                  count: 1,
                  indices: [indexOriginale]
              });
          }
      });
      return gruppi.sort((a, b) => {
          if (a.stato === b.stato) return 0;
          return a.stato === 'in_attesa' ? -1 : 1;
      });
  };
      
  const ordiniPerTavolo = Object.values(ordini.reduce((acc, ordine) => {
      if (!acc[ordine.tavolo]) {
          acc[ordine.tavolo] = { tavolo: ordine.tavolo, listaOrdini: [] };
      }
      acc[ordine.tavolo].listaOrdini.push(ordine);
      return acc;
  }, {}));

  // --- BLOCCO 1: SCHERMATA "NON ATTIVO" ---
  if (isSuiteDisabled) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background:'#ecf0f1', color:'#2c3e50'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#2980b9', textTransform:'uppercase'}}>REPARTO NON ATTIVO</h2>
              <p style={{fontSize:'1.2rem', opacity:0.8}}>Il Bar è disabilitato per questo locale.</p>
              <button onClick={() => navigate('/')} style={{marginTop:20, padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Torna alla Home</button>
          </div>
      );
  }

  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Bar...</h1></div>;

  // --- BLOCCO 2: LOGIN ---
  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#2c3e50'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center'}}>
              <h1>🍹 Accesso Bar</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={passwordInput} 
                    onChange={e=>setPasswordInput(e.target.value)} 
                    style={{
                        width:'100%', padding:'15px', marginBottom:'15px', fontSize:'18px', 
                        borderRadius:'5px', border: loginError ? '2px solid red' : '1px solid #ccc', boxSizing:'border-box', textAlign:'center'
                    }}
                  />
                  {loginError && <div style={{color:'#e74c3c', marginBottom:'10px', fontWeight:'bold'}}>Password Errata! ⛔</div>}
                  <button className="btn-invia" style={{width:'100%', padding:'15px', background:'#2980b9', border:'none', color:'white', borderRadius:'5px', fontSize:'18px', fontWeight:'bold', cursor:'pointer'}}>
                     {loadingLogin ? "Verifica..." : "ENTRA"}
                  </button>
              </form>
          </div>
      </div>
  );

  // --- BLOCCO 3: INTERFACCIA BAR ---
  return (
    <div className="cucina-container" style={{backgroundColor:'#2c3e50', minHeight:'100vh', padding:'20px'}}> 
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div><h1 style={{margin:0, color:'white'}}>🍹 Bar</h1><h3 style={{margin:'5px 0 0 0', color:'#ccc'}}>{infoRistorante.ristorante}</h3></div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}>Esci</button>
      </header>

      <div className="ordini-grid">
        {ordini.length === 0 && <div style={{textAlign: 'center', width: '100%', marginTop: '50px', color: '#fff'}}><h2>Tutto pulito al Bar! 🍺</h2></div>}

        {ordiniPerTavolo.map(gruppo => (
            <div key={gruppo.tavolo} className="ticket" style={{background:'#ecf0f1', borderTop:'5px solid #3498db'}}>
                
                {/* HEADER AGGIORNATO BAR */}
                <div className="ticket-header" style={{
                    background:'#2980b9', 
                    color:'white', 
                    padding:'10px', 
                    display:'flex', 
                    justifyContent:'space-between', 
                    alignItems:'flex-start'
                }}>
                    <div>
                        <span style={{fontSize:'1.5rem', display:'block'}}>Tavolo <strong>{gruppo.tavolo}</strong></span>
                        <span style={{
                            fontSize:'0.9rem', 
                            background:'rgba(255,255,255,0.2)', 
                            padding:'2px 8px', borderRadius:'4px', marginTop:'4px', 
                            display:'inline-block', fontWeight:'bold'
                        }}>
                            {gruppo.listaOrdini[0]?.cameriere 
                                ? `👤 ${gruppo.listaOrdini[0].cameriere}` 
                                : `📱 ${gruppo.listaOrdini[0]?.cliente || 'Cliente'}`}
                        </span>
                    </div>
                    {/* Orario del primo ordine */}
                    <span style={{fontSize:'0.9rem', marginTop:'5px'}}>
                        {new Date(gruppo.listaOrdini[0].data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {gruppo.listaOrdini.map(ord => {
                        const prodottiRaggruppati = getProdottiRaggruppati(ord.prodotti);
                        if(prodottiRaggruppati.length === 0) return null;

                        return (
                            <div key={ord.id} style={{marginBottom: '10px', borderBottom:'2px solid #bdc3c7'}}>
                                <div style={{fontSize:'0.85rem', background:'#d6eaf8', padding:'4px 10px', color:'#2980b9', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                    <span>Ore {new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>{ord.cameriere ? `👤 ${ord.cameriere}` : '📱 Cliente'}</span>
                                </div>

                                {prodottiRaggruppati.map((gruppoProd) => {
                                    const isServito = gruppoProd.stato === 'servito';
                                    const indiciDaModificare = gruppoProd.indices; 

                                    return (
                                        <div key={gruppoProd.key} 
                                            onClick={() => !isServito && segnaBibitaServita(ord.id, ord.prodotti, indiciDaModificare)}
                                            style={{
                                                padding:'12px 10px', borderBottom:'1px dashed #ecf0f1',
                                                cursor: isServito ? 'default' : 'pointer',
                                                background: isServito ? '#d4efdf' : 'white',
                                                opacity: isServito ? 0.6 : 1,
                                                display: 'flex', justifyContent:'space-between', alignItems:'center'
                                            }}
                                        >
                                            <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                <span style={{background: isServito ? '#95a5a6' : '#e67e22', color:'white', padding:'4px 8px', borderRadius:'50%', fontWeight:'bold', fontSize:'0.9rem', minWidth:'30px', textAlign:'center'}}>
                                                    {gruppoProd.count}x
                                                </span>
                                                <div style={{flex:1}}>
                                                    <span style={{fontSize:'1.1rem', fontWeight: isServito ? 'normal' : 'bold', textDecoration: isServito ? 'line-through' : 'none', color: isServito ? '#7f8c8d' : '#2c3e50'}}>
                                                        {gruppoProd.nome}
                                                    </span>

                                                    {/* --- NUOVA RIGA REPARTO --- */}
                                                    <div style={{fontSize:'0.75rem', color:'#7f8c8d', fontStyle:'italic', marginTop:'2px'}}>
                                                        🍹 Bar
                                                    </div>

                                                   {/* --- VISUALIZZAZIONE VARIANTI BAR --- */}
                                                    {gruppoProd.varianti_scelte && (
                                                        <div style={{marginTop:'2px'}}>
                                                            {gruppoProd.varianti_scelte.rimozioni?.map((ing, i) => (
                                                                <span key={i} style={{background:'#c0392b', color:'white', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', marginRight:'5px', display:'inline-block'}}>
                                                                    NO {ing}
                                                                </span>
                                                            ))}
                                                            {gruppoProd.varianti_scelte.aggiunte?.map((ing, i) => (
                                                                <span key={i} style={{background:'#27ae60', color:'white', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', marginRight:'5px', display:'inline-block'}}>
                                                                    + {ing.nome}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* --- BADGE CASSA / RIAPERTO --- */}
                                                    <div style={{marginTop:'4px', display:'flex', gap:'5px'}}>
                                                        {gruppoProd.chiuso_da_cassa && isServito && (
                                                            <span style={{background:'#27ae60', color:'white', padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', fontWeight:'bold'}}>
                                                                ✅ FATTO DALLA CASSA
                                                            </span>
                                                        )}
                                                        
                                                        {gruppoProd.riaperto && !isServito && (
                                                            <span style={{background:'#f39c12', color:'white', padding:'2px 5px', borderRadius:'3px', fontSize:'0.7rem', fontWeight:'bold'}}>
                                                                ⚠️ RIAPERTO DALLA CASSA
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isServito && <span>✅</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

export default Bar;