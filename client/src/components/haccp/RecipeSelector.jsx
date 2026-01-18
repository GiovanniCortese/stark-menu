import React, { useState, useEffect, useRef } from 'react';

const RecipeSelector = ({ info, API_URL, onIngredientsLoaded }) => {
    const [mode, setMode] = useState('select'); // 'select' | 'create' | 'edit'
    const [ricette, setRicette] = useState([]);
    
    // Stato per creazione/modifica
    const [editingId, setEditingId] = useState(null);
    const [newRecipeName, setNewRecipeName] = useState("");
    const [newIngList, setNewIngList] = useState([]);
    const [tempIng, setTempIng] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Ref per input file nascosto
    const fileInputRef = useRef(null);

    useEffect(() => {
        caricaRicette();
    }, [info.id]);

    const caricaRicette = async () => {
        try {
            const r = await fetch(`${API_URL}/api/haccp/ricette/${info.id}`);
            const data = await r.json();
            setRicette(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    // --- SELEZIONE PER PRODUZIONE ---
    const handleSelectRecipe = async (e) => {
        const ricettaId = e.target.value;
        if (!ricettaId) return;

        const r = await fetch(`${API_URL}/api/haccp/ricette/match/${ricettaId}?ristorante_id=${info.id}`);
        const data = await r.json();

        if (data.success) {
            onIngredientsLoaded(data.risultati, ricette.find(x => x.id == ricettaId).nome);
        }
    };

    // --- GESTIONE CRUD ---
    const addTempIng = () => {
        if (tempIng) { setNewIngList([...newIngList, tempIng]); setTempIng(""); }
    };

    const removeIng = (idx) => {
        setNewIngList(newIngList.filter((_, i) => i !== idx));
    };

    const startCreate = () => {
        setMode('create');
        setEditingId(null);
        setNewRecipeName("");
        setNewIngList([]);
    };

    const startEdit = (ricetta) => {
        setMode('edit');
        setEditingId(ricetta.id);
        setNewRecipeName(ricetta.nome);
        setNewIngList(ricetta.ingredienti || []);
    };

    const saveRecipe = async () => {
        if (!newRecipeName || newIngList.length === 0) return alert("Inserisci nome e ingredienti");
        
        const endpoint = mode === 'edit' 
            ? `${API_URL}/api/haccp/ricette/${editingId}` 
            : `${API_URL}/api/haccp/ricette`;
            
        const method = mode === 'edit' ? 'PUT' : 'POST';

        await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ristorante_id: info.id, nome: newRecipeName, ingredienti: newIngList })
        });
        
        backToSelect();
        caricaRicette();
    };
    
    const deleteRecipe = async (id) => {
        if(!confirm("Eliminare questa ricetta?")) return;
        await fetch(`${API_URL}/api/haccp/ricette/${id}`, { method: 'DELETE' });
        caricaRicette();
    };

    const backToSelect = () => {
        setMode('select');
        setEditingId(null);
        setNewRecipeName("");
        setNewIngList([]);
    };

    // --- IMPORT / EXPORT ---
    const handleExport = () => {
        window.open(`${API_URL}/api/haccp/export-ricette/${info.id}`, '_blank');
    };

    const triggerImport = () => {
        fileInputRef.current.click();
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ristorante_id', info.id);

        try {
            const res = await fetch(`${API_URL}/api/haccp/import-ricette`, {
                method: 'POST',
                body: formData
            });
            const d = await res.json();
            if(d.success) {
                alert("✅ Importazione completata!");
                caricaRicette();
            } else {
                alert("❌ Errore: " + d.error);
            }
        } catch(err) {
            alert("Errore upload");
        } finally {
            setIsUploading(false);
            e.target.value = null; // Reset input
        }
    };

    return (
        <div style={{ marginBottom: 15, padding: 15, background: '#eafaf1', border: '1px solid #27ae60', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: 15 }}>
                <strong style={{ color: '#27ae60', fontSize:14 }}>🧑‍🍳 Ricettario Intelligente</strong>
                
                {mode === 'select' && (
                    <div style={{display:'flex', gap:5}}>
                        <button onClick={handleExport} style={{background:'#34495e', color:'white', border:'none', borderRadius:3, padding:'4px 8px', cursor:'pointer', fontSize:11}}>
                            ⬇ Export
                        </button>
                        <button onClick={triggerImport} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, padding:'4px 8px', cursor:'pointer', fontSize:11}}>
                            {isUploading ? '⏳...' : '⬆ Import Excel'}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".xlsx, .xls" style={{display:'none'}} />
                    </div>
                )}
            </div>

            {mode === 'select' ? (
                <div>
                    <div style={{display:'flex', gap:10, marginBottom:10}}>
                         <select onChange={handleSelectRecipe} style={{ flex:1, padding: 8, border:'1px solid #ccc', borderRadius:4 }}>
                            <option value="">-- Seleziona un piatto da produrre --</option>
                            {ricette.map(r => (
                                <option key={r.id} value={r.id}>{r.nome} ({r.ingredienti?.length || 0} ingr.)</option>
                            ))}
                        </select>
                        <button onClick={startCreate} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>
                            + Crea
                        </button>
                    </div>

                    <div style={{fontSize:10, color:'#666', marginBottom:10}}>
                        💡 Selezionando un piatto, il sistema cercherà i lotti in dispensa automaticamente.
                    </div>

                    {/* Lista Gestione (Edit/Delete) */}
                    {ricette.length > 0 && (
                        <div style={{marginTop:15, borderTop:'1px solid #ddd', paddingTop:10}}>
                             <small style={{fontWeight:'bold', color:'#555'}}>Gestione Rapida:</small>
                             <div style={{display:'flex', flexWrap:'wrap', gap:5, marginTop:5}}>
                                 {ricette.map(r => (
                                     <div key={r.id} style={{fontSize:11, background:'white', padding:'4px 8px', borderRadius:15, border:'1px solid #ccc', display:'flex', alignItems:'center', gap:5}}>
                                         <span>{r.nome}</span>
                                         <div style={{borderLeft:'1px solid #ccc', paddingLeft:5, display:'flex', gap:3}}>
                                            <span onClick={()=>startEdit(r)} style={{cursor:'pointer', fontSize:12}} title="Modifica">✏️</span>
                                            <span onClick={()=>deleteRecipe(r.id)} style={{color:'#e74c3c', cursor:'pointer', fontWeight:'bold', fontSize:12}} title="Elimina">×</span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ background: 'white', padding: 15, borderRadius: 5, boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }}>
                    <h4 style={{margin:'0 0 10px 0', color:'#333'}}>{mode === 'create' ? 'Nuova Ricetta' : 'Modifica Ricetta'}</h4>
                    
                    <input 
                        placeholder="Nome Piatto (es. Lasagna)" 
                        value={newRecipeName} 
                        onChange={e => setNewRecipeName(e.target.value)} 
                        style={{ width: '100%', marginBottom: 10, padding: 8, border:'1px solid #ddd', borderRadius:4 }} 
                    />
                    
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                        <input 
                            placeholder="Aggiungi Ingrediente (es. Macinato)" 
                            value={tempIng} 
                            onChange={e => setTempIng(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && addTempIng()}
                            style={{ flex: 1, padding: 8, border:'1px solid #ddd', borderRadius:4 }} 
                        />
                        <button onClick={addTempIng} style={{ background: '#2980b9', color: 'white', border: 'none', borderRadius:4, width:40, fontWeight:'bold' }}>+</button>
                    </div>

                    <div style={{ marginBottom: 15, display: 'flex', flexWrap: 'wrap', gap: 5, minHeight:30 }}>
                        {newIngList.length === 0 && <span style={{fontSize:11, color:'#999'}}>Nessun ingrediente.</span>}
                        {newIngList.map((ing, i) => (
                            <span key={i} style={{ background: '#ecf0f1', padding: '4px 8px', borderRadius: 4, fontSize: 11, display:'flex', alignItems:'center', gap:5 }}>
                                {ing}
                                <span onClick={()=>removeIng(i)} style={{color:'#c0392b', cursor:'pointer', fontWeight:'bold'}}>×</span>
                            </span>
                        ))}
                    </div>

                    <div style={{display:'flex', gap:10}}>
                        <button onClick={backToSelect} style={{ flex:1, background: '#95a5a6', color: 'white', border: 'none', padding: 10, borderRadius:4, cursor: 'pointer' }}>Annulla</button>
                        <button onClick={saveRecipe} style={{ flex:1, background: '#27ae60', color: 'white', border: 'none', padding: 10, borderRadius:4, cursor: 'pointer', fontWeight:'bold' }}>
                            {mode === 'create' ? 'SALVA' : 'AGGIORNA'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeSelector;