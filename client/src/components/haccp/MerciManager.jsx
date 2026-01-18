import React, { useState, useRef } from 'react';

const MerciManager = ({ 
    merci, merciForm, setMerciForm, salvaMerci, handleMerciPhoto, 
    uploadingMerci, iniziaModificaMerci, eliminaMerce, assets, resetMerciForm,
    handleFileAction, openDownloadModal,
    API_URL // Assicurati che venga passato dal padre!
}) => {
    
    // Stati per la scansione AI
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null); // Contiene il JSON dell'AI
    const scanInputRef = useRef(null);

    // Funzione che gestisce l'invio della foto all'AI
    const handleScanBolla = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setIsScanning(true);
        const fd = new FormData();
        fd.append('photo', file);

        try {
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const json = await res.json();
            
            if(json.success) {
                setScannedData(json.data); // Salva i dati trovati e apre il "mini modale" di scelta
            } else {
                alert("Errore AI: " + json.error);
            }
        } catch(err) {
            alert("Errore di connessione col server AI");
        } finally {
            setIsScanning(false);
            e.target.value = null; // Reset input
        }
    };

    // Funzione per "importare" un singolo prodotto trovato dall'AI nel form
    const importaProdotto = (prod) => {
        setMerciForm(prev => ({
            ...prev,
            fornitore: scannedData.fornitore || prev.fornitore,
            data_ricezione: scannedData.data_ricezione || prev.data_ricezione,
            prodotto: prod.nome,
            quantita: prod.quantita || '',
            lotto: prod.lotto || '',
            scadenza: prod.scadenza || '',
            note: 'Importato da AI ✨'
        }));
        // Rimuoviamo il prodotto dalla lista scansionata per evitare duplicati visivi
        setScannedData(prev => ({
            ...prev,
            prodotti: prev.prodotti.filter(p => p !== prod)
        }));
    };

    return (
        <div className="no-print">
            {/* --- SEZIONE SCANSIONE AI --- */}
            <div style={{marginBottom: 20, padding: 15, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, color: 'white', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>
                <div>
                    <h3 style={{margin:0, fontSize:18}}>✨ Magic Scan (Beta)</h3>
                    <p style={{margin:'5px 0 0 0', fontSize:12, opacity:0.9}}>Fai una foto alla bolla cartacea: l'IA compilerà i dati per te.</p>
                </div>
                <button 
                    onClick={() => scanInputRef.current.click()} 
                    disabled={isScanning}
                    style={{background:'white', color:'#764ba2', border:'none', padding:'10px 20px', borderRadius:25, fontWeight:'bold', cursor: isScanning ? 'wait' : 'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}
                >
                    {isScanning ? '🤖 Analisi in corso...' : '📸 SCANSIONA BOLLA'}
                </button>
                <input type="file" ref={scanInputRef} accept="image/*" capture="environment" onChange={handleScanBolla} style={{display:'none'}} />
            </div>

            {/* --- LISTA RISULTATI SCAN (Se presenti) --- */}
            {scannedData && scannedData.prodotti.length > 0 && (
                <div style={{marginBottom: 20, padding: 15, background: '#e0f7fa', border: '2px solid #00bcd4', borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                        <strong style={{color:'#006064'}}>Prodotti Rilevati ({scannedData.prodotti.length})</strong>
                        <button onClick={() => setScannedData(null)} style={{fontSize:11, background:'transparent', border:'none', textDecoration:'underline', cursor:'pointer'}}>Chiudi</button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                        {scannedData.prodotti.map((p, idx) => (
                            <div key={idx} onClick={() => importaProdotto(p)} style={{background:'white', padding:10, borderRadius:5, border:'1px solid #b2ebf2', cursor:'pointer', minWidth:200, flex:1, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
                                <div style={{fontWeight:'bold', fontSize:13}}>{p.nome}</div>
                                <div style={{fontSize:11, color:'#555'}}>Qta: {p.quantita} | Lotto: {p.lotto || '-'}</div>
                                <div style={{fontSize:10, color:'#00838f', marginTop:5, fontWeight:'bold'}}>CLICCA PER IMPORTARE ⬇</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- FORM NORMALE (Identico a prima, ma popolato dall'AI) --- */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: merciForm.id ? '5px solid #f39c12' : '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h3>{merciForm.id ? '✏️ Modifica Arrivo Merce' : '📥 Nuovo Arrivo'}</h3>
                    {merciForm.id && <button onClick={resetMerciForm} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:5, padding:'5px 10px', cursor:'pointer'}}>Annulla Modifica</button>}
                </div>
                
                <form onSubmit={salvaMerci} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data Arrivo</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Quantità (KG/Colli)</label><input value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} placeholder="Es. 10kg" style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Destinazione</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                          <option value="">-- Seleziona --</option>
                          {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>

                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} placeholder="Es. Fattura 42..." style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{display:'flex', alignItems:'center', gap:5}}>
                      <label style={{cursor:'pointer', background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, border:'1px solid #ccc', fontSize:12, whiteSpace:'nowrap'}}>
                          {uploadingMerci ? "Caricamento..." : (merciForm.allegato_url ? "📎 Bolla Allegata" : "📎 Allega Bolla")}
                          <input type="file" accept="image/*,.pdf" onChange={handleMerciPhoto} style={{display:'none'}} />
                      </label>
                    </div>

                    <div style={{display:'flex', flexDirection:'column', gap:5, minWidth:100}}>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                        <label style={{fontSize:11}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                    </div>
                    
                    <button type="submit" style={{background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, cursor:'pointer', height:40, fontWeight:'bold'}}>
                        {merciForm.id ? 'AGGIORNA' : 'REGISTRA'}
                    </button>
                </form>
            </div>

            <div style={{background:'white', padding:20, borderRadius:10}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                   <h3>📦 Storico Arrivi</h3>
                   <button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'5px 15px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>⬇ Scarica Report Merci</button>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Fornitore / Prodotto</th>
                            <th style={{padding:8}}>Condizione Prodotti</th> 
                            <th style={{padding:8}}>Lotto / Scadenza</th>
                            <th style={{padding:8}}>Note / Dest.</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merci.map(m => (
                            <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                <td style={{padding:8}}><strong>{m.fornitore}</strong><br/>{m.prodotto} ({m.quantita})</td>
                                <td style={{padding:8}}>
                                    {!m.conforme ? <span style={{color:'red', fontWeight:'bold'}}>TEMP KO</span> : 
                                     (!m.integro ? <span style={{color:'orange', fontWeight:'bold'}}>DANNEGGIATO</span> : 
                                     <span style={{color:'green', fontWeight:'bold'}}>CONFORME</span>)}
                                </td>
                                <td style={{padding:8}}>
                                     L: {m.lotto}<br/>
                                     S: {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                                </td>
                                <td style={{padding:8}}>
                                     {m.destinazione && <div>📍 {m.destinazione}</div>}
                                     {m.note && <div style={{fontStyle:'italic'}}>{m.note}</div>}
                                </td>
                                <td style={{padding:8, display:'flex', gap:5}}>
                                   {m.allegato_url && (
                                        <button 
                                            onClick={() => handleFileAction(m.allegato_url)} 
                                            style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 5px', cursor:'pointer'}}
                                        >
                                            📎
                                        </button>
                                    )}
                                    <button onClick={()=>iniziaModificaMerci(m)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'2px 5px'}}>✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'2px 5px'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MerciManager;