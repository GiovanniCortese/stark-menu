// client/src/Bar.jsx - VERSIONE V5 (FIX VARIANTI & RAGGRUPPAMENTO SICURO) 🍹
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [infoRistorante, setInfoRistorante] = useState(null); 
  const [isAuthorized, setIsAuthorized] = useState(false); 

  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const { slug } = useParams(); 
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(setInfoRistorante);
    const sessionKey = `bar_session_${slug}`;
    if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);
  }, [slug]);

// --- NUOVA FUNZIONE LOGIN (API) ---
const handleLogin = async (e) => {
    e.preventDefault();
    if(!infoRistorante?.id) return;
    setLoadingLogin(true); // Stato opzionale per feedback
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
        } else { alert("Password Errata"); }
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
            const tuttiOrdini = data.nuovi_ordini || [];
            const ordiniDaMostrare = tuttiOrdini.filter(o => {
                const prodotti = Array.isArray(o.prodotti) ? o.prodotti : [];
                const bibite = prodotti.filter(p => p.is_bar);
                if (bibite.length === 0) return false;
                const tutteFiniti = bibite.every(p => p.stato === 'servito');
                return !tutteFiniti;
            });
            setOrdini(ordiniDaMostrare);
        })
        .catch(e => console.error("Polling error:", e));
  };

  useEffect(() => { 
      if(isAuthorized && infoRistorante) { 
          aggiorna(); 
          const i = setInterval(aggiorna, 2000); 
          return () => clearInterval(i); 
      } 
  }, [isAuthorized, infoRistorante]);

  const segnaBibitaServita = async (ordineId, prodottiAttuali, indices) => {
      const nuoviProdotti = [...prodottiAttuali];
      const primoItem = nuoviProdotti[indices[0]];
      if (primoItem.stato === 'servito') return; 

      const nuovoStato = 'servito';
      indices.forEach(idx => {
          const item = nuoviProdotti[idx];
          item.stato = nuovoStato;
          item.ora_servizio = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      });

      const qty = indices.length;
      const logMsg = `[BAR 🍹] HA SERVITO: ${qty > 1 ? qty + 'x ' : ''}${primoItem.nome}`;

      await fetch(`${API_URL}/api/ordine/${ordineId}/update-items`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prodotti: nuoviProdotti, logMsg: logMsg })
      });
      aggiorna();
  };

  // --- HELPER CHIAVE VARIANTI ---
  const getVariantKey = (v) => {
      if(!v) return "";
      const r = (v.rimozioni || []).sort().join('_');
      const a = (v.aggiunte || []).map(x => x.nome).sort().join('_');
      return `${r}|${a}`;
  };

  // --- RAGGRUPPAMENTO BAR (FIXATO) ---
  const getProdottiRaggruppati = (prodotti) => {
      const gruppi = [];
      
      prodotti.forEach((p, indexOriginale) => {
          if (!p.is_bar) return; 

          // *** CHIAVE UNICA ***
          const variantKey = getVariantKey(p.varianti_scelte);
          const key = `${p.nome}-${p.stato}-${variantKey}`;
          
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

  if (!infoRistorante) return <div style={{textAlign:'center', padding:50}}><h1>⏳ Caricamento Bar...</h1></div>;

  if (!isAuthorized) return (
      <div className="cucina-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column', background:'#2c3e50'}}>
          <div style={{background:'white', padding:'40px', borderRadius:'10px', width:'90%', maxWidth:'400px', textAlign:'center'}}>
              <h1>🍹 Accesso Bar</h1>
              <h3>{infoRistorante.ristorante}</h3>
              <form onSubmit={handleLogin}>
                  <input type="password" placeholder="Password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px'}}/>
                  <button className="btn-invia" style={{width:'100%', padding:'10px', background:'#2980b9', border:'none', color:'white', borderRadius:'5px'}}>ENTRA</button>
              </form>
          </div>
      </div>
  );

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
                <div className="ticket-header" style={{background:'#2980b9', color:'white', padding:'10px'}}>
                    <span style={{fontSize:'1.5rem'}}>Tavolo <strong>{gruppo.tavolo}</strong></span>
                </div>
                
                <div className="ticket-body" style={{textAlign:'left', paddingBottom:'5px'}}>
                    {gruppo.listaOrdini.map(ord => {
                        const prodottiRaggruppati = getProdottiRaggruppati(ord.prodotti);
                        if(prodottiRaggruppati.length === 0) return null;

                        return (
                            <div key={ord.id} style={{marginBottom: '10px', borderBottom:'2px solid #bdc3c7'}}>
                                <div style={{fontSize:'0.85rem', background:'#d6eaf8', padding:'4px 10px', color:'#2980b9', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                    <span>Ore {new Date(ord.data_ora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span>{ord.cameriere}</span>
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