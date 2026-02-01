// client/src/features/haccp/Haccp.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config';

import Temperature from './components/Temperature';
import Assets from './components/Assets';
import Etichette from './components/Etichette';

export default function Haccp() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [ristorante, setRistorante] = useState(null);
    const [tab, setTab] = useState('temp'); // temp, assets, labels
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verifica Autenticazione (Semplificata, controlla se user esiste)
        const user = localStorage.getItem("stark_user");
        if(!user) { navigate('/login'); return; }

        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(d => {
                setRistorante(d);
                setLoading(false);
            })
            .catch(e => console.error(e));
    }, [slug, navigate]);

    if(loading) return <div style={{padding:20}}>Caricamento HACCP...</div>;

    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', flexDirection:'column'}}>
            {/* HEADER */}
            <div style={{background:'#2c3e50', padding:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h1 style={{margin:0}}>🛡️ HACCP: {ristorante.ristorante}</h1>
                <button onClick={()=>navigate(`/admin/${slug}`)} style={{background:'rgba(255,255,255,0.2)', color:'white', border:'none', padding:'10px 20px', cursor:'pointer'}}>Torna Admin</button>
            </div>

            {/* TABS */}
            <div style={{display:'flex', background:'white', borderBottom:'1px solid #ddd'}}>
                <TabButton label="🌡️ Registro Temperature" active={tab==='temp'} onClick={()=>setTab('temp')} />
                <TabButton label="🏷️ Etichette Scadenza" active={tab==='labels'} onClick={()=>setTab('labels')} />
                <TabButton label="⚙️ Macchinari" active={tab==='assets'} onClick={()=>setTab('assets')} />
            </div>

            {/* CONTENT */}
            <div style={{flex:1}}>
                {tab === 'temp' && <Temperature API_URL={API_URL} ristoranteId={ristorante.id} />}
                {tab === 'labels' && <Etichette API_URL={API_URL} ristoranteId={ristorante.id} />}
                {tab === 'assets' && <Assets API_URL={API_URL} ristoranteId={ristorante.id} />}
            </div>
        </div>
    );
}

const TabButton = ({ label, active, onClick }) => (
    <button 
        onClick={onClick}
        style={{
            padding:'15px 30px', 
            background: active ? '#ecf0f1' : 'white',
            border:'none', 
            borderBottom: active ? '3px solid #e67e22' : 'none',
            fontWeight: active ? 'bold' : 'normal',
            cursor:'pointer',
            fontSize:16
        }}
    >
        {label}
    </button>
);