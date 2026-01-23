import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API_URL from './config'; 

// IMPORTA IL NUOVO MANAGER DALLA CARTELLA GIUSTA
import MagazzinoManager from './components/magazzino/MagazzinoManager'; 

function Magazzino() {
    const { slug } = useParams();
    const [infoRistorante, setInfoRistorante] = useState(null);
    const [authorized, setAuthorized] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Scarica info ristorante (ID e Nome)
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => setInfoRistorante(data))
            .catch(err => console.error("Errore recupero ID", err));

        // Controlla sessione
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
        localStorage.removeItem(`magazzino_auth_${slug}`);
        setAuthorized(false);
        setPassword("");
    };

    if (!infoRistorante) return <div style={{padding:20, color:'white', background:'#2c3e50', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Caricamento...</div>;

    // --- SCHERMATA LOGIN ---
    if (!authorized) {
        return (
            <div style={{minHeight:'100vh', background:'#2c3e50', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div style={{background:'white', padding:40, borderRadius:15, textAlign:'center', width:'90%', maxWidth:'400px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)'}}>
                    <div style={{fontSize:'3rem', marginBottom:10}}>📦</div>
                    <h2 style={{margin:0, color:'#2c3e50'}}>Magazzino</h2>
                    <p style={{color:'#7f8c8d'}}>{infoRistorante.ristorante}</p>
                    
                    <form onSubmit={handleLogin} style={{marginTop:30, display:'flex', flexDirection:'column', gap:15}}>
                        <input 
                            type="password" 
                            placeholder="Password Reparto" 
                            value={password} 
                            onChange={e=>setPassword(e.target.value)} 
                            style={{padding:15, borderRadius:8, border:'1px solid #ddd', fontSize:'16px', outline:'none', textAlign:'center'}}
                        />
                        
                        {error && <div style={{color:'#e74c3c', fontWeight:'bold', fontSize:'0.9rem'}}>{error}</div>}
                        
                        <button disabled={loading} style={{padding:15, background:'#3498db', color:'white', border:'none', borderRadius:8, fontSize:'16px', fontWeight:'bold', cursor:'pointer', opacity: loading ? 0.7 : 1}}>
                            {loading ? "Verifica..." : "ACCEDI"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- APPLICAZIONE MAGAZZINO ---
    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1'}}>
            {/* Header */}
            <div style={{background:'#2c3e50', padding:'10px 20px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <span style={{fontSize:'1.5rem'}}>📦</span>
                    <span style={{fontWeight:'bold'}}>{infoRistorante.ristorante}</span>
                </div>
                <button onClick={handleLogout} style={{background:'#c0392b', color:'white', padding:'8px 15px', borderRadius:5, border:'none', cursor:'pointer', fontWeight:'bold'}}>
                    ESCI 🔒
                </button>
            </div>
            
            {/* IMPORTANTE: Qui passiamo 'user' che contiene l'ID del ristorante.
                MagazzinoManager usa user.id per le chiamate API.
                Quindi trucchiamo passando infoRistorante come se fosse l'user.
            */}
            <MagazzinoManager 
                user={infoRistorante} 
                API_URL={API_URL}
            />
        </div>
    );
}

export default Magazzino;