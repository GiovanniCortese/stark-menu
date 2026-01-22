import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// Assicurati che il percorso punti a DOVE si trova MerciManager
import MerciManager from './components/haccp/MerciManager'; 

function Magazzino() {
    const { slug } = useParams();
    const [authorized, setAuthorized] = useState(false);
    const [password, setPassword] = useState("");
    const [ristoranteId, setRistoranteId] = useState(null);
    // IMPORTANTE: URL del backend (Render)
    const API_URL = "https://stark-backend-gg17.onrender.com"; 

    useEffect(() => {
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => setRistoranteId(data.id))
            .catch(err => console.error("Errore recupero ID", err));

        if (localStorage.getItem(`magazzino_auth_${slug}`) === "true") {
            setAuthorized(true);
        }
    }, [slug]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === "1234" || password === "admin") {
            setAuthorized(true);
            localStorage.setItem(`magazzino_auth_${slug}`, "true");
        } else {
            alert("Password Errata");
        }
    };

    if (!ristoranteId) return <div style={{padding:20, color:'white', background:'#2c3e50', minHeight:'100vh'}}>Caricamento Ristorante...</div>;

    if (!authorized) {
        return (
            <div style={{minHeight:'100vh', background:'#2c3e50', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}>
                    <h2>📦 Magazzino Centrale</h2>
                    <form onSubmit={handleLogin} style={{marginTop:20, display:'flex', flexDirection:'column', gap:10}}>
                        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:10}}/>
                        <button style={{padding:10, background:'#3498db', color:'white', border:'none'}}>ENTRA</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1'}}>
            <div style={{background:'#2c3e50', padding:'15px', color:'white', display:'flex', justifyContent:'space-between'}}>
                <h1 style={{fontSize:'1.2rem', margin:0}}>📦 Magazzino Generale</h1>
                <button onClick={() => { localStorage.removeItem(`magazzino_auth_${slug}`); setAuthorized(false); }}>ESCI</button>
            </div>
            {/* COMPONENTE INTELLIGENTE */}
            <MerciManager 
                ristoranteId={ristoranteId} 
                mode="all" 
                title="Gestione Completa Stock (Tutti i reparti)" 
                showHaccpToggle={true} 
                API_URL={API_URL}
            />
        </div>
    );
}

export default Magazzino;