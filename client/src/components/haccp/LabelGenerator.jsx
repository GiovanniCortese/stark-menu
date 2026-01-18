import React, { useState, useEffect } from 'react';
import RecipeSelector from './RecipeSelector'; // <--- NUOVO IMPORT

const LabelGenerator = ({ 
    labelData, setLabelData, handleLabelTypeChange, handlePrintLabel: originalHandlePrintLabel, 
    lastLabel, info, API_URL, staffList,
    handleReprint,
    openDownloadModal,
    merciList = [] 
}) => {
    const [storicoLabels, setStoricoLabels] = useState([]);
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [currentIngredient, setCurrentIngredient] = useState("");

    const caricaStorico = async () => {
        try {
            const r = await fetch(`${API_URL}/api/haccp/labels/storico/${info.id}`);
            const d = await r.json();
            setStoricoLabels(d);
        } catch (e) { console.error("Err storico labels", e); }
    };

    useEffect(() => { caricaStorico(); }, [lastLabel, info.id]);

    // --- NUOVA LOGICA: GESTIONE RICETTA CARICATA ---
    const handleRecipeLoaded = (risultatiMatching, nomeRicetta) => {
        // 1. Imposta il nome del prodotto
        setLabelData(prev => ({ ...prev, prodotto: nomeRicetta }));
        
        // 2. Prepara la lista ingredienti basandosi sul match del magazzino
        const nuoviIngredienti = [];
        
        risultatiMatching.forEach(match => {
            if (match.found) {
                // Se trovato in magazzino, aggiungi il dettaglio completo (Lotto, Scadenza...)
                nuoviIngredienti.push(match.text);
            } else {
                // Se NON trovato, aggiungi con un marcatore speciale per evidenziarlo
                nuoviIngredienti.push(`⚠️ MANCANTE: ${match.ingrediente_base}`);
            }
        });
        
        // 3. Aggiorna lo stato degli ingredienti selezionati
        setSelectedIngredients(nuoviIngredienti);
    };
    // ------------------------------------------------

    const handleDateChange = (e) => {
        const dateStr = e.target.value;
        if(!dateStr) return;
        const newDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(newDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        setLabelData({ ...labelData, scadenza_manuale: dateStr, giorni_scadenza: diffDays });
    };

    const handleDaysChange = (e) => {
        const days = parseInt(e.target.value) || 0;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        setLabelData({ ...labelData, giorni_scadenza: days, scadenza_manuale: newDate.toISOString().split('T')[0] });
    };

    // --- LOGICA INGREDIENTI MANUALI ---
    const today = new Date();
    const merciDisponibili = merciList.filter(m => {
        if(!m.scadenza) return true; 
        const scadenzaDate = new Date(m.scadenza);
        const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const scadenzaZero = new Date(scadenzaDate.getFullYear(), scadenzaDate.getMonth(), scadenzaDate.getDate());
        return scadenzaZero >= todayZero; 
    }).sort((a,b) => {
        if (a.prodotto < b.prodotto) return -1;
        if (a.prodotto > b.prodotto) return 1;
        if(!a.scadenza) return 1; 
        if(!b.scadenza) return -1;
        return new Date(a.scadenza) - new Date(b.scadenza);
    });

    const getExpiryColor = (scadenza) => {
        if(!scadenza) return 'black';
        const d = new Date(scadenza);
        const diffTime = d - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if(diffDays <= 3) return '#e67e22'; 
        return 'black';
    };

    const addIngredient = () => {
        if (!currentIngredient) return;
        if (selectedIngredients.includes(currentIngredient)) return alert("Ingrediente già inserito!");
        setSelectedIngredients([...selectedIngredients, currentIngredient]);
        setCurrentIngredient(""); 
    };

    const removeIngredient = (indexToRemove) => {
        setSelectedIngredients(selectedIngredients.filter((_, index) => index !== indexToRemove));
    };

    const handleCreateOnly = async (e) => {
        e.preventDefault();
        const ingredientiString = selectedIngredients.join(', '); 
        const scadenza = labelData.scadenza_manuale ? new Date(labelData.scadenza_manuale) : new Date();
        if(!labelData.scadenza_manuale) scadenza.setDate(scadenza.getDate() + parseInt(labelData.giorni_scadenza));

        try {
            const res = await fetch(`${API_URL}/api/haccp/labels`, { 
                method:'POST', headers:{'Content-Type':'application/json'}, 
                body: JSON.stringify({ 
                    ristorante_id: info.id, 
                    prodotto: labelData.prodotto, 
                    data_scadenza: scadenza, 
                    operatore: labelData.operatore || 'Chef', 
                    tipo_conservazione: labelData.tipo,
                    ingredienti: ingredientiString 
                }) 
            });
            const data = await res.json(); 
            if(data.success) { 
                caricaStorico();
                setLabelData({ ...labelData, prodotto: '' });
                setSelectedIngredients([]);
            } else { alert("Errore creazione: " + data.error); }
        } catch (err) { alert("Errore di connessione"); }
    };

    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #2980b9'}}>
                <h3>🏭 Produzione / Abbattimento</h3>

                {/* --- NUOVO COMPONENTE RICETTE --- */}
                <RecipeSelector info={info} API_URL={API_URL} onIngredientsLoaded={handleRecipeLoaded} />
                {/* -------------------------------- */}

                <form onSubmit={handleCreateOnly} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end', marginTop: 20}}>
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Prodotto / Piatto</label>
                        <input value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} placeholder="Es. Lasagna" style={{width:'100%', padding:8, border:'1px solid #ddd'}} required />
                    </div>

                    <div style={{flex:3, minWidth:300, background:'#f9f9f9', padding:10, borderRadius:5, border:'1px solid #eee'}}>
                        <label style={{fontSize:11, fontWeight:'bold', display:'block', marginBottom:5}}>Componi Ingredienti (con Produttore)</label>
                        <div style={{display:'flex', gap:5}}>
                            <select 
                                value={currentIngredient} 
                                onChange={e=>setCurrentIngredient(e.target.value)} 
                                style={{flex:1, padding:8, border:'1px solid #ddd', borderRadius:4}}
                            >
                                <option value="">-- Seleziona Ingrediente Manualmente --</option>
                                {merciDisponibili.map(m => (
                                    <option 
                                        key={m.id} 
                                        value={`${m.prodotto} - ${m.fornitore} (L:${m.lotto})`} 
                                        style={{
                                            color: getExpiryColor(m.scadenza), 
                                            fontWeight: getExpiryColor(m.scadenza)!=='black' ? 'bold' : 'normal'
                                        }}
                                    >
                                        {m.prodotto} - {m.fornitore} [L:{m.lotto}] {m.scadenza ? `(Scad: ${new Date(m.scadenza).toLocaleDateString()})` : ''}
                                    </option>
                                ))}
                            </select>
                            <button type="button" onClick={addIngredient} style={{background:'#27ae60', color:'white', border:'none', borderRadius:4, width:40, fontSize:20, cursor:'pointer'}}>+</button>
                        </div>
                        
                        <div style={{marginTop:10, display:'flex', flexWrap:'wrap', gap:5}}>
                            {selectedIngredients.map((ing, idx) => {
                                // Controllo se è un ingrediente mancante per colorarlo diversamente
                                const isMissing = ing.startsWith('⚠️');
                                return (
                                    <span key={idx} style={{
                                        background: isMissing ? '#e67e22' : '#dfe6e9', // Arancione se manca, Grigio se ok
                                        color: isMissing ? 'white' : 'black',
                                        padding:'2px 8px', borderRadius:10, fontSize:11, display:'flex', alignItems:'center', gap:5
                                    }}>
                                        {ing}
                                        <span onClick={()=>removeIngredient(idx)} style={{cursor:'pointer', color: isMissing ? 'white' : '#c0392b', fontWeight:'bold'}}>×</span>
                                    </span>
                                );
                            })}
                            {selectedIngredients.length === 0 && <span style={{fontSize:11, color:'#999'}}>Nessun ingrediente aggiunto.</span>}
                        </div>
                    </div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Conservazione</label>
                        <select value={labelData.tipo} onChange={handleLabelTypeChange} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                            <option value="positivo">Positivo (+3°C)</option>
                            <option value="negativo">Negativo (-18°C)</option>
                            <option value="sottovuoto">Sottovuoto</option>
                        </select>
                    </div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Giorni Scad.</label>
                        <input type="number" value={labelData.giorni_scadenza} onChange={handleDaysChange} style={{width:'100%', padding:8, border:'1px solid #ddd'}} />
                    </div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data Scadenza</label>
                        <input type="date" value={labelData.scadenza_manuale} onChange={handleDateChange} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required />
                    </div>
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Operatore</label>
                        <select value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}} required>
                            <option value="">-- Seleziona --</option>
                            {staffList.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                    </div>

                    <button type="submit" style={{background:'#2980b9', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold', width:'100%'}}>CREA PRODOTTO</button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                    <h3>📑 Registro Produzione (Ultimi 7 gg)</h3>
                    <button onClick={() => openDownloadModal('labels')} style={{background:'#27ae60', color:'white', border:'none', padding:'8px 15px', borderRadius:5, fontSize:13, cursor:'pointer', fontWeight:'bold'}}>
                        ⬇ Scarica Report Produzione
                    </button>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Prodotto / Ingredienti</th>
                            <th style={{padding:8}}>Lotto</th>
                            <th style={{padding:8}}>Scadenza</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {storicoLabels.map(l => (
                            <tr key={l.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(l.data_produzione).toLocaleDateString()}</td>
                                <td style={{padding:8}}>
                                    <strong>{l.prodotto}</strong>
                                    {l.ingredienti && (
                                        <div style={{fontSize:11, color:'#555', marginTop:4, lineHeight:'1.4em'}}>
                                            {l.ingredienti.split(', ').map((ing, i) => (
                                                <span key={i} style={{background:'#eee', padding:'1px 4px', borderRadius:3, marginRight:4, display:'inline-block'}}>🔗 {ing}</span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td style={{padding:8}}><code>{l.lotto}</code></td>
                                <td style={{padding:8, color:'#c0392b', fontWeight:'bold'}}>{new Date(l.data_scadenza).toLocaleDateString()}</td>
                                <td style={{padding:8}}>
                                    <button onClick={() => handleReprint(l)} style={{background:'#34495e', color:'white', border:'none', borderRadius:3, padding:'6px 12px', cursor:'pointer', fontWeight:'bold'}}>Stampa 🖨️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LabelGenerator;