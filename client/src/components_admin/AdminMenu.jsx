// client/src/components_admin/AdminMenu.jsx - V41 FINAL (ALL FIXES)
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const LISTA_ALLERGENI = [
  "Glutine 🌾", "Crostacei 🦐", "Uova 🥚", "Pesce 🐟", "Arachidi 🥜", 
  "Soia 🫘", "Latte 🥛", "Frutta a guscio 🌰", "Sedano 🥬", 
  "Senape 🌭", "Sesamo 🍔", "Solfiti 🍷", "Lupini 🌼", "Molluschi 🐙",
  "Prodotto Surgelato/Abbattuto ❄️" 
];

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  // --- LOGICA STATI ---
  const isAbbonamentoAttivo = config.account_attivo !== false; 
  const isMasterBlock = config.cucina_super_active === false; 
  const isCucinaAperta = config.ordini_abilitati;

  // --- FUNZIONI DI SERVIZIO ---
  const toggleCucina = async () => { 
      if (!isAbbonamentoAttivo) return alert("⛔ ABBONAMENTO SOSPESO."); 
      if (isMasterBlock) return alert("⛔ CUCINA BLOCCATA DAGLI ADMIN.");
      const nuovoStatoCucina = !isCucinaAperta; 
      setConfig({...config, ordini_abilitati: nuovoStatoCucina}); 
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method:'PUT', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({ ordini_abilitati: nuovoStatoCucina })
          }); 
      } catch (error) {
          alert("Errore di connessione.");
          setConfig({...config, ordini_abilitati: !nuovoStatoCucina});
      }
  };

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      
      let variantiJson = [];
      if (nuovoPiatto.varianti_str) {
          variantiJson = nuovoPiatto.varianti_str.split(',').map(v => {
              const [nome, prezzo] = v.split(':');
              if(nome && prezzo) return { nome: nome.trim(), prezzo: parseFloat(prezzo) };
              return null;
          }).filter(Boolean);
      }

      let ingredientiBaseArr = [];
      if (nuovoPiatto.ingredienti_base) {
          ingredientiBaseArr = nuovoPiatto.ingredienti_base.split(',').map(i => i.trim()).filter(Boolean);
      }

      const variantiFinali = { base: ingredientiBaseArr, aggiunte: variantiJson };
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      
      const payload = {
          ...nuovoPiatto, 
          categoria: cat, 
          ristorante_id: user.id,
          varianti: JSON.stringify(variantiFinali)
      };
      
      delete payload.varianti_str;
      delete payload.ingredienti_base;

      try {
          if(editId) {
              await fetch(`${API_URL}/api/prodotti/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
              alert("✅ Piatto modificato!");
          } else {
              if(categorie.length===0) return alert("Crea prima una categoria!"); 
              await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
              alert("✅ Piatto aggiunto!");
          }
          setNuovoPiatto({nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: ''}); 
          setEditId(null);
          ricaricaDati(); 
      } catch(err) { alert("❌ Errore salvataggio: " + err.message); }
  };

  const handleFileChange = async (e) => { 
      const f=e.target.files[0]; if(!f)return; setUploading(true); 
      const fd=new FormData(); fd.append('photo',f); 
      try {
        const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); 
        if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); 
      } catch(e) { console.error(e); } finally { setUploading(false); }
  };

  // --- NUOVE FUNZIONI AGGIUNTE ---
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ristorante_id', user.id);

    try {
        const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { alert(data.message); ricaricaDati(); } 
        else alert("Errore Import: " + data.error);
    } catch(err) { alert("Errore Connessione"); }
  };

  const handleSaveStyle = async () => {
    try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        alert("✅ Info Footer Aggiornate!");
    } catch(e) { alert("Errore salvataggio"); }
  };

  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  
  const avviaModifica = (piatto) => { 
      setEditId(piatto.id);
      
      let variantiObj = { base: [], aggiunte: [] };
      try {
          if(piatto.varianti) {
              variantiObj = typeof piatto.varianti === 'string' ? JSON.parse(piatto.varianti) : piatto.varianti;
          }
      } catch(e) { console.error("Err parse varianti", e); }

      const strBase = (variantiObj.base || []).join(', ');
      const strAggiunte = (variantiObj.aggiunte || []).map(v => `${v.nome}:${v.prezzo}`).join(', ');

      setNuovoPiatto({
          ...piatto, 
          allergeni: piatto.allergeni || [],
          ingredienti_base: strBase,
          varianti_str: strAggiunte
      }); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const annullaModifica = () => { setEditId(null); setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome || '', sottocategoria: '', descrizione:'', immagine_url:''}); };
  const duplicaPiatto = async (piattoOriginale) => { if(!confirm(`Duplicare?`)) return; const copia = { ...piattoOriginale, nome: `${piattoOriginale.nome} (Copia)`, ristorante_id: user.id }; await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(copia) }); ricaricaDati(); };

  // --- LOGICA DRAG & DROP ---
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceCat = result.source.droppableId.replace("cat-", "");
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);

    let nuovoMenu = [...menu];
    const piattoSpostato = nuovoMenu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;

    nuovoMenu = nuovoMenu.filter(p => p.id !== piattoId);
    const piattoAggiornato = { ...piattoSpostato, categoria: destCat };
    
    const piattiDestinazione = nuovoMenu
        .filter(p => p.categoria === destCat)
        .sort((a,b) => (a.posizione||0) - (b.posizione||0)); 
    
    piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);
    const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
    const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));
    
    setMenu([...altriPiatti, ...piattiDestinazioneFinali]);

    await fetch(`${API_URL}/api/prodotti/riordina`, { 
        method: 'PUT', headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ prodotti: piattiDestinazioneFinali.map(p => ({ id: p.id, posizione: p.posizione, categoria: destCat })) }) 
    });
  };

  let cardBg = '#fff3cd'; let cardBorder = '2px solid #333';
  if (!isAbbonamentoAttivo) { cardBg = '#ffecec'; cardBorder = '2px solid red'; } 
  else if (isMasterBlock) { cardBg = '#fadbd8'; cardBorder = '2px solid #c0392b'; } 
  else if (!isCucinaAperta) { cardBg = '#f8d7da'; }

  return (
    <div> {/* CONTENITORE PRINCIPALE UNICO */}
        
        {/* Pulsante Servizio */}
        <div className="card" style={{border: cardBorder, background: cardBg, marginBottom:'20px', textAlign:'center', padding: '15px'}}>
              {!isAbbonamentoAttivo ? (
                  <div><h2 style={{color:'red', margin:0}}>⛔ ABBONAMENTO SOSPESO</h2></div>
              ) : isMasterBlock ? (
                  <div><h2 style={{color:'#c0392b', margin:0}}>👮 CUCINA BLOCCATA ADMIN</h2></div>
              ) : (
                  <button onClick={toggleCucina} style={{background: isCucinaAperta ? '#2ecc71':'#e74c3c', width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                      {isCucinaAperta ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}
                  </button>
              )}
        </div>

        {/* --- SEZIONE EXCEL --- */}
        <div className="card" style={{background:'#f0f3f4', border:'1px solid #ddd', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px'}}>
            <h4 style={{margin:0}}>📊 Gestione Massiva Menu</h4>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank')} style={{background:'#27ae60', color:'white', fontSize:'12px', padding:'5px 10px', border:'none', borderRadius:'4px', cursor:'pointer'}}>📤 ESPORTA</button>
                <div style={{position:'relative'}}>
                    <button style={{background:'#2980b9', color:'white', fontSize:'12px', padding:'5px 10px', border:'none', borderRadius:'4px', cursor:'pointer'}}>📥 IMPORTA EXCEL</button>
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                </div>
            </div>
        </div>

        {/* --- SEZIONE EDITING --- */}
        <div style={{opacity: isAbbonamentoAttivo ? 1 : 0.4, pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none'}}>
            <div className="card" style={{background: editId ? '#e3f2fd' : '#f8f9fa', border: editId ? '2px solid #2196f3' : '2px dashed #ccc'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <h3>{editId ? "✏️ Modifica Piatto" : "➕ Aggiungi Piatto"}</h3>
                      {editId && <button onClick={annullaModifica} style={{background:'#777', padding:'5px', fontSize:'12px', color:'white', border:'none', borderRadius:'3px'}}>Annulla</button>}
                  </div>
                 <form onSubmit={handleSalvaPiatto} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                      <input placeholder="Nome Piatto" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required style={{padding:'10px'}} />
                      
                      <div style={{display:'flex', gap:'10px'}}>
                        <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{flex:1, padding:'10px'}}>
                            {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                        </select>
                        <input placeholder="Sottocategoria (es. Bianchi)" value={nuovoPiatto.sottocategoria} onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})} style={{flex:1, padding:'10px'}} />
                      </div>
                      
                      <textarea placeholder="Descrizione" value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{padding:'10px', minHeight:'60px'}}/>
                      
                      {/* --- SEZIONE VARIANTI & INGREDIENTI --- */}
                      <div style={{background:'#fff3cd', padding:'10px', borderRadius:'5px', border:'1px dashed #f39c12'}}>
                          <label style={{fontWeight:'bold', fontSize:'12px', display:'block', marginBottom:'5px'}}>🧂 INGREDIENTI BASE (Separati da virgola)</label>
                          <input placeholder="Es: Pomodoro, Mozzarella" value={nuovoPiatto.ingredienti_base || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, ingredienti_base: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
                          
                          <label style={{fontWeight:'bold', fontSize:'12px', display:'block', marginBottom:'5px'}}>➕ AGGIUNTE A PAGAMENTO (Nome:Prezzo)</label>
                          <textarea placeholder="Es: Bufala:2.00, Salame:1.50" value={nuovoPiatto.varianti_str || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, varianti_str: e.target.value})} style={{width:'100%', minHeight:'50px', padding:'8px'}} />
                      </div>

                      {/* --- SEZIONE ALLERGENI (SPOSTATA SOTTO) --- */}
                      <div style={{background:'#f9f9f9', padding:'10px', borderRadius:'5px', border:'1px solid #eee'}}>
                          <label style={{fontWeight:'bold', fontSize:'12px', display:'block', marginBottom:'5px'}}>⚠️ ALLERGENI PRESENTI</label>
                          <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                              {LISTA_ALLERGENI.map(all => (
                                  <label key={all} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', cursor:'pointer', background:'white', padding:'4px 8px', borderRadius:'15px', border: (nuovoPiatto.allergeni || []).includes(all) ? '1px solid #e74c3c' : '1px solid #ddd'}}>
                                      <input 
                                          type="checkbox" 
                                          checked={(nuovoPiatto.allergeni || []).includes(all)}
                                          onChange={(e) => {
                                              const current = nuovoPiatto.allergeni || [];
                                              if (e.target.checked) setNuovoPiatto({...nuovoPiatto, allergeni: [...current, all]});
                                              else setNuovoPiatto({...nuovoPiatto, allergeni: current.filter(x => x !== all)});
                                          }}
                                      />
                                      {all}
                                  </label>
                              ))}
                          </div>
                      </div>

                      <div style={{display:'flex', gap:'10px'}}>
                          <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={{flex:1, padding:'10px'}} step="0.10" required />
                          <div style={{background: 'white', padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <label style={{fontSize:'12px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', width: '100%'}}>
                                  📷 {uploading ? "CARICAMENTO..." : (nuovoPiatto.immagine_url ? "FOTO CARICATA ✅" : "CARICA FOTO")}
                                  <input type="file" onChange={handleFileChange} style={{display:'none'}} />
                              </label>
                              {uploading && <div className="spinner-mini"></div>} 
                          </div>
                      </div>
                      <button type="submit" className="btn-invia" style={{background: editId ? '#2196f3' : '#333', padding:'10px', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>{editId ? "AGGIORNA" : "SALVA"}</button>
                  </form>
            </div>

            {/* Lista Piatti Drag&Drop */}
            <DragDropContext onDragEnd={onDragEnd}>
                {categorie.map(cat => (
                    <div key={cat.id} style={{marginBottom: '20px'}}>
                        <h3 style={{marginTop:'30px', borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome}</h3>
                        <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                            {(provided, snapshot) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} style={{background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent', minHeight: '50px', padding: '5px'}}>
                                    {menu.filter(p => p.categoria === cat.nome).sort((a,b) => (a.posizione || 0) - (b.posizione || 0)).map((p, index) => (
                                            <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, marginBottom:'10px', background: snapshot.isDragging ? '#e3f2fd' : 'white', border: '1px solid #eee', padding:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                        <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                            <span style={{color:'#ccc', cursor:'grab', fontSize:'20px'}}>☰</span>
                                                            {p.immagine_url && <img src={p.immagine_url} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                            <div style={{flex:1}}>
                                                                <div><strong>{p.nome}</strong>{p.sottocategoria && <span style={{fontSize:'11px', background:'#eee', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>{p.sottocategoria}</span>}</div>
                                                                {p.descrizione && (<div style={{fontSize:'12px', color:'#777', fontStyle:'italic'}}>{p.descrizione}</div>)}
                                                                
                                                                {/* Ingredienti */}
                                                                {(() => {
                                                                    try {
                                                                        const v = typeof p.varianti === 'string' ? JSON.parse(p.varianti || '{}') : (p.varianti || {});
                                                                        const hasBase = v.base && v.base.length > 0;
                                                                        const hasAdd = v.aggiunte && v.aggiunte.length > 0;
                                                                        if (!hasBase && !hasAdd) return null;
                                                                        return (
                                                                            <div style={{fontSize:'11px', color:'#444', marginTop:'3px'}}>
                                                                                {hasBase && <div>🧂 {v.base.join(', ')}</div>}
                                                                                {hasAdd && <div style={{color:'#27ae60'}}>➕ {v.aggiunte.map(a => `${a.nome}`).join(', ')}</div>}
                                                                            </div>
                                                                        );
                                                                    } catch(e) { return null; }
                                                                })()}

                                                                {/* Allergeni */}
                                                                {p.allergeni && Array.isArray(p.allergeni) && p.allergeni.length > 0 && (
                                                                    <div style={{ marginTop: '4px' }}>
                                                                        {p.allergeni.filter(a => !a.includes("❄️")).length > 0 && (
                                                                            <div style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 'bold', textTransform: 'uppercase' }}>⚠️ {p.allergeni.filter(a => !a.includes("❄️")).join(', ')}</div>
                                                                        )}
                                                                        {p.allergeni.some(a => a.includes("❄️")) && (
                                                                            <div style={{ fontSize: '10px', color: '#3498db', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>❄️ SURGELATO</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div style={{fontSize:'12px', fontWeight:'bold', marginTop:'3px'}}>{p.prezzo}€</div>
                                                            </div>
                                                        </div>
                                                        <div style={{display:'flex', gap:'5px'}}>
                                                            <button onClick={() => avviaModifica(p)} style={{background:'#f1c40f', padding:'5px', borderRadius:'4px', border:'none', cursor:'pointer'}}>✏️</button>
                                                            <button onClick={() => duplicaPiatto(p)} style={{background:'#3498db', padding:'5px', borderRadius:'4px', border:'none', color:'white', cursor:'pointer'}}>❐</button>
                                                            <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px', borderRadius:'4px', border:'none', color:'white', cursor:'pointer'}}>🗑️</button>
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

{/* --- INFO LEGALI & FILE (SOLO CONTENUTO) --- */}
      <div className="card" style={{marginTop:'40px', background:'white', border:'1px solid #ddd', padding:'20px', borderRadius:'10px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
                <span style={{fontSize:'20px'}}>ℹ️</span>
                <h4 style={{margin:0, textTransform:'uppercase', color:'#555', fontSize:'14px', letterSpacing:'1px'}}>Info Legali & Allegati</h4>
            </div>

            {/* 1. TESTO */}
            <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Testo a fine pagina (es. Coperto, P.IVA)</label>
            <textarea 
                value={config.info_footer || ''}
                onChange={e => setConfig({...config, info_footer: e.target.value})}
                placeholder="Scrivi qui: Coperto 2.00€ - P.IVA..."
                style={{
                    width:'100%', padding:'15px', borderRadius:'5px', border:'1px solid #ccc', 
                    minHeight:'80px', marginBottom:'20px', fontSize:'14px'
                }}
            />

            {/* 2. UPLOAD FILE ALLERGENI */}
            <div style={{borderTop:'1px dashed #ddd', paddingTop:'20px'}}>
                <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'10px'}}>File Lista Allergeni (Opzionale)</label>
                
                {config.url_allergeni ? (
                    <div style={{position:'relative', border:'2px solid #27ae60', borderRadius:'10px', overflow:'hidden', height:'100px', background:'#f9f9f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {config.url_allergeni.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                             <img src={config.url_allergeni} style={{height:'100%', objectFit:'contain'}} />
                        ) : (
                             <span style={{fontSize:'16px', fontWeight:'bold'}}>📄 PDF CARICATO</span>
                        )}
                        <button 
                            onClick={() => setConfig({...config, url_allergeni: ''})} 
                            style={{position:'absolute', bottom:10, right:10, background:'red', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', fontSize:'11px'}}
                        >
                            🗑️ RIMUOVI
                        </button>
                    </div>
                ) : (
                    <div style={{border:'2px dashed #ccc', padding:'20px', textAlign:'center', borderRadius:'10px', cursor:'pointer', position:'relative', background:'#fafafa'}}>
                        <span style={{fontSize:'24px', display:'block'}}>📤</span>
                        <span style={{fontSize:'12px', color:'#666'}}>Clicca per caricare Foto o PDF</span>
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
                            style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, cursor:'pointer'}} 
                        />
                    </div>
                )}
            </div>

            <button onClick={handleSaveStyle} style={{marginTop:'20px', background:'#2ecc71', color:'white', width:'100%', padding:'15px', borderRadius:'5px', border:'none', fontWeight:'bold', fontSize:'14px', cursor:'pointer'}}>
                💾 SALVA INFO FOOTER
            </button>
      </div>
    </div>
  );
}

export default AdminMenu;