// client/src/components_admin/AdminSicurezza.jsx - REDESIGN GRAFICO
import { useState, useEffect } from 'react';

function AdminSicurezza({ user, API_URL }) {
    const [passwords, setPasswords] = useState({ pw_cassa: '', pw_cucina: '', pw_pizzeria: '', pw_bar: '', pw_haccp: '', pw_magazzino: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/ristorante/config/${user.id}`)
            .then(r => r.json())
            .then(data => {
                setPasswords({
                    pw_cassa: data.pw_cassa || '1234',
                    pw_cucina: data.pw_cucina || '1234',
                    pw_pizzeria: data.pw_pizzeria || '1234',
                    pw_bar: data.pw_bar || '1234',
                    pw_haccp: data.pw_haccp || '1234',
                    pw_magazzino: data.pw_magazzino || '1234'
                });
                setLoading(false);
            });
    }, [user.id]);

    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/ristorante/security/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwords) });
            alert("✅ Password Reparti Aggiornate con successo!");
        } catch (e) { alert("Errore connessione"); }
    };

    const SecurityCard = ({ title, icon, field, color }) => (
        <div style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '5px'}}>
                <div style={{background: color, width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white'}}>
                    {icon}
                </div>
                <div>
                    <h4 style={{margin: 0, color: '#333'}}>{title}</h4>
                    <span style={{fontSize: '11px', color: '#888'}}>Codice accesso</span>
                </div>
            </div>
            <input 
                type="text" 
                value={passwords[field]} 
                onChange={e => setPasswords({...passwords, [field]: e.target.value})} 
                style={{width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #f0f0f0', fontSize: '18px', textAlign: 'center', fontWeight: 'bold', color: '#333', letterSpacing: '2px', outline: 'none', background:'#fafafa', boxSizing:'border-box'}}
            />
        </div>
    );

    if (loading) return <div>Caricamento sicurezza...</div>;

    return (
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
            <div style={{textAlign: 'center', marginBottom: '40px'}}>
                <h2 style={{fontSize: '2rem', marginBottom: '10px', color: '#2c3e50'}}>🔐 Centro Sicurezza & Accessi</h2>
                <p style={{color: '#7f8c8d'}}>Gestisci i codici PIN per permettere al tuo staff di accedere ai vari reparti.</p>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px'}}>
                <SecurityCard title="Reparto Cassa" icon="💰" field="pw_cassa" color="#9b59b6" />
                <SecurityCard title="Reparto Cucina" icon="👨‍🍳" field="pw_cucina" color="#e67e22" />
                <SecurityCard title="Reparto Pizzeria" icon="🍕" field="pw_pizzeria" color="#c0392b" />
                <SecurityCard title="Reparto Bar" icon="🍹" field="pw_bar" color="#1abc9c" />
                <SecurityCard title="Admin HACCP" icon="🛡️" field="pw_haccp" color="#34495e" />
                <SecurityCard title="Responsabile Magazzino" icon="📦" field="pw_magazzino" color="#8e44ad" />
            </div>

            <button onClick={handleSave} style={{display: 'block', width: '100%', maxWidth: '400px', margin: '0 auto', padding: '18px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(44, 62, 80, 0.3)', transform: 'scale(1)', transition: 'transform 0.2s'}}>
                💾 SALVA TUTTE LE PASSWORD
            </button>
        </div>
    );
}

export default AdminSicurezza;