import { useState, useEffect } from 'react';

function AdminSicurezza({ user, API_URL }) {
const [passwords, setPasswords] = useState({ pw_cassa: '', pw_cucina: '', pw_pizzeria: '', pw_bar: '', pw_haccp: '' }); // <--- AGGIUNTO

    useEffect(() => {
        fetch(`${API_URL}/api/ristorante/config/${user.id}`)
            .then(r => r.json())
            .then(data => {
                setPasswords({
                    pw_cassa: data.pw_cassa || '1234',
                    pw_cucina: data.pw_cucina || '1234',
                    pw_pizzeria: data.pw_pizzeria || '1234',
                    pw_bar: data.pw_bar || '1234',
                    pw_haccp: data.pw_haccp || '1234'
                });
            });
    }, [user.id]);

    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/ristorante/security/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwords)
            });
            alert("✅ Password Reparti Aggiornate!");
        } catch (e) { alert("Errore"); }
    };

    const rowStyle = { marginBottom: 15, padding: 10, background: '#f9f9f9', borderRadius: 5, border: '1px solid #ddd' };
    const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: 5, color: '#333' };
    const inputStyle = { width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', fontSize: '16px' };

    return (
        <div className="card">
            <h3>🔐 Gestione Accessi Staff</h3>
            <p style={{fontSize:'0.9rem', color:'#666', marginBottom:20}}>Imposta qui le password che i tuoi dipendenti useranno per accedere ai loro reparti.</p>
            
            <div style={rowStyle}>
                <label style={labelStyle}>💰 Password CASSA</label>
                <input type="text" value={passwords.pw_cassa} onChange={e => setPasswords({...passwords, pw_cassa: e.target.value})} style={inputStyle} />
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>👨‍🍳 Password CUCINA</label>
                <input type="text" value={passwords.pw_cucina} onChange={e => setPasswords({...passwords, pw_cucina: e.target.value})} style={inputStyle} />
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>🍕 Password PIZZERIA</label>
                <input type="text" value={passwords.pw_pizzeria} onChange={e => setPasswords({...passwords, pw_pizzeria: e.target.value})} style={inputStyle} />
            </div>

            <div style={rowStyle}>
                <label style={labelStyle}>🍹 Password BAR</label>
                <input type="text" value={passwords.pw_bar} onChange={e => setPasswords({...passwords, pw_bar: e.target.value})} style={inputStyle} />
            </div>

            <div style={rowStyle}>
    <label style={labelStyle}>🛡️ Password HACCP (Admin/Controllo)</label>
    <input type="text" value={passwords.pw_haccp} onChange={e => setPasswords({...passwords, pw_haccp: e.target.value})} style={inputStyle} />
</div>

            <button onClick={handleSave} className="btn-invia" style={{width:'100%', marginTop:10, background:'#2c3e50'}}>SALVA PASSWORD</button>
        </div>
    );
}

export default AdminSicurezza;