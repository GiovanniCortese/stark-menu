// client/src/features/warehouse/components/ScannerBolla.jsx

import { useState } from 'react';

export default function ScannerBolla({ API_URL, ristoranteId, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scannedData, setScannedData] = useState(null); // I dati letti dall'AI

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const startScan = async () => {
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            // 1. Chiedi all'AI di leggere
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                // Aggiungiamo campi manuali se l'AI li ha persi
                const cleanData = {
                    header: {
                        fornitore: data.data.fornitore || "",
                        riferimento_documento: data.data.numero_bolla || "",
                        data_documento: data.data.data_documento || new Date().toISOString().split('T')[0],
                        data_ricezione: new Date().toISOString().split('T')[0]
                    },
                    rows: data.data.prodotti || []
                };
                setScannedData(cleanData);
            } else {
                alert("Errore scansione AI: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Errore di connessione AI");
        } finally {
            setLoading(false);
        }
    };

    const confermaImportazione = async () => {
        if(!scannedData) return;
        if(!confirm("Confermi l'aggiornamento del magazzino?")) return;

        try {
            const res = await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ristorante_id: ristoranteId,
                    header: scannedData.header,
                    rows: scannedData.rows
                })
            });
            const result = await res.json();
            if(result.success) {
                alert("✅ Magazzino aggiornato con successo!");
                setScannedData(null);
                setFile(null);
                setPreview(null);
                if(onImportSuccess) onImportSuccess();
            } else {
                alert("Errore: " + result.error);
            }
        } catch(e) { alert("Errore importazione"); }
    };

    // Helper per modificare i dati letti dall'AI prima di confermare
    const updateRow = (index, field, value) => {
        const newRows = [...scannedData.rows];
        newRows[index][field] = value;
        setScannedData({ ...scannedData, rows: newRows });
    };

    return (
        <div style={{padding:20}}>
            {!scannedData ? (
                // FASE 1: UPLOAD
                <div style={{textAlign:'center', padding:40, background:'white', borderRadius:10, border:'2px dashed #ccc'}}>
                    <h3>📷 Carica Foto Bolla / Fattura</h3>
                    <p>L'intelligenza artificiale leggerà i prodotti per te.</p>
                    
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{marginTop:20}} />
                    
                    {preview && (
                        <div style={{marginTop:20}}>
                            <img src={preview} alt="preview" style={{maxHeight:200, borderRadius:8}} />
                            <br/>
                            <button 
                                onClick={startScan} 
                                disabled={loading}
                                style={{marginTop:15, padding:'15px 30px', background: loading ? '#ccc' : '#8e44ad', color:'white', border:'none', borderRadius:30, fontSize:18, cursor: loading ? 'wait' : 'pointer'}}
                            >
                                {loading ? "✨ L'AI sta leggendo..." : "🚀 ANALIZZA CON AI"}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // FASE 2: VERIFICA DATI
                <div style={{background:'white', padding:20, borderRadius:10}}>
                    <h3>📝 Verifica Dati Bolla</h3>
                    
                    {/* Header Bolla */}
                    <div style={{display:'flex', gap:20, marginBottom:20, background:'#f8f9fa', padding:15, borderRadius:8}}>
                        <div>
                            <label>Fornitore:</label>
                            <input value={scannedData.header.fornitore} onChange={e=>setScannedData({...scannedData, header: {...scannedData.header, fornitore:e.target.value}})} style={{display:'block', padding:5}} />
                        </div>
                        <div>
                            <label>N. Documento:</label>
                            <input value={scannedData.header.riferimento_documento} onChange={e=>setScannedData({...scannedData, header: {...scannedData.header, riferimento_documento:e.target.value}})} style={{display:'block', padding:5}} />
                        </div>
                        <div>
                            <label>Data Fattura:</label>
                            <input type="date" value={scannedData.header.data_documento} onChange={e=>setScannedData({...scannedData, header: {...scannedData.header, data_documento:e.target.value}})} style={{display:'block', padding:5}} />
                        </div>
                    </div>

                    {/* Tabella Prodotti */}
                    <table style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{background:'#eee'}}>
                                <th style={{padding:10, textAlign:'left'}}>Prodotto (Letto da AI)</th>
                                <th style={{padding:10}}>Q.tà</th>
                                <th style={{padding:10}}>Prezzo Unit.</th>
                                <th style={{padding:10}}>IVA %</th>
                                <th style={{padding:10}}>Lotto/Scad</th>
                                <th style={{padding:10}}>Rimuovi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scannedData.rows.map((row, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #ddd'}}>
                                    <td style={{padding:5}}>
                                        <input value={row.nome} onChange={e=>updateRow(i, 'nome', e.target.value)} style={{width:'100%', padding:5}} />
                                    </td>
                                    <td style={{padding:5}}>
                                        <input type="number" value={row.quantita} onChange={e=>updateRow(i, 'quantita', e.target.value)} style={{width:60, padding:5}} />
                                    </td>
                                    <td style={{padding:5}}>
                                        <input type="number" value={row.prezzo_unitario} onChange={e=>updateRow(i, 'prezzo_unitario', e.target.value)} style={{width:80, padding:5}} />
                                    </td>
                                    <td style={{padding:5}}>
                                        <input type="number" value={row.iva} onChange={e=>updateRow(i, 'iva', e.target.value)} style={{width:50, padding:5}} />
                                    </td>
                                    <td style={{padding:5}}>
                                        <input placeholder="Lotto" value={row.lotto || ''} onChange={e=>updateRow(i, 'lotto', e.target.value)} style={{width:80, padding:5, marginBottom:2}} />
                                        <input type="date" value={row.scadenza || ''} onChange={e=>updateRow(i, 'scadenza', e.target.value)} style={{width:110, padding:5}} />
                                    </td>
                                    <td style={{textAlign:'center'}}>
                                        <button onClick={()=>{
                                            const newRows = scannedData.rows.filter((_, idx) => idx !== i);
                                            setScannedData({...scannedData, rows: newRows});
                                        }} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{display:'flex', gap:10, marginTop:20}}>
                        <button onClick={confermaImportazione} style={{flex:2, background:'#27ae60', color:'white', padding:15, border:'none', borderRadius:5, fontSize:16, cursor:'pointer'}}>✅ CONFERMA E CARICA IN MAGAZZINO</button>
                        <button onClick={()=>setScannedData(null)} style={{flex:1, background:'#c0392b', color:'white', padding:15, border:'none', borderRadius:5, fontSize:16, cursor:'pointer'}}>ANNULLA</button>
                    </div>
                </div>
            )}
        </div>
    );
}