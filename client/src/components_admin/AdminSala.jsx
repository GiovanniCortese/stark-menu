// client/src/components_admin/AdminSala.jsx
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable'; // Assicurati di avere: npm install react-draggable

const AdminSala = ({ user, API_URL }) => {
    const [tavoli, setTavoli] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    
    // Configurazione nuovo tavolo
    const [newTable, setNewTable] = useState({ label: '', shape: 'square', seats: 4 });

    const containerRef = useRef(null);

    // Caricamento Dati
    useEffect(() => {
        if(user && user.layout_sala) {
            try {
                const parsed = typeof user.layout_sala === 'string' ? JSON.parse(user.layout_sala) : user.layout_sala;
                setTavoli(Array.isArray(parsed) ? parsed : []);
            } catch(e) { setTavoli([]); }
        }
    }, [user]);

    const addTable = () => {
        const id = Date.now().toString(); // ID univoco semplice
        const nuovo = {
            id,
            label: newTable.label || `T-${tavoli.length + 1}`,
            shape: newTable.shape, // 'square', 'round', 'rect'
            seats: newTable.seats,
            x: 50, // Posizione default
            y: 50,
            status: 'free' // 'free', 'occupied', 'reserved'
        };
        setTavoli([...tavoli, nuovo]);
    };

    const updatePosition = (id, x, y) => {
        setTavoli(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    };

    const removeTable = (id) => {
        if(confirm("Eliminare questo tavolo?")) {
            setTavoli(prev => prev.filter(t => t.id !== id));
            setSelectedId(null);
        }
    };

    const salvaLayout = async () => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/ristorante/layout/${user.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ layout_sala: tavoli })
            });
            alert("✅ Layout Sala Salvato!");
        } catch(e) {
            alert("Errore salvataggio");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{padding: 20}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
                <div>
                    <h2 style={{margin:0}}>📐 Configurazione Sala (Mappa)</h2>
                    <p style={{margin:0, fontSize:12, color:'#666'}}>Trascina i tavoli per creare la piantina.</p>
                </div>
                <button 
                    onClick={salvaLayout}
                    style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}
                >
                    {loading ? 'Salvataggio...' : '💾 SALVA LAYOUT'}
                </button>
            </div>

            {/* CONTROLLI AGGIUNTA */}
            <div style={{background:'#f9f9f9', padding:15, borderRadius:8, marginBottom:20, display:'flex', gap:10, alignItems:'center'}}>
                <input 
                    placeholder="Nome (es. T-1)" 
                    value={newTable.label} 
                    onChange={e=>setNewTable({...newTable, label: e.target.value})}
                    style={{padding:8, borderRadius:4, border:'1px solid #ccc', width:100}}
                />
                <select 
                    value={newTable.shape} 
                    onChange={e=>setNewTable({...newTable, shape: e.target.value})}
                    style={{padding:8, borderRadius:4, border:'1px solid #ccc'}}
                >
                    <option value="square">Quadrato (2-4)</option>
                    <option value="round">Rotondo (4-8)</option>
                    <option value="rect">Rettangolare (6+)</option>
                </select>
                <button onClick={addTable} style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>+ Aggiungi</button>
            </div>

            {/* AREA MAPPA (Droppable Area) */}
            <div 
                ref={containerRef}
                style={{
                    width: '100%', 
                    height: '600px', 
                    background: '#e0e0e0', 
                    position: 'relative', 
                    borderRadius: 10, 
                    overflow: 'hidden',
                    backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    border: '2px solid #bdc3c7'
                }}
            >
                {tavoli.map(t => (
                    <Draggable
                        key={t.id}
                        bounds="parent"
                        defaultPosition={{x: t.x, y: t.y}}
                        onStop={(e, data) => updatePosition(t.id, data.x, data.y)}
                    >
                        <div 
                            onClick={()=>setSelectedId(t.id)}
                            style={{
                                position: 'absolute',
                                cursor: 'move',
                                width: t.shape === 'rect' ? 120 : 70,
                                height: 70,
                                borderRadius: t.shape === 'round' ? '50%' : '8px',
                                background: selectedId === t.id ? '#f1c40f' : (t.status === 'occupied' ? '#e74c3c' : '#2ecc71'),
                                border: '2px solid #333',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexDirection: 'column',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                zIndex: selectedId === t.id ? 10 : 1
                            }}
                        >
                            <span style={{fontWeight:'bold', fontSize:14}}>{t.label}</span>
                            {selectedId === t.id && (
                                <button 
                                    onClick={(e)=>{e.stopPropagation(); removeTable(t.id)}}
                                    style={{fontSize:10, background:'red', color:'white', border:'none', borderRadius:3, padding:'2px 4px', marginTop:4, cursor:'pointer'}}
                                >
                                    X
                                </button>
                            )}
                        </div>
                    </Draggable>
                ))}
            </div>
        </div>
    );
};

export default AdminSala;