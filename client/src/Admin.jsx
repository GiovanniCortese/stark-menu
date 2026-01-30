// client/src/Admin.jsx - VERSIONE V100 (NEW UI: SIDEBAR & DASHBOARD) 🚀
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// *** IMPORTIAMO I SOTTO-COMPONENTI ***
import AdminMenu from './components_admin/AdminMenu';
import AdminCategorie from './components_admin/AdminCategorie';
import AdminGrafica from './components_admin/AdminGrafica';
import AdminUsers from './components_admin/AdminUsers';
import AdminSicurezza from './components_admin/AdminSicurezza';
import AdminDashboard from './components_admin/AdminDashboard';
import AdminSala from './components_admin/AdminSala';
import AdminPrenotazioni from './components_admin/AdminPrenotazioni';

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- STATI LOGIN ADMIN ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // --- STATI GLOBALI ---
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [tab, setTab] = useState('dashboard'); // DEFAULT: DASHBOARD
  
  // Dati condivisi
  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  
  // CONFIGURAZIONE COMPLETA
  const [config, setConfig] = useState({ 
      account_attivo: true, 
      cucina_super_active: true,
      cassa_full_suite: true,
      ordini_abilitati: true, 
      
      // --- MODULI ---
      modulo_cassa: true,
      modulo_menu_digitale: true,
      modulo_ordini_clienti: true,
      modulo_magazzino: false,
      modulo_haccp: false,
      modulo_utenti: false,
      
      logo_url: '', cover_url: '',
      colore_sfondo: '#222222', colore_titolo: '#ffffff',
      colore_testo: '#cccccc', colore_prezzo: '#27ae60',
      font_style: 'sans-serif',

      // NUOVI CAMPI
      tipo_business: 'ristorante',
      pin_mode: false,
      layout_sala: []
  });

  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- INIZIALIZZAZIONE E CHECK AUTH ---
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
        setLoading(true);
        
        // 1. CHECK SESSIONE E USER
        const sessionKey = `stark_admin_session_${slug}`;
        const hasSession = localStorage.getItem(sessionKey); 
        const storedUser = localStorage.getItem("user");
        
        let authorized = false;
        
        // Logica di validazione automatica (Local Storage)
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (u.slug === slug || u.is_god_mode) {
                    authorized = true;
                    localStorage.setItem(sessionKey, "true");
                }
            } catch(e) {
                console.error("Errore parsing user localStorage", e);
            }
        }

        if (hasSession === "true") authorized = true;

        if (!authorized) {
            navigate('/login');
            setLoading(false);
            return;
        }

        setIsAuthorized(true);

        // Se autorizzato, carichiamo i dati
        try {
            const res = await fetch(`${API_URL}/api/menu/${slug}`);
            const data = await res.json();

            if (data && data.id) {
                setUser({ 
                    id: data.id, 
                    nome: data.ristorante, 
                    slug: slug, 
                    ruolo: data.ruolo || 'admin',
                    layout_sala: data.layout_sala 
                });
                setMenu(data.menu || []);
                
                const nuoviModuli = data.moduli || {};
                
                setConfig(prev => ({
                    ...prev, 
                    ...data.style,
                    data_scadenza: data.data_scadenza,
                    modulo_cassa: nuoviModuli.cassa ?? data.modulo_cassa ?? true,
                    modulo_menu_digitale: nuoviModuli.menu_digitale ?? data.modulo_menu_digitale ?? true,
                    modulo_ordini_clienti: nuoviModuli.ordini_clienti ?? data.modulo_ordini_clienti ?? true,
                    modulo_magazzino: nuoviModuli.magazzino ?? data.modulo_magazzino,
                    modulo_haccp: nuoviModuli.haccp ?? data.modulo_haccp,
                    modulo_utenti: nuoviModuli.utenti ?? data.modulo_utenti,
                    cucina_super_active: data.cucina_super_active, 
                    cassa_full_suite: data.cassa_full_suite ?? data.cucina_super_active ?? true, 
                    ordini_abilitati: data.ordini_abilitati,
                    account_attivo: data.subscription_active,
                    tipo_business: data.tipo_business || 'ristorante',
                    pin_mode: data.pin_mode || false,
                    layout_sala: data.layout_sala 
                }));
                
                caricaConfigurazioniExtra(data.id);
            } else { 
                alert("Ristorante non trovato."); 
                navigate('/'); 
            }
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    init();
  }, [slug, navigate]);

  const caricaConfigurazioniExtra = (id) => {
    fetch(`${API_URL}/api/ristorante/config/${id}`)
        .then(r=>r.json())
        .then(d => {
            setConfig(prev => ({...prev, ...d}));
            if(d.layout_sala) setUser(u => ({...u, layout_sala: d.layout_sala}));
        }); 
    
    fetch(`${API_URL}/api/categorie/${id}`)
        .then(res => res.json())
        .then(data => {
            const sorted = data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0));
            setCategorie(sorted);
        });
  };

  const ricaricaDati = () => {
      if(!user) return;
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
      fetch(`${API_URL}/api/categorie/${user.id}`).then(r=>r.json()).then(data => {
          const sorted = data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0));
          setCategorie(sorted);
      });
      fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d => {
        if(d) setConfig(prev => ({...prev, ...d}));
      });
  };

  const handleLogout = () => { 
      if(confirm("Uscire dal pannello?")) { 
          localStorage.removeItem(`stark_admin_session_${slug}`); 
          localStorage.removeItem("user");
          localStorage.removeItem("admin_token");
          navigate('/login'); 
      } 
  };
  
  const apriLink = (path) => window.open(path, '_blank');

  // --- LOADER & CHECKS ---
  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.2rem', color:'#666'}}>🔄 Caricamento Admin...</div>;
  if (!isAuthorized) return null;
  if (config.account_attivo === false) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#e74c3c'}}>Abbonamento Sospeso</h2>
              <button onClick={handleLogout} style={{marginTop:20, padding:'10px 20px'}}>Esci</button>
          </div>
      );
  }

  // --- VARIABILI VISIBILITÀ ---
  const showCassa = config.modulo_cassa === true; 
  const showMenu = config.modulo_menu_digitale !== false;
  const showUtenti = config.modulo_utenti === true;
  const showMagazzino = config.modulo_magazzino === true;
  const showHaccp = config.modulo_haccp === true;
  const showFullSuite = config.cassa_full_suite === true; 

  // --- MAPPING DEL TITOLO ---
  const getPageTitle = () => {
      switch(tab) {
          case 'dashboard': return 'Panoramica Generale';
          case 'prenotazioni': return 'Gestione Prenotazioni';
          case 'menu': return 'Gestione Menu & Prodotti';
          case 'categorie': return 'Categorie Menu';
          case 'style': return 'Personalizzazione Grafica';
          case 'sala': return 'Configurazione Sala';
          case 'users': return 'Gestione Staff';
          case 'security': return 'Impostazioni & Sicurezza';
          default: return 'Admin Panel';
      }
  };

  // --- STILI INTERNI (FALLBACK SE NON HAI APP.CSS) ---
  const styles = {
      container: { display: 'flex', height: '100vh', width: '100vw', background: '#f3f4f6', overflow: 'hidden' },
      sidebar: { width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', overflowY: 'auto' },
      logo: { fontSize: '1.4rem', fontWeight: 'bold', color: '#ff9f43', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' },
      navItem: (active) => ({ padding: '12px 15px', marginBottom: '5px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: active ? 'white' : '#cbd5e1', background: active ? '#ff9f43' : 'transparent', fontWeight: '500', transition: 'all 0.2s' }),
      main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      header: { height: '70px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 },
      content: { flex: 1, padding: '30px', overflowY: 'auto', background: '#f3f4f6' },
      appSection: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #334155' },
      appLabel: { fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', fontWeight: 'bold', paddingLeft: '10px' }
  };

  const NavItem = ({ id, icon, label }) => (
      <div style={styles.navItem(tab === id)} onClick={() => setTab(id)}>
          <span>{icon}</span> {label}
      </div>
  );

  const AppItem = ({ link, icon, label, color }) => (
      <div 
        onClick={() => apriLink(link)} 
        style={{...styles.navItem(false), color: color || '#cbd5e1', fontSize:'0.9rem'}}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
      >
          <span>{icon}</span> {label}
      </div>
  );

  return (
    <div style={styles.container}>
      
      {/* 1. SIDEBAR NAVIGATION */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
            ⚡ {user.nome}
        </div>

        {/* GESTIONE */}
        {user.ruolo !== 'editor' && <NavItem id="dashboard" icon="📊" label="Dashboard" />}
        {user.ruolo !== 'editor' && <NavItem id="prenotazioni" icon="📅" label="Prenotazioni" />}
        
        {showMenu && (
            <>
                <NavItem id="menu" icon="🍔" label="Menu & Prodotti" />
                <NavItem id="categorie" icon="📂" label="Categorie" />
                <NavItem id="style" icon="🎨" label="Grafica" />
            </>
        )}

        {user.ruolo !== 'editor' && <NavItem id="sala" icon="📐" label="Sala & Mappa" />}
        
        {user.ruolo !== 'editor' && showUtenti && <NavItem id="users" icon="👥" label="Staff" />}
        {user.ruolo !== 'editor' && <NavItem id="security" icon="⚙️" label="Impostazioni" />}

        {/* APPS ESTERNE */}
        <div style={styles.appSection}>
            <div style={styles.appLabel}>Applicazioni</div>
            {showMenu && <AppItem link={`/${slug}`} icon="👁️" label="Visualizza Menu" color="#3498db" />}
            {showCassa && <AppItem link={`/cassa/${slug}`} icon="💰" label="Cassa Smart" color="#9b59b6" />}
            {showFullSuite && (
                <>
                    <AppItem link={`/cucina/${slug}`} icon="👨‍🍳" label="KDS Cucina" color="#e67e22" />
                    <AppItem link={`/bar/${slug}`} icon="🍹" label="Monitor Bar" color="#1abc9c" />
                </>
            )}
            {showMagazzino && <AppItem link={`/magazzino/${slug}`} icon="📦" label="Magazzino" color="#8e44ad" />}
            {showHaccp && <AppItem link={`/haccp/${slug}`} icon="🛡️" label="HACCP" color="#95a5a6" />}
        </div>

        <div style={{marginTop:'auto', paddingTop: 20}}>
             <button onClick={handleLogout} style={{width:'100%', background:'#c0392b', color:'white', border:'none', padding:10, borderRadius:6}}>
                 🚪 Logout
             </button>
        </div>
      </div>

      {/* 2. MAIN AREA */}
      <div style={styles.main}>
          
          {/* HEADER */}
          <header style={styles.header}>
              <h2 style={{margin:0, fontSize:'1.3rem', color:'#334155'}}>{getPageTitle()}</h2>
              <div style={{display:'flex', alignItems:'center', gap:15}}>
                  <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:'bold', color:'#333'}}>{user.nome}</div>
                      <div style={{fontSize:'0.8rem', color:'#888'}}>{user.ruolo === 'admin' ? 'Amministratore' : 'Editor'}</div>
                  </div>
                  <div style={{width:40, height:40, borderRadius:'50%', background:'#ff9f43', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.2rem'}}>
                      {user.nome.charAt(0)}
                  </div>
              </div>
          </header>

          {/* DYNAMIC CONTENT AREA */}
          <div style={styles.content}>
            
            {/* WRAPPER BIANCO PER IL CONTENUTO */}
            <div style={{background:'white', borderRadius:'12px', padding:'25px', boxShadow:'0 2px 10px rgba(0,0,0,0.03)', minHeight:'100%'}}>
                
                {tab === 'dashboard' && user.ruolo !== 'editor' && (
                    <AdminDashboard user={user} API_URL={API_URL} config={config} setConfig={setConfig} />
                )}

                {tab === 'prenotazioni' && <AdminPrenotazioni user={user} config={config} API_URL={API_URL} />}

                {tab === 'menu' && showMenu && <AdminMenu user={user} menu={menu} setMenu={setMenu} categorie={categorie} config={config} setConfig={setConfig} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
                
                {tab === 'categorie' && showMenu && <AdminCategorie user={user} categorie={categorie} setCategorie={setCategorie} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
                
                {tab === 'style' && showMenu && <AdminGrafica user={user} config={config} setConfig={setConfig} API_URL={API_URL} />}
                
                {tab === 'sala' && <AdminSala user={user} API_URL={API_URL} />}
                
                {tab === 'users' && showUtenti && <AdminUsers API_URL={API_URL} user={user} />}
                
                {tab === 'security' && <AdminSicurezza user={user} API_URL={API_URL} />}
            </div>

          </div>
      </div>
    </div>
  );
}

export default Admin;