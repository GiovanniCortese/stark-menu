// client/src/Admin.jsx - VERSIONE V96 (PRENOTAZIONI ACTIVE) 📅
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
import AdminPrenotazioni from './components_admin/AdminPrenotazioni'; // <--- NUOVO IMPORT STEP 3

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
                // Se lo slug corrisponde o è un super admin in god mode
                if (u.slug === slug || u.is_god_mode) {
                    authorized = true;
                    localStorage.setItem(sessionKey, "true");
                }
            } catch(e) {
                console.error("Errore parsing user localStorage", e);
            }
        }

        if (hasSession === "true") authorized = true;

        // --- PUNTO DI SNODO: SE NON AUTORIZZATO -> REDIRECT ---
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
                    // Importante: passiamo il layout sala anche nello user object per i sotto-componenti
                    layout_sala: data.layout_sala 
                });
                setMenu(data.menu || []);
                
                // Mappatura Configurazione Backend -> Frontend
                const nuoviModuli = data.moduli || {};
                
                setConfig(prev => ({
                    ...prev, 
                    ...data.style,
                    data_scadenza: data.data_scadenza,

                    // Mappatura Moduli
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
                    
                    // NUOVI
                    tipo_business: data.tipo_business || 'ristorante',
                    pin_mode: data.pin_mode || false,
                    layout_sala: data.layout_sala // Assicura che arrivi
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
            // Sync layout nello user object se aggiornato
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

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.2rem', color:'#666'}}>🔄 Caricamento Admin...</div>;

  if (!isAuthorized) return null;

  if (config.account_attivo === false) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#e74c3c', textTransform:'uppercase'}}>Abbonamento Sospeso</h2>
              <p style={{fontSize:'1.2rem', color:'#666', maxWidth:'600px'}}>Il servizio è scaduto o sospeso. Contatta l'amministrazione.</p>
              <button onClick={handleLogout} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer', marginTop:20}}>Esci</button>
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

  return (
    <>
    <style>{`
        body { margin: 0; background-color: #f8f9fa; }
        .admin-wrapper { width: 100%; min-height: 100vh; padding: 20px; box-sizing: border-box; max-width: 1400px; margin: 0 auto; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .header-title h1 { margin: 0; font-size: 1.5rem; color: #2c3e50; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .action-btn { padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 0.85rem; color: white; transition: opacity 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
        .action-btn:hover { opacity: 0.9; }
        .admin-nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-bottom: 25px; }
        .nav-btn { padding: 12px 5px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.95rem; transition: all 0.2s; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .nav-btn:hover { transform: translateY(-2px); }
        @media (max-width: 768px) { .admin-wrapper { padding: 10px; } .header-title h1 { font-size: 1.2rem; } .admin-header { flex-direction: column; align-items: stretch; text-align: center; } .header-actions { justify-content: center; } .admin-nav { grid-template-columns: 1fr 1fr; } }
    `}</style>

    <div className="admin-wrapper">
      
      {/* HEADER (Pulsanti App) */}
      <div className="admin-header">
        <div className="header-title"><h1>⚙️ {user.nome}</h1></div>
        
        <div className="header-actions">
            {showMenu && <button onClick={() => apriLink(`/${slug}`)} className="action-btn" style={{background:'#3498db'}}>👁️ Menu</button>}
            {showCassa && <button onClick={() => apriLink(`/cassa/${slug}`)} className="action-btn" style={{background:'#9b59b6'}}>💰 Cassa</button>}
            
            {showFullSuite && (
                <>
                    <button onClick={() => apriLink(`/cucina/${slug}`)} className="action-btn" style={{background:'#e67e22'}}>👨‍🍳 Cucina</button>
                    <button onClick={() => apriLink(`/pizzeria/${slug}`)} className="action-btn" style={{background:'#c0392b'}}>🍕 Pizzeria</button>
                    <button onClick={() => apriLink(`/bar/${slug}`)} className="action-btn" style={{background:'#1abc9c'}}>🍹 Bar</button>
                </>
            )}

            {showMagazzino && <button onClick={() => apriLink(`/magazzino/${slug}`)} className="action-btn" style={{background:'#8e44ad'}}>📦 Magazzino</button>}
            {showHaccp && <button onClick={() => apriLink(`/haccp/${slug}`)} className="action-btn" style={{background:'#2c3e50'}}>🛡️ HACCP</button>}

            <button onClick={handleLogout} className="action-btn" style={{background:'#333', marginLeft:'auto'}}>🚪 Esci</button>
        </div>
      </div>
      
      {/* NAVIGAZIONE TAB */}
      <div className="admin-nav">
        {user.ruolo !== 'editor' && (
            <button onClick={() => setTab('dashboard')} className="nav-btn" 
                style={{background: tab==='dashboard'?'#2c3e50':'white', color: tab==='dashboard'?'white':'#444'}}>
                📈 Home
            </button>
        )}

        {/* --- NUOVO TAB PRENOTAZIONI --- */}
        {user.ruolo !== 'editor' && (
            <button onClick={() => setTab('prenotazioni')} className="nav-btn" 
                style={{background: tab==='prenotazioni'?'#8e44ad':'white', color: tab==='prenotazioni'?'white':'#444'}}>
                📅 Prenotazioni
            </button>
        )}

        {showMenu && <button onClick={() => setTab('menu')} className="nav-btn" style={{background: tab==='menu'?'#333':'white', color: tab==='menu'?'white':'#444'}}>🍔 Menu</button>}
        {showMenu && <button onClick={() => setTab('categorie')} className="nav-btn" style={{background: tab==='categorie'?'#333':'white', color: tab==='categorie'?'white':'#444'}}>📂 Categorie</button>}
        {showMenu && <button onClick={() => setTab('style')} className="nav-btn" style={{background: tab==='style'?'#9b59b6':'white', color: tab==='style'?'white':'#444'}}>🎨 Grafica</button>}
        
        {/* TAB SALA */}
        {user.ruolo !== 'editor' && (
            <button onClick={() => setTab('sala')} className="nav-btn" style={{background: tab==='sala'?'#c0392b':'white', color: tab==='sala'?'white':'#444'}}>
                📐 Sala & Mappa
            </button>
        )}
        
        {user.ruolo !== 'editor' && showUtenti && (
            <button onClick={() => setTab('users')} className="nav-btn" style={{background: tab==='users'?'#e67e22':'white', color: tab==='users'?'white':'#444'}}>👥 Utenti</button>
        )}

        {user.ruolo !== 'editor' && (
            <button onClick={() => setTab('security')} className="nav-btn" style={{background: tab==='security'?'#c0392b':'white', color: tab==='security'?'white':'#444'}}>🔐 Sicurezza</button>
        )}
      </div>

      {/* CONTENUTO */}
      <div style={{background:'white', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', minHeight:'500px'}}>
        
        {tab === 'dashboard' && user.ruolo !== 'editor' && (
            <AdminDashboard user={user} API_URL={API_URL} config={config} setConfig={setConfig} />
        )}

        {/* --- COMPONENTE PRENOTAZIONI --- */}
        {tab === 'prenotazioni' && <AdminPrenotazioni user={user} config={config} API_URL={API_URL} />}

        {tab === 'menu' && showMenu && <AdminMenu user={user} menu={menu} setMenu={setMenu} categorie={categorie} config={config} setConfig={setConfig} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
        {tab === 'categorie' && showMenu && <AdminCategorie user={user} categorie={categorie} setCategorie={setCategorie} API_URL={API_URL} ricaricaDati={ricaricaDati} />}
        {tab === 'style' && showMenu && <AdminGrafica user={user} config={config} setConfig={setConfig} API_URL={API_URL} />}
        
        {/* COMPONENTE SALA */}
        {tab === 'sala' && <AdminSala user={user} API_URL={API_URL} />}
        
        {tab === 'users' && showUtenti && <AdminUsers API_URL={API_URL} user={user} />}
        {tab === 'security' && <AdminSicurezza user={user} API_URL={API_URL} />}
      </div>
    </div>
    </>
  );
}

export default Admin;