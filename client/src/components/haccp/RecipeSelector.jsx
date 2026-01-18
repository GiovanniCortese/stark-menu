import React, { useState, useEffect } from 'react';

const RecipeSelector = ({ info, API_URL, onIngredientsLoaded }) => {
    const [mode, setMode] = useState('select'); // 'select' o 'create'
    const [ricette, setRicette] = useState([]);
    
    // Stato per creazione
    const [newRecipeName, setNewRecipeName] = useState("");
    const [newIngList, setNewIngList] = useState([]);
    const [tempIng, setTempIng] = useState("");

    useEffect(() => {
        caricaRicette();
    }, [info.id]);

    const caricaRicette = async () => {
        const r = await fetch(`${API_URL}/api/haccp/ricette/${info.id}`);
        setRicette(await r.json());
    };

    // --- LOGICA DI CARICAMENTO AUTOMATICO ---
    const handleSelectRecipe = async (e) => {
        const ricettaId = e.target.value;
        if (!ricettaId) return;

        // Chiamo il backend per fare il matching intelligente
        const r = await fetch(`${API_URL}/api/haccp/ricette/match/${ricettaId}?ristorante_id=${info.id}`);
        const data = await r.json();

        if (data.success) {
            // Passo i dati al padre (LabelGenerator)
            onIngredientsLoaded(data.risultati, ricette.find(x => x.id == ricettaId).nome);
        }
    };

    // --- LOGICA CREAZIONE ---
    const addTempIng = () => {
        if (tempIng) { setNewIngList([...newIngList, tempIng]); setTempIng(""); }
    };

    const saveRecipe = async () => {
        if (!newRecipeName || newIngList.length === 0) return alert("Inserisci nome e ingredienti");
        await fetch(`${API_URL}/api/haccp/ricette`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ristorante_id: info.id, nome: newRecipeName, ingredienti: newIngList })
        });
        setMode('select');
        setNewRecipeName("");
        setNewIngList([]);
        caricaRicette();
    };
    
    const deleteRecipe = async (id) => {
        if(!confirm("Eliminare questa ricetta?")) return;
        await fetch(`${API_URL}/api/haccp/ricette/${id}`, { method: 'DELETE' });
        caricaRicette();
    }

    return (
        <div style={{ marginBottom: 15, padding: 10, background: '#eafaf1', border: '1px solid #27ae60', borderRadius: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ color: '#27ae60' }}>🧑‍🍳 Ricettario Intelligente</strong>
                <button onClick={() => setMode(mode === 'select' ? 'create' : 'select')} style={{ fontSize: 11, cursor: 'pointer' }}>
                    {mode === 'select' ? '+ Crea Nuova Ricetta' : 'Torna alla selezione'}
                </button>
            </div>

            {mode === 'select' ? (
                <div>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 5 }}>Scegli Ricetta da produrre:</label>
                    <div style={{display:'flex', gap:5}}>
                        <select onChange={handleSelectRecipe} style={{ width: '100%', padding: 8 }}>
                            <option value="">-- Seleziona un piatto --</option>
                            {ricette.map(r => (
                                <option key={r.id} value={r.id}>{r.nome} ({r.ingredienti.length} ingr.)</option>
                            ))}
                        </select>
                    </div>
                     <div style={{marginTop:5, fontSize:10, color:'#666'}}>
                        💡 Selezionando un piatto, il sistema cercherà i lotti in dispensa automaticamente.
                    </div>
                    {/* Lista piccola per cancellare */}
                    {ricette.length > 0 && (
                        <div style={{marginTop:10}}>
                             <small>Gestisci:</small>
                             <div style={{display:'flex', flexWrap:'wrap', gap:5, marginTop:3}}>
                                 {ricette.map(r => (
                                     <span key={r.id} style={{fontSize:10, background:'white', padding:'2px 5px', borderRadius:3, border:'1px solid #ccc'}}>
                                         {r.nome} <span onClick={()=>deleteRecipe(r.id)} style={{color:'red', cursor:'pointer', fontWeight:'bold', marginLeft:3}}>x</span>
                                     </span>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ background: 'white', padding: 10, borderRadius: 5 }}>
                    <input placeholder="Nome Piatto (es. Lasagna)" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} style={{ width: '100%', marginBottom: 5, padding: 5 }} />
                    <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                        <input placeholder="Ingrediente (es. Macinato)" value={tempIng} onChange={e => setTempIng(e.target.value)} style={{ flex: 1, padding: 5 }} />
                        <button onClick={addTempIng} style={{ background: '#2980b9', color: 'white', border: 'none' }}>+</button>
                    </div>
                    <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {newIngList.map((ing, i) => (
                            <span key={i} style={{ background: '#eee', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{ing}</span>
                        ))}
                    </div>
                    <button onClick={saveRecipe} style={{ width: '100%', background: '#27ae60', color: 'white', border: 'none', padding: 8, cursor: 'pointer' }}>SALVA RICETTA</button>
                </div>
            )}
        </div>
    );
};

export default RecipeSelector;