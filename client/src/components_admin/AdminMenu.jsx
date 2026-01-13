// client/src/components_admin/AdminMenu.jsx - V44 FIXED (Responsive & No Overflow)
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const LISTA_ALLERGENI = [
  "Glutine 🌾", "Crostacei 🦐", "Uova 🥚", "Pesce 🐟", "Arachidi 🥜", 
  "Soia 🫘", "Latte 🥛", "Frutta a guscio 🌰", "Sedano 🥬", 
  "Senape 🌭", "Sesamo 🍔", "Solfiti 🍷", "Lupini 🌼", "Molluschi 🐙",
  "Prodotto Surgelato/Abbattuto ❄️" 
];

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  // --- STATI ---
  const [nuovoPiatto, setNuovoPiatto] = useState({ 
      nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '',
      ingredienti_base: '', varianti_str: '', allergeni: [] 
  });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  // --- SAFE MODE ---
  if (!config || !categorie || !menu) {
      return <div style={{padding:'40px', textAlign:'center', color:'#666'}}>🔄 Caricamento Menu...</div>;
  }

  const isAbbonamentoAttivo = config.account_attivo !== false; 
  const isMasterBlock = config.cucina_super_active === false; 
  const isCucinaAperta = config.ordini_abilitati;

  // --- HANDLERS ---
  const toggleCucina = async () => { 
      if (!isAbbonamentoAttivo) return alert("⛔ ABBONAMENTO SOSPESO."); 
      if (isMasterBlock) return alert("⛔ CUCINA BLOCCATA DAGLI ADMIN.");
      const nuovoStatoCucina = !isCucinaAperta; 
      setConfig({...config, ordini_abilitati: nuovoStatoCucina}); 
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method:'PUT', headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({ ordini_abilitati: nuovoStatoCucina })
          }); 
      } catch (error) {
          alert("Errore connessione."); setConfig({...config, ordini_abilitati: !nuovoStatoCucina});
      }
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
      
      const ingredientiBaseArr = nuovoPiatto.ingredienti_base 
          ? nuovoPiatto.ingredienti_base.split(',').map(i => i.trim()).filter(Boolean) 
          : [];
          
      const variantiFinali = { base: ingredientiBaseArr, aggiunte: variantiJson };
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      
      const payload = { ...nuovoPiatto, categoria: cat, ristorante_id: user.id, varianti: JSON.stringify(variantiFinali) };
      delete payload.varianti_str; 
      delete payload.ingredienti_base;

      try {
          const method = editId ? 'PUT' : 'POST';
          const url = editId ? `${API_URL}/api/prodotti/${editId}` : `${API_URL}/api/prodotti`;
          
          if(!editId && categorie.length === 0) return alert("Crea prima una categoria!"); 

          await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
          alert(editId ? "✅ Piatto aggiornato!" : "✅ Piatto creato!");
          
          setNuovoPiatto({
              nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:'', 
              varianti_str: '', ingredienti_base: '', allergeni: []
          }); 
          setEditId(null); 
          ricaricaDati(); 
      } catch(err) { alert("❌ Errore: " + err.message); }
  };

  const handleFileChange = async (e) => { 
      const f=e.target.files[0]; if(!f)return; setUploading(true); 
      const fd=new FormData(); fd.append('photo', f); 
      try {
        const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); 
        if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); 
      } catch(e) { console.error(e); } finally { setUploading(false); }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const formData = new FormData(); formData.append('file', file); formData.append('ristorante_id', user.id);
    try {
        const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { alert(data.message); ricaricaDati(); } else alert("Errore: " + data.error);
    } catch(err) { alert("Errore Connessione"); }
  };

  const handleSaveStyle = async () => {
    try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config) });
        alert("✨ Info Footer Salvate con Successo!");
    } catch(e) { alert("Errore salvataggio"); }
  };

  const cancellaPiatto = async (id) => { if(confirm("Sei sicuro di voler eliminare questo piatto?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  
  const avviaModifica = (piatto) => { 
      setEditId(piatto.id);
      let variantiObj = { base: [], aggiunte: [] };
      try { variantiObj = typeof piatto.varianti === 'string' ? JSON.parse(piatto.varianti) : piatto.varianti || { base: [], aggiunte: [] }; } catch(e) {}

      setNuovoPiatto({
          ...piatto, 
          allergeni: piatto.allergeni || [],
          ingredienti_base: (variantiObj.base || []).join(', '),
          varianti_str: (variantiObj.aggiunte || []).map(v => `${v.nome}:${v.prezzo}`).join(', ')
      }); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const annullaModifica = () => { 
      setEditId(null); 
      setNuovoPiatto({
          nome:'', prezzo:'', categoria:categorie.length > 0 ? categorie[0].nome : '', 
          sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: '', allergeni: []
      }); 
  };

  const duplicaPiatto = async (piatto) => { if(!confirm(`Duplicare ${piatto.nome}?`)) return; const copia = { ...piatto, nome: `${piatto.nome} (Copia)`, ristorante_id: user.id }; await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(copia) }); ricaricaDati(); };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);
    let nuovoMenu = [...menu];
    const piattoSpostato = nuovoMenu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;
    nuovoMenu = nuovoMenu.filter(p => p.id !== piattoId);
    const piattoAggiornato = { ...piattoSpostato, categoria: destCat };
    const piattiDestinazione = nuovoMenu.filter(p => p.categoria === destCat).sort((a,b) => (a.posizione||0) - (b.posizione||0)); 
    piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);
    const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
    const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));
    setMenu([...altriPiatti, ...piattiDestinazioneFinali]);
    await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: piattiDestinazioneFinali.map(p => ({ id: p.id, posizione: p.posizione, categoria: destCat })) }) });
  };

  // --- STILI (FIXED BOX-SIZING) ---
  const containerStyle = { maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#333' };
  
  const cardStyle = { 
    background: 'white', 
    borderRadius: '12px', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
    padding: '25px', 
    marginBottom: '30px', 
    border: '1px solid #f0f0f0',
    boxSizing: 'border-box' // <--- IMPORTANTE
  };
  
  const inputStyle = { 
    width: '100%', 
    padding: '12px 15px', 
    borderRadius: '8px', 
    border: '1px solid #e0e0e0', 
    fontSize: '14px', 
    background: '#f9f9f9', 
    transition: 'all 0.3s',
    boxSizing: 'border-box' // <--- IMPORTANTE
  };
  
  const labelStyle = { 
    fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', 
    display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' 
  };

  return (
    <div style={containerStyle}>
        
        {/* 1. HEADER & STATUS */}
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', background: isCucinaAperta ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color:'white', border:'none'}}>
            <div>
                <h2 style={{margin:0, fontSize:'24px'}}>{isCucinaAperta ? "✅ Servizio Attivo" : "🛑 Servizio Sospeso"}</h2>
                <p style={{margin:0, opacity:0.9, fontSize:'14px'}}>{isCucinaAperta ? "I clienti possono inviare ordini." : "Gli ordini sono bloccati."}</p>
            </div>
            {isAbbonamentoAttivo && !isMasterBlock && (
                <button onClick={toggleCucina} style={{background:'white', color: isCucinaAperta ? '#27ae60' : '#c0392b', border:'none', padding:'12px 25px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                    {isCucinaAperta ? "CHIUDI ORDINI CLIENTI" : "APRI ORDINI CLIENTI"}
                </button>
            )}
        </div>

        {/* 2. EXCEL TOOLS */}
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 25px', background:'#f8f9fa'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <span style={{fontSize:'24px'}}>📊</span>
                <div>
                    <h4 style={{margin:0, color:'#2c3e50'}}>Import/Export Excel</h4>
                    <p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>Gestisci il tuo menu massivamente.</p>
                </div>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank')} style={{background:'white', border:'1px solid #ddd', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', color:'#333'}}>📤 Scarica Menu</button>
                <div style={{position:'relative'}}>
                    <button style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>📥 Carica Excel</button>
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                </div>
            </div>
        </div>

        {/* 3. EDITOR PIATTI */}
        <div style={{opacity: isAbbonamentoAttivo ? 1 : 0.5, pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none'}}>
            <div style={{...cardStyle, borderLeft: editId ? '5px solid #3498db' : '5px solid #2ecc71'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                      <h3 style={{margin:0, color:'#2c3e50'}}>{editId ? "✏️ Modifica Piatto" : "✨ Aggiungi Nuovo Piatto"}</h3>
                      {editId && <button onClick={annullaModifica} style={{background:'#eee', color:'#333', border:'none', padding:'5px 15px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'}}>Annulla Modifica</button>}
                  </div>

                 <form onSubmit={handleSalvaPiatto} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px'}}>
                      
                      {/* Colonna Sinistra */}
                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div>
                              <label style={labelStyle}>Nome del Piatto *</label>
                              <input placeholder="Es. Spaghetti alle Vongole" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required style={inputStyle} />
                          </div>
                          <div style={{display:'flex', gap:'15px'}}>
                              <div style={{flex:1}}>
                                  <label style={labelStyle}>Categoria</label>
                                  <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={inputStyle}>
                                      {categorie && categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                                  </select>
                              </div>
                              <div style={{flex:1}}>
                                  <label style={labelStyle}>Prezzo (€)</label>
                                  <input type="number" placeholder="0.00" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={inputStyle} step="0.10" required />
                              </div>
                          </div>
                          <div>
                              <label style={labelStyle}>Descrizione</label>
                              <textarea placeholder="Descrivi il piatto..." value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{...inputStyle, minHeight:'80px', resize:'vertical'}}/>
                          </div>
                          <div>
                                <label style={labelStyle}>📷 Foto Piatto</label>
                                <div style={{background: '#f8f9fa', border: '2px dashed #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', cursor: 'pointer', position:'relative', boxSizing:'border-box'}}>
                                    <input type="file" onChange={handleFileChange} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                                    {uploading ? <span style={{color:'#3498db'}}>⏳ Caricamento...</span> : (
                                        nuovoPiatto.immagine_url ? 
                                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                                            <img src={nuovoPiatto.immagine_url} style={{width:40, height:40, borderRadius:5, objectFit:'cover'}} />
                                            <span style={{color:'#27ae60', fontWeight:'bold'}}>Foto Caricata! (Clicca per cambiare)</span>
                                        </div> : 
                                        <span style={{color:'#888'}}>Trascina qui o clicca per caricare</span>
                                    )}
                                </div>
                          </div>
                      </div>

                      {/* Colonna Destra */}
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
                                      const isSelected = (nuovoPiatto.allergeni || []).includes(all);
                                      return (
                                          <div key={all} 
                                              onClick={() => {
                                                  const current = nuovoPiatto.allergeni || [];
                                                  if (isSelected) setNuovoPiatto({...nuovoPiatto, allergeni: current.filter(x => x !== all)});
                                                  else setNuovoPiatto({...nuovoPiatto, allergeni: [...current, all]});
                                              }}
                                              style={{
                                                  padding:'6px 12px', borderRadius:'20px', fontSize:'11px', cursor:'pointer', fontWeight:'bold',
                                                  background: isSelected ? '#ffebee' : 'white',
                                                  color: isSelected ? '#c0392b' : '#555',
                                                  border: isSelected ? '1px solid #e74c3c' : '1px solid #ddd',
                                                  transition: 'all 0.2s',
                                                  boxSizing: 'border-box'
                                              }}
                                          >
                                              {isSelected ? '✅ ' : ''}{all}
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                          
                          <button type="submit" style={{marginTop:'auto', background: editId ? '#3498db' : '#2ecc71', color:'white', padding:'15px', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                              {editId ? "💾 AGGIORNA MODIFICHE" : "➕ SALVA PIATTO"}
                          </button>
                      </div>
                  </form>
            </div>

            {/* 4. LISTA MENU DRAG & DROP */}
            <DragDropContext onDragEnd={onDragEnd}>
                {categorie && categorie.map(cat => (
                    <div key={cat.id} style={{marginBottom: '40px'}}>
                        <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#2c3e50', borderBottom:'2px solid #eee', paddingBottom:'10px', marginBottom:'20px'}}>
                            <span style={{background:'#eee', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'}}>📂</span> 
                            {cat.nome}
                        </h3>
                        <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                            {(provided, snapshot) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} 
                                    style={{
                                        background: snapshot.isDraggingOver ? '#f0f9ff' : 'transparent', 
                                        minHeight: '60px', borderRadius:'10px', padding: '10px', transition: 'background 0.3s',
                                        boxSizing: 'border-box'
                                    }}>
                                    {menu && menu.filter(p => p.categoria === cat.nome).sort((a,b) => (a.posizione || 0) - (b.posizione || 0)).map((p, index) => (
                                            <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                                                        style={{
                                                            ...provided.draggableProps.style, marginBottom:'12px', 
                                                            background: 'white', 
                                                            border: '1px solid #eee', 
                                                            borderRadius: '10px',
                                                            padding:'15px', 
                                                            display:'flex', justifyContent:'space-between', alignItems:'center',
                                                            boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.02)',
                                                            transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                                                            boxSizing: 'border-box'
                                                        }}>
                                                        
                                                        <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1}}>
                                                            <div style={{cursor:'grab', color:'#ccc', fontSize:'20px'}}>⋮⋮</div>
                                                            {p.immagine_url && <img src={p.immagine_url} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'8px'}}/>}
                                                            <div>
                                                                <div style={{fontWeight:'bold', color:'#333', fontSize:'15px'}}>{p.nome} <span style={{fontWeight:'normal', fontSize:'12px', color:'#888'}}>({Number(p.prezzo).toFixed(2)}€)</span></div>
                                                                {p.descrizione && <div style={{fontSize:'12px', color:'#777'}}>{p.descrizione}</div>}
                                                                
                                                                {/* Chips Allergeni Mini */}
                                                                {p.allergeni && p.allergeni.length > 0 && (
                                                                    <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                                                                        {p.allergeni.slice(0, 3).map(a => <span key={a} style={{fontSize:'9px', background:'#fff0f0', color:'#c0392b', padding:'2px 6px', borderRadius:'10px'}}>{a.split(' ')[0]}</span>)}
                                                                        {p.allergeni.length > 3 && <span style={{fontSize:'9px', color:'#888'}}>+{p.allergeni.length - 3}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{display:'flex', gap:'8px'}}>
                                                            <button onClick={() => avviaModifica(p)} style={{background:'#fff3e0', color:'#e67e22', border:'none', width:35, height:35, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>✏️</button>
                                                            <button onClick={() => duplicaPiatto(p)} style={{background:'#e3f2fd', color:'#2980b9', border:'none', width:35, height:35, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>❐</button>
                                                            <button onClick={() => cancellaPiatto(p.id)} style={{background:'#ffebee', color:'#c0392b', border:'none', width:35, height:35, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>🗑️</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </DragDropContext>
        </div>

        {/* 5. INFO LEGALI & FOOTER (SPLIT DESIGN) */}
        <div style={{
            ...cardStyle, 
            borderLeft: '5px solid #8e44ad',
            background: 'linear-gradient(to right, #ffffff 50%, #fdfbfd 50%)' 
        }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'25px', borderBottom:'1px solid #eee', paddingBottom:'15px'}}>
                <span style={{fontSize:'24px'}}>⚖️</span>
                <h3 style={{margin:0, color:'#2c3e50'}}>Configurazione Footer & Allergeni</h3>
            </div>

            <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap:'40px'}}>
                
                {/* COLONNA SINISTRA: TESTO */}
                <div>
                    <label style={{...labelStyle, fontSize:'14px', marginBottom:'15px'}}>📝 Testo a piè di pagina</label>
                    <div style={{position:'relative'}}>
                        <textarea 
                            value={config.info_footer || ''}
                            onChange={e => setConfig({...config, info_footer: e.target.value})}
                            placeholder="Inserisci qui P.IVA, Coperto, Info di servizio..."
                            style={{
                                width:'100%', padding:'20px', borderRadius:'12px', border:'1px solid #dcdcdc', 
                                minHeight:'180px', fontSize:'15px', lineHeight:'1.6', background:'white',
                                boxShadow:'inset 0 2px 5px rgba(0,0,0,0.02)', resize:'none', fontFamily:'inherit',
                                boxSizing: 'border-box' // <--- IMPORTANTE
                            }}
                        />
                        <div style={{position:'absolute', bottom:15, right:15, fontSize:'12px', color:'#aaa'}}>Testo visibile in fondo al menu</div>
                    </div>
                </div>

                {/* COLONNA DESTRA: UPLOAD FILE */}
                <div>
                    <label style={{...labelStyle, fontSize:'14px', marginBottom:'15px'}}>📄 Allegato Allergeni (PDF/FOTO)</label>
                    
                    {config.url_allergeni ? (
                        <div style={{
                            border:'2px solid #27ae60', background:'#f0fbf4', borderRadius:'12px', 
                            height:'180px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            position:'relative', overflow:'hidden', boxSizing:'border-box'
                        }}>
                            {config.url_allergeni.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                 <img src={config.url_allergeni} style={{height:'100%', width:'100%', objectFit:'contain', opacity:0.8}} />
                            ) : (
                                 <div style={{textAlign:'center'}}>
                                     <span style={{fontSize:'40px'}}>📄</span>
                                     <div style={{fontWeight:'bold', color:'#27ae60', marginTop:10}}>PDF Caricato Correttamente</div>
                                 </div>
                            )}
                            
                            {/* Overlay azioni */}
                            <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s'}} 
                                 onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                <button 
                                    onClick={() => setConfig({...config, url_allergeni: ''})} 
                                    style={{background:'#e74c3c', color:'white', border:'none', padding:'10px 20px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer'}}
                                >
                                    🗑️ RIMUOVI FILE
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            border:'2px dashed #bdc3c7', borderRadius:'12px', background:'#fdfdfd',
                            height:'180px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            cursor:'pointer', position:'relative', transition:'all 0.3s', boxSizing:'border-box'
                        }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3498db'} onMouseLeave={e => e.currentTarget.style.borderColor = '#bdc3c7'}>
                            
                            <span style={{fontSize:'40px', marginBottom:'10px', opacity:0.5}}>📤</span>
                            <div style={{fontWeight:'bold', color:'#7f8c8d'}}>Clicca o Trascina qui il file</div>
                            <div style={{fontSize:'12px', color:'#aaa', marginTop:5}}>Accetta PDF, JPG, PNG</div>
                            
                            <input 
                                type="file" 
                                onChange={async (e) => {
                                    const f = e.target.files[0]; if(!f) return;
                                    const fd = new FormData(); fd.append('photo', f);
                                    try {
                                        const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
                                        const d = await r.json();
                                        if(d.url) setConfig({...config, url_allergeni: d.url});
                                    } catch(err) { alert("Errore Upload"); }
                                }} 
                                style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} 
                            />
                        </div>
                    )}
                </div>
            </div>

            <button onClick={handleSaveStyle} style={{
                marginTop:'30px', width:'100%', padding:'18px', 
                background:'linear-gradient(to right, #8e44ad, #9b59b6)', color:'white', 
                border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'bold', 
                cursor:'pointer', letterSpacing:'1px', boxShadow:'0 5px 15px rgba(142, 68, 173, 0.3)'
            }}>
                💾 SALVA IMPOSTAZIONI FOOTER
            </button>
        </div>
    </div>
  );
}

export default AdminMenu;