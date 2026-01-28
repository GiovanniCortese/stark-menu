// client/src/Magazzino.jsx - VERSIONE V6 (MODULE PROTECTION) 📦
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// IMPORTA IL MANAGER (Assicurati che il percorso sia corretto)
import MagazzinoManager from './components/magazzino/MagazzinoManager'; 

function Magazzino() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const API_URL = "https://stark-backend-gg17.onrender.com"; 

    // --- STATI ---
    const [infoRistorante, setInfoRistorante] = useState(null);
    const [authorized, setAuthorized] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    // STATO DI BLOCCO MODULO
    const [isModuleDisabled, setIsModuleDisabled] = useState(false);

    useEffect(() => {
        // Scarica info ristorante (ID e Nome)
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => {
                setInfoRistorante(data);

                // --- 🔒 CONTROLLO DI SICUREZZA: MODULO ATTIVO? ---
                // Se il modulo magazzino è false, blocchiamo tutto.
                if (data.moduli && data.moduli.magazzino === false) {
                    setIsModuleDisabled(true);
                }
            })
            .catch(err => console.error("Errore recupero dati:", err));

        // Controlla sessione esistente
        if (localStorage.getItem(`magazzino_auth_${slug}`) === "true") {
            setAuthorized(true);
        }
    }, [slug]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/station`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ristorante_id: infoRistorante.id, 
                    role: 'magazzino', 
                    password: password 
                })
            });
            
            const data = await res.json();

            if (data.success) {
                setAuthorized(true);
                localStorage.setItem(`magazzino_auth_${slug}`, "true");
            } else {
                setError(data.error || "Password errata");
            }
        } catch (err) {
            setError("Errore di connessione al server");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if(window.confirm("Uscire dal Magazzino?")) {
            localStorage.removeItem(`magazzino_auth_${slug}`);
            setAuthorized(false);
            setPassword("");
        }
    };

    // --- BLOCCO 1: MODULO NON ATTIVO ---
    if (isModuleDisabled) {
        return (
            <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', flexDirection:'column', padding:'20px', textAlign:'center', background:'#ecf0f1', color:'#2c3e50'}}>
                <h1 style={{fontSize:'4rem', margin:0}}>⛔</h1>
                <h2 style={{color:'#8e44ad', textTransform:'uppercase'}}>MAGAZZINO NON ATTIVO</h2>
                <p style={{fontSize:'1.2rem', opacity:0.8}}>La gestione magazzino è disabilitata per questo locale.</p>
                <button onClick={() => navigate('/')} style={{marginTop:20, padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>Torna alla Home</button>
            </div>
        );
    }

    // --- BLOCCO 2: CARICAMENTO ---
    if (!infoRistorante) return (
        <div style={{padding:20, color:'#7f8c8d', background:'#ecf0f1', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem'}}>
            ⏳ Caricamento Magazzino...
        </div>
    );

    // --- BLOCCO 3: SCHERMATA LOGIN ---
    if (!authorized) {
        return (
            <div style={{minHeight:'100vh', background:'#2c3e50', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div style={{background:'white', padding:40, borderRadius:15, textAlign:'center', width:'90%', maxWidth:'400px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)'}}>
                    <div style={{fontSize:'3rem', marginBottom:10}}>📦</div>
                    <h2 style={{margin:0, color:'#2c3e50'}}>Accesso Magazzino</h2>
                    <p style={{color:'#7f8c8d'}}>{infoRistorante.ristorante}</p>
                    
                    <form onSubmit={handleLogin} style={{marginTop:30, display:'flex', flexDirection:'column', gap:15}}>
                        <input 
                            type="password" 
                            placeholder="Password Reparto" 
                            value={password} 
                            onChange={e=>setPassword(e.target.value)} 
                            autoFocus
                            style={{padding:15, borderRadius:8, border:'1px solid #ddd', fontSize:'16px', outline:'none', textAlign:'center'}}
                        />
                        
                        {error && <div style={{color:'#e74c3c', fontWeight:'bold', fontSize:'0.9rem'}}>⚠️ {error}</div>}
                        
                        <button disabled={loading} style={{padding:15, background:'#8e44ad', color:'white', border:'none', borderRadius:8, fontSize:'16px', fontWeight:'bold', cursor:'pointer', opacity: loading ? 0.7 : 1}}>
                            {loading ? "Verifica..." : "ACCEDI"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- BLOCCO 4: APPLICAZIONE MAGAZZINO ---
    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1'}}>
            {/* Header */}
            <div style={{background:'#2c3e50', padding:'10px 20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <span style={{fontSize:'1.8rem'}}>📦</span>
                    <div>
                        <h2 style={{margin:0, fontSize:'1.2rem'}}>Magazzino</h2>
                        <span style={{fontSize:'0.8rem', opacity:0.8}}>{infoRistorante.ristorante}</span>
                    </div>
                </div>
                <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>
                    ESCI
                </button>
            </div>
            
            {/* Passiamo 'infoRistorante' come user perché contiene l'ID necessario */}
            <MagazzinoManager 
                user={infoRistorante} 
                API_URL={API_URL}
            />
        </div>
    );
}

export default Magazzino;