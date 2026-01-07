// client/src/Admin.jsx - VERSIONE V14 (MODULARE CON PATH CORRETTI) 🧱
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// *** IMPORTIAMO I SOTTO-COMPONENTI DALLA CARTELLA SPECIFICA ***
import AdminMenu from './components_admin/AdminMenu';
import AdminCategorie from './components_admin/AdminCategorie';
import AdminGrafica from './components_admin/AdminGrafica';
import AdminExcel from './components_admin/AdminExcel';

function Admin() {
  const { slug } = useParams(); 
  const navigate = useNavigate();

  // --- STATI GLOBALI (Condivisi tra i tab) ---
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [tab, setTab] = useState('menu'); 
  
  // Dati condivisi
  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  
  // Configurazione (Grafica e Stato Servizio)
  const [config, setConfig] = useState({ 
      ordini_abilitati: false, servizio_attivo: false,
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
        const sessionKey = `stark_session_${slug}`;
        const isGodMode = localStorage.getItem(sessionKey); 
        
        if (!isGodMode) {
            const pass = prompt(`🔒 Admin Panel: ${slug}\nInserisci Password:`);
            if (pass !== "tonystark") {
                alert("Password Errata"); window.location.href = "/"; return;
            }
            localStorage.setItem(sessionKey, "true");
        }

        try {
            // 1. Carica Info Ristorante
            const res = await fetch(`${API_URL}/api/menu/${slug}`);
            const data = await res.json();

            if (data && data.id) {
                const userData = { 
                    id: data.id, 
                    nome: data.ristorante, 
                    slug: slug, 
                    superAdminAbilitato: data.ordini_abilitati 
                };
                setUser(userData);
                setMenu(data.menu || []);
                
                // 2. Carica Config Extra e Categorie
                caricaConfigurazioniExtra(userData.id);
            } else { 
                alert("Ristorante non trovato."); 
                navigate('/'); 
            }
        } catch (error) { 
            console.error(error); 
            alert("Errore connessione."); 
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
            const safeConfig = { 
                ...d, 
                colore_prezzo: d.colore_prezzo || '#27ae60', 
                colore_titolo: d.colore_titolo || '#ffffff', 
                colore_testo: d.colore_testo || '#cccccc', 
                colore_sfondo: d.colore_sfondo || '#222222' 
            };
            setConfig(prev => ({...prev, ...safeConfig}));
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
      // Ricarica Stato Servizio
      fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d => {
        if(d) setConfig(prev => ({...prev, servizio_attivo: d.servizio_attivo}));
      });
  };

  const handleLogout = () => { 
      if(confirm("Uscire dal pannello?")) { 
          localStorage.removeItem(`stark_session_${slug}`); 
          navigate('/'); 
      } 
  };
  
  const apriMenuFrontend = () => { window.open(`/${slug}`, '_blank'); };

  if (loading) return <div style={{padding:'50px', textAlign:'center', fontSize:'20px'}}>🔄 Caricamento Admin...</div>;
  if (!user) return null;

  return (
    <div className="container">
      {/* HEADER GLOBALE */}
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={apriMenuFrontend} style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>👁️ VEDI MENU</button>
            <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>🚪 ESCI</button>
        </div>
      </header>
      
      {/* MENU TAB DI NAVIGAZIONE */}
      <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'10px', marginBottom: '20px'}}>
            <button onClick={() => setTab('menu')} style={{background: tab==='menu'?'#333':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='menu'?'white':'black', fontWeight:'bold'}}>🍔 Menu</button>
            <button onClick={() => setTab('categorie')} style={{background: tab==='categorie'?'#333':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='categorie'?'white':'black', fontWeight:'bold'}}>📂 Categorie</button>
            <button onClick={() => setTab('style')} style={{background: tab==='style'?'#9b59b6':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='style'?'white':'black', fontWeight:'bold'}}>🎨 Grafica</button>
            <button onClick={() => setTab('excel')} style={{background: tab==='excel'?'#27ae60':'#ccc', flex:1, padding:10, border:'none', cursor:'pointer', color: tab==='excel'?'white':'black', fontWeight:'bold'}}>📊 Excel</button>
      </div>

      {/* --- CARICAMENTO DINAMICO DEI COMPONENTI --- */}
      
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

    </div>
  );
}

export default Admin;