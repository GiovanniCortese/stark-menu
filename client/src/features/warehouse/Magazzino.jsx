// client/src/features/warehouse/Magazzino.jsx - VERSIONE V108 (AUTH STATION & TABS) 📦
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// *** IMPORT DEI SOTTO-COMPONENTI MODULARI ***
import StockTable from './components/StockTable';
import ScannerBolla from './components/ScannerBolla';

function Magazzino() {
    const { slug } = useParams();
    const navigate = useNavigate();
    
    // Configurazione API locale
    const API_URL = "https://stark-backend-gg17.onrender.com";

    // --- STATI DATI ---
    const [ristorante, setRistorante] = useState(null);
    const [tab, setTab] = useState('stock'); // 'stock' | 'scanner'
    const [loading, setLoading] = useState(true);

    // --- STATI AUTH & SICUREZZA ---
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isModuleDisabled, setIsModuleDisabled] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [loginError, setLoginError] = useState(false);

    // 1. CARICAMENTO E CONTROLLI
    useEffect(() => {
        const init = async () => {
            try {
                // Fetch info ristorante
                const res = await fetch(`${API_URL}/api/menu/${slug}`);
                const data = await res.json();
                setRistorante(data);

                // Check Modulo Attivo (Supporta sia vecchio formato 'moduli' che nuovo flat)
                const isMagazzinoActive = data.modulo_magazzino !== false && (data.moduli?.magazzino !== false);
                if (!isMagazzinoActive) {
                    setIsModuleDisabled(true);
                    setLoading(false);
                    return;
                }

                // Check Sessione Esistente (Utente Loggato OPPURE Sessione Magazzino locale)
                const user = localStorage.getItem("stark_user") || localStorage.getItem("user");
                const stationSession = localStorage.getItem(`magazzino_session_${data.id}`);

                if (user || stationSession === "true") {
                    setIsAuthorized(true);
                }

                setLoading(false);
            } catch (err) {
                console.error("Errore init magazzino:", err);
                setLoading(false);
            }
        };

        init();
    }, [slug]);

    // 2. HANDLER LOGIN
    const handleLogin = (e) => {
        e.preventDefault();
        // Password specifica magazzino o password admin generale
        if (passwordInput === ristorante.pw_magazzino || passwordInput === ristorante.password) {
            setIsAuthorized(true);
            localStorage.setItem(`magazzino_session_${ristorante.id}`, "true");
            setLoginError(false);
        } else {
            setLoginError(true);
        }
    };

    const handleLogout = () => {
        if(window.confirm("Chiudere il Magazzino?")) {
            localStorage.removeItem(`magazzino_session_${ristorante?.id}`);
            // Se è un utente loggato globalmente, naviga via, altrimenti resetta stato
            if (localStorage.getItem("user")) navigate('/');
            else setIsAuthorized(false);
        }
    };

    // --- RENDER ---

    if (loading) return <div style={{padding:50, textAlign:'center', color:'#7f8c8d'}}>Caricamento Magazzino...</div>;
    
    if (isModuleDisabled) return (
        <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#f4f6f7', flexDirection:'column'}}>
            <h1 style={{fontSize:'4rem', margin:0}}>🔒</h1>
            <h2 style={{color:'#7f8c8d'}}>Modulo Magazzino Non Attivo</h2>
            <button onClick={()=>navigate('/')} style={{marginTop:20, padding:'10px 20px', cursor:'pointer'}}>Torna alla Home</button>
        </div>
    );

    // SCHERMATA LOGIN (Se non autorizzato)
    if (!isAuthorized) {
        return (
            <div style={{minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#8e44ad'}}>
                <div style={{background:'white', padding:40, borderRadius:12, width:'100%', maxWidth:350, textAlign:'center', boxShadow:'0 15px 40px rgba(0,0,0,0.3)'}}>
                    <div style={{fontSize:'3rem', marginBottom:15}}>📦</div>
                    <h2 style={{margin:0, color:'#2c3e50'}}>Accesso Magazzino</h2>
                    <p style={{color:'#7f8c8d', marginBottom:25}}>{ristorante?.ristorante}</p>
                    
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Password Magazzino" 
                            value={passwordInput} 
                            onChange={e=>setPasswordInput(e.target.value)} 
                            style={{width:'100%', padding:12, marginBottom:15, borderRadius:6, border: loginError ? '2px solid #e74c3c' : '1px solid #ccc', fontSize:16, textAlign:'center'}}
                            autoFocus
                        />
                        {loginError && <p style={{color:'#e74c3c', fontSize:13, marginTop:-10, marginBottom:10}}>Password Errata</p>}
                        <button style={{width:'100%', padding:12, background:'#8e44ad', color:'white', border:'none', borderRadius:6, fontSize:16, fontWeight:'bold', cursor:'pointer'}}>ENTRA</button>
                    </form>
                </div>
            </div>
        );
    }

    // DASHBOARD MAGAZZINO (Se autorizzato)
    return (
        <div style={{minHeight:'100vh', background:'#f4f6f7', display:'flex', flexDirection:'column', fontFamily:'sans-serif'}}>
            {/* HEADER */}
            <div style={{background:'#8e44ad', padding:'15px 25px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', alignItems:'center', gap:15}}>
                    <span style={{fontSize:'1.8rem'}}>📦</span>
                    <div>
                        <h1 style={{margin:0, fontSize:'1.2rem'}}>Gestione Magazzino</h1>
                        <span style={{fontSize:'0.8rem', opacity:0.8}}>{ristorante?.ristorante}</span>
                    </div>
                </div>
                <div style={{display:'flex', gap:10}}>
                    {/* Se utente admin loggato, mostra link admin */}
                    {(localStorage.getItem("stark_user") || localStorage.getItem("user")) && (
                        <button onClick={()=>navigate(`/admin/${slug}`)} style={btnHeader}>Admin Panel</button>
                    )}
                    <button onClick={handleLogout} style={{...btnHeader, background:'#c0392b'}}>Esci</button>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div style={{display:'flex', background:'white', borderBottom:'1px solid #ddd', padding:'0 10px'}}>
                <button 
                    onClick={()=>setTab('stock')}
                    style={{
                        padding:'15px 30px', 
                        background: tab==='stock' ? '#f4f6f7' : 'white', 
                        border:'none', 
                        borderBottom: tab==='stock' ? '3px solid #8e44ad' : '3px solid transparent', 
                        fontWeight: tab==='stock'?'bold':'normal', 
                        color: tab==='stock'?'#8e44ad':'#7f8c8d',
                        cursor:'pointer', fontSize:15, transition:'0.2s'
                    }}
                >
                    📦 Giacenze & Inventario
                </button>
                <button 
                    onClick={()=>setTab('scanner')}
                    style={{
                        padding:'15px 30px', 
                        background: tab==='scanner' ? '#f4f6f7' : 'white', 
                        border:'none', 
                        borderBottom: tab==='scanner' ? '3px solid #8e44ad' : '3px solid transparent', 
                        fontWeight: tab==='scanner'?'bold':'normal', 
                        color: tab==='scanner'?'#8e44ad':'#7f8c8d',
                        cursor:'pointer', fontSize:15, transition:'0.2s'
                    }}
                >
                    📷 Carica Bolla (AI Scanner)
                </button>
            </div>

            {/* CONTENT AREA */}
            <div style={{flex:1, padding:20, overflowY:'auto'}}>
                {tab === 'stock' && (
                    <StockTable API_URL={API_URL} ristoranteId={ristorante.id} />
                )}
                
                {tab === 'scanner' && (
                    <ScannerBolla API_URL={API_URL} ristoranteId={ristorante.id} />
                )}
            </div>
        </div>
    );
}

// STYLES
const btnHeader = {
    background:'rgba(255,255,255,0.2)', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold', fontSize:'0.9rem'
};

export default Magazzino;