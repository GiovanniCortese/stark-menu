// client/src/components/haccp/MerciManager.jsx
import React, { useState, useEffect, useRef } from 'react';
// IMPORTIAMO IL COMPONENTE DI STAGING DEL MAGAZZINO
// Assicurati che questo percorso sia corretto nella tua struttura
import MagazzinoStaging from '../../warehouse/components/MagazzinoStaging';

const MerciManager = (props) => {
    // 1. ESTRAPOLIAMO LE PROPS
    const { 
        API_URL = "https://stark-backend-gg17.onrender.com",
        ristoranteId, 
        mode = "haccp", 
        title, 
        showHaccpToggle = false,
        openDownloadModal,
        // Props da Haccp.jsx (se controllato dal padre)
        merci: propMerci,
        merciForm: propForm,
        setMerciForm: propSetForm,
        salvaMerci: propSalva,
        handleMerciPhoto: propPhoto,
        uploadingMerci: propUploading,
        iniziaModificaMerci: propIniziaModifica,
        eliminaMerce: propElimina,
        assets: propAssets,
        resetMerciForm: propReset,
        ricaricaDati // Callback opzionale per ricaricare i dati del padre
    } = props;

    // Se propMerci è definito, allora lo stato è gestito dal padre (Haccp.jsx)
    const isControlled = propMerci !== undefined;

    // --- STATI INTERNI (Usati solo se il componente lavora in autonomia) ---
    const initialInternalForm = {
        data_ricezione: new Date().toISOString().split('T')[0],
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        fornitore: '', 
        numero_bolla: '',    
        codice_articolo: '', 
        prodotto: '', 
        quantita: '', 
        unita_misura: 'pz',
        prezzo: '',          // Teniamo nel form per inserimento manuale, ma nascosto in tabella
        prezzo_unitario: '', 
        lotto: '', 
        scadenza: '', 
        destinazione: '', 
        condizioni: 'conforme', 
        note: '', 
        allegato_url: '',
        is_haccp: mode === 'haccp'
    };

    const [internalMerci, setInternalMerci] = useState([]);
    const [internalAssets, setInternalAssets] = useState([]);
    const [internalForm, setInternalForm] = useState(initialInternalForm);
    const [internalLoading, setInternalLoading] = useState(false);
    const [internalUploading, setInternalUploading] = useState(false);

    // --- VARIABILI UNIFICATE ---
    const merci = isControlled ? propMerci : internalMerci;
    const assets = isControlled ? propAssets : internalAssets;
    const merciForm = isControlled ? propForm : internalForm;
    const setMerciForm = isControlled ? propSetForm : setInternalForm;
    const uploadingMerci = isControlled ? propUploading : internalUploading;

    // --- SCAN & AI STATE ---
    const [isScanning, setIsScanning] = useState(false);
    const [view, setView] = useState('lista'); // 'lista', 'staging'
    const [stagingData, setStagingData] = useState(null);
    const scanInputRef = useRef(null);

    // --- NAVIGAZIONE MESE ---
    const [viewDate, setViewDate] = useState(new Date());

    // --- HELPER TIME ---
    const getCurrentTime = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    // --- LOGICA FETCH (Solo se non controllato dal padre) ---
    useEffect(() => {
        if (!isControlled && ristoranteId) {
            const fetchData = async () => {
                setInternalLoading(true);
                try {
                    // Calcoliamo inizio e fine mese per il filtro
                    const year = viewDate.getFullYear();
                    const month = viewDate.getMonth();
                    const start = new Date(year, month, 1).toISOString().split('T')[0];
                    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

                    const [resM, resA] = await Promise.all([
                        fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}&start=${start}&end=${end}`),
                        fetch(`${API_URL}/api/haccp/assets/${ristoranteId}`)
                    ]);
                    const dataM = await resM.json();
                    setInternalMerci(Array.isArray(dataM) ? dataM : []);
                    setInternalAssets(await resA.json());
                } catch(e) { console.error("Err Fetch", e); }
                finally { setInternalLoading(false); }
            };
            fetchData();
        }
    }, [isControlled, ristoranteId, mode, API_URL, viewDate]);

    // --- LOGICA FILTRO MESE (Se i dati arrivano già filtrati dal backend, questo è ridondante ma sicuro) ---
    const filteredMerci = (merci || []).filter(m => {
        const d = new Date(m.data_ricezione);
        return d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth();
    }).sort((a,b) => new Date(b.data_ricezione) - new Date(a.data_ricezione)); 

    const changeMonth = (delta) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    // --- LOGICA AZIONI ---
    const handleReset = () => {
        if (isControlled && propReset) propReset();
        else setInternalForm(initialInternalForm);
    };

    const handleSave = async (e) => {
        if(e) e.preventDefault();
        const formWithTime = { ...merciForm, ora: merciForm.ora || getCurrentTime() };
        if(!isControlled) setInternalForm(formWithTime); 

        if (isControlled) {
            if (!merciForm.ora) setMerciForm(prev => ({...prev, ora: getCurrentTime()}));
            propSalva(e); 
        } else {
            try {
                // Salvataggio standard (singolo)
                const payload = { ...formWithTime, ristorante_id: ristoranteId };
                const url = payload.id ? `${API_URL}/api/haccp/merci/${payload.id}` : `${API_URL}/api/haccp/merci`; // createMerce usa ora importMerci logic
                const method = payload.id ? 'PUT' : 'POST';
                await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
                handleReset();
                // Refresh
                const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
                setInternalMerci(await r.json());
            } catch(e) { alert("Errore salvataggio"); }
        }
    };

    const handlePhoto = async (e) => {
        if (isControlled) {
            propPhoto(e);
        } else {
            const f = e.target.files[0]; if(!f) return;
            setInternalUploading(true);
            const fd = new FormData(); fd.append('photo', f);
            try {
                const res = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
                const d = await res.json();
                if(d.url) setInternalForm(prev => ({...prev, allegato_url: d.url}));
            } catch(e) { alert("Err Upload"); }
            finally { setInternalUploading(false); }
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Eliminare? Verrà aggiornato lo stock del magazzino.")) return;

        if (isControlled) {
            propElimina(id);
        } else {
            await fetch(`${API_URL}/api/haccp/merci/${id}`, { method: 'DELETE' });
            // Refresh rapido
            const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
            setInternalMerci(await r.json());
        }
    };

    const handleEdit = (m) => {
        const cleanData = {
            ...m,
            // Mapping corretto dei campi
            numero_bolla: m.numero_bolla || m.riferimento_documento || '',
            codice_articolo: m.codice_articolo || '',
            note: m.note || '',
            condizioni: m.condizioni || 'conforme',
            scadenza: m.scadenza ? m.scadenza.split('T')[0] : '',
            data_ricezione: m.data_ricezione ? m.data_ricezione.split('T')[0] : ''
        };
        if(isControlled) propIniziaModifica(cleanData);
        else setInternalForm(cleanData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- MAGIC SCAN & STAGING LOGIC ---
    
    const handleScanBolla = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        setIsScanning(true); 
        try {
            const fd = new FormData();
            // Invia direttamente il file (PDF o Immagine)
            fd.append('photo', file);
            
            // Usa l'endpoint che riconosce i PDF e estrae TUTTO (scanBolla aggiornato)
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            
            // I dati arrivano completi (Prezzi, IVA, etc.)
            const data = json.data;
            if (data.prodotti) {
                // Impostiamo is_haccp=true ma manteniamo i prezzi per il salvataggio in magazzino
                data.prodotti = data.prodotti.map(p => ({ ...p, is_haccp: true }));
            }
            
            // Passa alla vista di revisione (Staging)
            setStagingData([data]); 
            setView('staging');
            
        } catch(err) { alert("⚠️ ERRORE SCANSIONE: " + err.message); } 
        finally { setIsScanning(false); e.target.value = null; }
    };

    // Conferma salvataggio da Staging
    const handleStagingConfirm = async (datiFinali) => {
        try {
            // Chiamata all'endpoint importMerci (che salva prima in Magazzino poi in HACCP)
            const url = `${API_URL}/api/haccp/merci/import`; 
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merci: datiFinali })
            });
            const json = await res.json();
            
            if (json.success) {
                alert("✅ Carico completato: Magazzino aggiornato e Registro HACCP compilato!");
                setStagingData(null);
                setView('lista');
                
                // Ricarica dati
                if (isControlled && ricaricaDati) ricaricaDati(); 
                else if (!isControlled) {
                    const r = await fetch(`${API_URL}/api/haccp/merci/${ristoranteId}?mode=${mode}`);
                    setInternalMerci(await r.json());
                } else {
                    window.location.reload(); 
                }
            } else {
                alert("Errore salvataggio: " + json.error);
            }
        } catch (e) {
            alert("Errore server.");
        }
    };

    // --- RENDER ---
    
    // 1. VISTA REVISIONE (Staging)
    if (view === 'staging') {
        return (
            <MagazzinoStaging 
                initialData={stagingData}
                onConfirm={handleStagingConfirm}
                onCancel={() => { 
                    if(window.confirm("Annullare il caricamento?")) {
                        setView('lista');
                        setStagingData(null);
                    } 
                }}
                // NOTA: Non nascondiamo i prezzi qui (hidePrices={false}) così puoi controllare
                // che l'AI abbia letto bene la fattura prima di caricare il magazzino.
            />
        );
    }

    // 2. VISTA STANDARD (Lista HACCP)
    return (
        <div className="no-print">
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <h3 style={{color:'#2c3e50', margin:0}}>{title || (mode === 'all' ? "📦 Magazzino Generale" : "🍎 Ricevimento Merci HACCP")}</h3>
                
                {openDownloadModal && (
                    <button onClick={()=>openDownloadModal('merci')} style={{background:'#f39c12', color:'white', border:'none', padding:'6px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report Excel</button>
                )}
            </div>

            {/* MAGIC SCAN BUTTON */}
            <div onClick={() => scanInputRef.current.click()} style={{marginBottom: 20, padding: 15, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, color: 'white', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: 'pointer'}}>
                <div><h3 style={{margin:0}}>✨ Magic Scan (AI)</h3><p style={{margin:0, fontSize:12}}>Carica Foto o PDF per caricare Magazzino + HACCP.</p></div>
                <button disabled={isScanning} style={{background:'white', color:'#764ba2', border:'none', padding:'10px 20px', borderRadius:25, fontWeight:'bold'}}>{isScanning ? '🤖...' : '📸 SCANSIONA'}</button>
                <input type="file" ref={scanInputRef} accept="image/*,application/pdf" onChange={handleScanBolla} style={{ display: 'none' }} />            
            </div>

            {/* FORM MANUALE (Opzionale, per inserimenti rapidi senza bolla) */}
            <div style={{background:'white', padding:20, borderRadius:10, marginBottom:20, borderLeft: '5px solid #27ae60'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><h3>{merciForm.id ? '✏️ Modifica' : '📥 Inserimento Manuale'}</h3>{merciForm.id && <button onClick={handleReset}>Annulla</button>}</div>
                <form onSubmit={handleSave} style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}}>
                    
                    {/* RIGA 1 */}
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Data</label><input type="date" value={merciForm.data_ricezione} onChange={e=>setMerciForm({...merciForm, data_ricezione:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:0.5, minWidth:80}}><label style={{fontSize:11}}>Ora</label><input type="time" value={merciForm.ora || ''} onChange={e=>setMerciForm({...merciForm, ora:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1.5, minWidth:120}}><label style={{fontSize:11}}>N. Documento</label><input type="text" value={merciForm.numero_bolla || ''} onChange={e=>setMerciForm({...merciForm, numero_bolla:e.target.value})} placeholder="Es. 104" style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Fornitore</label><input value={merciForm.fornitore} onChange={e=>setMerciForm({...merciForm, fornitore:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>

                    {/* RIGA 2 */}
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Cod. Art.</label><input value={merciForm.codice_articolo || ''} onChange={e=>setMerciForm({...merciForm, codice_articolo:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:2, minWidth:150}}><label style={{fontSize:11}}>Prodotto</label><input value={merciForm.prodotto} onChange={e=>setMerciForm({...merciForm, prodotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} required /></div>
                    <div style={{flex:1, minWidth:80}}><label style={{fontSize:11}}>Quantità</label><input type="number" step="0.01" value={merciForm.quantita} onChange={e=>setMerciForm({...merciForm, quantita:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:0.8, minWidth:80}}>
                        <label style={{fontSize:11}}>U.M.</label>
                        <select value={merciForm.unita_misura || 'pz'} onChange={e=>setMerciForm({...merciForm, unita_misura:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                            <option value="pz">Pz</option><option value="kg">Kg</option><option value="lt">Lt</option><option value="ct">Ct</option>
                        </select>
                    </div>

                    {/* RIGA 3 - LOTTO & SCADENZA (Cruciali per HACCP) */}
                    <div style={{flex:1, minWidth:100}}><label style={{fontSize:11}}>Lotto</label><input value={merciForm.lotto} onChange={e=>setMerciForm({...merciForm, lotto:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    <div style={{flex:1, minWidth:120}}><label style={{fontSize:11}}>Scadenza</label><input type="date" value={merciForm.scadenza} onChange={e=>setMerciForm({...merciForm, scadenza:e.target.value})} style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>
                    
                    <div style={{flex:1, minWidth:120}}>
                        <label style={{fontSize:11}}>Condizioni</label>
                        <select value={merciForm.condizioni || 'conforme'} onChange={e=>setMerciForm({...merciForm, condizioni:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd', borderColor: merciForm.condizioni === 'conforme' ? '#27ae60' : '#e74c3c'}}>
                            <option value="conforme">✅ Conforme</option>
                            <option value="non_conforme">❌ Non Conforme</option>
                        </select>
                    </div>
                    
                    <div style={{flex:1, minWidth:150}}><label style={{fontSize:11}}>Stoccaggio</label>
                      <select value={merciForm.destinazione} onChange={e=>setMerciForm({...merciForm, destinazione:e.target.value})} style={{width:'100%', padding:9, border:'1px solid #ddd'}}>
                          <option value="">-- Seleziona --</option>
                          {assets && assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                      </select>
                    </div>
                    
                    <div style={{flex:2, minWidth:200}}><label style={{fontSize:11}}>Note</label><input value={merciForm.note || ''} onChange={e=>setMerciForm({...merciForm, note:e.target.value})} placeholder="Eventuali note..." style={{width:'100%', padding:8, border:'1px solid #ddd'}} /></div>

                    <label style={{background: merciForm.allegato_url ? '#2ecc71' : '#ecf0f1', padding:'10px', borderRadius:5, cursor:'pointer', fontSize:12, marginTop:18}}>{uploadingMerci ? "..." : "📎 Allegato"}<input type="file" accept="image/*,.pdf" onChange={handlePhoto} style={{display:'none'}} /></label>
                    <button type="submit" style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', marginTop:18}}>{merciForm.id ? 'AGGIORNA' : 'SALVA'}</button>
                </form>
            </div>

            {/* SELETTORE MESE */}
            <div style={{display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '10px', borderRadius: '8px 8px 0 0', border: '1px solid #eee', borderBottom: 'none', width: 'fit-content'}}>
                <button onClick={() => changeMonth(-1)} style={{background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '0 10px'}}>◀</button>
                <span style={{fontWeight: 'bold', minWidth: '150px', textAlign: 'center', color: '#2c3e50'}}>
                    {viewDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
                <button onClick={() => changeMonth(1)} style={{background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '0 10px'}}>▶</button>
            </div>

            {/* TABELLA STORICO (Senza Prezzi per HACCP) */}
            <div style={{background:'white', border:'1px solid #eee', borderTop:'none', borderRadius:'0 0 10px 10px'}}>
                <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                        <thead>
                            <tr style={{background:'#ecf0f1', color:'#2c3e50', textAlign:'left'}}>
                                <th style={{padding:12}}>Data</th>
                                <th style={{padding:12}}>Rif. Doc</th>
                                <th style={{padding:12}}>Fornitore</th>
                                <th style={{padding:12}}>Cod. Art</th>
                                <th style={{padding:12}}>Prodotto</th>
                                <th style={{padding:12}}>Qta</th>
                                <th style={{padding:12}}>Lotto</th>
                                <th style={{padding:12}}>Scadenza</th>
                                <th style={{padding:12}}>Condizioni</th>
                                <th style={{padding:12}}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMerci.length === 0 ? (
                                <tr><td colSpan="10" style={{padding:20, textAlign:'center', color:'#999'}}>Nessuna registrazione in questo mese.</td></tr>
                            ) : (
                                filteredMerci.map(m => (
                                    <tr key={m.id} style={{borderBottom:'1px solid #eee', background: (showHaccpToggle && !m.is_haccp) ? '#fcfcfc' : 'white'}}>
                                        <td style={{padding:10}}>
                                            {new Date(m.data_ricezione).toLocaleDateString()}
                                            <div style={{fontSize:10, color:'#999'}}>{m.ora}</div>
                                        </td>
                                        
                                        <td style={{padding:10}}>
                                            <strong>{m.riferimento_documento || m.numero_bolla || '-'}</strong>
                                        </td>
                                        
                                        <td style={{padding:10}}>{m.fornitore}</td>
                                        <td style={{padding:10}}>{m.codice_articolo || '-'}</td>
                                        <td style={{padding:10}}>
                                            <strong style={{color: m.is_haccp ? '#2c3e50' : '#7f8c8d'}}>{m.prodotto}</strong>
                                            {m.allegato_url && <span style={{marginLeft:5, fontSize:12}}>📎</span>}
                                        </td>
                                        <td style={{padding:10}}>{m.quantita} {m.unita_misura}</td>
                                        
                                        <td style={{padding:10, fontFamily:'monospace'}}>{m.lotto || '-'}</td>
                                        <td style={{padding:10, color: m.scadenza ? '#c0392b' : '#333'}}>
                                            {m.scadenza ? new Date(m.scadenza).toLocaleDateString() : '-'}
                                        </td>
                                        
                                        <td style={{padding:10}}>
                                            {m.condizioni === 'non_conforme' ? (
                                                <span style={{background:'#fadbd8', color:'#e74c3c', padding:'3px 8px', borderRadius:10, fontSize:10, fontWeight:'bold'}}>NON CONFORME</span>
                                            ) : (
                                                <span style={{background:'#d5f5e3', color:'#27ae60', padding:'3px 8px', borderRadius:10, fontSize:10, fontWeight:'bold'}}>OK</span>
                                            )}
                                        </td>
                                        <td style={{padding:10}}>
                                            <button onClick={()=>handleEdit(m)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16}}>✏️</button>
                                            <button onClick={()=>handleDelete(m.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:16}}>🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MerciManager;