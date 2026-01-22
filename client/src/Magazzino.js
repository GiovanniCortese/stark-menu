// client/src/Magazzino.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MerciManager from './MerciManager'; // Riutilizziamo il componente potente che hai già

function Magazzino() {
    const { slug } = useParams();
    const [authorized, setAuthorized] = useState(false);
    const [password, setPassword] = useState("");
    const [ristoranteId, setRistoranteId] = useState(null);
    const API_URL = "https://stark-backend-gg17.onrender.com";

    useEffect(() => {
        // Recupera ID ristorante dallo slug
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => setRistoranteId(data.id))
            .catch(err => console.error("Errore recupero ID", err));

        // Check sessione locale
        if (localStorage.getItem(`magazzino_auth_${slug}`) === "true") {
            setAuthorized(true);
        }
    }, [slug]);

    const handleLogin = (e) => {
        e.preventDefault();
        // Password semplice statica per demo, o usa API di verifica
        if (password === "1234" || password === "admin") {
            setAuthorized(true);
            localStorage.setItem(`magazzino_auth_${slug}`, "true");
        } else {
            alert("Password Errata");
        }
    };

    if (!ristoranteId) return <div style={{padding:20, color:'white'}}>Caricamento...</div>;

    if (!authorized) {
        return (
            <div style={{minHeight:'100vh', background:'#2c3e50', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div style={{background:'white', padding:40, borderRadius:10, textAlign:'center'}}>
                    <h2>📦 Accesso Magazzino Centrale</h2>
                    <p>Area riservata carico/scarico completo</p>
                    <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:10}}>
                        <input 
                            type="password" 
                            placeholder="Password Magazzino" 
                            value={password} 
                            onChange={e=>setPassword(e.target.value)}
                            style={{padding:10, borderRadius:5, border:'1px solid #ccc'}}
                        />
                        <button style={{padding:10, background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>ENTRA</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1'}}>
            <div style={{background:'#2c3e50', padding:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h1 style={{margin:0}}>📦 Magazzino Generale</h1>
                <button onClick={() => { localStorage.removeItem(`magazzino_auth_${slug}`); setAuthorized(false); }} style={{background:'transparent', border:'1px solid white', color:'white', padding:'5px 15px', borderRadius:20, cursor:'pointer'}}>ESCI</button>
            </div>
            
            {/* Passiamo mode="all" così MerciManager carica TUTTI i prodotti.
                Passiamo showHaccpToggle={true} così possiamo decidere cosa va in produzione.
            */}
            <MerciManager 
                ristoranteId={ristoranteId} 
                mode="all" 
                title="Gestione Completa Stock" 
                showHaccpToggle={true} 
            />
        </div>
    );
}

export default Magazzino;