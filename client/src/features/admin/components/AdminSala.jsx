// client/src/components_admin/AdminSala.jsx - FIX REACT 18 STRICT MODE
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable'; 

// --- SOTTO-COMPONENTE PER GESTIRE IL REF SINGOLO ---
// Questo è fondamentale per evitare l'errore "findDOMNode is not a function"
const TavoloDraggable = ({ t, updatePosition, setSelectedId, selectedId, removeTable }) => {
    const nodeRef = useRef(null); // Ref stabile per questo specifico tavolo

    return (
        <Draggable
            nodeRef={nodeRef} // Passiamo il ref a Draggable
            bounds="parent"
            defaultPosition={{x: t.x || 0, y: t.y || 0}}
            onStop={(e, data) => updatePosition(t.id, data.x, data.y)}
        >
            <div 
                ref={nodeRef} // E lo colleghiamo al DIV reale
                onClick={()=>setSelectedId(t.id)}
                style={{
                    position: 'absolute',
                    cursor: 'move',
                    width: t.shape === 'rect' ? 120 : (t.shape === 'round' ? 80 : 70),
                    height: t.shape === 'round' ? 80 : 70,
                    borderRadius: t.shape === 'round' ? '50%' : '8px',
                    background: selectedId === t.id ? '#f1c40f' : (t.status === 'occupied' ? '#e74c3c' : '#2ecc71'),
                    border: '2px solid #333',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    zIndex: selectedId === t.id ? 10 : 1,
                    touchAction: 'none' // Importante per touch screen
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
    );
};

const AdminSala = ({ user, API_URL }) => {
    const [tavoli, setTavoli] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [newTable, setNewTable] = useState({ label: '', shape: 'square', seats: 4 });

    const containerRef = useRef(null);

    // Caricamento Dati Sicuro
    useEffect(() => {
        if(user && user.layout_sala) {
            try {
                let parsed = user.layout_sala;
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                }
                if (Array.isArray(parsed)) {
                    setTavoli(parsed);
                } else {
                    setTavoli([]);
                }
            } catch(e) { 
                console.error("Errore parsing sala:", e);
                setTavoli([]); 
            }
        } else {
            setTavoli([]);
        }
    }, [user]);

    const addTable = () => {
        const currentTables = Array.isArray(tavoli) ? tavoli : [];
        const id = Date.now().toString(); 
        const nuovo = {
            id,
            label: newTable.label || `T-${currentTables.length + 1}`,
            shape: newTable.shape, 
            seats: newTable.seats,
            x: 50, 
            y: 50,
            status: 'free' 
        };
        setTavoli([...currentTables, nuovo]);
    };

    const updatePosition = (id, x, y) => {
        setTavoli(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map(t => t.id === id ? { ...t, x, y } : t);
        });
    };

    const removeTable = (id) => {
        if(confirm("Eliminare questo tavolo?")) {
            setTavoli(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
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
            alert("Errore salvataggio: " + e.message);
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
            <div style={{background:'white', padding:15, borderRadius:8, marginBottom:20, display:'flex', gap:10, alignItems:'center', border:'1px solid #ddd'}}>
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
                {Array.isArray(tavoli) && tavoli.map(t => (
                    <TavoloDraggable 
                        key={t.id} 
                        t={t} 
                        updatePosition={updatePosition}
                        setSelectedId={setSelectedId}
                        selectedId={selectedId}
                        removeTable={removeTable}
                    />
                ))}
            </div>
        </div>
    );
};

export default AdminSala;