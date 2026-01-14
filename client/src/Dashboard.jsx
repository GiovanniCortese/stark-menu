// client/src/Dashboard.jsx - VERSIONE PRO (Sort Portate + Info Ristorante)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); 
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState({ personali: [], condivisi: [] });
  const [formProfile, setFormProfile] = useState({});
  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com"; // O importalo da config

  useEffect(() => {
    const saved = localStorage.getItem('stark_user');
    if (!saved) { navigate('/'); return; }
    const u = JSON.parse(saved);
    setUser(u);
    setFormProfile({ nome: u.nome, email: u.email, telefono: u.telefono, indirizzo: u.indirizzo, password: u.password });
    fetchStats(u.id);
  }, []);

  const fetchStats = (id) => {
      fetch(`${API_URL}/api/cliente/stats/${id}`)
        .then(r => r.json())
        .then(data => {
            setStats(data);
            fetchOrders(id);
            setInterval(() => fetchOrders(id), 3000);
        });
  };

  const fetchOrders = (id) => {
      const savedTavolo = localStorage.getItem('last_tavolo'); 
      fetch(`${API_URL}/api/ordini/cliente/${id}?tavolo=${savedTavolo}`)
        .then(r => r.json())
        .then(setOrders)
        .catch(console.error);
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      try {
          await fetch(`${API_URL}/api/utenti/${user.id}`, {
              method: 'PUT', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({...formProfile, ruolo: 'cliente'})
          });
          alert("Profilo Aggiornato! 💾");
          localStorage.setItem('stark_user', JSON.stringify({...user, ...formProfile}));
      } catch(e) { alert("Errore aggiornamento"); }
  };

  const handleLogout = () => {
      if(confirm("Vuoi uscire?")) { localStorage.removeItem('stark_user'); navigate('/'); }
  };

  if (!stats) return <div style={{padding:40, textAlign:'center', color:'white'}}>Caricamento...</div>;

  const ordiniAttivi = orders.personali.filter(o => o.stato !== 'pagato');
  const storicoOrdini = orders.personali.filter(o => o.stato === 'pagato');

  return (
    <div style={{minHeight:'100vh', background:'#1a1a1a', color:'white', fontFamily:'sans-serif', paddingBottom:80}}>
      {/* HEADER PROFILO */}
      <div style={{background: `linear-gradient(to bottom, ${stats.livello.colore}44, #1a1a1a)`, padding:'30px 20px', textAlign:'center'}}>
          <div style={{width:80, height:80, background: stats.livello.colore, borderRadius:'50%', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'35px', boxShadow:`0 0 20px ${stats.livello.colore}`}}>
            {stats.livello.nome.split(' ')[1]}
          </div>
          <h2 style={{margin:0}}>{user.nome}</h2>
          <div style={{color: stats.livello.colore, fontWeight:'bold', marginTop:5, textTransform:'uppercase', letterSpacing:1}}>
              {stats.livello.nome}
          </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex', borderBottom:'1px solid #333', background:'#222'}}>
          {['live', 'storico', 'profilo'].map(t => (
              <button key={t} onClick={()=>setActiveTab(t)} style={{flex:1, padding:15, background:'transparent', border:'none', color: activeTab===t ? stats.livello.colore : '#666', borderBottom: activeTab===t ? `3px solid ${stats.livello.colore}` : 'none', fontWeight:'bold', textTransform:'uppercase'}}>
                  {t === 'live' ? '📡 Live' : (t === 'storico' ? '📜 Storico' : '👤 Profilo')}
              </button>
          ))}
      </div>

      <div style={{padding:20}}>
          {activeTab === 'live' && (
              <div>
                  {ordiniAttivi.length === 0 && orders.condivisi.length === 0 ? (
                      <div style={{textAlign:'center', marginTop:40, opacity:0.6}}><h3>Nessun ordine attivo 😴</h3></div>
                  ) : (
                      <>
                        {ordiniAttivi.map(ord => <TicketOrdine key={ord.id} ordine={ord} colore={stats.livello.colore} />)}
                        {orders.condivisi.map(ord => <TicketOrdine key={ord.id} ordine={ord} colore="#555" isShared />)}
                      </>
                  )}
              </div>
          )}

          {activeTab === 'storico' && (
              <div>
                  {storicoOrdini.map(ord => (
                      <TicketOrdine key={ord.id} ordine={ord} colore="#27ae60" isHistory />
                  ))}
              </div>
          )}

          {activeTab === 'profilo' && (
              <form onSubmit={handleUpdateProfile} style={{display:'flex', flexDirection:'column', gap:15}}>
                  <label>Nome <input value={formProfile.nome} onChange={e=>setFormProfile({...formProfile, nome:e.target.value})} style={inputStyle}/></label>
                  <label>Email <input value={formProfile.email} onChange={e=>setFormProfile({...formProfile, email:e.target.value})} style={inputStyle}/></label>
                  <label>Telefono <input value={formProfile.telefono} onChange={e=>setFormProfile({...formProfile, telefono:e.target.value})} style={inputStyle}/></label>
                  <label>Indirizzo <input value={formProfile.indirizzo} onChange={e=>setFormProfile({...formProfile, indirizzo:e.target.value})} style={inputStyle}/></label>
                  <label>Password <input value={formProfile.password} onChange={e=>setFormProfile({...formProfile, password:e.target.value})} style={inputStyle}/></label>
                  <button type="submit" style={{background: stats.livello.colore, color:'#000', padding:15, border:'none', borderRadius:10, fontWeight:'bold', fontSize:16}}>SALVA</button>
                  <button type="button" onClick={handleLogout} style={{background:'#c0392b', color:'#fff', padding:15, border:'none', borderRadius:10, fontWeight:'bold', fontSize:16}}>ESCI</button>
              </form>
          )}
      </div>
    </div>
  );
}

// --- HELPER LOGICA CUCINA ---
const getCourse = (p) => {
    if (p.course !== undefined) return p.course === 0 ? 5 : p.course; 
    if (p.is_bar) return 5; 
    if (p.is_pizzeria) return 3; 
    return 2; // Default Primi
};
const courseLabels = { 1: 'ANTIPASTI', 2: 'PRIMI', 3: 'SECONDI / PIZZE', 4: 'DESSERT', 5: 'BAR' };

function TicketOrdine({ ordine, colore, isShared, isHistory }) {
    const prodotti = Array.isArray(ordine.prodotti) ? ordine.prodotti : [];
    
    // RAGGRUPPAMENTO PER PORTATA (LOGICA CUCINA)
    const grouped = prodotti.reduce((acc, p) => {
        const c = getCourse(p);
        if(!acc[c]) acc[c] = [];
        acc[c].push(p);
        return acc;
    }, {});
    const sortedCourses = Object.keys(grouped).sort((a,b)=>a-b);

    return (
        <div style={{background: isShared ? '#333' : '#252525', borderRadius:12, padding:15, marginBottom:15, border:`1px solid ${isHistory ? '#444' : colore}`}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, borderBottom:'1px solid #444', paddingBottom:10}}>
                <div>
                    {isHistory ? (
                        <>
                            <div style={{fontSize:18, fontWeight:'bold', color:'white'}}>📍 {ordine.nome_ristorante || 'Ristorante'}</div>
                            <div style={{fontSize:12, color:'#aaa'}}>{new Date(ordine.data_ora).toLocaleDateString()} - Ore {new Date(ordine.data_ora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                        </>
                    ) : (
                        <span style={{fontWeight:'bold', color: isShared ? '#aaa' : 'white'}}>
                            {isShared ? `👤 ${ordine.cliente}` : `Tavolo ${ordine.tavolo}`}
                        </span>
                    )}
                </div>
                <div style={{fontWeight:'bold', fontSize:18, color: colore}}>€ {Number(ordine.totale).toFixed(2)}</div>
            </div>

            {/* LISTA PIATTI DIVISA PER PORTATE */}
            {sortedCourses.map(course => (
                <div key={course} style={{marginBottom:10}}>
                    <div style={{fontSize:10, color:'#888', fontWeight:'bold', marginBottom:4, borderBottom:'1px dashed #444'}}>{courseLabels[course]}</div>
                    {grouped[course].map((p, idx) => {
                        const isServito = p.stato === 'servito';
                        return (
                            <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', opacity: isServito || isHistory ? 0.6 : 1, padding:'4px 0'}}>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                    <span style={{color:'white'}}>{p.nome}</span>
                                    {p.varianti_scelte && (p.varianti_scelte.rimozioni?.length > 0 || p.varianti_scelte.aggiunte?.length > 0) && <span style={{fontSize:10, color:'#e67e22'}}>📝</span>}
                                </div>
                                {!isHistory && (
                                    <span style={{fontSize:10, background: isServito ? '#27ae60' : '#e67e22', padding:'2px 6px', borderRadius:4, color:'white'}}>
                                        {isServito ? 'SERVITO' : 'IN PREPARAZIONE'}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    );
}

const inputStyle = { width:'100%', padding:12, borderRadius:8, background:'#333', border:'1px solid #444', color:'white', boxSizing:'border-box' };

export default Dashboard;