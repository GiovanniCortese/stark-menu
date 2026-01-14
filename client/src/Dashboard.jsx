import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'storico', 'profilo'
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState({ personali: [], condivisi: [] });
  const [formProfile, setFormProfile] = useState({});
  const navigate = useNavigate();
  const API_URL = "https://stark-backend-gg17.onrender.com";

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
            // Polling ordini
            fetchOrders(id);
            setInterval(() => fetchOrders(id), 3000);
        });
  };

  const fetchOrders = (id) => {
      // Recupera tavolo attuale se esiste
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
      if(confirm("Vuoi uscire?")) {
          localStorage.removeItem('stark_user');
          navigate('/');
      }
  };

  if (!stats) return <div style={{padding:40, textAlign:'center', color:'white'}}>Caricamento Profilo...</div>;

  // Filtro Ordini
  const ordiniAttivi = orders.personali.filter(o => o.stato !== 'pagato');
  const storicoOrdini = orders.personali.filter(o => o.stato === 'pagato');
  const ordiniTavolo = orders.condivisi;

  return (
    <div style={{minHeight:'100vh', background:'#1a1a1a', color:'white', fontFamily:'sans-serif', paddingBottom:80}}>
      
      {/* HEADER PROFILO & LIVELLO */}
      <div style={{background: `linear-gradient(to bottom, ${stats.livello.colore}44, #1a1a1a)`, padding:'30px 20px', textAlign:'center'}}>
          <div style={{width:80, height:80, background: stats.livello.colore, borderRadius:'50%', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'35px', boxShadow:`0 0 20px ${stats.livello.colore}`}}>
            {stats.livello.nome.split(' ')[1]}
          </div>
          <h2 style={{margin:0}}>{user.nome}</h2>
          <div style={{color: stats.livello.colore, fontWeight:'bold', marginTop:5, textTransform:'uppercase', letterSpacing:1}}>
              {stats.livello.nome}
          </div>
          <div style={{fontSize:12, opacity:0.7, marginTop:5}}>
              {stats.num_ordini} Ordini completati • Affidabilità: {stats.livello.affidabilita}
          </div>
      </div>

      {/* TABS NAVIGAZIONE */}
      <div style={{display:'flex', borderBottom:'1px solid #333', background:'#222'}}>
          {['live', 'storico', 'profilo'].map(t => (
              <button key={t} onClick={()=>setActiveTab(t)} style={{flex:1, padding:15, background:'transparent', border:'none', color: activeTab===t ? stats.livello.colore : '#666', borderBottom: activeTab===t ? `3px solid ${stats.livello.colore}` : 'none', fontWeight:'bold', textTransform:'uppercase'}}>
                  {t === 'live' ? '📡 Live' : (t === 'storico' ? '📜 Storico' : '👤 Profilo')}
              </button>
          ))}
      </div>

      <div style={{padding:20}}>
          
          {/* TAB 1: LIVE TRACKER */}
          {activeTab === 'live' && (
              <div>
                  {ordiniAttivi.length === 0 && ordiniTavolo.length === 0 ? (
                      <div style={{textAlign:'center', marginTop:40, opacity:0.6}}>
                          <h3>Nessun ordine attivo 😴</h3>
                          <button onClick={()=>navigate('/')} style={{background: stats.livello.colore, border:'none', padding:'10px 20px', borderRadius:20, color:'#000', fontWeight:'bold', cursor:'pointer'}}>VAI AL MENU</button>
                      </div>
                  ) : (
                      <>
                        <h3 style={{borderLeft:`4px solid ${stats.livello.colore}`, paddingLeft:10}}>I Tuoi Ordini</h3>
                        {ordiniAttivi.map(ord => <TicketOrdine key={ord.id} ordine={ord} colore={stats.livello.colore} />)}
                        
                        {ordiniTavolo.length > 0 && (
                            <>
                                <h3 style={{borderLeft:`4px solid #fff`, paddingLeft:10, marginTop:30}}>Condivisi al Tavolo</h3>
                                {ordiniTavolo.map(ord => <TicketOrdine key={ord.id} ordine={ord} colore="#555" isShared />)}
                            </>
                        )}
                      </>
                  )}
              </div>
          )}

          {/* TAB 2: STORICO */}
          {activeTab === 'storico' && (
              <div>
                  {storicoOrdini.map(ord => (
                      <div key={ord.id} style={{background:'#2c2c2c', borderRadius:10, padding:15, marginBottom:15}}>
                          <div style={{display:'flex', justifyContent:'space-between', opacity:0.7, fontSize:12, marginBottom:5}}>
                              <span>{new Date(ord.data_ora).toLocaleDateString()}</span>
                              <span>Ord #{ord.id}</span>
                          </div>
                          <div style={{fontWeight:'bold', fontSize:18, marginBottom:10}}>Totale: € {Number(ord.totale).toFixed(2)}</div>
                          <div style={{fontSize:13, color:'#aaa'}}>
                              {ord.prodotti.map(p => p.nome).join(', ')}
                          </div>
                          <div style={{marginTop:10, color:'#27ae60', fontWeight:'bold', fontSize:12}}>✅ CONTO PAGATO</div>
                      </div>
                  ))}
              </div>
          )}

          {/* TAB 3: PROFILO */}
          {activeTab === 'profilo' && (
              <form onSubmit={handleUpdateProfile} style={{display:'flex', flexDirection:'column', gap:15}}>
                  <label>Nome <input value={formProfile.nome} onChange={e=>setFormProfile({...formProfile, nome:e.target.value})} style={inputStyle}/></label>
                  <label>Email <input value={formProfile.email} onChange={e=>setFormProfile({...formProfile, email:e.target.value})} style={inputStyle}/></label>
                  <label>Telefono <input value={formProfile.telefono} onChange={e=>setFormProfile({...formProfile, telefono:e.target.value})} style={inputStyle}/></label>
                  <label>Indirizzo <input value={formProfile.indirizzo} onChange={e=>setFormProfile({...formProfile, indirizzo:e.target.value})} style={inputStyle}/></label>
                  <label>Nuova Password <input value={formProfile.password} onChange={e=>setFormProfile({...formProfile, password:e.target.value})} style={inputStyle}/></label>
                  
                  <button type="submit" style={{background: stats.livello.colore, color:'#000', padding:15, border:'none', borderRadius:10, fontWeight:'bold', fontSize:16, marginTop:10}}>SALVA MODIFICHE</button>
                  <button type="button" onClick={handleLogout} style={{background:'#c0392b', color:'#fff', padding:15, border:'none', borderRadius:10, fontWeight:'bold', fontSize:16}}>ESCI</button>
              </form>
          )}
      </div>
    </div>
  );
}

// SOTTO-COMPONENTE PER IL TRACKING VISIVO
function TicketOrdine({ ordine, colore, isShared }) {
    const prodotti = Array.isArray(ordine.prodotti) ? ordine.prodotti : [];
    
    // Calcolo progresso
    const totali = prodotti.length;
    const serviti = prodotti.filter(p => p.stato === 'servito').length;
    const perc = totali > 0 ? (serviti / totali) * 100 : 0;

    return (
        <div style={{background: isShared ? '#333' : '#252525', borderRadius:12, padding:15, marginBottom:15, border:`1px solid ${isShared ? '#444' : colore}`}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                <span style={{fontWeight:'bold', color: isShared ? '#aaa' : 'white'}}>
                    {isShared ? `👤 ${ordine.cliente || 'Ospite'}` : `Tavolo ${ordine.tavolo}`}
                </span>
                <span style={{fontSize:12, opacity:0.6}}>{new Date(ordine.data_ora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>

            {/* BARRA PROGRESSO */}
            <div style={{height:6, background:'#444', borderRadius:3, marginBottom:15, overflow:'hidden'}}>
                <div style={{width:`${perc}%`, background: colore, height:'100%', transition:'width 0.5s'}}></div>
            </div>

            {/* LISTA PIATTI TRACKER */}
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {prodotti.map((p, idx) => {
                    const isServito = p.stato === 'servito';
                    return (
                        <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', opacity: isServito ? 0.5 : 1}}>
                            <div style={{display:'flex', alignItems:'center', gap:10}}>
                                <span style={{fontSize:16}}>{isServito ? '✅' : (p.is_pizzeria || !p.is_bar ? '👨‍🍳' : '🍹')}</span>
                                <span style={{textDecoration: isServito ? 'line-through' : 'none'}}>{p.nome}</span>
                            </div>
                            <span style={{fontSize:11, background: isServito ? '#27ae60' : '#e67e22', padding:'2px 6px', borderRadius:4, color:'white'}}>
                                {isServito ? 'SERVITO' : (p.stato === 'in_attesa' ? 'IN CODA' : 'PREPARAZIONE')}
                            </span>
                        </div>
                    )
                })}
            </div>
            
            <div style={{marginTop:15, borderTop:'1px solid #444', paddingTop:10, textAlign:'right', fontWeight:'bold', fontSize:18, color: colore}}>
                Tot: € {Number(ordine.totale).toFixed(2)}
            </div>
        </div>
    );
}

const inputStyle = { width:'100%', padding:12, borderRadius:8, background:'#333', border:'1px solid #444', color:'white', boxSizing:'border-box' };

export default Dashboard;