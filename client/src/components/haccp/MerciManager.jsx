// client/src/components/haccp/MerciManager.jsx
import React, { useState, useRef } from 'react';

const MerciManager = ({ 
    merci, merciForm, setMerciForm, salvaMerci, 
    iniziaModificaMerci, eliminaMerce, assets, resetMerciForm,
    handleFileAction, openDownloadModal, API_URL 
}) => {
    
    // Stati Scan AI
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState(null); 
    const scanInputRef = useRef(null);

    // Gestione Scan (Foto o PDF)
    const handleScan = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setIsScanning(true);
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: formData });
            const data = await res.json();

            if(data.success) {
                const info = data.data; // { fornitore, data_ricezione, numero_documento, prodotti, allegato_url }
                
                // Salva i dati grezzi per l'uso (selezione prodotti)
                setScannedData(info);
                
                // Precompila il form manuale con i dati di testata
                // LOGICA NOTE: Inserisce Numero Documento nelle note
                const noteDoc = info.numero_documento ? `Rif: ${info.numero_documento}` : '';
                
                setMerciForm(prev => ({
                    ...prev,
                    fornitore: info.fornitore || '',
                    data_ricezione: info.data_ricezione || new Date().toISOString().split('T')[0],
                    note: noteDoc, 
                    allegato_url: info.allegato_url || ''
                }));

                alert(data.message || "✅ Documento analizzato! Seleziona i prodotti da caricare.");
            } else {
                throw new Error(data.error);
            }
        } catch(err) {
            console.error(err);
            alert("❌ Errore Scan: " + err.message);
        } finally {
            setIsScanning(false);
            e.target.value = null; // Reset input
        }
    };

    const importaProdotto = (prod) => {
        setMerciForm(prev => ({
            ...prev,
            prodotto: prod.nome,
            quantita: prod.quantita,
            prezzo: prod.prezzo || 0,
            scadenza: prod.scadenza || '',
            // Mantiene i dati di testata (Fornitore, Note/DDT, Allegato) già settati
        }));
    };

    return (
        <div className="no-print">
            
            {/* --- SEZIONE DI CARICO --- */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft:'5px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                    <h3 style={{margin:0, color:'#2c3e50'}}>📦 Carico Merce & DDT</h3>
                    
                    {/* BOTTONE SCAN AI */}
                    <div style={{display:'flex', gap:10}}>
                        <button 
                            onClick={() => scanInputRef.current.click()} 
                            style={{background:'#8e44ad', color:'white', border:'none', padding:'10px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}
                        >
                            📸 SCAN BOLLA / PDF
                        </button>
                        <input 
                            type="file" 
                            ref={scanInputRef} 
                            accept="image/*,application/pdf" // ACCETTA PDF
                            onChange={handleScan} 
                            style={{display:'none'}} 
                        />
                    </div>
                </div>

                {isScanning && <div style={{padding:15, background:'#e8f6f3', color:'#16a085', borderRadius:5, marginBottom:15}}>⏳ Analisi documento in corso (AI)... Attendere...</div>}

                {/* VISUALIZZATORE RISULTATI SCAN */}
                {scannedData && (
                    <div style={{marginBottom:20, padding:15, background:'#f9f9f9', border:'1px solid #ddd', borderRadius:5}}>
                        <h4 style={{marginTop:0}}>Risultati Scan: {scannedData.fornitore}</h4>
                        <div style={{display:'flex', gap:10, fontSize:13, marginBottom:10, color:'#555'}}>
                            <span>📅 {scannedData.data_ricezione}</span>
                            <span>📄 {scannedData.numero_documento || "Nessun N. Doc"}</span>
                            {scannedData.allegato_url && <span style={{color:'#2980b9'}}>📎 Allegato Presente</span>}
                        </div>
                        
                        <div style={{display:'flex', flexDirection:'column', gap:5}}>
                            {scannedData.prodotti.length === 0 && <p>Nessun prodotto rilevato automaticamente. Compila sotto.</p>}
                            {scannedData.prodotti.map((p, i) => (
                                <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', padding:8, border:'1px solid #eee'}}>
                                    <span><strong>{p.nome}</strong> ({p.quantita}) - € {p.prezzo}</span>
                                    <button onClick={() => importaProdotto(p)} style={{background:'#27ae60', color:'white', border:'none', padding:'4px 10px', borderRadius:3, cursor:'pointer'}}>Usa Dati</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setScannedData(null)} style={{marginTop:10, background:'#95a5a6', color:'white', border:'none', padding:'5px 10px', borderRadius:3, cursor:'pointer'}}>Chiudi Scan</button>
                    </div>
                )}

                {/* FORM MANUALE */}
                <form onSubmit={salvaMerci} style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:15}}>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Data Ricezione</label>
                        <input type="date" required value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Fornitore</label>
                        <input type="text" placeholder="Es. Metro" required value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Prodotto</label>
                        <input type="text" placeholder="Es. Farina 00" required value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Note / N. Doc</label>
                        <input type="text" placeholder="Es. Rif. DDT 402" value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Quantità</label>
                        <input type="text" placeholder="Es. 10 kg" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    <div>
                        <label style={{fontSize:12, fontWeight:'bold'}}>Prezzo Tot (€)</label>
                        <input type="number" step="0.01" placeholder="0.00" value={merciForm.prezzo} onChange={e=>setMerciForm({...merciForm, prezzo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4}} />
                    </div>
                    
                    {/* Campo Allegato Nascosto (Gestito da Scan) o Visibile se vuoi caricarlo a mano senza scan */}
                    {merciForm.allegato_url && (
                        <div style={{gridColumn:'1 / -1', padding:10, background:'#eaf2f8', borderRadius:4, fontSize:13}}>
                            📎 <strong>File Allegato Pronto</strong> 
                            <button type="button" onClick={() => setMerciForm({...merciForm, allegato_url: ''})} style={{marginLeft:10, color:'red', border:'none', background:'none', cursor:'pointer'}}>Rimuovi</button>
                        </div>
                    )}

                    <div style={{gridColumn:'1/-1', display:'flex', gap:10, marginTop:10}}>
                        <button type="submit" style={{padding:'10px 20px', background:'#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>{merciForm.id ? 'AGGIORNA' : 'REGISTRA CARICO'}</button>
                        {merciForm.id && <button type="button" onClick={resetMerciForm} style={{padding:'10px 20px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>ANNULLA</button>}
                    </div>
                </form>
            </div>

            {/* --- TABELLA RIEPILOGO --- */}
            <div style={{background:'white', padding:20, borderRadius:10, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                    <h4>Ultimi Arrivi</h4>
                    <button onClick={() => openDownloadModal('merci')} style={{background:'#34495e', color:'white', border:'none', padding:'5px 15px', borderRadius:5, fontSize:13, cursor:'pointer'}}>⬇ Report Excel</button>
                </div>
                <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left'}}>
                            <th style={{padding:8}}>Data</th>
                            <th style={{padding:8}}>Fornitore</th>
                            <th style={{padding:8}}>Prodotto</th>
                            <th style={{padding:8}}>Qta/€</th>
                            <th style={{padding:8}}>Note / Doc</th>
                            <th style={{padding:8}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merci.map(m => (
                            <tr key={m.id} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:8}}>{new Date(m.data_ricezione).toLocaleDateString()}</td>
                                <td style={{padding:8}}>{m.fornitore}</td>
                                <td style={{padding:8}}>
                                    <strong>{m.prodotto}</strong>
                                    {m.lotto && <div style={{fontSize:11, color:'#666'}}>L: {m.lotto}</div>}
                                </td>
                                <td style={{padding:8}}>
                                    <div>{m.quantita}</div>
                                    {m.prezzo > 0 && <div style={{color:'#27ae60', fontWeight:'bold'}}>€ {Number(m.prezzo).toFixed(2)}</div>}
                                </td>
                                <td style={{padding:8}}>
                                    {/* Mostra NOTE (che contiene il DDT) e LINK ALLEGATO */}
                                    <div style={{fontSize:12, fontStyle:'italic'}}>{m.note}</div>
                                    {m.allegato_url && (
                                        <button 
                                            onClick={() => handleFileAction(m.allegato_url)}
                                            style={{marginTop:5, background:'#d6eaf8', color:'#2980b9', border:'1px solid #a9cce3', padding:'2px 8px', borderRadius:10, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:3}}
                                        >
                                            📎 Vedi Doc
                                        </button>
                                    )}
                                </td>
                                <td style={{padding:8, display:'flex', gap:5}}>
                                    <button onClick={()=>iniziaModificaMerci(m)} style={{background:'#f39c12', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'4px 8px'}}>✏️</button>
                                    <button onClick={()=>eliminaMerce(m.id)} style={{background:'#e74c3c', color:'white', border:'none', borderRadius:3, cursor:'pointer', padding:'4px 8px'}}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default MerciManager;