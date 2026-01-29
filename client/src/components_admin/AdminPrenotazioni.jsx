// client/src/components_admin/AdminPrenotazioni.jsx
import React, { useState, useEffect } from 'react';

const AdminPrenotazioni = ({ user, config, API_URL }) => {
    // Helper date
    const getToday = () => new Date().toISOString().split('T')[0];
    
    // Stati
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [bookings, setBookings] = useState([]);
    const [layoutSala, setLayoutSala] = useState([]);
    const [showModal, setShowModal] = useState(false);
    
    // Form Dati
    const [formData, setFormData] = useState({
        cliente_nome: '', cliente_telefono: '',
        ora_prenotazione: '20:00', persone: 2,
        tavolo_id: '', note: ''
    });

    // 1. Carica Layout e Prenotazioni
    useEffect(() => {
        // Layout
        if (config.layout_sala) {
            try {
                const parsed = typeof config.layout_sala === 'string' ? JSON.parse(config.layout_sala) : config.layout_sala;
                setLayoutSala(Array.isArray(parsed) ? parsed : []);
            } catch(e) { setLayoutSala([]); }
        }
        
        // Prenotazioni
        fetchBookings();
    }, [config, selectedDate, user.id]);

    const fetchBookings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/prenotazioni/${user.id}?date=${selectedDate}`);
            const data = await res.json();
            setBookings(Array.isArray(data) ? data : []);
        } catch(e) { console.error("Err bookings", e); }
    };

    // 2. Gestione Click Tavolo
    const handleTableClick = (tavolo) => {
        // Cerca se c'è una prenotazione su questo tavolo per questa data
        const existing = bookings.find(b => b.tavolo_id === String(tavolo.id) || b.tavolo_id === tavolo.label); // check ID o Label
        
        if (existing) {
            alert(`🛑 TAVOLO PRENOTATO\n\nCliente: ${existing.cliente_nome}\nTel: ${existing.cliente_telefono}\nOra: ${existing.ora_prenotazione}\nPersone: ${existing.persone}\nNote: ${existing.note || '-'}`);
        } else {
            // Apri modale per nuova prenotazione
            setFormData({
                ...formData,
                tavolo_id: tavolo.label, // Usiamo la label visiva come ID di riferimento
                tavolo_real_id: tavolo.id
            });
            setShowModal(true);
        }
    };

    // 3. Salva Prenotazione
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/prenotazioni`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ristorante_id: user.id,
                    data_prenotazione: selectedDate,
                    ...formData
                })
            });
            const data = await res.json();
            if(data.success) {
                setShowModal(false);
                fetchBookings();
                // Reset parziale form
                setFormData({...formData, cliente_nome: '', cliente_telefono: '', note: ''});
            } else {
                alert("Errore salvataggio");
            }
        } catch(e) { alert("Errore connessione"); }
    };

    // 4. Cancella Prenotazione
    const handleDelete = async (id) => {
        if(!confirm("Cancellare questa prenotazione?")) return;
        await fetch(`${API_URL}/api/prenotazioni/${id}`, {
            method: 'PUT', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ status: 'cancellata' })
        });
        fetchBookings();
    };

    return (
        <div style={{display:'flex', gap:20, flexDirection:'row', flexWrap:'wrap'}}>
            
            {/* COLONNA SINISTRA: LISTA & CONTROLLI */}
            <div style={{flex:1, minWidth:300}}>
                <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                    <h3 style={{marginTop:0, color:'#2c3e50'}}>📅 Seleziona Data</h3>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        style={{width:'100%', padding:12, fontSize:16, borderRadius:5, border:'1px solid #ddd'}}
                    />
                </div>

                <div style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                    <h3 style={{marginTop:0, color:'#2c3e50'}}>Lista Prenotazioni</h3>
                    {bookings.length === 0 ? <p style={{color:'#999'}}>Nessuna prenotazione per oggi.</p> : (
                        <div style={{display:'flex', flexDirection:'column', gap:10}}>
                            {bookings.map(b => (
                                <div key={b.id} style={{padding:10, borderLeft:'4px solid #3498db', background:'#f9f9f9', borderRadius:4}}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <strong>{b.ora_prenotazione} - {b.cliente_nome}</strong>
                                        <button onClick={()=>handleDelete(b.id)} style={{border:'none', background:'transparent', cursor:'pointer'}}>❌</button>
                                    </div>
                                    <div style={{fontSize:13, color:'#555'}}>
                                        Tavolo: <b>{b.tavolo_id}</b> | Persone: {b.persone}<br/>
                                        Tel: {b.cliente_telefono}
                                    </div>
                                    {b.note && <div style={{fontSize:12, fontStyle:'italic', color:'#7f8c8d'}}>{b.note}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* COLONNA DESTRA: MAPPA VISUALE */}
            <div style={{flex:2, minWidth:300}}>
                <div style={{background:'#e0e0e0', width:'100%', height:'600px', position:'relative', borderRadius:10, border:'2px solid #bdc3c7', overflow:'hidden'}}>
                    {layoutSala.length === 0 && <div style={{padding:50, textAlign:'center', color:'#7f8c8d'}}>Nessun layout sala disegnato. Vai in "Sala" per crearlo.</div>}
                    
                    {layoutSala.map(t => {
                        // Check se prenotato
                        const isBooked = bookings.some(b => b.tavolo_id === t.label);
                        
                        return (
                            <div 
                                key={t.id}
                                onClick={() => handleTableClick(t)}
                                style={{
                                    position: 'absolute', left: t.x, top: t.y,
                                    width: t.shape === 'rect' ? 120 : (t.shape === 'round' ? 80 : 70),
                                    height: t.shape === 'round' ? 80 : 70,
                                    borderRadius: t.shape === 'round' ? '50%' : '8px',
                                    background: isBooked ? '#e74c3c' : '#2ecc71', // ROSSO = PRENOTATO, VERDE = LIBERO
                                    border: '2px solid white',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                    color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px black',
                                    transition: 'transform 0.1s'
                                }}
                                title={isBooked ? "Prenotato" : "Libero - Clicca per prenotare"}
                            >
                                <div style={{fontSize:16}}>{t.label}</div>
                                {isBooked && <div style={{fontSize:10}}>Occupato</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODALE AGGIUNTA */}
            {showModal && (
                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
                    <div style={{background:'white', padding:30, borderRadius:10, width:350}}>
                        <h3 style={{marginTop:0}}>Nuova Prenotazione</h3>
                        <p>Tavolo: <b>{formData.tavolo_id}</b> | Data: <b>{selectedDate}</b></p>
                        <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:10}}>
                            <input placeholder="Nome Cliente" required value={formData.cliente_nome} onChange={e=>setFormData({...formData, cliente_nome:e.target.value})} style={{padding:10}} />
                            <input placeholder="Telefono" value={formData.cliente_telefono} onChange={e=>setFormData({...formData, cliente_telefono:e.target.value})} style={{padding:10}} />
                            <div style={{display:'flex', gap:10}}>
                                <input type="time" required value={formData.ora_prenotazione} onChange={e=>setFormData({...formData, ora_prenotazione:e.target.value})} style={{padding:10, flex:1}} />
                                <input type="number" placeholder="Pers." required value={formData.persone} onChange={e=>setFormData({...formData, persone:e.target.value})} style={{padding:10, width:60}} />
                            </div>
                            <textarea placeholder="Note / Allergie" value={formData.note} onChange={e=>setFormData({...formData, note:e.target.value})} style={{padding:10, height:60}}></textarea>
                            
                            <div style={{display:'flex', gap:10, marginTop:10}}>
                                <button type="button" onClick={()=>setShowModal(false)} style={{flex:1, padding:10, background:'#ccc', border:'none', borderRadius:5, cursor:'pointer'}}>Annulla</button>
                                <button type="submit" style={{flex:1, padding:10, background:'#27ae60', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>SALVA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminPrenotazioni;