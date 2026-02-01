// client/src/features/public-menu/BookingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config'; // Import corretto

const BookingPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    // Stati
    const [ristorante, setRistorante] = useState(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        data: new Date().toISOString().split('T')[0],
        ora: '20:00',
        persone: 2,
        nome: '',
        telefono: '',
        note: ''
    });

    useEffect(() => {
        fetch(`${API_URL}/api/menu/${slug}`)
            .then(r => r.json())
            .then(data => setRistorante(data))
            .catch(console.error);
    }, [slug]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ristorante) return;

        try {
            const res = await fetch(`${API_URL}/api/prenotazioni`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...formData,
                    ristorante_id: ristorante.id
                })
            });
            const data = await res.json();
            if (data.success) {
                setStep(2); // Successo
            } else {
                alert("Errore: " + data.error);
            }
        } catch (err) {
            alert("Errore di connessione");
        }
    };

    if (!ristorante) return <div style={{padding:20}}>Caricamento...</div>;

    const styleInput = { width:'100%', padding:12, marginBottom:15, borderRadius:8, border:'1px solid #ddd' };

    return (
        <div style={{minHeight:'100vh', background:'#f4f4f4', display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div style={{background:'white', maxWidth:500, width:'100%', padding:30, borderRadius:15, boxShadow:'0 5px 20px rgba(0,0,0,0.1)'}}>
                
                {step === 1 && (
                    <form onSubmit={handleSubmit}>
                        <h2 style={{color:'#2c3e50', marginTop:0}}>Prenota da {ristorante.nome}</h2>
                        
                        <label>Quando?</label>
                        <div style={{display:'flex', gap:10}}>
                            <input type="date" required value={formData.data} onChange={e=>setFormData({...formData, data:e.target.value})} style={styleInput} />
                            <input type="time" required value={formData.ora} onChange={e=>setFormData({...formData, ora:e.target.value})} style={styleInput} />
                        </div>

                        <label>Quante persone?</label>
                        <input type="number" min="1" required value={formData.persone} onChange={e=>setFormData({...formData, persone:e.target.value})} style={styleInput} />

                        <label>I tuoi dati</label>
                        <input type="text" placeholder="Nome e Cognome" required value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} style={styleInput} />
                        <input type="tel" placeholder="Telefono (per conferma WhatsApp)" required value={formData.telefono} onChange={e=>setFormData({...formData, telefono:e.target.value})} style={styleInput} />
                        
                        <textarea placeholder="Allergie o richieste particolari?" value={formData.note} onChange={e=>setFormData({...formData, note:e.target.value})} style={{...styleInput, height:80}}></textarea>

                        <button type="submit" style={{width:'100%', padding:15, background:'#27ae60', color:'white', border:'none', borderRadius:8, fontSize:18, fontWeight:'bold', cursor:'pointer'}}>
                            CONFERMA PRENOTAZIONE
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:60}}>🎉</div>
                        <h2 style={{color:'#27ae60'}}>Prenotazione Inviata!</h2>
                        <p>Grazie <b>{formData.nome}</b>.</p>
                        <p>Riceverai a breve una conferma su WhatsApp al numero {formData.telefono}.</p>
                        <button onClick={()=>navigate(`/${slug}`)} style={{marginTop:20, padding:'10px 20px', background:'#34495e', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>
                            Torna al Menu
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default BookingPage;