// client/src/components_admin/AdminMenu.jsx - VERSIONE V48 (TOGGLE SUITE & ORDINI) 🛠️
import { useState, useRef } from 'react'; 
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ProductRow from './ProductRow';

const LISTA_ALLERGENI = [
  "Glutine 🌾", "Crostacei 🦐", "Uova 🥚", "Pesce 🐟", "Arachidi 🥜", 
  "Soia 🫘", "Latte 🥛", "Frutta a guscio 🌰", "Sedano 🥬", 
  "Senape 🌭", "Sesamo 🍔", "Solfiti 🍷", "Lupini 🌼", "Molluschi 🐙",
  "Prodotto Surgelato/Abbattuto ❄️" 
];

const LANGUAGES_MAP = {
    en: "Inglese 🇬🇧",
    fr: "Francese 🇫🇷",
    de: "Tedesco 🇩🇪",
    es: "Spagnolo 🇪🇸",
    pt: "Portoghese 🇵🇹",
    pl: "Polacco 🇵🇱",
    ru: "Russo 🇷🇺"
};

const parseAllergeniSicuro = (valore) => {
    try {
        if (Array.isArray(valore)) return valore;
        if (typeof valore === 'string') return JSON.parse(valore);
        return [];
    } catch (e) { return []; }
};

const ImageUploader = ({ type, currentUrl, icon, config, setConfig, API_URL }) => (
    <div style={{marginTop:'5px', flex:1, minWidth:'200px'}}>
        {currentUrl ? (
            <div style={{
                position:'relative', border:'1px solid #27ae60', borderRadius:'8px', padding:'10px', 
                background:'#f0fff4', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center',
                height:'100%', boxSizing:'border-box', justifyContent:'center'
            }}>
                <span style={{fontSize:'24px', marginBottom:'5px'}}>{icon}</span>
                <span style={{fontSize:'12px', fontWeight:'bold', color:'#27ae60'}}>File Caricato!</span>
                <button 
                    onClick={() => setConfig({...config, [type]: ''})} 
                    style={{
                        marginTop:'8px', background:'#e74c3c', color:'white', border:'none', 
                        padding:'5px 10px', borderRadius:'5px', cursor:'pointer', fontSize:'11px', fontWeight:'bold'
                    }}
                >
                    🗑️ RIMUOVI
                </button>
            </div>
        ) : (
            <div style={{
                border:'2px dashed #ccc', borderRadius:'8px', padding:'15px', textAlign:'center', 
                position:'relative', cursor:'pointer', background:'#fafafa', transition:'all 0.3s',
                height:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'
            }}>
                <span style={{fontSize:'24px', opacity:0.5}}>{icon}</span>
                <div style={{fontSize:'11px', color:'#666', marginTop:'5px'}}>Clicca per caricare</div>
                <input 
                    type="file" 
                    onChange={async (e) => {
                        const f = e.target.files[0]; if(!f) return;
                        const fd = new FormData(); fd.append('photo', f);
                        try {
                            const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
                            const d = await r.json();
                            if(d.url) {
                                setConfig(prev => ({...prev, [type]: d.url}));
                            }
                        } catch(err) { alert("Errore caricamento"); }
                    }} 
                    style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} 
                />
            </div>
        )}
    </div>
);

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ 
      nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '',
      ingredienti_base: '', varianti_str: '', allergeni: [], unita_misura: '', qta_minima: 1 
  });

  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const menuScanRef = useRef(null);
  const [traduzioniInput, setTraduzioniInput] = useState({});
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false); 
  const [translating, setTranslating] = useState(false); 

  if (!config || !categorie || !menu) {
      return <div style={{padding:'40px', textAlign:'center', color:'#666'}}>🔄 Caricamento Menu...</div>;
  }

  // --- NUOVE FUNZIONI TOGGLE ---
  const toggleOrdini = async () => {
      const newVal = !config.ordini_abilitati;
      setConfig({ ...config, ordini_abilitati: newVal });
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ordini_abilitati: newVal })
          });
      } catch (e) { alert("Errore connessione"); }
  };

  const toggleSuite = async () => {
      const newVal = !config.cucina_super_active;
      setConfig({ ...config, cucina_super_active: newVal });
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cucina_super_active: newVal })
          });
          // Ricarica per aggiornare la sidebar (nascondere/mostrare pulsanti Cucina/Bar)
          setTimeout(() => window.location.reload(), 500);
      } catch (e) { alert("Errore connessione"); }
  };

  const isAbbonamentoAttivo = config.account_attivo !== false; 
  
  const handleSaveStyle = async () => {
    try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config) });
        alert("✨ Impostazioni salvate!");
    } catch(e) { alert("Errore salvataggio"); }
  };

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      
      let variantiJson = [];
      if (nuovoPiatto.varianti_str) {
          variantiJson = nuovoPiatto.varianti_str.split(',').map(v => {
              const [nome, prezzo] = v.split(':');
              return (nome && prezzo) ? { nome: nome.trim(), prezzo: parseFloat(prezzo) } : null;
          }).filter(Boolean);
      }
      const ingredientiBaseArr = nuovoPiatto.ingredienti_base ? nuovoPiatto.ingredienti_base.split(',').map(i => i.trim()).filter(Boolean) : [];
      const variantiFinali = { base: ingredientiBaseArr, aggiunte: variantiJson };
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      const subCat = nuovoPiatto.sottocategoria || ""; 
      
      const allergeniFinali = Array.isArray(nuovoPiatto.allergeni) ? nuovoPiatto.allergeni : [];

      const payload = { 
          ...nuovoPiatto, 
          categoria: cat, 
          sottocategoria: subCat, 
          ristorante_id: user.id, 
          varianti: JSON.stringify(variantiFinali),
          allergeni: JSON.stringify(allergeniFinali),
          traduzioni: traduzioniInput 
      };
      delete payload.varianti_str; delete payload.ingredienti_base;

      try {
          const method = editId ? 'PUT' : 'POST';
          const url = editId ? `${API_URL}/api/prodotti/${editId}` : `${API_URL}/api/prodotti`;
          if(!editId && categorie.length === 0) return alert("Crea prima una categoria!"); 
          await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
          alert(editId ? "✅ Piatto aggiornato!" : "✅ Piatto creato!");
          
          setNuovoPiatto({ nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: '', allergeni: [], unita_misura: '', qta_minima: 1 }); 
          setTraduzioniInput({}); 
          setEditId(null); ricaricaDati(); 
      } catch(err) { alert("❌ Errore: " + err.message); }
  };

  const handleFileChange = async (e) => { 
      const f=e.target.files[0]; if(!f)return; setUploading(true); 
      const fd=new FormData(); fd.append('photo', f); 
      try { const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); } catch(e) { console.error(e); } finally { setUploading(false); }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setImporting(true); 
    const formData = new FormData(); formData.append('file', file); formData.append('ristorante_id', user.id);
    try { 
        const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData }); 
        const data = await res.json(); 
        if(data.success) { alert(data.message); ricaricaDati(); } else { alert("Errore: " + data.error); }
    } catch(err) { alert("Errore Connessione"); } finally { setImporting(false); }
  };

  const handleMenuScan = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setIsScanningMenu(true); const formData = new FormData(); formData.append('photo', file);
    try {
        const resAI = await fetch(`${API_URL}/api/menu/scan-photo`, { method: 'POST', body: formData });
        const jsonAI = await resAI.json();
        if(!jsonAI.success) throw new Error(jsonAI.error || "Errore scansione");
        const resImport = await fetch(`${API_URL}/api/prodotti/import-massivo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prodotti: jsonAI.data, ristorante_id: user.id })
        });
        const dataImport = await resImport.json();
        if (!resImport.ok) throw new Error(dataImport.error || "Errore salvataggio");
        alert(`✅ Scansione completata!\n\n🆕 ${dataImport.added} piatti aggiunti\n🔄 ${dataImport.updated} piatti aggiornati`);
        if(ricaricaDati) ricaricaDati(); 
    } catch(err) { alert("❌ Errore: " + err.message); } finally { setIsScanningMenu(false); e.target.value = null; }
  };

  const cancellaPiatto = async (id) => { if(confirm("Sei sicuro di voler eliminare questo piatto?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  
  const avviaModifica = (piatto) => { 
      setEditId(piatto.id); 
      let variantiObj = { base: [], aggiunte: [] }; 
      try { variantiObj = typeof piatto.varianti === 'string' ? JSON.parse(piatto.varianti) : piatto.varianti || { base: [], aggiunte: [] }; } catch(e) {} 
      const allergeniClean = parseAllergeniSicuro(piatto.allergeni);

      setNuovoPiatto({ 
          ...piatto, 
          categoria: piatto.categoria, 
          sottocategoria: piatto.sottocategoria || '', 
          unita_misura: piatto.unita_misura || '', 
          qta_minima: piatto.qta_minima || 1, 
          allergeni: allergeniClean, 
          ingredienti_base: (variantiObj.base || []).join(', '), 
          varianti_str: (variantiObj.aggiunte || []).map(v => `${v.nome}:${v.prezzo}`).join(', ') 
      }); 
      setTraduzioniInput(piatto.traduzioni || {});
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const annullaModifica = () => { 
      setEditId(null); 
      setNuovoPiatto({ nome:'', prezzo:'', categoria:categorie.length > 0 ? categorie[0].nome : '', sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: '', allergeni: [], unita_misura: '', qta_minima: 1 }); 
      setTraduzioniInput({}); 
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const [destCat, destSub] = result.destination.droppableId.split("::");
    const piattoId = parseInt(result.draggableId);
    let nuovoMenu = [...menu];
    const piattoSpostato = nuovoMenu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;
    nuovoMenu = nuovoMenu.filter(p => p.id !== piattoId);
    const piattoAggiornato = { ...piattoSpostato, categoria: destCat, sottocategoria: destSub === "Generale" ? "" : destSub };
    const prodottiDestinazione = nuovoMenu.filter(p => p.categoria === destCat && (p.sottocategoria || "Generale") === destSub).sort((a,b) => (a.posizione||0) - (b.posizione||0)); 
    prodottiDestinazione.splice(result.destination.index, 0, piattoAggiornato);
    const altriPiatti = nuovoMenu.filter(p => !(p.categoria === destCat && (p.sottocategoria || "Generale") === destSub));
    const piattiDestinazioneFinali = prodottiDestinazione.map((p, idx) => ({ id: p.id, posizione: idx, categoria: p.categoria, sottocategoria: p.sottocategoria }));
    setMenu([...altriPiatti, ...piattiDestinazioneFinali]);
    await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: piattiDestinazioneFinali.map(p => ({ id: p.id, posizione: p.posizione, categoria: p.categoria, sottocategoria: p.sottocategoria })) }) });
  };

  const spostaSottocategoria = async (catNome, subKey, direzione) => {
      const prodottiCat = menu.filter(p => p.categoria === catNome);
      const groups = prodottiCat.reduce((acc, p) => { const s = p.sottocategoria || "Generale"; if (!acc[s]) acc[s] = []; acc[s].push(p); return acc; }, {});
      let groupKeys = Object.keys(groups).sort((a,b) => { const minPosA = Math.min(...groups[a].map(p => p.posizione || 0)); const minPosB = Math.min(...groups[b].map(p => p.posizione || 0)); return minPosA - minPosB; });
      const idx = groupKeys.indexOf(subKey); if (idx === -1) return;
      const nuovoIdx = idx + direzione; if (nuovoIdx < 0 || nuovoIdx >= groupKeys.length) return;
      [groupKeys[idx], groupKeys[nuovoIdx]] = [groupKeys[nuovoIdx], groupKeys[idx]];
      let nuoviProdottiDaSalvare = []; let globalCounter = 0;
      groupKeys.forEach(key => { const prods = groups[key].sort((a,b) => (a.posizione||0) - (b.posizione||0)); prods.forEach(p => { nuoviProdottiDaSalvare.push({ ...p, posizione: globalCounter++ }); }); });
      const altriProdotti = menu.filter(p => p.categoria !== catNome);
      setMenu([...altriProdotti, ...nuoviProdottiDaSalvare]);
      await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: nuoviProdottiDaSalvare.map(p => ({ id: p.id, posizione: p.posizione, categoria: p.categoria, sottocategoria: p.sottocategoria })) }) });
  };

  const containerStyle = { width: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#333', boxSizing: 'border-box' };
  const cardStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '25px', marginBottom: '30px', border: '1px solid #f0f0f0', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', background: '#f9f9f9', transition: 'all 0.3s', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={containerStyle}>
        
        {/* OVERLAY LOADING */}
        {(importing || isScanningMenu || translating) && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.9)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{fontSize:'50px'}}>{translating ? "🌍" : "🤖"}</div>
                <h2 style={{color: translating ? '#16a085' : '#3498db'}}>{translating ? "Traduzione Intelligente in corso..." : (isScanningMenu ? "Analisi Menu con AI..." : "Sto elaborando il file...")}</h2>
                <p>{translating ? "JARVIS sta traducendo il menu, potrebbe richiedere fino a 5 Minuti." : "Potrebbe richiedere fino a 5 Minuti."}</p>
            </div>
        )}

        {/* --- NUOVA SEZIONE: CONFIGURAZIONE OPERATIVA (ORDINI & SUITE) --- */}
        <div style={{...cardStyle, borderLeft:'5px solid #2c3e50', background:'#f8f9fa'}}>
            <h3 style={{marginTop:0, color:'#2c3e50', fontSize:'18px'}}>⚙️ Configurazione Operativa</h3>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px'}}>
                
                {/* 1. RICEZIONE ORDINI (TAVOLI) */}
                <div style={{background: config.ordini_abilitati ? '#e8f8f5' : '#fff', border: config.ordini_abilitati ? '1px solid #2ecc71' : '1px solid #ddd', padding:'15px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{position:'relative', width:'50px', height:'26px'}}>
                        <input type="checkbox" checked={config.ordini_abilitati || false} onChange={toggleOrdini} style={{opacity:0, width:0, height:0}} />
                        <span onClick={toggleOrdini} style={{position:'absolute', cursor:'pointer', top:0, left:0, right:0, bottom:0, background: config.ordini_abilitati ? '#2ecc71' : '#ccc', borderRadius:'34px', transition:'.4s'}}>
                            <span style={{position:'absolute', content:'""', height:'20px', width:'20px', left: config.ordini_abilitati ? '26px' : '4px', bottom:'3px', background:'white', transition:'.4s', borderRadius:'50%'}}></span>
                        </span>
                    </div>
                    <div>
                        <h4 style={{margin:0, color:'#2c3e50'}}>🍽️ Ricezione Ordini</h4>
                        <p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>{config.ordini_abilitati ? "I clienti possono ordinare dal tavolo." : "Ordini bloccati (Solo visualizzazione menu)."}</p>
                    </div>
                </div>

                {/* 2. MODALITÀ SUITE (Attiva Cucina/Bar/Pizzeria) */}
                <div style={{background: config.cucina_super_active ? '#ebf5fb' : '#fff', border: config.cucina_super_active ? '1px solid #3498db' : '1px solid #ddd', padding:'15px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{position:'relative', width:'50px', height:'26px'}}>
                        <input type="checkbox" checked={config.cucina_super_active || false} onChange={toggleSuite} style={{opacity:0, width:0, height:0}} />
                        <span onClick={toggleSuite} style={{position:'absolute', cursor:'pointer', top:0, left:0, right:0, bottom:0, background: config.cucina_super_active ? '#3498db' : '#ccc', borderRadius:'34px', transition:'.4s'}}>
                            <span style={{position:'absolute', content:'""', height:'20px', width:'20px', left: config.cucina_super_active ? '26px' : '4px', bottom:'3px', background:'white', transition:'.4s', borderRadius:'50%'}}></span>
                        </span>
                    </div>
                    <div>
                        <h4 style={{margin:0, color:'#2c3e50'}}>👨‍🍳 Modalità Suite</h4>
                        <p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>{config.cucina_super_active ? "Attivi: Cucina, Bar, Pizzeria & Cassa." : "Attiva: SOLO CASSA (Ideale per piccole attività)."}</p>
                    </div>
                </div>

            </div>
        </div>

        {/* --- PANNEL IMPORT/EXPORT --- */}
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 25px', background:'#fff', flexWrap:'wrap', gap:'15px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}><span style={{fontSize:'24px'}}>📊</span><div><h4 style={{margin:0, color:'#2c3e50'}}>Import/Export Menu</h4><p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>Gestisci il tuo menu massivamente.</p></div></div>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                <button onClick={() => window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank')} style={{background:'white', border:'1px solid #ddd', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', color:'#333', whiteSpace:'nowrap'}}>📤 Scarica Menu</button>
                <div style={{position:'relative'}}><button style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', whiteSpace:'nowrap'}}>📥 Carica Excel</button><input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} /></div>
                <div style={{position:'relative'}}><button onClick={() => menuScanRef.current.click()} style={{background:'#8e44ad', color:'white', padding:'8px 15px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'600', whiteSpace:'nowrap'}}>📸 SCAN MENU CARTACEO</button><input type="file" ref={menuScanRef} accept="image/*,application/pdf" onChange={handleMenuScan} style={{ display: 'none' }} /></div>         
            </div>
        </div>

        {/* --- PANNEL GESTIONE LINGUE --- */}
        <div style={{...cardStyle, padding:'25px', background:'#e8f8f5', border:'1px solid #1abc9c'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px'}}>
                <span style={{fontSize:'28px'}}>🌍</span>
                <div>
                    <h4 style={{margin:0, color:'#16a085', fontSize:'18px'}}>Gestione Lingue Internazionali</h4>
                    <p style={{margin:0, fontSize:'13px', color:'#7f8c8d'}}>Attiva o disattiva le lingue del tuo menu digitale.</p>
                </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'15px'}}>
                {Object.entries(LANGUAGES_MAP).map(([code, label]) => {
                    let isAttiva = false;
                    if (menu) { for (let p of menu) { try { const t = typeof p.traduzioni === 'string' ? JSON.parse(p.traduzioni) : (p.traduzioni || {}); if (t[code]) { isAttiva = true; break; } } catch(e){} } }

                    return (
                        <div key={code} style={{
                            background:'white', borderRadius:'12px', padding:'15px', border: isAttiva ? '2px solid #2ecc71' : '1px solid #ddd',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', justifyContent:'space-between', gap:'10px'
                        }}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                <span style={{fontWeight:'bold', color:'#2c3e50', fontSize:'15px'}}>{label}</span>
                                {isAttiva ? <span style={{fontSize:'10px', background:'#2ecc71', color:'white', padding:'3px 8px', borderRadius:'10px', fontWeight:'bold'}}>ATTIVA</span> : <span style={{fontSize:'10px', background:'#bdc3c7', color:'white', padding:'3px 8px', borderRadius:'10px', fontWeight:'bold'}}>OFF</span>}
                            </div>
                            <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                                {isAttiva && (
                                    <button onClick={async () => { if(!confirm(`Disattivare ${label}?`)) return; try { const res = await fetch(`${API_URL}/api/menu/remove-language`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ristorante_id: user.id, lang: code }) }); if(res.ok) { alert("Lingua disattivata!"); ricaricaDati(); } } catch(e) { alert("Errore"); } }} style={{flex:1, background:'#fff', border:'1px solid #e74c3c', color:'#e74c3c', borderRadius:'6px', padding:'8px', fontSize:'12px', fontWeight:'bold', cursor:'pointer'}}>Disattiva</button>
                                )}
                                <button onClick={async () => { const action = isAttiva ? "Aggiornare" : "Attivare"; if(!confirm(`Vuoi ${action} la traduzione in ${label}?`)) return; setTranslating(true); try { const res = await fetch(`${API_URL}/api/menu/translate-all`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ristorante_id: user.id, languages: [code] }) }); const data = await res.json(); if(data.success) { alert(`✅ ${label} Attivato!`); ricaricaDati(); } else { alert("Errore AI: " + data.error); } } catch(e) { alert("Errore rete"); } finally { setTranslating(false); } }} disabled={translating} style={{flex:1, background: isAttiva ? '#3498db' : '#2ecc71', border:'none', color:'white', borderRadius:'6px', padding:'8px', fontSize:'12px', fontWeight:'bold', cursor: translating ? 'wait' : 'pointer', opacity: translating ? 0.7 : 1}}>
                                    {translating ? "⏳..." : (isAttiva ? "🔄 Aggiorna" : "✨ Attiva")}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {translating && <div style={{marginTop:'15px', textAlign:'center', color:'#16a085', fontSize:'13px', fontWeight:'bold'}}>🤖 L'Intelligenza Artificiale sta traducendo il menu... attendi...</div>}
        </div>

        {/* --- FORM AGGIUNTA PIATTO --- */}
        <div style={{opacity: isAbbonamentoAttivo ? 1 : 0.5, pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none'}}>
            <div style={{...cardStyle, borderLeft: editId ? '5px solid #3498db' : '5px solid #2ecc71'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px'}}>
                      <h3 style={{margin:0, color:'#2c3e50'}}>{editId ? "✏️ Modifica Piatto" : "✨ Aggiungi Nuovo Piatto"}</h3>
                      {editId && <button onClick={annullaModifica} style={{background:'#eee', color:'#333', border:'none', padding:'5px 15px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'}}>Annulla Modifica</button>}
                  </div>

                 <form onSubmit={handleSalvaPiatto} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div>
                              <label style={labelStyle}>Nome del Piatto *</label>
                              <input placeholder="Es. Spaghetti alle Vongole" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required style={inputStyle} />
                          </div>
                          
                          <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
                              <div style={{flex:1, minWidth:'140px'}}>
                                  <label style={labelStyle}>Categoria</label>
                                  <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={inputStyle}>
                                      {categorie && categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                                  </select>
                              </div>
                              <div style={{flex:1, minWidth:'140px'}}>
                                  <label style={labelStyle}>Sottocategoria</label>
                                  <input placeholder="Es. Bianchi, Rossi, Terra..." value={nuovoPiatto.sottocategoria || ''} onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})} style={inputStyle} />
                              </div>
                              <div style={{flex:0.7, minWidth:'100px'}}>
                                  <label style={labelStyle}>Prezzo</label>
                                  <input type="number" placeholder="0.00" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={inputStyle} step="0.10" required />
                              </div>
                          </div>

                          <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
                              <div style={{flex:1, minWidth:'100px'}}>
                                    <label style={labelStyle}>Unità</label>
                                    <input type="text" placeholder="/hg" value={nuovoPiatto.unita_misura || ''} onChange={e => setNuovoPiatto({...nuovoPiatto, unita_misura: e.target.value})} style={inputStyle} />
                                </div>
                                <div style={{flex:1, minWidth:'100px'}}>
                                    <label style={labelStyle}>Minimo</label>
                                    <input type="number" placeholder="1" value={nuovoPiatto.qta_minima || 1} onChange={e => setNuovoPiatto({...nuovoPiatto, qta_minima: e.target.value})} style={inputStyle} min="0.1" step="0.1" />
                                </div>
                          </div>

                          <div><label style={labelStyle}>Descrizione</label><textarea placeholder="Descrivi il piatto..." value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{...inputStyle, minHeight:'80px', resize:'vertical'}}/></div>
                          <div>
                                <label style={labelStyle}>📷 Foto Piatto</label>
                                <div style={{background: '#f8f9fa', border: '2px dashed #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', cursor: 'pointer', position:'relative', boxSizing:'border-box'}}>
                                    <input type="file" onChange={handleFileChange} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                                    {uploading ? <span style={{color:'#3498db'}}>⏳ Caricamento...</span> : (nuovoPiatto.immagine_url ? <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}><img src={nuovoPiatto.immagine_url} style={{width:40, height:40, borderRadius:5, objectFit:'cover'}} /><span style={{color:'#27ae60', fontWeight:'bold'}}>Foto Caricata!</span></div> : <span style={{color:'#888'}}>Trascina qui o clicca per caricare</span>)}
                                </div>
                          </div>
                      </div>

                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div style={{background:'#fffcf0', padding:'15px', borderRadius:'8px', border:'1px solid #f9e79f', boxSizing:'border-box'}}>
                              <label style={{...labelStyle, color:'#d4ac0d'}}>🧂 Varianti & Ingredienti</label>
                              <input placeholder="Ingredienti Base (es: Pomodoro, Mozzarella)" value={nuovoPiatto.ingredienti_base || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, ingredienti_base: e.target.value})} style={{...inputStyle, marginBottom:'10px', background:'white'}} />
                              <textarea placeholder="Aggiunte Extra (es: Bufala:2.00, Salame:1.50)" value={nuovoPiatto.varianti_str || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, varianti_str: e.target.value})} style={{...inputStyle, minHeight:'60px', background:'white'}} />
                          </div>

                          <div style={{background:'#fcfcfc', padding:'15px', borderRadius:'8px', border:'1px solid #eee', boxSizing:'border-box'}}>
                              <label style={labelStyle}>⚠️ Allergeni</label>
                              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                  {LISTA_ALLERGENI.map(all => {
                                      const currentAllergeni = parseAllergeniSicuro(nuovoPiatto.allergeni);
                                      const isSelected = currentAllergeni.includes(all);
                                      return (
                                          <div key={all} 
                                              onClick={() => {if (isSelected) setNuovoPiatto({...nuovoPiatto, allergeni: currentAllergeni.filter(x => x !== all)}); else setNuovoPiatto({...nuovoPiatto, allergeni: [...currentAllergeni, all]});}}
                                              style={{padding:'6px 12px', borderRadius:'20px', fontSize:'11px', cursor:'pointer', fontWeight:'bold', background: isSelected ? '#ffebee' : 'white', color: isSelected ? '#c0392b' : '#555', border: isSelected ? '1px solid #e74c3c' : '1px solid #ddd', transition: 'all 0.2s', boxSizing: 'border-box'}}>
                                              {isSelected ? '✅ ' : ''}{all}
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                          
                          <button type="submit" style={{marginTop:'auto', background: editId ? '#3498db' : '#2ecc71', color:'white', padding:'15px', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>{editId ? "💾 AGGIORNA MODIFICHE" : "➕ SALVA PIATTO"}</button>
                      </div>
                  </form>
            </div>

            {/* --- LISTA PIATTI (Drag & Drop) --- */}
            <DragDropContext onDragEnd={onDragEnd}>
                {categorie && categorie.map(cat => {
                    const piattiCat = menu.filter(p => p.categoria === cat.nome);
                    const groups = piattiCat.reduce((acc, p) => {
                        const sub = p.sottocategoria || "Generale";
                        if (!acc[s]) acc[sub] = [];
                        acc[sub].push(p);
                        return acc;
                    }, {});

                    const sortedKeys = Object.keys(groups).sort((a,b) => {
                        const minPosA = Math.min(...groups[a].map(p => p.posizione || 0));
                        const minPosB = Math.min(...groups[b].map(p => p.posizione || 0));
                        return minPosA - minPosB;
                    });
                    if (sortedKeys.length === 0) sortedKeys.push("Generale");

                    return (
                        <div key={cat.id} style={{marginBottom: '40px'}}>
                            <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#2c3e50', borderBottom:'2px solid #eee', paddingBottom:'10px', marginBottom:'20px'}}>
                                <span style={{background:'#eee', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'}}>📂</span> 
                                {cat.nome}
                            </h3>
                            
                            {sortedKeys.map(subKey => {
                                const products = groups[subKey] || [];
                                products.sort((a, b) => (a.posizione || 0) - (b.posizione || 0));

                                return (
                                    <div key={subKey} style={{marginBottom: '15px', marginLeft: '10px'}}>
                                        {subKey !== "Generale" && (
                                            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                                                <h4 style={{fontSize:'14px', color:'#7f8c8d', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>↳ {subKey}</h4>
                                                <div style={{display:'flex', gap:'2px'}}>
                                                    <button onClick={() => spostaSottocategoria(cat.nome, subKey, -1)} style={{fontSize:'10px', padding:'2px 6px', cursor:'pointer', border:'1px solid #ddd', background:'white', borderRadius:'4px'}}>⬆️</button>
                                                    <button onClick={() => spostaSottocategoria(cat.nome, subKey, 1)} style={{fontSize:'10px', padding:'2px 6px', cursor:'pointer', border:'1px solid #ddd', background:'white', borderRadius:'4px'}}>⬇️</button>
                                                </div>
                                            </div>
                                        )}

                                        <Droppable droppableId={`${cat.nome}::${subKey}`}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps} style={{paddingBottom: products.length === 0 ? '40px' : '10px', background: products.length === 0 ? 'rgba(0,0,0,0.02)' : 'transparent', borderRadius: '8px', border: products.length === 0 ? '1px dashed #ccc' : 'none'}}>
                                                    {products.length === 0 && <div style={{padding:'10px', fontSize:'12px', color:'#aaa', textAlign:'center'}}>Trascina qui per spostare in "{subKey}"</div>}
                                                    {products.map((prodotto, index) => (
                                                        <Draggable key={String(prodotto.id)} draggableId={String(prodotto.id)} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style, marginBottom: '8px', userSelect: 'none', transform: provided.draggableProps.style?.transform}}>
                                                                    <ProductRow prodotto={prodotto} avviaModifica={avviaModifica} eliminaProdotto={cancellaPiatto} isDragging={snapshot.isDragging} />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </DragDropContext>
        </div>

        {/* --- FOOTER SETTINGS --- */}
        <div style={{ ...cardStyle, borderLeft: '5px solid #8e44ad' }}>
            <h3 style={{ marginBottom: '25px', color: '#2c3e50' }}>⚖️ Configurazione Footer & Coperto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', alignItems:'start' }}>
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div style={{padding:'15px', background:'#fdfefe', borderRadius:'8px', border:'1px solid #bbdefb'}}>
                        <label style={labelStyle}>💰 Costo Coperto (€)</label>
                        <input type="number" value={config.prezzo_coperto || 0} onChange={e => setConfig({...config, prezzo_coperto: e.target.value})} style={{...inputStyle, width:'100%', maxWidth:'150px'}} step="0.10" />
                        <p style={{margin:'5px 0 0 0', fontSize:'12px', color:'#666'}}>Aggiunto in automatico al checkout.</p>
                    </div>
                    <div>
                        <label style={labelStyle}>📝 Testo a piè di pagina</label>
                        <textarea value={config.info_footer || ''} onChange={e => setConfig({...config, info_footer: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '80px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{padding:'15px', background:'#f3e5f5', borderRadius:'8px', border:'1px solid #e1bee7'}}>
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontWeight:'bold', color:'#8e44ad'}}>
                            <input type="checkbox" checked={config.nascondi_euro || false} onChange={(e) => setConfig({...config, nascondi_euro: e.target.checked})} />
                            <span>Nascondi simbolo "€"</span>
                        </label>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>📅 Menù Giorno</label><ImageUploader type="url_menu_giorno" currentUrl={config.url_menu_giorno} icon="🥗" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>📄 Menù PDF</label><ImageUploader type="url_menu_pdf" currentUrl={config.url_menu_pdf} icon="📖" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>📋 Allergeni</label><ImageUploader type="url_allergeni" currentUrl={config.url_allergeni} icon="⚠️" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                </div>
            </div>
            <button onClick={handleSaveStyle} style={{ marginTop: '30px', width: '100%', padding:'15px', background:'#8e44ad', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' }}>💾 SALVA IMPOSTAZIONI FOOTER</button>
        </div>
    </div>
  );
}

export default AdminMenu;