// client/src/Admin.jsx - VERSIONE FULL WIDTH & RESPONSIVE
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_URL from './config'; 

// *** IMPORTIAMO I SOTTO-COMPONENTI ***
import AdminMenu from './components_admin/AdminMenu';
import AdminCategorie from './components_admin/AdminCategorie';
import AdminGrafica from './components_admin/AdminGrafica';
import AdminExcel from './components_admin/AdminExcel';
import AdminUsers from './components_admin/AdminUsers';
import AdminSicurezza from './components_admin/AdminSicurezza';
import AdminDashboard from './components_admin/AdminDashboard';

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- STATI LOGIN ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [identifierInput, setIdentifierInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // --- STATI GLOBALI ---
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [tab, setTab] = useState('dashboard'); 
  
  // Dati condivisi
  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  
  // CONFIGURAZIONE
  const [config, setConfig] = useState({ 
      account_attivo: true, 
      cucina_super_active: true,
      ordini_abilitati: false, 
      servizio_attivo: false,
      logo_url: '', cover_url: '',
      colore_sfondo: '#222222', colore_titolo: '#ffffff',
      colore_testo: '#cccccc', colore_prezzo: '#27ae60',
      font_style: 'sans-serif'
  });

  // --- INIZIALIZZAZIONE ---
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
        setLoading(true);
        const sessionKey = `stark_admin_session_${slug}`;
        if (localStorage.getItem(sessionKey) === "true") setIsAuthorized(true);

        try {
            const res = await fetch(`${API_URL}/api/menu/${slug}`);
            const data = await res.json();

            if (data && data.id) {
                setUser({ id: data.id, nome: data.ristorante, slug: slug, ruolo: data.ruolo || 'admin' });
                setMenu(data.menu || []);
                caricaConfigurazioniExtra(data.id);
            } else { 
                alert("Ristorante non trovato."); 
                navigate('/'); 
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    init();
  }, [slug]);

  const caricaConfigurazioniExtra = (id) => {
    fetch(`${API_URL}/api/ristorante/config/${id}`).then(r=>r.json()).then(d => setConfig(prev => ({...prev, ...d}))); 
    fetch(`${API_URL}/api/categorie/${id}`).then(res => res.json()).then(data => setCategorie(data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0))));
  };

  const ricaricaDati = () => {
      if(!user) return;
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
      fetch(`${API_URL}/api/categorie/${user.id}`).then(r=>r.json()).then(data => setCategorie(data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0))));
      fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d => { if(d) setConfig(prev => ({...prev, ...d})); });
  };

  const handleLogout = () => { 
      if(confirm("Uscire dal pannello?")) { 
          localStorage.removeItem(`stark_admin_session_${slug}`); 
          navigate('/'); 
      } 
  };
  
  const handleAdminLogin = async (e) => {
    e.preventDefault(); setLoadingLogin(true); setLoginError(false);
    try {
        const res = await fetch(`${API_URL}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: identifierInput, password: passwordInput }) });
        const data = await res.json();
        if (data.success) { setIsAuthorized(true); localStorage.setItem(`stark_admin_session_${data.user.slug}`, "true"); } else { setLoginError(true); }
    } catch (err) { alert("Errore connessione"); } finally { setLoadingLogin(false); }
  };
  
  // Stili bottoni esterni
  const externalLinkStyle = { background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'5px' };

  // Stile bottoni navigazione TAB
  const navBtnStyle = (active, color) => ({
      background: active ? color : 'white', color: active ? 'white' : '#555',
      border: active ? 'none' : '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
      fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', flex: '0 0 auto',
      transition: 'all 0.2s', boxShadow: active ? '0 4px 10px rgba(0,0,0,0.2)' : 'none'
  });

  if (loading) return <div style={{padding:'50px', textAlign:'center', fontSize:'20px'}}>🔄 Caricamento Admin...</div>;

  // --- LOGIN PAGE ---
  if (!isAuthorized) {
    return (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#111', color:'white', fontFamily:"'Inter', sans-serif"}}>
            <div style={{background:'#222', padding:'40px', borderRadius:'16px', width:'90%', maxWidth:'400px', textAlign:'center', border:'1px solid #333', boxShadow:'0 20px 50px rgba(0,0,0,0.5)'}}>
                <h1 style={{margin:0, fontSize:'3rem'}}>🔐</h1>
                <h2 style={{marginTop:10, color:'white'}}>Admin Panel</h2>
                <p style={{color:'#888', marginBottom:30}}>{user?.nome || "Area Riservata"}</p>

                <form onSubmit={handleAdminLogin}>
                    <input type="email" placeholder="Email" value={identifierInput} onChange={e => setIdentifierInput(e.target.value)} required style={{width:'100%', padding:'15px', borderRadius:'8px', border:'1px solid #444', background:'#333', color:'white', marginBottom:'10px', boxSizing:'border-box', outline:'none'}} />
                    <input type="password" placeholder="Password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} required style={{width:'100%', padding:'15px', borderRadius:'8px', border:'1px solid #444', background:'#333', color:'white', marginBottom:'20px', boxSizing:'border-box', outline:'none'}} />
                    {loginError && <p style={{color:'#e74c3c', marginBottom:'15px'}}>⛔ Credenziali errate</p>}
                    <button type="submit" disabled={loadingLogin} style={{width:'100%', padding:'15px', background:'#3498db', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', fontSize:'16px'}}>{loadingLogin ? "Verifica..." : "ACCEDI"}</button>
                </form>
                <button onClick={() => navigate('/')} style={{marginTop:20, background:'none', border:'none', color:'#666', cursor:'pointer', textDecoration:'underline'}}>← Torna al sito</button>
            </div>
        </div>
    );
  }

  if (!user) return null;

  // --- BLOCCO ABBONAMENTO SCADUTO ---
  if (config.account_attivo === false) {
      return (
          <div style={{textAlign:'center', padding:'50px', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'#f8f9fa'}}>
              <h1 style={{fontSize:'4rem', marginBottom:'10px'}}>⛔</h1>
              <h2 style={{color:'red', textTransform:'uppercase'}}>Abbonamento Sospeso</h2>
              <p style={{fontSize:'1.2rem', color:'#666'}}>Contatta l'amministrazione per riattivare il servizio.</p>
              <button onClick={handleLogout} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', marginTop:'20px'}}>Esci</button>
          </div>
      );
  }

  // --- LAYOUT FULL WIDTH ---
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f4f6f8', fontFamily: "'Inter', sans-serif", color:'#333' }}>
      
      {/* HEADER */}
      <header style={{background: '#1a1a1a', padding:'15px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', flexWrap:'wrap', gap:'15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <h1 style={{margin:0, fontSize:'1.3rem', fontWeight:'700'}}>⚙️ {user.nome}</h1>
            <span style={{background:'#3498db', fontSize:'10px', padding:'3px 8px', borderRadius:'10px', fontWeight:'bold'}}>ADMIN</span>
        </div>
        
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
            <button onClick={apriMenuFrontend} style={externalLinkStyle}>👁️ MENU</button>
            <button onClick={apriCassa} style={externalLinkStyle}>💰 CASSA</button>
            <button onClick={apriCucina} style={externalLinkStyle}>👨‍🍳 CUCINA</button>
            <button onClick={apriPizzeria} style={externalLinkStyle}>🍕 PIZZERIA</button>
            <button onClick={apriBar} style={externalLinkStyle}>🍹 BAR</button>
            <button onClick={apriHaccp} style={externalLinkStyle}>🛡️ HACCP</button>
            <button onClick={handleLogout} style={{...externalLinkStyle, background:'#c0392b', borderColor:'#c0392b'}}>🚪 ESCI</button>
        </div>
      </header>
      
      {/* NAVIGAZIONE TAB (SCROLLABLE SU MOBILE) */}
      <div style={{
          background: 'white', padding: '15px 20px', borderBottom: '1px solid #ddd', 
          overflowX: 'auto', display: 'flex', gap: '10px', scrollbarWidth:'none', position:'sticky', top:0, zIndex:100
      }}>
        {user.ruolo !== 'editor' && <button onClick={() => setTab('dashboard')} style={navBtnStyle(tab==='dashboard', '#2c3e50')}>📈 Dashboard</button>}
        <button onClick={() => setTab('menu')} style={navBtnStyle(tab==='menu', '#333')}>🍔 Menu</button>
        <button onClick={() => setTab('categorie')} style={navBtnStyle(tab==='categorie', '#333')}>📂 Categorie</button>
        <button onClick={() => setTab('style')} style={navBtnStyle(tab==='style', '#9b59b6')}>🎨 Grafica</button>
        <button onClick={() => setTab('excel')} style={navBtnStyle(tab==='excel', '#27ae60')}>📊 Excel</button>
        
        {user.ruolo !== 'editor' && (
            <>
                <button onClick={() => setTab('users')} style={navBtnStyle(tab==='users', '#e67e22')}>👥 Utenti</button>
                <button onClick={() => setTab('security')} style={navBtnStyle(tab==='security', '#c0392b')}>🔐 Sicurezza</button>
            </>
        )}
      </div>

      {/* CONTENUTO FULL WIDTH */}
      <div style={{ padding: '20px', boxSizing:'border-box', maxWidth:'100%' }}>
          {tab === 'dashboard' && user.ruolo !== 'editor' && <AdminDashboard user={user} API_URL={API_URL} />}
          {tab === 'menu' && <AdminMenu user={user} menu={menu} setMenu={setMenu} categorie={categorie} config={config} setConfig={setConfig} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
          {tab === 'categorie' && <AdminCategorie user={user} categorie={categorie} setCategorie={setCategorie} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
          {tab === 'style' && <AdminGrafica user={user} config={config} setConfig={setConfig} API_URL={API_URL} />}
          {tab === 'excel' && <AdminExcel user={user} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
          {tab === 'users' && <AdminUsers API_URL={API_URL} user={user} />}
          {tab === 'security' && <AdminSicurezza user={user} API_URL={API_URL} />}
      </div>

    </div>
  );
}

export default Admin;