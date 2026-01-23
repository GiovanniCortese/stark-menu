// client/src/Admin.jsx - VERSIONE V43 (RESPONSIVE & FLUID) 📱
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// import API_URL from './config'; // Usa la variabile interna come nel tuo codice originale

// *** IMPORTIAMO I SOTTO-COMPONENTI ***
import AdminMenu from './components_admin/AdminMenu';
import AdminCategorie from './components_admin/AdminCategorie';
import AdminGrafica from './components_admin/AdminGrafica';
import MagazzinoManager from './components/magazzino/MagazzinoManager';
import AdminUsers from './components_admin/AdminUsers';
import AdminSicurezza from './components_admin/AdminSicurezza';
import AdminDashboard from './components_admin/AdminDashboard';

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- NUOVI STATI LOGIN ADMIN ---
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
  
  // CONFIGURAZIONE COMPLETA
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

  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- INIZIALIZZAZIONE E AUTH ---
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
        setLoading(true);
        const sessionKey = `stark_admin_session_${slug}`;
        const hasSession = localStorage.getItem(sessionKey); 
        
        if (hasSession === "true") {
            setIsAuthorized(true);
        }

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
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    init();
  }, [slug]);

  const caricaConfigurazioniExtra = (id) => {
    fetch(`${API_URL}/api/ristorante/config/${id}`)
        .then(r=>r.json())
        .then(d => {
            setConfig(prev => ({...prev, ...d}));
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
          navigate('/'); 
      } 
  };
  
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    setLoginError(false);

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: identifierInput, 
                password: passwordInput 
            })
        });
        
        const data = await res.json();

        if (data.success) {
            setIsAuthorized(true);
            localStorage.setItem(`stark_admin_session_${data.user.slug}`, "true");
        } else {
            setLoginError(true);
        }
    } catch (err) {
        alert("Errore di connessione");
    } finally {
        setLoadingLogin(false);
    }
  };
  
  // --- FUNZIONI DI NAVIGAZIONE RAPIDA ---
  const apriLink = (path) => window.open(path, '_blank');

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.2rem', color:'#666'}}>🔄 Caricamento Admin...</div>;

  // --- LOGIN SCREEN (FULL SCREEN) ---
  if (!isAuthorized) {
    return (
        <div style={{
            display:'flex', justifyContent:'center', alignItems:'center', 
            minHeight:'100vh', background:'#1a1a1a', flexDirection:'column', padding: '20px'
        }}>
            <div style={{
                background:'white', padding:'40px', borderRadius:'15px', 
                width:'100%', maxWidth:'400px', textAlign:'center', 
                boxShadow:'0 10px 25px rgba(0,0,0,0.5)'
            }}>
                <div style={{fontSize:'3rem', marginBottom:'10px'}}>🕶️</div>
                <h2 style={{color:'#333', margin:'0 0 10px 0'}}>Admin Panel</h2>
                <p style={{color:'#666', marginBottom:'20px'}}>{user?.nome || "Accesso Riservato"}</p>

                <form onSubmit={handleAdminLogin}>
                    <input 
                        type="email" 
                        placeholder="Email Amministratore" 
                        value={identifierInput}
                        onChange={e => setIdentifierInput(e.target.value)}
                        required
                        style={{
                            width:'100%', padding:'15px', borderRadius:'8px', 
                            border: loginError ? '2px solid #e74c3c' : '1px solid #ddd',
                            fontSize:'16px', boxSizing:'border-box', marginBottom:'10px', textAlign:'center'
                        }}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        required
                        style={{
                            width:'100%', padding:'15px', borderRadius:'8px', 
                            border: loginError ? '2px solid #e74c3c' : '1px solid #ddd',
                            fontSize:'16px', boxSizing:'border-box', marginBottom:'10px', textAlign:'center'
                        }}
                    />
                    {loginError && <p style={{color:'#e74c3c', fontWeight:'bold', fontSize:'0.9rem'}}>Email o Password errati ⛔</p>}
                    
                    <button type="submit" disabled={loadingLogin} style={{
                        width:'100%', padding:'15px', background:'#2c3e50', color:'white', border:'none', 
                        borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:'pointer', marginTop:'10px'
                    }}>
                        {loadingLogin ? "Verifica..." : "ACCEDI AL PANNELLO"}
                    </button>
                </form>
                
                <button onClick={() => navigate('/')} style={{marginTop:20, background:'none', border:'none', color:'#999', cursor:'pointer'}}>
                    ← Torna al sito
                </button>
            </div>
        </div>
    );
  }

  // Se l'utente non è caricato ma siamo autorizzati, aspettiamo
  if (!user) return null;

  // --- BLOCCO ABBONAMENTO SCADUTO ---
  if (config.account_attivo === false) {
      return (
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center'}}>
              <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
              <h2 style={{color:'#e74c3c', textTransform:'uppercase'}}>Abbonamento Sospeso</h2>
              <p style={{fontSize:'1.2rem', color:'#666', maxWidth:'600px'}}>
                  L'accesso al pannello di gestione per <strong>{user.nome}</strong> è stato momentaneamente bloccato.
              </p>
              <div style={{background:'#fff3cd', border:'1px solid #ffeeba', padding:'15px', borderRadius:'5px', margin:'20px 0', color:'#856404', maxWidth:'600px'}}>
                  Contatta l'amministrazione Stark Enterprise per regolarizzare la posizione e riattivare il servizio.
              </div>
              <button onClick={handleLogout} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>
                  Esci
              </button>
          </div>
      );
  }

  // --- RENDER PRINCIPALE ---
  return (
    <>
    {/* CSS INJECT PER RESPONSIVENESS */}
    <style>{`
        body { margin: 0; background-color: #f8f9fa; }
        .admin-wrapper {
            width: 100%;
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
            max-width: 1400px;
            margin: 0 auto;
        }
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            background: white;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .header-title h1 {
            margin: 0;
            font-size: 1.5rem;
            color: #2c3e50;
        }
        .header-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .action-btn {
            padding: 8px 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.85rem;
            color: white;
            transition: opacity 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .action-btn:hover { opacity: 0.9; }

        /* NAVIGAZIONE TABS - GRID RESPONSIVE */
        .admin-nav {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
            gap: 8px;
            margin-bottom: 25px;
        }
        .nav-btn {
            padding: 12px 5px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.95rem;
            transition: all 0.2s;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .nav-btn:hover { transform: translateY(-2px); }

        /* MOBILE TWEAKS */
        @media (max-width: 768px) {
            .admin-wrapper { padding: 10px; }
            .header-title h1 { font-size: 1.2rem; }
            .admin-header { flex-direction: column; align-items: stretch; text-align: center; }
            .header-actions { justify-content: center; }
            .admin-nav { grid-template-columns: 1fr 1fr; } /* 2 colonne su mobile */
        }
    `}</style>

    <div className="admin-wrapper">
      
      {/* HEADER */}
      <div className="admin-header">
        <div className="header-title">
            <h1>⚙️ {user.nome}</h1>
        </div>
        <div className="header-actions">
            <button onClick={() => apriLink(`/${slug}`)} className="action-btn" style={{background:'#3498db'}}>👁️ Menu</button>
            <button onClick={() => apriLink(`/cassa/${slug}`)} className="action-btn" style={{background:'#9b59b6'}}>💰 Cassa</button>
            <button onClick={() => apriLink(`/cucina/${slug}`)} className="action-btn" style={{background:'#e67e22'}}>👨‍🍳 Cucina</button>
            <button onClick={() => apriLink(`/pizzeria/${slug}`)} className="action-btn" style={{background:'#c0392b'}}>🍕 Pizzeria</button>
            <button onClick={() => apriLink(`/bar/${slug}`)} className="action-btn" style={{background:'#1abc9c'}}>🍹 Bar</button>
            <button onClick={() => apriLink(`/magazzino/${slug}`)} className="action-btn" style={{background:'#8e44ad'}}>📦 Magazzino</button>
            <button onClick={() => apriLink(`/haccp/${slug}`)} className="action-btn" style={{background:'#2c3e50'}}>🛡️ HACCP</button>
            <button onClick={handleLogout} className="action-btn" style={{background:'#333', marginLeft:'auto'}}>🚪 Esci</button>
        </div>
      </div>
      
      {/* MENU TAB DI NAVIGAZIONE */}
      <div className="admin-nav">
        {user.ruolo !== 'editor' && (
            <button onClick={() => setTab('dashboard')} className="nav-btn" 
                style={{background: tab==='dashboard'?'#2c3e50':'white', color: tab==='dashboard'?'white':'#444'}}>
                📈 Home
            </button>
        )}

        <button onClick={() => setTab('menu')} className="nav-btn" 
            style={{background: tab==='menu'?'#333':'white', color: tab==='menu'?'white':'#444'}}>
            🍔 Menu
        </button>
        
        <button onClick={() => setTab('categorie')} className="nav-btn" 
            style={{background: tab==='categorie'?'#333':'white', color: tab==='categorie'?'white':'#444'}}>
            📂 Categorie
        </button>
        
        <button onClick={() => setTab('style')} className="nav-btn" 
            style={{background: tab==='style'?'#9b59b6':'white', color: tab==='style'?'white':'#444'}}>
            🎨 Grafica
        </button>
        
        <button onClick={() => setTab('magazzino')} className="nav-btn" 
            style={{background: tab==='magazzino'?'#27ae60':'white', color: tab==='magazzino'?'white':'#444'}}>
            📊 Magazzino
        </button>
        
        {user.ruolo !== 'editor' && (
            <>
                <button onClick={() => setTab('users')} className="nav-btn" 
                    style={{background: tab==='users'?'#e67e22':'white', color: tab==='users'?'white':'#444'}}>
                    👥 Utenti
                </button>
                <button onClick={() => setTab('security')} className="nav-btn" 
                    style={{background: tab==='security'?'#c0392b':'white', color: tab==='security'?'white':'#444'}}>
                    🔐 Sicurezza
                </button>
            </>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div style={{background:'white', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', minHeight:'500px'}}>
        
        {tab === 'dashboard' && user.ruolo !== 'editor' && (
            <AdminDashboard user={user} API_URL={API_URL} />
        )}
        
        {tab === 'menu' && (
            <AdminMenu 
                user={user} 
                menu={menu} setMenu={setMenu}
                categorie={categorie} 
                config={config} setConfig={setConfig}
                API_URL={API_URL} 
                ricaricaDati={ricaricaDati} 
            />
        )}

        {tab === 'categorie' && (
            <AdminCategorie 
                user={user} 
                categorie={categorie} setCategorie={setCategorie}
                API_URL={API_URL} 
                ricaricaDati={ricaricaDati} 
            />
        )}

        {tab === 'style' && (
            <AdminGrafica 
                user={user} 
                config={config} setConfig={setConfig}
                API_URL={API_URL} 
            />
        )}

        {tab === 'magazzino' && (
   <div style={{ padding: '0 20px' }}>
        <MagazzinoManager 
            ristoranteId={user.id} 
            API_URL={API_URL} 
        />
    </div>
)}

        {tab === 'users' && (
            <AdminUsers 
                API_URL={API_URL} 
                user={user} 
            />
        )}
        
        {tab === 'security' && (
            <AdminSicurezza 
                user={user} 
                API_URL={API_URL} 
            />
        )}
      </div>

    </div>
    </>
  );
}

export default Admin;