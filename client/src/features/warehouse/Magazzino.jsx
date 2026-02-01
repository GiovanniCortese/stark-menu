// client/src/features/warehouse/Magazzino.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config';

import StockTable from './components/StockTable';
import ScannerBolla from './components/ScannerBolla';

export default function Magazzino() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [ristorante, setRistorante] = useState(null);
    const [tab, setTab] = useState('stock'); // 'stock' | 'scanner'

    useEffect(() => {
        // Auth check semplice
        const user = localStorage.getItem("stark_user");
        if(!user) { navigate('/login'); return; }

        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(setRistorante)
            .catch(console.error);
    }, [slug]);

    if(!ristorante) return <div style={{padding:20}}>Caricamento Magazzino...</div>;

    return (
        <div style={{minHeight:'100vh', background:'#f4f6f7', display:'flex', flexDirection:'column'}}>
            {/* HEADER */}
            <div style={{background:'#8e44ad', padding:20, color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h1 style={{margin:0}}>📦 Magazzino: {ristorante.ristorante}</h1>
                <button onClick={()=>navigate(`/admin/${slug}`)} style={{background:'rgba(255,255,255,0.2)', color:'white', border:'none', padding:'10px 20px', cursor:'pointer'}}>Torna Admin</button>
            </div>

            {/* TABS */}
            <div style={{display:'flex', background:'white', borderBottom:'1px solid #ddd'}}>
                <button 
                    onClick={()=>setTab('stock')}
                    style={{padding:'15px 30px', background: tab==='stock'?'#ecf0f1':'white', border:'none', borderBottom: tab==='stock'?'3px solid #8e44ad':'none', fontWeight:'bold', cursor:'pointer', fontSize:16}}
                >
                    📦 Giacenze Attuali
                </button>
                <button 
                    onClick={()=>setTab('scanner')}
                    style={{padding:'15px 30px', background: tab==='scanner'?'#ecf0f1':'white', border:'none', borderBottom: tab==='scanner'?'3px solid #8e44ad':'none', fontWeight:'bold', cursor:'pointer', fontSize:16}}
                >
                    📷 Carica Bolla (AI)
                </button>
            </div>

            {/* CONTENT */}
            <div style={{flex:1}}>
                {tab === 'stock' && <StockTable API_URL={API_URL} ristoranteId={ristorante.id} />}
                {tab === 'scanner' && <ScannerBolla API_URL={API_URL} ristoranteId={ristorante.id} onImportSuccess={()=>setTab('stock')} />}
            </div>
        </div>
    );
}