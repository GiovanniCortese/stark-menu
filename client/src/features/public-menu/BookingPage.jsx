// client/src/features/public-menu/BookingPage.jsx - VERSIONE V107 (MAPPA INTERATTIVA & SMART FLOW) 📅
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config';

const BookingPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    // --- STATI DATI ---
    const [ristorante, setRistorante] = useState(null);
    const [layout, setLayout] = useState([]);
    const [bookings, setBookings] = useState([]); // Prenotazioni esistenti per check disponibilità
    const [loading, setLoading] = useState(true);

    // --- STATI FLUSSO ---
    const [step, setStep] = useState(1); // 1: Data/Persone -> 2: Tavolo (Opzionale) -> 3: Dati -> 4: Fine
    const [formData, setFormData] = useState({
        data: new Date().toISOString().split('T')[0],
        ora: '20:00',
        persone: 2,
        tavolo_id: null,
        tavolo_label: '', // Per visualizzazione
        nome: '',
        telefono: '',
        note: ''
    });

    // 1. CARICAMENTO INFO RISTORANTE & LAYOUT
    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/api/menu/${slug}`);
                const data = await res.json();
                setRistorante(data);
                
                // Gestione Layout Sala (se esiste)
                if (data.layout_sala) {
                    try {
                        // Se arriva come stringa JSON, parsalo, altrimenti usa diretto
                        const parsed = typeof data.layout_sala === 'string' ? JSON.parse(data.layout_sala) : data.layout_sala;
                        if(Array.isArray(parsed)) setLayout(parsed);
                    } catch (e) { console.error("Errore parsing layout", e); }
                }
                setLoading(false);
            } catch (err) { console.error(err); setLoading(false); }
        };
        fetchInfo();
    }, [slug]);

    // 2. CHECK DISPONIBILITÀ (Quando si cambia data/ora)
    useEffect(() => {
        if (!ristorante) return;
        // Carichiamo le prenotazioni per la data scelta per colorare la mappa
        fetch(`${API_URL}/api/prenotazioni/check?ristorante_id=${ristorante.id}&data=${formData.data}&ora=${formData.ora}`)
            .then(r => r.json())
            .then(data => setBookings(Array.isArray(data) ? data : []))
            .catch(e => console.error("Err check booking", e));
    }, [formData.data, formData.ora, ristorante]);

    // --- HANDLERS ---
    const handleNextStep = () => {
        // Se siamo allo step 1 e c'è un layout configurato, andiamo alla scelta tavolo (Step 2)
        // Altrimenti saltiamo direttamente ai dati (Step 3)
        if (step === 1) {
            if (layout.length > 0) setStep(2);
            else setStep(3);
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleTavoloSelect = (tavolo) => {
        // Verifica se occupato
        if (isTavoloOccupato(tavolo.id)) return; // O alert("Occupato")
        
        setFormData({
            ...formData, 
            tavolo_id: tavolo.id, 
            tavolo_label: tavolo.label || tavolo.numero 
        });
        setStep(3); // Vai ai dati
    };

    const isTavoloOccupato = (tId) => {
        // Logica semplice: se c'è una prenotazione su questo tavolo in questa data/ora
        // (Il backend dovrebbe fare controlli più fini sulla durata, qui è visuale)
        return bookings.some(b => b.tavolo_id === tId);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/prenotazioni`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...formData, ristorante_id: ristorante.id })
            });
            const data = await res.json();
            if (data.success) {
                setStep(4); // Successo
            } else {
                alert("Errore: " + (data.error || "Riprova"));
            }
        } catch (err) { alert("Errore di connessione"); }
    };

    if (loading) return <div style={{padding:20, textAlign:'center'}}>Caricamento...</div>;
    if (!ristorante) return <div style={{padding:20, textAlign:'center'}}>Ristorante non trovato.</div>;

    return (
        <div style={{minHeight:'100vh', background:'#ecf0f1', display:'flex', justifyContent:'center', padding:20, fontFamily:'sans-serif'}}>
            <div style={{width:'100%', maxWidth:'500px', background:'white', borderRadius:15, overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
                
                {/* HEADER */}
                <div style={{background: '#2c3e50', padding: 20, color: 'white', textAlign: 'center'}}>
                    <h2 style={{margin:0}}>📅 Prenota Tavolo</h2>
                    <p style={{margin:0, opacity:0.8}}>{ristorante.ristorante}</p>
                </div>

                {/* STEP 1: QUANDO & QUANTI */}
                {step === 1 && (
                    <div style={{padding:30}}>
                        <h3 style={{color:'#34495e', marginTop:0}}>Quando volete venire?</h3>
                        
                        <div style={inputGroup}>
                            <label>Data</label>
                            <input type="date" value={formData.data} onChange={e=>setFormData({...formData, data:e.target.value})} style={inputStyle} min={new Date().toISOString().split('T')[0]} />
                        </div>

                        <div style={{display:'flex', gap:15}}>
                            <div style={{...inputGroup, flex:1}}>
                                <label>Orario</label>
                                <select value={formData.ora} onChange={e=>setFormData({...formData, ora:e.target.value})} style={inputStyle}>
                                    <option>12:00</option><option>12:30</option><option>13:00</option><option>13:30</option><option>14:00</option>
                                    <option disabled>---</option>
                                    <option>19:00</option><option>19:30</option><option>20:00</option><option>20:30</option><option>21:00</option><option>21:30</option><option>22:00</option>
                                </select>
                            </div>
                            <div style={{...inputGroup, flex:1}}>
                                <label>Persone</label>
                                <select value={formData.persone} onChange={e=>setFormData({...formData, persone:e.target.value})} style={inputStyle}>
                                    {[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={handleNextStep} style={btnPrimary}>AVANTI ➡️</button>
                    </div>
                )}

                {/* STEP 2: SCELTA TAVOLO (Solo se layout esiste) */}
                {step === 2 && (
                    <div style={{padding:0, height:'100%', display:'flex', flexDirection:'column'}}>
                        <div style={{padding:'20px 20px 0', textAlign:'center'}}>
                            <h3 style={{margin:0, color:'#34495e'}}>Scegli il tuo tavolo</h3>
                            <p style={{fontSize:13, color:'#7f8c8d'}}>Clicca su un tavolo libero (Verde)</p>
                        </div>
                        
                        <div style={{position:'relative', width:'100%', height:'400px', background:'#ddd', overflow:'auto', marginTop:20, borderTop:'1px solid #ccc', borderBottom:'1px solid #ccc'}}>
                            {layout.map(t => {
                                const occupato = isTavoloOccupato(t.id);
                                return (
                                    <div 
                                        key={t.id}
                                        onClick={() => !occupato && handleTavoloSelect(t)}
                                        style={{
                                            position: 'absolute',
                                            left: t.x, top: t.y,
                                            width: t.width || (t.shape === 'rect' ? 80 : 60),
                                            height: t.height || 60,
                                            background: occupato ? '#e74c3c' : '#27ae60',
                                            color: 'white',
                                            borderRadius: t.shape === 'round' ? '50%' : '8px',
                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            cursor: occupato ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                            fontWeight: 'bold', fontSize: '0.8rem',
                                            border: '2px solid white'
                                        }}
                                    >
                                        {t.label || t.numero}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{padding:20, textAlign:'center'}}>
                            <button onClick={()=>setStep(3)} style={{background:'none', border:'none', textDecoration:'underline', cursor:'pointer', color:'#7f8c8d'}}>Non ho preferenze, scegli tu</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: DATI CONTATTO */}
                {step === 3 && (
                    <div style={{padding:30}}>
                        <h3 style={{color:'#34495e', marginTop:0}}>I tuoi dati</h3>
                        <p style={{background:'#eafaf1', padding:10, borderRadius:8, fontSize:13, color:'#27ae60'}}>
                            🗓️ {new Date(formData.data).toLocaleDateString()} ore {formData.ora} <br/>
                            👥 {formData.persone} Persone <br/>
                            {formData.tavolo_label && <span>📍 Tavolo: <b>{formData.tavolo_label}</b></span>}
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div style={inputGroup}>
                                <label>Nome Prenotazione</label>
                                <input required type="text" value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} style={inputStyle} placeholder="Es. Mario Rossi" />
                            </div>
                            <div style={inputGroup}>
                                <label>Telefono (WhatsApp)</label>
                                <input required type="tel" value={formData.telefono} onChange={e=>setFormData({...formData, telefono:e.target.value})} style={inputStyle} placeholder="Es. 3331234567" />
                            </div>
                            <div style={inputGroup}>
                                <label>Note / Allergie (Opzionale)</label>
                                <textarea value={formData.note} onChange={e=>setFormData({...formData, note:e.target.value})} style={{...inputStyle, height:80}} placeholder="Es. Seggiolone, Celiachia..." />
                            </div>

                            <div style={{display:'flex', gap:10, marginTop:20}}>
                                <button type="button" onClick={()=>setStep(prev => prev - (layout.length > 0 ? 1 : 2))} style={btnSecondary}>Indietro</button>
                                <button type="submit" style={btnPrimary}>CONFERMA ✅</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* STEP 4: SUCCESSO */}
                {step === 4 && (
                    <div style={{padding:50, textAlign:'center'}}>
                        <div style={{fontSize:60, marginBottom:20}}>🎉</div>
                        <h2 style={{color:'#27ae60', margin:0}}>Prenotazione Inviata!</h2>
                        <p style={{color:'#7f8c8d', marginTop:10}}>Grazie <b>{formData.nome}</b>.</p>
                        <p style={{fontSize:14}}>Riceverai a breve una conferma su WhatsApp al numero {formData.telefono}.</p>
                        
                        <div style={{marginTop:30}}>
                            <button onClick={()=>navigate(`/${slug}`)} style={btnSecondary}>Torna al Menu</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

// --- STYLES ---
const inputGroup = { marginBottom: 15 };
const inputStyle = { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' };
const btnPrimary = { width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: 10 };
const btnSecondary = { flex: 1, padding: '15px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: 8, fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' };

export default BookingPage;