// client/src/features/public-menu/UserDashboard.jsx - VERSIONE V109 (CLIENTE + SOCKET) 👤
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext'; // <--- USIAMO I SOCKET
import API_URL from '../../config';

function UserDashboard() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // --- STATI ---
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'history', 'profile'
  const [stats, setStats] = useState({ punti: 0, ordini_totali: 0, spesa_totale: 0 });
  const [orders, setOrders] = useState({ personali: [], condivisi: [] });
  const [formProfile, setFormProfile] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. INIT & AUTH CHECK
  useEffect(() => {
    const saved = localStorage.getItem('user'); // Nota: Standardizziamo su 'user'
    if (!saved) { navigate('/login'); return; }
    
    const u = JSON.parse(saved);
    setUser(u);
    setFormProfile({ nome: u.nome, email: u.email, telefono: u.telefono, indirizzo: u.indirizzo, password: '' });
    
    // Carica dati iniziali
    fetchStats(u.id);
    fetchOrders(u.id);
    setLoading(false);
  }, []);

  // 2. SOCKET LISTENER (Sostituisce il polling)
  useEffect(() => {
    if (!socket || !user) return;

    const handleUpdate = () => {
        console.log("👤 DASHBOARD CLIENTE: Aggiornamento ordine ricevuto");
        fetchOrders(user.id); // Ricarica solo gli ordini quando serve
    };

    socket.on('refresh_ordini', handleUpdate);
    socket.on('nuovo_ordine', handleUpdate); // Ascolta anche nuovi ordini del tavolo

    return () => {
        socket.off('refresh_ordini', handleUpdate);
        socket.off('nuovo_ordine', handleUpdate);
    };
  }, [socket, user]);

  // --- FETCH DATI ---
  const fetchStats = async (id) => {
      try {
        const res = await fetch(`${API_URL}/api/cliente/stats/${id}`);
        const data = await res.json();
        setStats(data || { punti: 0 });
      } catch(e) { console.error(e); }
  };

  const fetchOrders = async (id) => {
      const savedTavolo = localStorage.getItem('last_tavolo'); // Se il cliente è seduto
      try {
        const res = await fetch(`${API_URL}/api/cliente/ordini/${id}?tavolo=${savedTavolo || ''}`);
        const data = await res.json();
        setOrders(data);
      } catch(e) { console.error(e); }
  };

  // --- AZIONI ---
  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      try {
          const res = await fetch(`${API_URL}/api/utenti/${user.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(formProfile)
          });
          if(res.ok) {
              const updated = await res.json();
              localStorage.setItem('user', JSON.stringify(updated));
              setUser(updated);
              alert("✅ Profilo aggiornato!");
          } else {
              alert("❌ Errore aggiornamento");
          }
      } catch(err) { alert("Errore di connessione"); }
  };

  const logout = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/');
  };

  // --- HELPER RENDERING ---
  const renderOrderList = (listaOrdini, isHistory = false) => {
      if(!listaOrdini || listaOrdini.length === 0) return <div style={{padding:20, textAlign:'center', color:'#888'}}>Nessun ordine trovato.</div>;
      
      return listaOrdini.map(ord => (
          <div key={ord.id} style={{background:'#1e272e', padding:15, borderRadius:10, marginBottom:15, borderLeft: isHistory ? '4px solid #7f8c8d' : '4px solid #e67e22'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, borderBottom:'1px solid #333', paddingBottom:5}}>
                  <span style={{color:'#f1c40f', fontWeight:'bold'}}>Ordine #{ord.id}</span>
                  <span style={{color:'#bdc3c7', fontSize:12}}>{new Date(ord.data_creazione).toLocaleString()}</span>
              </div>
              <OrderItems products={ord.prodotti} isHistory={isHistory} />
              <div style={{textAlign:'right', marginTop:10, fontWeight:'bold', color:'white'}}>
                  Totale: € {parseFloat(ord.totale || 0).toFixed(2)}
              </div>
          </div>
      ));
  };

  if(loading) return <div style={{color:'white', padding:20}}>Caricamento profilo...</div>;

  return (
    <div style={{minHeight:'100vh', background:'#0f1011', color:'white', fontFamily:'sans-serif', paddingBottom:80}}>
        
        {/* HEADER */}
        <div style={{padding:20, background: 'linear-gradient(180deg, rgba(39,174,96,0.2) 0%, rgba(0,0,0,0) 100%)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h1 style={{margin:0}}>Ciao, {user?.nome} 👋</h1>
                <button onClick={logout} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', padding:'5px 10px', borderRadius:5, cursor:'pointer'}}>Esci</button>
            </div>
            
            {/* CARD PUNTI */}
            <div style={{marginTop:20, background:'#27ae60', padding:20, borderRadius:15, boxShadow:'0 10px 20px rgba(39, 174, 96, 0.3)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <div style={{fontSize:12, textTransform:'uppercase', letterSpacing:1, opacity:0.8}}>Stark Fidelity</div>
                    <div style={{fontSize:32, fontWeight:'bold'}}>{stats?.punti || 0} Punti</div>
                </div>
                <div style={{fontSize:40}}>🎁</div>
            </div>
        </div>

        {/* TABS */}
        <div style={{display:'flex', borderBottom:'1px solid #333', marginTop:20}}>
            <button onClick={()=>setActiveTab('live')} style={{...tabStyle, borderBottom: activeTab==='live' ? '3px solid #f1c40f' : 'none', color: activeTab==='live'?'white':'#777'}}>🔥 In Corso</button>
            <button onClick={()=>setActiveTab('history')} style={{...tabStyle, borderBottom: activeTab==='history' ? '3px solid #3498db' : 'none', color: activeTab==='history'?'white':'#777'}}>📜 Storico</button>
            <button onClick={()=>setActiveTab('profile')} style={{...tabStyle, borderBottom: activeTab==='profile' ? '3px solid #e74c3c' : 'none', color: activeTab==='profile'?'white':'#777'}}>⚙️ Profilo</button>
        </div>

        {/* CONTENT */}
        <div style={{padding:20}}>
            
            {activeTab === 'live' && (
                <div>
                    <h3 style={{color:'#f1c40f'}}>I tuoi ordini attivi</h3>
                    {renderOrderList(orders.personali.filter(o => o.stato !== 'pagato' && o.stato !== 'archiviato'))}
                    
                    {orders.condivisi.length > 0 && (
                        <>
                            <h3 style={{color:'#e67e22', marginTop:30}}>Tavolo Condiviso</h3>
                            <p style={{fontSize:12, color:'#888'}}>Ordini fatti dagli amici al tuo tavolo</p>
                            {renderOrderList(orders.condivisi.filter(o => o.stato !== 'pagato' && o.stato !== 'archiviato'))}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div>
                    <h3 style={{color:'#3498db'}}>Storico Ordini</h3>
                    {renderOrderList(orders.personali.filter(o => o.stato === 'pagato' || o.stato === 'archiviato'), true)}
                </div>
            )}

            {activeTab === 'profile' && (
                <div style={{background:'#1e272e', padding:20, borderRadius:10}}>
                    <h3>I tuoi dati</h3>
                    <form onSubmit={handleUpdateProfile} style={{display:'flex', flexDirection:'column', gap:15}}>
                        <input value={formProfile.nome} onChange={e=>setFormProfile({...formProfile, nome:e.target.value})} placeholder="Nome" style={inputStyle} />
                        <input value={formProfile.email} onChange={e=>setFormProfile({...formProfile, email:e.target.value})} placeholder="Email" style={inputStyle} />
                        <input value={formProfile.telefono} onChange={e=>setFormProfile({...formProfile, telefono:e.target.value})} placeholder="Telefono" style={inputStyle} />
                        <input value={formProfile.indirizzo} onChange={e=>setFormProfile({...formProfile, indirizzo:e.target.value})} placeholder="Indirizzo" style={inputStyle} />
                        <input type="password" value={formProfile.password} onChange={e=>setFormProfile({...formProfile, password:e.target.value})} placeholder="Nuova Password (opzionale)" style={inputStyle} />
                        <button type="submit" style={{padding:15, background:'#e74c3c', color:'white', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer', marginTop:10}}>SALVA MODIFICHE</button>
                    </form>
                </div>
            )}
        </div>
    </div>
  );
}

// Sotto-componente per visualizzare i prodotti raggruppati (preso dalla logica Dashboard originale)
function OrderItems({ products, isHistory }) {
    // Logica per raggruppare i prodotti per portata
    const courseOrder = { antipasti: 1, primi: 2, secondi: 3, pizze: 4, contorni: 5, dessert: 6, bevande: 7 };
    const courseLabels = { antipasti: 'Antipasti', primi: 'Primi', secondi: 'Secondi', pizze: 'Pizze', contorni: 'Contorni', dessert: 'Dessert', bevande: 'Bar / Bevande' };
    
    // Raggruppa
    const grouped = {};
    products.forEach(p => {
        let c = (p.categoria || 'altro').toLowerCase();
        // Semplice normalizzazione
        if(c.includes('antipast')) c='antipasti';
        else if(c.includes('prim')) c='primi';
        else if(c.includes('second')) c='secondi';
        else if(c.includes('pizz')) c='pizze';
        else if(c.includes('bevande') || c.includes('bar')) c='bevande';
        
        if(!grouped[c]) grouped[c] = [];
        grouped[c].push(p);
    });

    // Ordina chiavi
    const sortedKeys = Object.keys(grouped).sort((a,b) => (courseOrder[a]||99) - (courseOrder[b]||99));

    return (
        <div>
            {sortedKeys.map(course => (
                <div key={course} style={{marginBottom:10}}>
                    <div style={{fontSize:11, textTransform:'uppercase', color:'#888', marginBottom:5, borderBottom:'1px dashed #444'}}>{courseLabels[course] || course}</div>
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

// Styles
const tabStyle = { flex:1, padding:15, background:'transparent', border:'none', cursor:'pointer', fontSize:14, fontWeight:'bold' };
const inputStyle = { width:'100%', padding:12, borderRadius:8, background:'#333', border:'1px solid #444', color:'white', boxSizing:'border-box' };

export default UserDashboard;