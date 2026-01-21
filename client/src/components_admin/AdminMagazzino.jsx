import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx'; 

function AdminMagazzino({ user, API_URL }) {
    const [tab, setTab] = useState('dashboard'); 
    const [stats, setStats] = useState({ fornitori: [], storico: [], top_prodotti: [] });
    const [assets, setAssets] = useState([]); 
    const [filtro, setFiltro] = useState("");
    
    // Stati per Carico AI/Excel
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const importExcelRef = useRef(null);

    // Form Manuale
    const [merciForm, setMerciForm] = useState({
        id: null,
        data_ricezione: new Date().toISOString().split('T')[0],
        fornitore: '', prodotto: '', lotto: '', scadenza: '',
        temperatura: '', conforme: true, integro: true, note: '',
        quantita: '', allegato_url: '', destinazione: '', 
        prezzo_unitario: '', iva: '', prezzo: '' // prezzo qui è il Totale Imponibile
    });

    const [previewDoc, setPreviewDoc] = useState(null); 
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => { ricaricaDati(); }, []);

    // --- CALCOLO AUTOMATICO PREZZI NEL FORM ---
    useEffect(() => {
        const qta = parseFloat(merciForm.quantita);
        const unit = parseFloat(merciForm.prezzo_unitario);
        
        // Se inserisco Qta e Unitario, calcolo il Totale Imponibile
        if (!isNaN(qta) && !isNaN(unit)) {
            const totImponibile = (qta * unit).toFixed(2);
            if (merciForm.prezzo !== totImponibile) {
                setMerciForm(prev => ({ ...prev, prezzo: totImponibile }));
            }
        }
    }, [merciForm.quantita, merciForm.prezzo_unitario]);

    const ricaricaDati = () => {
        fetch(`${API_URL}/api/haccp/stats/magazzino/${user.id}`).then(r => r.json()).then(setStats).catch(console.error);
        fetch(`${API_URL}/api/haccp/assets/${user.id}`).then(r => r.json()).then(setAssets).catch(console.error);
    };

    // --- IMPORT EXCEL (SMART UPDATE) ---
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Mappatura per il backend (che gestisce l'UPSERT)
                const formattedData = data.map(row => ({
                    ristorante_id: user.id,
                    data_ricezione: row['Data'] || new Date(),
                    fornitore: row['Fornitore'] || 'Excel Import',
                    prodotto: row['Prodotto'] || 'Prodotto Sconosciuto',
                    quantita: row['Quantita'] || row['Qta'] || 1,
                    prezzo_unitario: row['Prezzo Unitario'] || row['Unitario'] || 0,
                    iva: row['IVA'] || 0,
                    // Se manca il totale, lo calcoliamo noi
                    prezzo: row['Totale'] || ((row['Prezzo Unitario'] || 0) * (row['Qta'] || 1)) || 0,
                    lotto: row['Lotto'] || '',
                    scadenza: row['Scadenza'] || null,
                    // IMPORTANTE: Le note o il numero documento servono per identificare se è la stessa riga da aggiornare
                    note: row['Documento'] || row['Note'] || '', 
                    operatore: 'ADMIN_IMPORT'
                }));

                // Chiamata alla rotta specifica per l'import massivo con check duplicati
                const res = await fetch(`${API_URL}/api/haccp/merci/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merci: formattedData })
                });
                
                const json = await res.json();
                if(json.success) {
                    alert(`✅ Importazione completata! ${json.message}`);
                    ricaricaDati();
                } else {
                    alert("Errore Import: " + json.error);
                }

            } catch (err) {
                alert("Errore importazione Excel: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; 
    };

    // --- DOWNLOAD EXCEL COMPLETO ---
    const handleDownloadExcel = () => {
        const dataToExport = movimentiFiltrati.map(r => {
            const imp = parseFloat(r.prezzo) || 0;
            const ivaPerc = parseFloat(r.iva) || 0;
            const ivaVal = imp * (ivaPerc / 100);
            const totIvato = imp + ivaVal;

            return {
                Data: new Date(r.data_ricezione).toLocaleDateString(),
                Fornitore: r.fornitore,
                Prodotto: r.prodotto,
                Quantita: r.quantita,
                'Prezzo Unitario': r.prezzo_unitario,
                'Totale Imponibile': imp.toFixed(2),
                'IVA %': ivaPerc,
                'IVA Totale': ivaVal.toFixed(2),
                'Totale Ivato': totIvato.toFixed(2),
                Lotto: r.lotto,
                Scadenza: r.scadenza ? new Date(r.scadenza).toLocaleDateString() : '',
                Documento: r.note
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Magazzino");
        XLSX.writeFile(wb, "Magazzino_Export.xlsx");
    };

    // --- SALVATAGGIO MANUALE (FIXED) ---
    const salvaMerciManuale = async (e) => {
        e.preventDefault();
        try {
            const url = merciForm.id ? `${API_URL}/api/haccp/merci/${merciForm.id}` : `${API_URL}/api/haccp/merci`;
            const method = merciForm.id ? 'PUT' : 'POST';
            
            // Assicuriamoci di mandare numeri e null dove serve
            const payload = { 
                ...merciForm, 
                ristorante_id: user.id, 
                operatore: 'ADMIN', // Importante per il backend
                prezzo: parseFloat(merciForm.prezzo) || 0,
                prezzo_unitario: parseFloat(merciForm.prezzo_unitario) || 0,
                iva: parseFloat(merciForm.iva) || 0,
                scadenza: merciForm.scadenza ? merciForm.scadenza : null,
                temperatura: merciForm.temperatura ? parseFloat(merciForm.temperatura) : null
            };
            
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();

            if(data.success) {
                alert(merciForm.id ? "✅ Riga aggiornata!" : "✅ Merce registrata!");
                setMerciForm({ 
                    id: null, data_ricezione: new Date().toISOString().split('T')[0],
                    fornitore:'', prodotto:'', quantita:'', prezzo_unitario:'', iva:'', prezzo:'', 
                    lotto:'', scadenza:'', note:'', allegato_url:'', destinazione:'', temperatura: '', conforme: true, integro: true
                });
                ricaricaDati();
            } else {
                alert("Errore API: " + (data.error || "Sconosciuto"));
            }
        } catch (err) { alert("Errore Salvataggio: " + err.message); }
    };

    const iniziaModifica = (r) => {
        setTab('carico');
        setMerciForm({
            ...r,
            data_ricezione: r.data_ricezione ? r.data_ricezione.split('T')[0] : '',
            scadenza: r.scadenza ? r.scadenza.split('T')[0] : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminaMerce = async (id) => {
        if(!window.confirm("Sei sicuro di voler eliminare questa riga?")) return;
        try {
            await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'});
            ricaricaDati();
        } catch(e) { alert("Errore eliminazione"); }
    };

    // --- HELPER TABELLA ---
    const movimentiFiltrati = stats.storico.filter(r => (r.prodotto + r.fornitore + (r.note||"")).toLowerCase().includes(filtro.toLowerCase()));
    
    const renderRowData = (r) => {
        const qta = parseFloat(r.quantita) || 0;
        const unit = parseFloat(r.prezzo_unitario) || 0;
        const imp = parseFloat(r.prezzo) || (qta * unit);
        const iva = parseFloat(r.iva) || 0;
        const ivaTot = imp * (iva / 100);
        const totIvato = imp + ivaTot;
        return { imp: imp.toFixed(2), ivaTot: ivaTot.toFixed(2), totIvato: totIvato.toFixed(2) };
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div style={{padding: '20px', background: '#f4f6f8', minHeight: '90vh', fontFamily:"'Inter', sans-serif"}}>
            
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2 style={{color: '#2c3e50', margin:0}}>📦 Magazzino & Acquisti</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={() => setTab('dashboard')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='dashboard'?'#34495e':'white', color:tab==='dashboard'?'white':'#333', border:'1px solid #ccc'}}>📊 Dashboard</button>
                    <button onClick={() => setTab('carico')} style={{padding:'10px 20px', borderRadius:20, cursor:'pointer', background: tab==='carico'?'#27ae60':'white', color:tab==='carico'?'white':'#27ae60', border:'1px solid #27ae60'}}>📥 Nuovo Arrivo</button>
                </div>
            </div>

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
                    <div style={{background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                        <h3>💰 Spesa per Fornitore</h3>
                        <div style={{height: 250}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.fornitori} dataKey="totale" nameKey="fornitore" cx="50%" cy="50%" outerRadius={80} label>{stats.fornitori.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                                    <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* SEZIONE CARICO / MODIFICA */}
            {tab === 'carico' && (
                <div>
                     <div style={{display:'flex', gap:15, marginBottom:20}}>
                        <div style={{flex:1, background:'white', padding:20, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                            <div><h3 style={{margin:0, color:'#27ae60'}}>📊 Importa Excel</h3><p style={{margin:0, fontSize:12}}>Carica lista prodotti (No Duplicati)</p></div>
                            <button onClick={() => importExcelRef.current.click()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:25, cursor:'pointer'}}>📂 CARICA XLS</button>
                            <input type="file" ref={importExcelRef} accept=".xlsx, .xls" onChange={handleImportExcel} style={{display:'none'}} />
                        </div>
                    </div>

                    <div style={{background:'white', padding:25, borderRadius:15, marginBottom:30, borderLeft:'5px solid #27ae60', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                        <h3 style={{marginTop:0, color:'#2c3e50'}}>{merciForm.id ? '✏️ Modifica Arrivo' : '📥 Nuovo Arrivo'}</h3>
                        <form onSubmit={salvaMerciManuale} style={{display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end'}}>
                            
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Data</label><input type="date" required value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Russo" /></div>
                            <div style={{flex:2, minWidth:180}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Vodka" /></div>
                            
                            {/* PREZZI & QTA */}
                            <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Quantità</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>P. Unitario (€)</label><input type="number" step="0.01" value={merciForm.prezzo_unitario} onChange={e=>setMerciForm({...merciForm, prezzo_unitario:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="€ Unit" /></div>
                            <div style={{flex:1, minWidth:60}}><label style={{fontSize:11}}>IVA %</label><input type="number" value={merciForm.iva} onChange={e=>setMerciForm({...merciForm, iva:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="22" /></div>
                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>TOTALE (Imp)</label><input type="number" step="0.01" value={merciForm.prezzo} readOnly style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5, background:'#eee', fontWeight:'bold'}} placeholder="Totale" /></div>

                            <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:130}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>
                            <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Temp °C</label><input type="number" step="0.1" value={merciForm.temperatura} onChange={e=>setMerciForm({...merciForm, temperatura:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} /></div>

                            <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note (DDT/Fattura)</label><input value={merciForm.note} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} style={{width:'100%', padding:10, border:'1px solid #ddd', borderRadius:5}} placeholder="Es. Fattura 1004" /></div>

                            <div style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.conforme} onChange={e=>setMerciForm({...merciForm, conforme:e.target.checked})} /> Conforme</label>
                                <label style={{fontSize:11, display:'flex', alignItems:'center'}}><input type="checkbox" checked={merciForm.integro} onChange={e=>setMerciForm({...merciForm, integro:e.target.checked})} /> Integro</label>
                            </div>

                            <button type="submit" style={{padding:'10px 25px', background: merciForm.id ? '#f39c12' : '#27ae60', color:'white', border:'none', borderRadius:5, fontWeight:'bold', cursor:'pointer', height:42}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
                            {merciForm.id && <button type="button" onClick={()=>{setMerciForm({id:null, data_ricezione:'', fornitore:'', prodotto:'', quantita:'', prezzo:'', prezzo_unitario:'', iva:'', lotto:'', scadenza:'', note:''});}} style={{padding:'10px', background:'#95a5a6', color:'white', border:'none', borderRadius:5, cursor:'pointer', height:42}}>ANNULLA</button>}
                        </form>
                    </div>
                </div>
            )}

            {/* TABELLA STORICO */}
            <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                    <h3>📦 Storico</h3>
                    <div style={{display:'flex', gap:10}}>
                         <button onClick={handleDownloadExcel} style={{background:'#f39c12', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report</button>
                         <input type="text" placeholder="Cerca..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                    </div>
                </div>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f0f0f0', textAlign:'left', color:'#333', borderBottom:'2px solid #ddd'}}>
                                <th style={{padding:10}}>Data</th>
                                <th style={{padding:10}}>Fornitore</th>
                                <th style={{padding:10}}>Prodotto</th>
                                <th style={{padding:10}}>Qta</th>
                                <th style={{padding:10}}>Unit.</th>
                                <th style={{padding:10}}>IVA</th>
                                <th style={{padding:10}}>Totale</th>
                                <th style={{padding:10}}>Lotto</th>
                                <th style={{padding:10}}>Scadenza</th>
                                <th style={{padding:10}}>Temp</th>
                                <th style={{padding:10}}>Note / Doc</th>
                                <th style={{padding:10}}>Allegato</th>
                                <th style={{padding:10}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentiFiltrati.slice(0, 100).map((r, i) => {
                                const calcs = renderRowData(r);
                                return (
                                    <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                        <td style={{padding:10}}>{new Date(r.data_ricezione).toLocaleDateString()}</td>
                                        <td style={{padding:10}}>{r.fornitore}</td>
                                        <td style={{padding:10, fontWeight:'bold'}}>{r.prodotto}</td>
                                        <td style={{padding:10}}>{r.quantita}</td>
                                        <td style={{padding:10}}>€ {r.prezzo_unitario || '-'}</td>
                                        <td style={{padding:10}}>{r.iva ? r.iva + '%' : '-'}</td>
                                        <td style={{padding:10, color:'#27ae60', fontWeight:'bold'}}>€ {calcs.totIvato}</td>
                                        <td style={{padding:10, fontSize:12}}>{r.lotto || '-'}</td>
                                        <td style={{padding:10}}>{r.scadenza ? new Date(r.scadenza).toLocaleDateString() : '-'}</td>
                                        <td style={{padding:10}}>{r.temperatura ? r.temperatura + '°' : '-'}</td>
                                        <td style={{padding:10, fontSize:12, color:'#555'}}>{r.note}</td>
                                        <td style={{padding:10}}>
                                           {r.allegato_url && <button onClick={() => window.open(r.allegato_url, '_blank')} style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 6px', cursor:'pointer'}}>📎</button>}
                                        </td>
                                        <td style={{padding:10, display:'flex', gap:5}}>
                                            <button onClick={()=>iniziaModifica(r)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Modifica">✏️</button>
                                            <button onClick={()=>eliminaMerce(r.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Elimina">🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminMagazzino;