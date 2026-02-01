// client/src/features/admin/Admin.jsx - VERSIONE V101 (MONITOR SEPARATI: CUCINA, PIZZERIA, BAR) 🚀
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_URL from '../../config'; // Import corretto da src/config.js

// *** IMPORTIAMO I SOTTO-COMPONENTI (Dalla cartella ./components) ***
import AdminMenu from './components/AdminMenu';
import AdminCategorie from './components/AdminCategorie';
import AdminGrafica from './components/AdminGrafica';
import AdminUsers from './components/AdminUsers';
import AdminSicurezza from './components/AdminSicurezza';
import AdminDashboard from './components/AdminDashboard';
import AdminSala from './components/AdminSala';
import AdminPrenotazioni from './components/AdminPrenotazioni';

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- STATI LOGIN ADMIN ---
  const [isAuthorized, setIsAuthorized] = useState(false);

  // --- STATI GLOBALI ---
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [tab, setTab] = useState('dashboard'); // DEFAULT: DASHBOARD

  // ✅ errore caricamento (evita crash React quando /api/menu/:slug fa 500)
  const [loadError, setLoadError] = useState('');

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

  // --- INIZIALIZZAZIONE E CHECK AUTH ---
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
        setLoading(true);
        setLoadError('');

        // 1. CHECK SESSIONE E USER
        const sessionKey = `stark_admin_session_${slug}`;
        localStorage.getItem(sessionKey); // (compat) non serve usarlo per la validazione

        // ✅ FIX: supporta sia "user" (nuovo) sia "stark_user" (vecchio)
        const storedUserRaw = localStorage.getItem("user") || localStorage.getItem("stark_user");

        let authorized = false;
        let userData = null;

        if (storedUserRaw) {
            try {
                userData = JSON.parse(storedUserRaw);
                const ruolo = userData.ruolo || userData.role; // ✅ ruolo/role
                if (['admin', 'editor', 'superadmin'].includes(ruolo)) {
                    authorized = true;
                    localStorage.setItem(sessionKey, "true");
                }
            } catch(e) {
                console.error("Errore parsing user localStorage", e);
            }
        }

        if (!authorized) {
            navigate('/login', { replace: true });
            setLoading(false);
            return;
        }

        setIsAuthorized(true);

        // Se autorizzato, carichiamo i dati freschi dal server
        try {
            const res = await fetch(`${API_URL}/api/menu/${slug}`);

            // ✅ se backend risponde 500/404 ecc, NON far crashare React
            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                const ruolo = userData?.ruolo || userData?.role;
                setLoadError(`Errore caricamento ristorante (${res.status}). ${txt ? txt.slice(0, 120) : ''}`);

                // superadmin torna al pannello superadmin (così non resta bloccato)
                if (ruolo === 'superadmin') {
                    setTimeout(() => navigate('/super-admin', { replace: true }), 200);
                } else {
                    setTimeout(() => navigate('/login', { replace: true }), 200);
                }
                return;
            }

            const data = await res.json();

            if (data && data.id) {
                const ruolo = userData?.ruolo || userData?.role;

                // permessi: se non matcha e non è superadmin -> fuori
                if (ruolo !== 'superadmin' && parseInt(userData.ristorante_id) !== parseInt(data.id)) {
                    alert("Non hai i permessi per questo ristorante.");
                    navigate('/login', { replace: true });
                    return;
                }

                setUser({ 
                    ...userData,
                    id: data.id, 
                    nome_ristorante: data.ristorante,
                    slug: slug, 
                    layout_sala: data.layout_sala 
                });

                setMenu(data.menu || []);

                const nuoviModuli = data.moduli || {};

                setConfig(prev => ({
                    ...prev, 
                    ...data.style, // Unisce stili
                    ...data,       // Unisce config base

                    // Normalizzazione Moduli
                    modulo_cassa: nuoviModuli.cassa ?? data.modulo_cassa ?? true,
                    modulo_menu_digitale: nuoviModuli.menu_digitale ?? data.modulo_menu_digitale ?? true,
                    modulo_ordini_clienti: nuoviModuli.ordini_clienti ?? data.modulo_ordini_clienti ?? true,
                    modulo_magazzino: nuoviModuli.magazzino ?? data.modulo_magazzino,
                    modulo_haccp: nuoviModuli.haccp ?? data.modulo_haccp,
                    modulo_utenti: nuoviModuli.utenti ?? data.modulo_utenti,

                    cucina_super_active: data.cucina_super_active, 
                    cassa_full_suite: data.cassa_full_suite ?? data.cucina_super_active ?? true, 
                    ordini_abilitati: data.ordini_abilitati,
                    account_attivo: data.subscription_active ?? data.account_attivo ?? true,
                    tipo_business: data.tipo_business || 'ristorante',
                    pin_mode: data.pin_mode || false,
                    layout_sala: data.layout_sala 
                }));

                caricaConfigurazioniExtra(data.id);
            } else { 
                setLoadError("Ristorante non trovato."); 
                navigate('/'); 
            }
        } catch (error) { 
            console.error(error); 
            setLoadError("Errore connessione o server.");
        } finally { 
            setLoading(false); 
        }
    };

    init();
  }, [slug, navigate]);

  const caricaConfigurazioniExtra = (id) => {
    // 1. Configurazione Dettagliata
    fetch(`${API_URL}/api/ristorante/config/${id}`)
        .then(r=>r.json())
        .then(d => {
            setConfig(prev => ({...prev, ...d}));
            if(d?.layout_sala) setUser(u => (u ? ({...u, layout_sala: d.layout_sala}) : u));
        }); 

    // 2. Categorie
    fetch(`${API_URL}/api/categorie/${id}`)
        .then(res => res.json())
        .then(data => {
            const sorted = Array.isArray(data) ? data.sort((a,b) => (a.ordine_visualizzazione || 0) - (b.ordine_visualizzazione || 0)) : [];
            setCategorie(sorted);
        });
  };

  const ricaricaDati = () => {
      if(!user) return;
      // Ricarica Menu
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
      // Ricarica Categorie
      fetch(`${API_URL}/api/categorie/${user.id}`).then(r=>r.json()).then(data => {
          const sorted = Array.isArray(data) ? data.sort((a,b) => (a.ordine_visualizzazione || 0) - (b.ordine_visualizzazione || 0)) : [];
          setCategorie(sorted);
      });
      // Ricarica Config
      fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d => {
        if(d) setConfig(prev => ({...prev, ...d}));
      });
  };

  const handleLogout = () => { 
      if(window.confirm("Uscire dal pannello?")) { 
          localStorage.removeItem(`stark_admin_session_${slug}`); 
          localStorage.removeItem("stark_user");
          localStorage.removeItem("user");
          localStorage.removeItem("admin_token");
          localStorage.removeItem("superadmin_target_slug");
          navigate('/login', { replace: true }); 
      } 
  };

  const apriLink = (path) => window.open(path, '_blank');

  // --- LOADER & CHECKS ---
  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.2rem', color:'#666'}}>🔄 Caricamento Admin...</div>;

  // ✅ schermata errore (evita React crash + removeChild)
  if (loadError) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center'}}>
              <h1 style={{fontSize:'3rem', margin:0}}>⚠️</h1>
              <h2 style={{color:'#e67e22'}}>Errore Caricamento</h2>
              <p style={{maxWidth:700, color:'#555'}}>{loadError}</p>
              <button onClick={() => navigate('/super-admin', { replace: true })} style={{marginTop:20, padding:'10px 20px', background:'#1e293b', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>
                  Torna al Super Admin
              </button>
          </div>
      );
  }

  if (!isAuthorized) return null;

  // ✅ ruolo robusto
  const ruolo = user?.ruolo || user?.role;

  if (config.account_attivo === false) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#e74c3c'}}>Abbonamento Sospeso</h2>
              <p>Contatta l'amministrazione per riattivare il servizio.</p>
              <button onClick={handleLogout} style={{marginTop:20, padding:'10px 20px', background:'#333', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Esci</button>
          </div>
      );
  }

  // --- VARIABILI VISIBILITÀ ---
  const showCassa = config.modulo_cassa === true; 
  const showMenu = config.modulo_menu_digitale !== false;
  const showUtenti = config.modulo_utenti === true || ruolo === 'superadmin';
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

  // --- STILI INTERNI (FALLBACK) ---
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

  // se user è ancora null per qualsiasi ragione, evita crash
  const safeUserNome = user?.nome || 'Utente';
  const safeUserRole = ruolo || 'admin';

  return (
    <div style={styles.container}>

      {/* 1. SIDEBAR NAVIGATION */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
            ⚡ {user?.nome_ristorante || "Admin"}
        </div>

        {/* GESTIONE */}
        {safeUserRole !== 'editor' && <NavItem id="dashboard" icon="📊" label="Dashboard" />}
        {safeUserRole !== 'editor' && <NavItem id="prenotazioni" icon="📅" label="Prenotazioni" />}

        {showMenu && (
            <>
                <NavItem id="menu" icon="🍔" label="Menu & Prodotti" />
                <NavItem id="categorie" icon="📂" label="Categorie" />
                <NavItem id="style" icon="🎨" label="Grafica" />
            </>
        )}

        {safeUserRole !== 'editor' && <NavItem id="sala" icon="📐" label="Sala & Mappa" />}

        {(showUtenti || safeUserRole === 'admin' || safeUserRole === 'superadmin') && safeUserRole !== 'editor' && (
            <NavItem id="users" icon="👥" label="Staff" />
        )}

        {safeUserRole !== 'editor' && <NavItem id="security" icon="⚙️" label="Impostazioni" />}

        {/* APPS ESTERNE (KDS SEPARATI) */}
        <div style={styles.appSection}>
            <div style={styles.appLabel}>Applicazioni</div>
            {showMenu && <AppItem link={`/${slug}`} icon="👁️" label="Visualizza Menu" color="#3498db" />}
            {showCassa && <AppItem link={`/cassa/${slug}`} icon="💰" label="Cassa Smart" color="#9b59b6" />}

            {showFullSuite && (
                <>
                    <AppItem link={`/cucina/${slug}`} icon="👨‍🍳" label="Monitor Cucina" color="#e67e22" />
                    <AppItem link={`/pizzeria/${slug}`} icon="🍕" label="Monitor Pizzeria" color="#e74c3c" />
                    <AppItem link={`/bar/${slug}`} icon="🍹" label="Monitor Bar" color="#1abc9c" />
                </>
            )}

            {showMagazzino && <AppItem link={`/magazzino/${slug}`} icon="📦" label="Magazzino" color="#8e44ad" />}
            {showHaccp && <AppItem link={`/haccp/${slug}`} icon="🛡️" label="HACCP" color="#95a5a6" />}
        </div>

        <div style={{marginTop:'auto', paddingTop: 20}}>
             <div style={{fontSize:12, color:'#64748b', marginBottom:10}}>
                 Loggato come: <b>{safeUserNome}</b>
             </div>
             <button onClick={handleLogout} style={{width:'100%', background:'#c0392b', color:'white', border:'none', padding:10, borderRadius:6, cursor:'pointer'}}>
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
                      <div style={{fontWeight:'bold', color:'#333'}}>{safeUserNome}</div>
                      <div style={{fontSize:'0.8rem', color:'#888', textTransform:'capitalize'}}>{safeUserRole}</div>
                  </div>
                  <div style={{width:40, height:40, borderRadius:'50%', background:'#ff9f43', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.2rem'}}>
                      {safeUserNome ? safeUserNome.charAt(0).toUpperCase() : "U"}
                  </div>
              </div>
          </header>

          {/* DYNAMIC CONTENT AREA */}
          <div style={styles.content}>

            {/* CONTENITORE COMPONENTI */}
            <div style={{background:'white', borderRadius:'12px', padding:'25px', boxShadow:'0 2px 10px rgba(0,0,0,0.03)', minHeight:'100%'}}>

                {tab === 'dashboard' && safeUserRole !== 'editor' && (
                    <AdminDashboard user={user} API_URL={API_URL} config={config} setConfig={setConfig} />
                )}

                {tab === 'prenotazioni' && <AdminPrenotazioni user={user} config={config} API_URL={API_URL} />}

                {tab === 'menu' && showMenu && (
                    <AdminMenu user={user} menu={menu} setMenu={setMenu} categorie={categorie} config={config} setConfig={setConfig} API_URL={API_URL} ricaricaDati={ricaricaDati} />
                )}

                {tab === 'categorie' && showMenu && (
                    <AdminCategorie user={user} categorie={categorie} setCategorie={setCategorie} API_URL={API_URL} ricaricaDati={ricaricaDati} />
                )}

                {tab === 'style' && showMenu && (
                    <AdminGrafica user={user} config={config} setConfig={setConfig} API_URL={API_URL} />
                )}

                {tab === 'sala' && <AdminSala user={user} API_URL={API_URL} />}

                {tab === 'users' && <AdminUsers API_URL={API_URL} user={user} />}

                {tab === 'security' && <AdminSicurezza user={user} API_URL={API_URL} />}
            </div>

          </div>
      </div>
    </div>
  );
}

export default Admin;
