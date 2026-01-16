import React, { useState, useEffect } from 'react';

const LabelGenerator = ({ 
    labelData, setLabelData, handleLabelTypeChange, handlePrintLabel, 
    lastLabel, info, API_URL, staffList,
    handleReprint,
    openDownloadModal,
    merciList = [] // Nuova prop per ricevere la lista della dispensa
}) => {
    const [storicoLabels, setStoricoLabels] = useState([]);

    const caricaStorico = async () => {
        try {
            const r = await fetch(`${API_URL}/api/haccp/labels/storico/${info.id}`);
            const d = await r.json();
            setStoricoLabels(d);
        } catch (e) { console.error("Err storico labels", e); }
    };

    useEffect(() => { caricaStorico(); }, [lastLabel, info.id]);

    // Funzione per sincronizzare i giorni quando cambio la data nel calendario
    const handleDateChange = (e) => {
        const dateStr = e.target.value;
        if(!dateStr) return;
        const newDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(newDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        setLabelData({ ...labelData, scadenza_manuale: dateStr, giorni_scadenza: diffDays });
    };

    // Funzione per sincronizzare la data quando cambio i giorni numerici
    const handleDaysChange = (e) => {
        const days = parseInt(e.target.value) || 0;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        setLabelData({ ...labelData, giorni_scadenza: days, scadenza_manuale: newDate.toISOString().split('T')[0] });
    };

    // --- LOGICA FILTRO MERCI (ALIMENTI) ---
    const today = new Date();
    
    // 1. Filtra scaduti e ordina per scadenza più vicina
    const merciDisponibili = merciList.filter(m => {
        if(!m.scadenza) return true; // Se non ha scadenza, mostralo
        const scadenzaDate = new Date(m.scadenza);
        // Normalizziamo le date per confrontare solo i giorni (senza ore)
        const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const scadenzaZero = new Date(scadenzaDate.getFullYear(), scadenzaDate.getMonth(), scadenzaDate.getDate());
        return scadenzaZero >= todayZero; // Mostra solo se NON è scaduto ieri o prima
    }).sort((a,b) => {
        if(!a.scadenza) return 1; 
        if(!b.scadenza) return -1;
        return new Date(a.scadenza) - new Date(b.scadenza);
    });

    // 2. Calcola colore per scadenze vicine (<= 3 giorni)
    const getExpiryColor = (scadenza) => {
        if(!scadenza) return 'black';
        const d = new Date(scadenza);
        const diffTime = d - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if(diffDays <= 3) return '#e67e22'; // Arancione
        return 'black';
    };

    return (
        <div className="no-print">
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #2980b9'}}>
                <h3>🏭 Produzione / Abbattimento</h3>
                <form onSubmit={handlePrintLabel} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    
                    {/* CAMPO PRODOTTO */}
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Prodotto / Piatto</label>
                        <input value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required />
                    </div>

                    {/* NUOVO CAMPO: ALIMENTI / INGREDIENTI */}
                    <div style={{flex:2, minWidth:250}}><label style={{fontSize:11}}>Alimenti / Materie Prime (Opzionale)</label>
                        <select 
                            value={labelData.ingredienti || ''} 
                            onChange={e=>setLabelData({...labelData, ingredienti:e.target.value})} 
                            style={{width:'100%', padding:9, border:'1px solid #ddd'}}
                        >
                            <option value="">-- Seleziona da Dispensa --</option>
                            {merciDisponibili.map(m => (
                                <option 
                                    key={m.id} 
                                    value={`${m.prodotto} (L:${m.lotto})`} 
                                    style={{
                                        color: getExpiryColor(m.scadenza), 
                                        fontWeight: getExpiryColor(m.scadenza)!=='black' ? 'bold' : 'normal'
                                    }}
                                >
                                    {m.prodotto} - {m.fornitore} [L:{m.lotto}] {m.scadenza ? `(Scad: ${new Date(m.scadenza).toLocaleDateString()})` : ''}
                                </option>
                            ))}
                        </select>
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

                    {/* TASTO MODIFICATO: SOLO CREA */}
                    <button style={{background:'#2980b9', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold'}}>
                        CREA
                    </button>
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
                                    {/* VISUALIZZAZIONE INGREDIENTI NELLO STORICO */}
                                    {l.ingredienti && <div style={{fontSize:11, color:'#555', marginTop:2}}>🔗 {l.ingredienti}</div>}
                                </td>
                                <td style={{padding:8}}><code>{l.lotto}</code></td>
                                <td style={{padding:8, color:'#c0392b', fontWeight:'bold'}}>{new Date(l.data_scadenza).toLocaleDateString()}</td>
                                <td style={{padding:8}}>
                                    {/* TASTO MODIFICATO: SOLO STAMPA */}
                                    <button onClick={() => handleReprint(l)} style={{background:'#34495e', color:'white', border:'none', borderRadius:3, padding:'4px 8px', cursor:'pointer'}}>Stampa 🖨️</button>
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