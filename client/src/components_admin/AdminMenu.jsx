// client/src/components_admin/AdminMenu.jsx
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

  // --- LOGICA DI CONTROLLO STATO E MODULI ---
  const isAbbonamentoAttivo = config.account_attivo !== false; 
  const isModuloOrdiniAttivo = config.modulo_ordini_clienti !== false; 
  const isCucinaAperta = config.ordini_abilitati;

  let headerBg = isCucinaAperta ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
  let headerTitle = isCucinaAperta ? "✅ Servizio Attivo" : "🛑 Servizio Sospeso";
  let headerDesc = isCucinaAperta ? "I clienti possono inviare ordini dal tavolo." : "Gli ordini sono attualmente bloccati.";

  if (!isModuloOrdiniAttivo) {
      headerBg = 'linear-gradient(135deg, #7f8c8d 0%, #34495e 100%)'; 
      headerTitle = "⚖️ MODULO ORDINI DISABILITATO";
      headerDesc = "La funzione ordini è stata disattivata dal SuperAdmin o non è prevista nel piano.";
  }

  const handleSaveStyle = async () => {
    try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config) });
        alert("✨ Impostazioni, Coperto e Footer salvati!");
    } catch(e) { alert("Errore salvataggio"); }
  };

  const toggleCucina = async () => { 
      if (!isAbbonamentoAttivo) return alert("⛔ ABBONAMENTO SOSPESO."); 
      if (!isModuloOrdiniAttivo) return alert("⛔ FUNZIONE DISABILITATA DAL SUPER ADMIN."); 
      const nuovoStatoCucina = !isCucinaAperta; 
      setConfig({...config, ordini_abilitati: nuovoStatoCucina}); 
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ordini_abilitati: nuovoStatoCucina }) }); 
      } catch (error) { alert("Errore connessione."); setConfig({...config, ordini_abilitati: !nuovoStatoCucina}); }
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
    // 1. Controlli di sicurezza base
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;

    // Se l'utente ha trascinato nello stesso punto, non fare nulla
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // 2. Estrai i dati
    const [destCat, destSub] = destination.droppableId.split("::");
    const piattoId = parseInt(draggableId);

    // 3. Clona il menu attuale (per non modificare direttamente lo stato)
    let nuovoMenu = [...menu];

    // 4. Trova e rimuovi il piatto dalla sua vecchia posizione
    const indexPiatto = nuovoMenu.findIndex(p => p.id === piattoId);
    if (indexPiatto === -1) return;
    const [piattoSpostato] = nuovoMenu.splice(indexPiatto, 1);

    // 5. Aggiorna i dati del piatto (Categoria e Sottocategoria)
    const piattoAggiornato = {
        ...piattoSpostato,
        categoria: destCat,
        sottocategoria: destSub === "Generale" ? "" : destSub
    };

    // 6. Separiamo i piatti della categoria di destinazione dagli altri
    // (Questo serve per calcolare le nuove posizioni 1, 2, 3...)
    const piattiTarget = nuovoMenu.filter(p => 
        p.categoria === destCat && 
        (p.sottocategoria || "Generale") === destSub
    );
    
    const altriPiatti = nuovoMenu.filter(p => 
        !(p.categoria === destCat && (p.sottocategoria || "Generale") === destSub)
    );

    // 7. Ordiniamo i piatti target per sicurezza (per evitare scatti)
    piattiTarget.sort((a, b) => (a.posizione || 0) - (b.posizione || 0));

    // 8. Inseriamo il piatto nella nuova posizione
    piattiTarget.splice(destination.index, 0, piattoAggiornato);

    // 9. Ricalcoliamo le posizioni sequenziali (1, 2, 3...) solo per questa categoria
    const piattiTargetFinali = piattiTarget.map((p, idx) => ({
        ...p,
        posizione: idx + 1
    }));

    // 10. Ricostruiamo il menu unendo il resto + i piatti aggiornati
    // IMPORTANTE: Questo setta lo stato visuale IMMEDIATAMENTE (Nessun "scatto")
    setMenu([...altriPiatti, ...piattiTargetFinali]);

    // 11. Inviamo al server solo i piatti riordinati (in background)
    try {
        await fetch(`${API_URL}/api/prodotti/riordina`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ prodotti: piattiTargetFinali }) 
        });
    } catch (error) {
        console.error("Errore salvataggio ordine:", error);
    }
};

  const spostaSottocategoria = async (catNome, subKey, direzione) => {
      const prodottiCat = menu.filter(p => p.categoria === catNome);
      const groups = prodottiCat.reduce((acc, p) => {
          const s = p.sottocategoria || "Generale";
          if (!acc[s]) acc[s] = [];
          acc[s].push(p);
          return acc;
      }, {});
      let groupKeys = Object.keys(groups).sort((a,b) => {
          const minPosA = Math.min(...groups[a].map(p => p.posizione || 0));
          const minPosB = Math.min(...groups[b].map(p => p.posizione || 0));
          return minPosA - minPosB;
      });
      const idx = groupKeys.indexOf(subKey);
      if (idx === -1) return;
      const nuovoIdx = idx + direzione;
      if (nuovoIdx < 0 || nuovoIdx >= groupKeys.length) return; 
      [groupKeys[idx], groupKeys[nuovoIdx]] = [groupKeys[nuovoIdx], groupKeys[idx]];
      let nuoviProdottiDaSalvare = [];
      let globalCounter = 0;
      groupKeys.forEach(key => {
          const prods = groups[key].sort((a,b) => (a.posizione||0) - (b.posizione||0)); 
          prods.forEach(p => { nuoviProdottiDaSalvare.push({ ...p, posizione: globalCounter++ }); });
      });
      const altriProdotti = menu.filter(p => p.categoria !== catNome);
      setMenu([...altriProdotti, ...nuoviProdottiDaSalvare]);
      await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: nuoviProdottiDaSalvare }) });
  };

  const containerStyle = { width: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#333', boxSizing: 'border-box' };
  const cardStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '25px', marginBottom: '30px', border: '1px solid #f0f0f0', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', background: '#f9f9f9', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block', textTransform: 'uppercase' };

  return (
    <div style={containerStyle}>
        
        {/* OVERLAY LOADING */}
        {(importing || isScanningMenu || translating) && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.9)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{fontSize:'50px'}}>{translating ? "🌍" : "🤖"}</div>
                <h2 style={{color: translating ? '#16a085' : '#3498db'}}>{translating ? "Traduzione Intelligente..." : "Elaborazione in corso..."}</h2>
            </div>
        )}

        {/* HEADER STATO ORDINI */}
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', background: headerBg, color:'white', border:'none', flexWrap:'wrap', gap:'20px'}}>
            <div><h2 style={{margin:0, fontSize:'24px'}}>{headerTitle}</h2><p style={{margin:0, opacity:0.9, fontSize:'14px'}}>{headerDesc}</p></div>
            {isAbbonamentoAttivo && isModuloOrdiniAttivo && (
                <button onClick={toggleCucina} style={{background:'white', color: isCucinaAperta ? '#27ae60' : '#c0392b', border:'none', padding:'12px 25px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                    {isCucinaAperta ? "CHIUDI ORDINI CLIENTE" : "APRI ORDINI CLIENTE"}
                </button>
            )}
            {!isModuloOrdiniAttivo && (
                <div style={{background:'rgba(255,255,255,0.2)', padding:'10px 15px', borderRadius:'8px', fontSize:'12px', fontWeight:'bold'}}>SOLO CONSULTAZIONE</div>
            )}
        </div>

        {/* STRUMENTI IMPORT/SCAN */}
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 25px', background:'#f8f9fa', flexWrap:'wrap', gap:'15px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}><span style={{fontSize:'24px'}}>📊</span><div><h4 style={{margin:0, color:'#2c3e50'}}>Import/Export</h4><p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>Gestione massiva menu.</p></div></div>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                <button onClick={() => window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank')} style={{background:'white', border:'1px solid #ddd', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>📤 Scarica</button>
                <div style={{position:'relative'}}><button style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>📥 Excel</button><input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} /></div>
                <div style={{position:'relative'}}><button onClick={() => menuScanRef.current.click()} style={{background:'#8e44ad', color:'white', padding:'8px 15px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'600'}}>📸 AI SCAN</button><input type="file" ref={menuScanRef} accept="image/*,application/pdf" onChange={handleMenuScan} style={{ display: 'none' }} /></div>         
            </div>
        </div>

        {/* GESTIONE LINGUE */}
        <div style={{...cardStyle, background:'#e8f8f5', border:'1px solid #1abc9c'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px'}}><span style={{fontSize:'28px'}}>🌍</span><h4 style={{margin:0, color:'#16a085'}}>Lingue Internazionali</h4></div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'15px'}}>
                {Object.entries(LANGUAGES_MAP).map(([code, label]) => {
                    let isAttiva = false;
                    if (menu) {
                        for (let p of menu) {
                             try {
                                 const t = typeof p.traduzioni === 'string' ? JSON.parse(p.traduzioni) : (p.traduzioni || {});
                                 if (t[code]) { isAttiva = true; break; }
                             } catch(e){}
                        }
                    }
                    return (
                        <div key={code} style={{background:'white', borderRadius:'12px', padding:'15px', border: isAttiva ? '2px solid #2ecc71' : '1px solid #ddd', display:'flex', flexDirection:'column', gap:'10px'}}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                <span style={{fontWeight:'bold', color:'#2c3e50'}}>{label}</span>
                                <span style={{fontSize:'10px', background: isAttiva ? '#2ecc71' : '#bdc3c7', color:'white', padding:'3px 8px', borderRadius:'10px'}}>{isAttiva ? 'ATTIVA' : 'OFF'}</span>
                            </div>
                            <div style={{display:'flex', gap:'5px'}}>
                                {isAttiva && <button onClick={async () => { if(confirm(`Rimuovere ${label}?`)) { await fetch(`${API_URL}/api/menu/remove-language`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ristorante_id:user.id, lang:code})}); ricaricaDati(); }}} style={{flex:1, background:'#fff', border:'1px solid #e74c3c', color:'#e74c3c', borderRadius:'6px', padding:'8px', fontSize:'12px', cursor:'pointer'}}>Disattiva</button>}
                                <button onClick={async () => { setTranslating(true); try { const res = await fetch(`${API_URL}/api/menu/translate-all`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ristorante_id:user.id, languages:[code]})}); const data = await res.json(); if(data.success) { alert(`${label} Pronto!`); ricaricaDati(); } } finally { setTranslating(false); } }} style={{flex:1, background: isAttiva ? '#3498db' : '#2ecc71', border:'none', color:'white', borderRadius:'6px', padding:'8px', fontSize:'12px', cursor:'pointer'}}>{isAttiva ? "🔄 Aggiorna" : "✨ Attiva"}</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* AGGIUNTA/MODIFICA PIATTO */}
        <div style={{opacity: isAbbonamentoAttivo ? 1 : 0.5, pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none'}}>
            <div style={{...cardStyle, borderLeft: editId ? '5px solid #3498db' : '5px solid #2ecc71'}}>
                 <h3 style={{marginBottom:'20px'}}>{editId ? "✏️ Modifica Piatto" : "✨ Nuovo Piatto"}</h3>
                 <form onSubmit={handleSalvaPiatto} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <input placeholder="Nome del Piatto *" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required style={inputStyle} />
                          <div style={{display:'flex', gap:'10px'}}>
                              <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{...inputStyle, flex:1}}>
                                  {categorie && categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                              </select>
                              <input placeholder="Sottocategoria" value={nuovoPiatto.sottocategoria || ''} onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})} style={{...inputStyle, flex:1}} />
                          </div>
                          <div style={{display:'flex', gap:'10px'}}>
                              <input type="number" placeholder="Prezzo (€)" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={{...inputStyle, flex:1}} step="0.10" required />
                              <input type="text" placeholder="Unità (es: /hg)" value={nuovoPiatto.unita_misura || ''} onChange={e => setNuovoPiatto({...nuovoPiatto, unita_misura: e.target.value})} style={{...inputStyle, flex:1}} />
                          </div>
                          <textarea placeholder="Descrizione..." value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{...inputStyle, minHeight:'80px'}}/>
                          <div style={{background:'#f8f9fa', border:'2px dashed #ddd', padding:'10px', textAlign:'center', position:'relative'}}>
                                <input type="file" onChange={handleFileChange} style={{position:'absolute', inset:0, opacity:0}} />
                                {uploading ? "⏳..." : (nuovoPiatto.immagine_url ? "✅ Foto Caricata" : "📸 Clicca per Foto")}
                          </div>
                      </div>
                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div style={{background:'#fffcf0', padding:'10px', borderRadius:'8px', border:'1px solid #f9e79f'}}>
                              <input placeholder="Ingredienti Base" value={nuovoPiatto.ingredienti_base || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, ingredienti_base: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                              <textarea placeholder="Varianti (es: Bufala:2.00)" value={nuovoPiatto.varianti_str || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, varianti_str: e.target.value})} style={{...inputStyle, minHeight:'60px'}} />
                          </div>
                          <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
                                {LISTA_ALLERGENI.map(all => {
                                    const currentAll = parseAllergeniSicuro(nuovoPiatto.allergeni);
                                    const sel = currentAll.includes(all);
                                    return <div key={all} onClick={() => setNuovoPiatto({...nuovoPiatto, allergeni: sel ? currentAll.filter(x => x!==all) : [...currentAll, all]})} style={{padding:'5px 10px', borderRadius:'15px', fontSize:'10px', cursor:'pointer', background: sel ? '#ffebee' : '#fff', border: sel ? '1px solid #e74c3c' : '1px solid #ddd'}}>{all}</div>
                                })}
                          </div>
                          <button type="submit" style={{marginTop:'auto', background: editId ? '#3498db' : '#2ecc71', color:'white', padding:'15px', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>{editId ? "💾 AGGIORNA" : "➕ AGGIUNGI AL MENU"}</button>
                          {editId && <button onClick={annullaModifica} style={{background:'#eee', border:'none', padding:'5px', cursor:'pointer'}}>Annulla</button>}
                      </div>
                 </form>
            </div>

            {/* LISTA MENU DRAG & DROP */}
            <DragDropContext onDragEnd={onDragEnd}>
                {categorie && categorie.map(cat => {
                    const piattiCat = menu.filter(p => p.categoria === cat.nome);
                    const groups = piattiCat.reduce((acc, p) => {
                        const sub = p.sottocategoria || "Generale";
                        if (!acc[sub]) acc[sub] = [];
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
                            <h3 style={{borderBottom:'2px solid #eee', paddingBottom:'10px'}}>{cat.nome}</h3>
                            {sortedKeys.map(subKey => {
                                const products = (groups[subKey] || []).sort((a,b) => (a.posizione||0) - (b.posizione||0));
                                return (
                                    <div key={subKey} style={{marginBottom: '15px', marginLeft: '10px'}}>
                                        {subKey !== "Generale" && (
                                            <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px'}}>
                                                <span style={{fontSize:'12px', color:'#7f8c8d'}}>↳ {subKey}</span>
                                                <button onClick={() => spostaSottocategoria(cat.nome, subKey, -1)} style={{border:'none', background:'none', cursor:'pointer'}}>⬆️</button>
                                                <button onClick={() => spostaSottocategoria(cat.nome, subKey, 1)} style={{border:'none', background:'none', cursor:'pointer'}}>⬇️</button>
                                            </div>
                                        )}
                                        <Droppable droppableId={`${cat.nome}::${subKey}`}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps} style={{minHeight:'20px'}}>
                                                    {products.map((p, index) => (
                                                        <Draggable key={String(p.id)} draggableId={String(p.id)} index={index}>
                                                            {(pvd, snp) => (
                                                                <div ref={pvd.innerRef} {...pvd.draggableProps} {...pvd.dragHandleProps} style={{...pvd.draggableProps.style, marginBottom:'5px'}}>
                                                                    <ProductRow prodotto={p} avviaModifica={avviaModifica} eliminaProdotto={cancellaPiatto} isDragging={snp.isDragging} />
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

        {/* CONFIGURAZIONE FOOTER & COPERTO */}
        <div style={{ ...cardStyle, borderLeft: '5px solid #8e44ad' }}>
            <h3 style={{ marginBottom: '25px' }}>⚖️ Configurazione Footer & Coperto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div style={{padding:'15px', background:'#fdfefe', borderRadius:'8px', border:'1px solid #bbdefb'}}>
                        <label style={labelStyle}>💰 Costo Coperto (€)</label>
                        <input type="number" value={config.prezzo_coperto || 0} onChange={e => setConfig({...config, prezzo_coperto: e.target.value})} style={inputStyle} step="0.10" />
                    </div>
                    <textarea placeholder="Testo footer (es. Info Legali, Orari)..." value={config.info_footer || ''} onChange={e => setConfig({...config, info_footer: e.target.value})} style={{...inputStyle, minHeight:'100px'}} />
                    <label style={{display:'flex', alignItems:'center', gap:'10px', fontWeight:'bold', color:'#8e44ad', cursor:'pointer'}}>
                        <input type="checkbox" checked={config.nascondi_euro || false} onChange={(e) => setConfig({...config, nascondi_euro: e.target.checked})} />
                        Nascondi simbolo "€"
                    </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>🥗 Menu Giorno</label><ImageUploader type="url_menu_giorno" currentUrl={config.url_menu_giorno} icon="🥗" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>📖 Menu PDF</label><ImageUploader type="url_menu_pdf" currentUrl={config.url_menu_pdf} icon="📖" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                    <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '10px' }}><label style={labelStyle}>⚠️ Allergeni</label><ImageUploader type="url_allergeni" currentUrl={config.url_allergeni} icon="⚠️" config={config} setConfig={setConfig} API_URL={API_URL} /></div>
                </div>
            </div>
            <button onClick={handleSaveStyle} style={{ marginTop: '30px', width: '100%', padding:'15px', background:'#8e44ad', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' }}>💾 SALVA IMPOSTAZIONI FOOTER</button>
        </div>
    </div>
  );
}

export default AdminMenu;