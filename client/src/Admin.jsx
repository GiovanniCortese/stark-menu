// client/src/Admin.jsx - VERSIONE V42 (AGGIUNTA GESTIONE UTENTI CRM) 🔒
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// *** IMPORTIAMO I SOTTO-COMPONENTI ***
import AdminMenu from './components_admin/AdminMenu';
import AdminCategorie from './components_admin/AdminCategorie';
import AdminGrafica from './components_admin/AdminGrafica';
import AdminExcel from './components_admin/AdminExcel';
import AdminUsers from './components_admin/AdminUsers'; // NUOVO IMPORT
import AdminSicurezza from './components_admin/AdminSicurezza'; // <--- AGGIUNGI QUESTO
import AdminDashboard from './components_admin/AdminDashboard'; // <--- IMPORTA QUESTO

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- NUOVI STATI LOGIN ADMIN ---
const [isAuthorized, setIsAuthorized] = useState(false);
const [identifierInput, setIdentifierInput] = useState(""); // Email o Nome Utente
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
  
  // CONFIGURAZIONE COMPLETA (include account_attivo e cucina_super_active)
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
                setUser({ id: data.id, nome: data.ristorante, slug: slug });
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
    // Fetch Config
    fetch(`${API_URL}/api/ristorante/config/${id}`)
        .then(r=>r.json())
        .then(d => {
            setConfig(prev => ({...prev, ...d}));
        }); 
    
    // Fetch Categorie
    fetch(`${API_URL}/api/categorie/${id}`)
        .then(res => res.json())
        .then(data => {
            const sorted = data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0));
            setCategorie(sorted);
        });
  };

  const ricaricaDati = () => {
      if(!user) return;
      // Ricarica Menu
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
      // Ricarica Categorie
      fetch(`${API_URL}/api/categorie/${user.id}`).then(r=>r.json()).then(data => {
          const sorted = data.sort((a,b) => (a.posizione || 0) - (b.posizione || 0));
          setCategorie(sorted);
      });
      // Ricarica Stato Servizio/Config
      fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d => {
        if(d) setConfig(prev => ({...prev, ...d}));
      });
  };

const handleLogout = () => { 
      if(confirm("Uscire dal pannello?")) { 
          // CANCELLA LA NUOVA CHIAVE
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
                email: identifierInput, // identifierInput ora conterrà l'email
                password: passwordInput 
            })
        });
        
        const data = await res.json();

        if (data.success) {
            setIsAuthorized(true);
            // Salviamo la sessione usando lo slug che ci ha confermato il server
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
  const apriMenuFrontend = () => window.open(`/${slug}`, '_blank');
  const apriCassa = () => window.open(`/cassa/${slug}`, '_blank');
  const apriCucina = () => window.open(`/cucina/${slug}`, '_blank');
  const apriPizzeria = () => window.open(`/pizzeria/${slug}`, '_blank');
  const apriBar = () => window.open(`/bar/${slug}`, '_blank');

  if (loading) return <div style={{padding:'50px', textAlign:'center', fontSize:'20px'}}>🔄 Caricamento Admin...</div>;

  // --- SE NON AUTORIZZATO, MOSTRA IL FORM DI LOGIN ---
  if (!isAuthorized) {
    return (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#1a1a1a', flexDirection:'column'}}>
            <div style={{background:'white', padding:'40px', borderRadius:'15px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
                <h1 style={{fontSize:'3rem', margin:0}}>🕶️</h1>
                <h2 style={{color:'#333', marginTop:10}}>Admin Panel</h2>
                <p style={{color:'#666'}}>{user?.nome || "Accesso Riservato"}</p>

                <form onSubmit={handleAdminLogin} style={{marginTop:20}}>
    <input 
        type="email" // Usiamo type email per validazione automatica
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
        borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:'pointer'
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

  // --- BLOCCO TOTALE: SE ABBONAMENTO SCADUTO ---
  if (config.account_attivo === false) {
      return (
          <div className="container" style={{textAlign:'center', padding:'50px', maxWidth:'600px', margin:'50px auto'}}>
              <h1 style={{fontSize:'4rem', marginBottom:'10px'}}>⛔</h1>
              <h2 style={{color:'red', textTransform:'uppercase'}}>Abbonamento Sospeso</h2>
              <p style={{fontSize:'1.2rem', color:'#666'}}>
                  L'accesso al pannello di gestione per <strong>{user.nome}</strong> è stato momentaneamente bloccato.
              </p>
              <div style={{background:'#fff3cd', border:'1px solid #ffeeba', padding:'15px', borderRadius:'5px', margin:'20px 0', color:'#856404'}}>
                  Contatta l'amministrazione Stark Enterprise per regolarizzare la posizione e riattivare il servizio.
              </div>
              <button onClick={handleLogout} style={{background:'#333', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>
                  Esci
              </button>
          </div>
      );
  }

  return (
    <div className="container">
      {/* HEADER GLOBALE */}
     <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px'}}>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
            {/* MENU PUBBLICO */}
            <button onClick={apriMenuFrontend} style={{background:'#3498db', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                👁️ MENU
            </button>

            {/* GESTIONALI INTERNI */}
            <button onClick={apriCassa} style={{background:'#9b59b6', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                💰 CASSA
            </button>
            <button onClick={apriCucina} style={{background:'#e67e22', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                👨‍🍳 CUCINA
            </button>
            <button onClick={apriPizzeria} style={{background:'#c0392b', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                🍕 PIZZERIA
            </button>
            <button onClick={apriBar} style={{background:'#1abc9c', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
                🍹 BAR
            </button>
            
            {/* LOGOUT */}
            <button onClick={handleLogout} style={{background:'#333', color:'white', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', marginLeft:'10px'}}>
                🚪 ESCI
            </button>
        </div>
      </header>
      
/* MENU TAB DI NAVIGAZIONE */
<div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'10px', marginBottom: '20px'}}>
    {/* DASHBOARD: VISIBILE SOLO AD ADMIN (NON EDITOR) */}
    {user.ruolo !== 'editor' && (
        <button onClick={() => setTab('dashboard')} style={{background: tab==='dashboard'?'#2c3e50':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='dashboard'?'white':'black', fontWeight:'bold'}}>
            📈 Home
        </button>
    )}

    <button onClick={() => setTab('menu')} style={{background: tab==='menu'?'#333':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='menu'?'white':'black', fontWeight:'bold'}}>🍔 Menu</button>
    <button onClick={() => setTab('categorie')} style={{background: tab==='categorie'?'#333':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='categorie'?'white':'black', fontWeight:'bold'}}>📂 Categorie</button>
    <button onClick={() => setTab('style')} style={{background: tab==='style'?'#9b59b6':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='style'?'white':'black', fontWeight:'bold'}}>🎨 Grafica</button>
    <button onClick={() => setTab('excel')} style={{background: tab==='excel'?'#27ae60':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='excel'?'white':'black', fontWeight:'bold'}}>📊 Excel</button>
    
    {/* UTENTI & SICUREZZA: NASCOSTI SE SEI EDITOR */}
    {user.ruolo !== 'editor' && (
        <>
            <button onClick={() => setTab('users')} style={{background: tab==='users'?'#e67e22':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='users'?'white':'black', fontWeight:'bold'}}>👥 Utenti</button>
            <button onClick={() => setTab('security')} style={{background: tab==='security'?'#c0392b':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='security'?'white':'black', fontWeight:'bold'}}>🔐 Sicurezza</button>
        </>
    )}
</div>

      {/* --- CARICAMENTO DINAMICO DEI COMPONENTI --- */}
      
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

      {tab === 'excel' && (
          <AdminExcel 
            user={user} 
            API_URL={API_URL} 
            ricaricaDati={ricaricaDati} 
          />
      )}

{/* NUOVO COMPONENTE UTENTI */}
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
  );
}

export default Admin;