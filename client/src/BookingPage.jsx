// client/src/BookingPage.jsx - VERSIONE V1 (PRENOTAZIONI PUBBLICHE) 📅
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const BookingPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const API_URL = "https://stark-backend-gg17.onrender.com";

    // Stati Dati
    const [ristorante, setRistorante] = useState(null);
    const [layout, setLayout] = useState([]);
    const [bookings, setBookings] = useState([]);
    
    // Stati Form
    const [step, setStep] = useState(1); // 1: Data/Persone, 2: Tavolo, 3: Dati, 4: Successo
    const [formData, setFormData] = useState({
        data: new Date().toISOString().split('T')[0],
        ora: '20:00',
        persone: 2,
        tavolo_id: null,
        tavolo_label: '',
        nome: '',
        telefono: '',
        note: ''
    });

    const [loading, setLoading] = useState(true);

    // 1. Carica Info Ristorante
    useEffect(() => {
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => {
                setRistorante(data);
                if (data.layout_sala) {
                    try {
                        const parsed = typeof data.layout_sala === 'string' ? JSON.parse(data.layout_sala) : data.layout_sala;
                        setLayout(Array.isArray(parsed) ? parsed : []);
                    } catch(e) { setLayout([]); }
                }
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, [slug]);

    // 2. Carica Prenotazioni Esistenti (quando cambia data o step)
    useEffect(() => {
        if (ristorante && step === 2) {
            fetch(`${API_URL}/api/prenotazioni/${ristorante.id}?date=${formData.data}`)
                .then(r => r.json())
                .then(data => setBookings(Array.isArray(data) ? data : []));
        }
    }, [step, formData.data, ristorante]);

    // Handlers
    const handleNext = () => {
        if(step === 1 && (!formData.data || !formData.ora)) return alert("Seleziona data e ora");
        setStep(step + 1);
    };

    const handleTableSelect = (tavolo) => {
        // Verifica se occupato
        const isOccupied = bookings.some(b => b.tavolo_id === tavolo.label);
        if (isOccupied) return alert("Questo tavolo è già prenotato per questa data.");
        
        setFormData({ ...formData, tavolo_id: tavolo.id, tavolo_label: tavolo.label });
        setStep(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/prenotazioni`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ristorante_id: ristorante.id,
                    cliente_nome: formData.nome,
                    cliente_telefono: formData.telefono,
                    data_prenotazione: formData.data,
                    ora_prenotazione: formData.ora,
                    persone: formData.persone,
                    tavolo_id: formData.tavolo_label, // Salviamo la label (es. "Tavolo 1")
                    note: formData.note
                })
            });
            const data = await res.json();
            if(data.success) {
                setStep(4);
            } else {
                alert("Errore prenotazione: " + data.error);
            }
        } catch(e) { alert("Errore di connessione"); }
    };

    if (loading) return <div style={{padding:20, textAlign:'center'}}>Caricamento...</div>;
    if (!ristorante) return <div style={{padding:20, textAlign:'center'}}>Ristorante non trovato</div>;

    // STILI
    const containerStyle = { maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', minHeight:'100vh', background:'#f8f9fa' };
    const cardStyle = { background: 'white', padding: 30, borderRadius: 15, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
    const titleStyle = { color: '#2c3e50', textAlign: 'center', marginTop: 0 };
    const labelStyle = { display:'block', marginBottom:5, fontWeight:'bold', color:'#555', fontSize:14 };
    const inputStyle = { width:'100%', padding:12, borderRadius:8, border:'1px solid #ddd', marginBottom:15, fontSize:16, boxSizing:'border-box' };
    const btnStyle = { width:'100%', padding:15, background:'#e67e22', color:'white', border:'none', borderRadius:8, fontSize:18, fontWeight:'bold', cursor:'pointer' };

    return (
        <div style={containerStyle}>
            <div style={{textAlign:'center', marginBottom:20}}>
                {ristorante?.style?.logo && <img src={ristorante.style.logo} alt="logo" style={{height:60, marginBottom:10}} />}
                <h2 style={{margin:0, color:'#2c3e50'}}>Prenota un Tavolo</h2>
                <p style={{margin:0, color:'#7f8c8d'}}>presso {ristorante.ristorante}</p>
            </div>

            {/* STEP 1: DATA, ORA, PERSONE */}
            {step === 1 && (
                <div style={cardStyle}>
                    <label style={labelStyle}>📅 DATA</label>
                    <input type="date" value={formData.data} onChange={e=>setFormData({...formData, data:e.target.value})} style={inputStyle} min={new Date().toISOString().split('T')[0]} />
                    
                    <div style={{display:'flex', gap:10}}>
                        <div style={{flex:1}}>
                            <label style={labelStyle}>🕗 ORA</label>
                            <input type="time" value={formData.ora} onChange={e=>setFormData({...formData, ora:e.target.value})} style={inputStyle} />
                        </div>
                        <div style={{flex:1}}>
                            <label style={labelStyle}>👥 PERSONE</label>
                            <input type="number" min="1" value={formData.persone} onChange={e=>setFormData({...formData, persone:e.target.value})} style={inputStyle} />
                        </div>
                    </div>

                    <button onClick={handleNext} style={btnStyle}>AVANTI ➜</button>
                </div>
            )}

            {/* STEP 2: SCELTA TAVOLO (MAPPA) */}
            {step === 2 && (
                <div style={cardStyle}>
                    <h3 style={titleStyle}>Scegli il tuo posto</h3>
                    <p style={{textAlign:'center', fontSize:12, color:'#666', marginTop:-10}}>Verde = Libero • Rosso = Occupato</p>
                    
                    <div style={{
                        width: '100%', height: 400, background: '#e0e0e0', 
                        position: 'relative', borderRadius: 10, overflow: 'auto',
                        border: '2px solid #bdc3c7', marginTop:20, marginBottom:20
                    }}>
                        {layout.length === 0 && <p style={{textAlign:'center', paddingTop:150}}>Nessuna mappa disponibile.</p>}
                        
                        {layout.map(t => {
                            const isOccupied = bookings.some(b => b.tavolo_id === t.label);
                            return (
                                <div key={t.id} onClick={() => handleTableSelect(t)}
                                     style={{
                                         position: 'absolute', left: t.x, top: t.y,
                                         width: t.shape === 'rect' ? 80 : 50, height: 50,
                                         borderRadius: t.shape === 'round' ? '50%' : '8px',
                                         background: isOccupied ? '#e74c3c' : '#2ecc71',
                                         border: '2px solid white',
                                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                                         color: 'white', fontWeight: 'bold', fontSize: 10, cursor: 'pointer',
                                         boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                     }}>
                                    {t.label}
                                </div>
                            );
                        })}
                    </div>
                    
                    <button onClick={()=>setStep(1)} style={{...btnStyle, background:'#95a5a6'}}>⬅ INDIETRO</button>
                    {layout.length === 0 && (
                        <button onClick={()=>setStep(3)} style={{...btnStyle, marginTop:10}}>SALTA SELEZIONE TAVOLO</button>
                    )}
                </div>
            )}

            {/* STEP 3: DATI CLIENTE */}
            {step === 3 && (
                <div style={cardStyle}>
                    <h3 style={titleStyle}>I tuoi dati</h3>
                    <p style={{textAlign:'center', marginBottom:20}}>Prenotazione per il <b>{formData.tavolo_label || "Tavolo non specificato"}</b></p>
                    
                    <form onSubmit={handleSubmit}>
                        <label style={labelStyle}>NOME COMPLETO *</label>
                        <input required placeholder="Mario Rossi" value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} style={inputStyle} />
                        
                        <label style={labelStyle}>TELEFONO *</label>
                        <input required placeholder="333 1234567" type="tel" value={formData.telefono} onChange={e=>setFormData({...formData, telefono:e.target.value})} style={inputStyle} />
                        
                        <label style={labelStyle}>NOTE / ALLERGIE</label>
                        <textarea placeholder="Es. Seggiolone, Celiachia..." value={formData.note} onChange={e=>setFormData({...formData, note:e.target.value})} style={{...inputStyle, height:80}} />

                        <div style={{display:'flex', gap:10}}>
                            <button type="button" onClick={()=>setStep(2)} style={{flex:1, padding:15, background:'#95a5a6', color:'white', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer'}}>INDIETRO</button>
                            <button type="submit" style={{flex:2, padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:8, fontSize:16, fontWeight:'bold', cursor:'pointer'}}>CONFERMA ✅</button>
                        </div>
                    </form>
                </div>
            )}

            {/* STEP 4: SUCCESSO */}
            {step === 4 && (
                <div style={{...cardStyle, textAlign:'center', padding:50}}>
                    <div style={{fontSize:60, marginBottom:20}}>🎉</div>
                    <h2 style={{color:'#27ae60'}}>Prenotazione Confermata!</h2>
                    <p>Grazie <b>{formData.nome}</b>, ti aspettiamo.</p>
                    <div style={{background:'#f9f9f9', padding:15, borderRadius:10, margin:'20px 0', textAlign:'left'}}>
                        <div>📅 Data: <b>{new Date(formData.data).toLocaleDateString()}</b></div>
                        <div>🕗 Ora: <b>{formData.ora}</b></div>
                        <div>👥 Persone: <b>{formData.persone}</b></div>
                        <div>📍 Tavolo: <b>{formData.tavolo_label || "Assegnato all'arrivo"}</b></div>
                    </div>
                    <button onClick={()=>navigate(`/${slug}`)} style={btnStyle}>VAI AL MENU</button>
                </div>
            )}
        </div>
    );
};

export default BookingPage;