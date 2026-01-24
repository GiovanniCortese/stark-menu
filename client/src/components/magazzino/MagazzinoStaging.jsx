// client/src/components_haccp/MagazzinoStaging.jsx
import React, { useState, useEffect } from 'react';

const MagazzinoStaging = ({ initialData, onConfirm, onCancel }) => {
    // Helper per ottenere la data di OGGI in formato YYYY-MM-DD (Fuso Italiano corretto)
    const getTodayItaly = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000; // Correzione offset in millisecondi
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    // Helper per formattare qualsiasi data in YYYY-MM-DD per l'input HTML
    const safeDate = (val) => {
        if (!val) return '';
        // Se c'è la T (ISO string), splitta. Altrimenti restituisci così com'è.
        return val.includes('T') ? val.split('T')[0] : val;
    };

    // --- STATO INTESTAZIONE ---
    const [headerData, setHeaderData] = useState({
        fornitore: '',
        riferimento_documento: '',
        data_documento: '', // Data scritta sulla FATTURA
        data_ricezione: '', // Data di INSERIMENTO
        note: ''
    });

    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (initialData && initialData.length > 0) {
            const first = initialData[0];
            
            // Capiamo se è una MODIFICA (ha ID) o NUOVO CARICO (non ha ID)
            const isEditMode = !!first.id; 

            setHeaderData({
                fornitore: first.fornitore || '',
                riferimento_documento: first.riferimento_documento || '',
                
                // Data Fattura: pulisce eventuali formati ISO
                data_documento: safeDate(first.data_documento), 
                
                // Data Inserimento:
                // - Se Modifica: mantiene la data originale del primo record
                // - Se Nuovo: imposta OGGI
                data_ricezione: isEditMode && first.data_ricezione ? safeDate(first.data_ricezione) : getTodayItaly(),
                
                note: first.note || ''
            });

            // Mappiamo le righe con NORMALIZZAZIONE DATI (Fix IVA 4% default)
            setRows(initialData.map((item, idx) => ({ 
                ...item, 
                // FIX CRUCIALE: Trasforma "10.00" (stringa DB) in "10" (stringa select)
                iva: item.iva ? String(parseFloat(item.iva)) : '0', 
                
                // Assicuriamoci che i numeri siano numeri per i calcoli
                sconto: item.sconto ? parseFloat(item.sconto) : 0,
                quantita: item.quantita ? parseFloat(item.quantita) : 0,
                prezzo_unitario: item.prezzo_unitario ? parseFloat(item.prezzo_unitario) : 0,

                id: item.id || null, // Importante per distinguere INSERT da UPDATE
                tempId: Date.now() + idx 
            })));
        }
    }, [initialData]);

    const handleHeaderChange = (field, value) => {
        setHeaderData(prev => ({ ...prev, [field]: value }));
    };

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(item => 
            item.tempId === id ? { ...item, [field]: value } : item
        ));
    };

    const handleDeleteRow = (id) => {
        setRows(prev => prev.filter(item => item.tempId !== id));
    };

    const addRow = () => {
        setRows([...rows, {
            id: null, // Nuova riga manuale
            tempId: Date.now(),
            codice_articolo: '',
            prodotto: '',
            quantita: 1,
            unita_misura: 'Pz',
            prezzo_unitario: 0,
            sconto: 0,
            iva: '10', // Default stringa per select
            scadenza: '',
            lotto: '',
            is_haccp: true
        }]);
    };

    const handleConfirm = () => {
        // Applica i dati dell'intestazione a TUTTE le righe e prepara il payload finale
        const finalData = rows.map(row => ({
            ...row,
            // Sovrascriviamo le righe con i dati dell'intestazione globali
            fornitore: headerData.fornitore,
            riferimento_documento: headerData.riferimento_documento,
            data_documento: headerData.data_documento,
            data_ricezione: headerData.data_ricezione,
            note: headerData.note,
            // (L'ID è già dentro row grazie allo spread ...row)
        }));
        onConfirm(finalData);
    };

    const calculateTotal = () => {
        return rows.reduce((acc, item) => {
            const qta = parseFloat(item.quantita) || 0;
            const prz = parseFloat(item.prezzo_unitario) || 0;
            const sc = parseFloat(item.sconto) || 0;
            const iva = parseFloat(item.iva) || 0;
            
            const nettoScontato = prz * (1 - sc/100);
            const totRiga = (qta * nettoScontato) * (1 + iva/100);
            
            return acc + totRiga;
        }, 0).toFixed(2);
    };

    // Stili CSS
    const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '4px' };
    const inputHeaderStyle = { width: '100%', padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px', background: '#fff', fontSize:'14px' };
    const thStyle = { padding: '10px', textAlign: 'left', background:'#f1f2f6', borderBottom:'2px solid #ddd', fontSize:'12px', color:'#2c3e50', whiteSpace:'nowrap' };
    const tdStyle = { padding: '5px', borderBottom: '1px solid #eee' };
    const inputTableStyle = { width: '100%', padding: '6px', border: '1px solid #dfe6e9', borderRadius: '4px', fontSize:'13px' };

    return (
        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 25px rgba(0,0,0,0.1)' }}>
            
            {/* --- SEZIONE INTESTAZIONE --- */}
            <div style={{ marginBottom: 25, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                    <div>
                        <h2 style={{ margin: 0, color:'#2c3e50', display:'flex', alignItems:'center', gap:10 }}>
                            🧐 Revisione & Modifica Massiva
                        </h2>
                        <p style={{ margin:0, color:'#7f8c8d', fontSize:13 }}>
                            Verifica intestazione. Le modifiche qui sopra verranno applicate a <b>tutte</b> le righe.
                        </p>
                    </div>
                    <div style={{textAlign:'right'}}>
                        <div style={{fontSize:12, color:'#999'}}>TOTALE STIMATO</div>
                        <div style={{fontSize:24, fontWeight:'bold', color:'#27ae60'}}>€ {calculateTotal()}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', background:'#f8f9fa', padding:15, borderRadius:8, border:'1px solid #e1e1e1' }}>
                    <div style={{ flex: 2, minWidth: '200px' }}>
                        <label style={labelStyle}>FORNITORE</label>
                        <input 
                            type="text" 
                            value={headerData.fornitore} 
                            onChange={(e) => handleHeaderChange('fornitore', e.target.value)} 
                            style={{...inputHeaderStyle, fontWeight:'bold', color:'#2980b9'}} 
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={labelStyle}>N° DOCUMENTO (FATTURA)</label>
                        <input 
                            type="text" 
                            value={headerData.riferimento_documento} 
                            onChange={(e) => handleHeaderChange('riferimento_documento', e.target.value)} 
                            style={inputHeaderStyle} 
                            placeholder="Es. 1024/A"
                        />
                    </div>
                    
                    {/* CAMPO 1: DATA DOCUMENTO (Dalla Carta) */}
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{...labelStyle, color:'#e67e22'}}>📅 DATA FATTURA</label>
                        <input 
                            type="date" 
                            value={headerData.data_documento} 
                            onChange={(e) => handleHeaderChange('data_documento', e.target.value)} 
                            style={{...inputHeaderStyle, borderBottom:'2px solid #e67e22'}} 
                        />
                    </div>

                    {/* CAMPO 2: DATA INSERIMENTO */}
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        <label style={{...labelStyle, color:'#27ae60'}}>📥 DATA INSERIMENTO</label>
                        <input 
                            type="date" 
                            value={headerData.data_ricezione} 
                            onChange={(e) => handleHeaderChange('data_ricezione', e.target.value)} 
                            style={{...inputHeaderStyle, borderBottom:'2px solid #27ae60'}} 
                        />
                    </div>
                </div>
            </div>

            {/* --- TABELLA PRODOTTI --- */}
            <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto', border:'1px solid #eee', borderRadius:8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th style={{...thStyle, width:40}}></th>
                            <th style={{...thStyle, width:90}}>Codice</th>
                            <th style={thStyle}>Prodotto</th>
                            <th style={{...thStyle, width:70}}>Qta</th>
                            <th style={{...thStyle, width:70}}>Unità</th>
                            <th style={{...thStyle, width:90}}>€ Unit.</th>
                            <th style={{...thStyle, width:70}}>Sc.%</th>
                            <th style={{...thStyle, width:70}}>IVA%</th>
                            <th style={{...thStyle, width:130}}>Scadenza</th>
                            <th style={{...thStyle, width:100}}>Lotto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(item => (
                            <tr key={item.tempId} style={{ background: '#fff' }}>
                                <td style={{...tdStyle, textAlign: 'center'}}>
                                    <button onClick={() => handleDeleteRow(item.tempId)} style={{ background: '#fff0f0', border: '1px solid #ffcccc', color: '#e74c3c', borderRadius:4, cursor: 'pointer', fontWeight:'bold', width:24, height:24, padding:0 }} title="Elimina riga">✕</button>
                                </td>
                                <td style={tdStyle}>
                                    <input type="text" value={item.codice_articolo || ''} onChange={(e) => handleRowChange(item.tempId, 'codice_articolo', e.target.value)} style={{...inputTableStyle, fontFamily:'monospace', fontSize:12}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="text" value={item.prodotto} onChange={(e) => handleRowChange(item.tempId, 'prodotto', e.target.value)} style={{...inputTableStyle, fontWeight:'500'}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="number" step="0.01" value={item.quantita} onChange={(e) => handleRowChange(item.tempId, 'quantita', e.target.value)} style={{...inputTableStyle, textAlign:'center', fontWeight:'bold'}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="text" value={item.unita_misura} onChange={(e) => handleRowChange(item.tempId, 'unita_misura', e.target.value)} style={{...inputTableStyle, textAlign:'center'}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="number" step="0.001" value={item.prezzo_unitario} onChange={(e) => handleRowChange(item.tempId, 'prezzo_unitario', e.target.value)} style={inputTableStyle} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="number" step="0.01" value={item.sconto} onChange={(e) => handleRowChange(item.tempId, 'sconto', e.target.value)} style={{...inputTableStyle, color: item.sconto > 0 ? '#e74c3c' : '#ccc'}} />
                                </td>
                                <td style={tdStyle}>
                                    {/* SELECT IVA AGGIORNATA */}
                                    <select 
                                        value={item.iva} 
                                        onChange={(e) => handleRowChange(item.tempId, 'iva', e.target.value)} 
                                        style={inputTableStyle}
                                    >
                                        <option value="4">4%</option>
                                        <option value="10">10%</option>
                                        <option value="22">22%</option>
                                        <option value="0">0%</option>
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <input type="date" value={safeDate(item.scadenza)} onChange={(e) => handleRowChange(item.tempId, 'scadenza', e.target.value)} style={{...inputTableStyle, fontSize:12}} />
                                </td>
                                <td style={tdStyle}>
                                    <input type="text" value={item.lotto} onChange={(e) => handleRowChange(item.tempId, 'lotto', e.target.value)} style={inputTableStyle} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div style={{ marginTop: 15 }}>
                <button onClick={addRow} style={{ padding: '8px 15px', background: '#ecf0f1', color:'#2c3e50', border: '1px solid #bdc3c7', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold', fontSize:13 }}>
                    + Aggiungi Riga Vuota
                </button>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 15, borderTop:'1px solid #eee', paddingTop:20 }}>
                <button onClick={onCancel} style={{ flex: 1, padding: 15, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 8, fontSize: '1rem', cursor: 'pointer', fontWeight:'bold' }}>
                    ❌ ANNULLA TUTTO
                </button>
                <button onClick={handleConfirm} style={{ flex: 3, padding: 15, background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow:'0 4px 15px rgba(46, 204, 113, 0.4)' }}>
                    ✅ CONFERMA E SALVA ({rows.length} Righe)
                </button>
            </div>
        </div>
    );
};

export default MagazzinoStaging;