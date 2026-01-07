// client/src/components_admin/AdminMenu.jsx - VERSIONE V35 (LEGGE IL NUOVO BLOCCO ACCOUNT)
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  // --- FUNZIONI DI SERVIZIO ---
  const toggleServizio = async () => { 
      // 1. CONTROLLO ABBONAMENTO (account_attivo)
      // Se il campo non esiste (vecchi db) lo consideriamo attivo (true). Se è false, blocchiamo.
      const isAccountAttivo = config.account_attivo !== false; 

      if (!isAccountAttivo) { 
          alert("⛔ ATTENZIONE: Il tuo abbonamento è SOSPESO.\nContatta l'amministrazione per riattivare il servizio."); 
          return; 
      }

      // 2. GESTIONE CUCINA (servizio_attivo)
      const n = !config.servizio_attivo; 
      
      // Aggiornamento ottimistico
      setConfig({...config, servizio_attivo:n}); 
      
      try {
          // Nota: Il server farà un doppio controllo di sicurezza
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method:'PUT', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({servizio_attivo:n})
          }); 
      } catch (error) {
          alert("Errore di connessione.");
          setConfig({...config, servizio_attivo: !n});
      }
  };

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      const payload = {...nuovoPiatto, categoria:cat, ristorante_id:user.id};
      
      try {
          if(editId) {
              await fetch(`${API_URL}/api/prodotti/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
              alert("✅ Piatto modificato!");
          } else {
              if(categorie.length===0) return alert("Crea prima una categoria!"); 
              await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
              alert("✅ Piatto aggiunto!");
          }
          setNuovoPiatto({nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:''}); 
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

  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModifica = (piatto) => { setEditId(piatto.id); setNuovoPiatto(piatto); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const annullaModifica = () => { setEditId(null); setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome || '', sottocategoria: '', descrizione:'', immagine_url:''}); };
  const duplicaPiatto = async (piattoOriginale) => { if(!confirm(`Duplicare?`)) return; const copia = { ...piattoOriginale, nome: `${piattoOriginale.nome} (Copia)`, ristorante_id: user.id }; await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(copia) }); ricaricaDati(); };

  const onDragEnd = async (result) => {
    if (!result.destination || result.type !== 'DISH') return;
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);
    const piattoSpostato = menu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;

    const newMenuState = menu.map(p => { if (p.id === piattoId) return { ...p, categoria: destCat }; return p; });
    const piattiDestinazione = newMenuState.filter(p => p.categoria === destCat && p.id !== piattoId).sort((a, b) => (a.posizione || 0) - (b.posizione || 0));
    piattiDestinazione.splice(result.destination.index, 0, { ...piattoSpostato, categoria: destCat });
    const updatePayload = piattiDestinazione.map((p, idx) => ({ id: p.id, posizione: idx, categoria: destCat }));
    
    const finalMenu = newMenuState.map(p => { const updatedP = updatePayload.find(up => up.id === p.id); return updatedP ? { ...p, ...updatedP } : p; });
    setMenu(finalMenu);

    try { await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: updatePayload }) }); } 
    catch (error) { alert("❌ Errore rete"); ricaricaDati(); }
  };

  // Determina se l'account è attivo (se undefined è true per compatibilità)
  const isAccountAttivo = config.account_attivo !== false;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        {/* Pulsante Servizio / Blocco Abbonamento */}
        <div className="card" style={{
            border: isAccountAttivo ? '2px solid #333' : '2px solid red', 
            background: isAccountAttivo ? (config.servizio_attivo ? '#fff3cd' : '#f8d7da') : '#ffecec', 
            marginBottom:'20px', textAlign:'center', padding: '15px'
        }}>
              {!isAccountAttivo ? (
                  /* CASO 1: ACCOUNT SOSPESO DAL SUPER ADMIN */
                  <div>
                      <h2 style={{color:'red', margin:0, fontSize:'1.5rem'}}>⛔ ABBONAMENTO SOSPESO</h2>
                      <p style={{color:'#c0392b', fontWeight:'bold', margin:'5px 0'}}>Il pannello di controllo è disabilitato dall'amministrazione.</p>
                  </div>
              ) : (
                  /* CASO 2: ACCOUNT ATTIVO -> MOSTRA GESTIONE CUCINA */
                  <button onClick={toggleServizio} style={{
                      background: config.servizio_attivo ? '#2ecc71':'#e74c3c', 
                      width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', 
                      border:'none', borderRadius:'5px', cursor:'pointer'
                  }}>
                      {config.servizio_attivo ? "✅ CUCINA APERTA (Clicca per Chiudere)" : "🛑 CUCINA CHIUSA (Clicca per Aprire)"}
                  </button>
              )}
        </div>

        {/* Form Aggiungi/Modifica (Disabilitato visivamente se sospeso, ma non strettamente necessario se il blocco sopra funziona) */}
        <div className="card" style={{background: editId ? '#e3f2fd' : '#f8f9fa', border: editId ? '2px solid #2196f3' : '2px dashed #ccc', opacity: isAccountAttivo ? 1 : 0.5, pointerEvents: isAccountAttivo ? 'auto' : 'none'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h3>{editId ? "✏️ Modifica Piatto" : "➕ Aggiungi Piatto"}</h3>
                  {editId && <button onClick={annullaModifica} style={{background:'#777', padding:'5px', fontSize:'12px', color:'white', border:'none', borderRadius:'3px'}}>Annulla</button>}
              </div>
              <form onSubmit={handleSalvaPiatto} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <input placeholder="Nome Piatto" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
                  <div style={{display:'flex', gap:'10px'}}>
                    <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{flex:1, padding:'10px'}}>
                        {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                    </select>
                    <input placeholder="Sottocategoria (es. Bianchi)" value={nuovoPiatto.sottocategoria} onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})} style={{flex:1}} />
                  </div>
                  <textarea placeholder="Descrizione" value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{padding:'10px', minHeight:'60px'}}/>
                  <div style={{display:'flex', gap:'10px'}}>
                      <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={{flex:1}}/>
                       <div style={{background:'white', padding:'5px', flex:1}}><input type="file" onChange={handleFileChange} />{uploading && "..."}{nuovoPiatto.immagine_url && "✅"}</div>
                  </div>
                  <button type="submit" className="btn-invia" style={{background: editId ? '#2196f3' : '#333'}}>{editId ? "AGGIORNA" : "SALVA"}</button>
              </form>
        </div>

        {/* Lista Piatti */}
        {categorie.map(cat => (
            <div key={cat.id} style={{marginBottom: '20px'}}>
                <h3 style={{marginTop:'30px', borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome} {cat.is_bar && "🍹"} {cat.is_pizzeria && "🍕"}</h3>
                <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                    {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="menu-list" style={{background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent', minHeight: '50px', padding: '5px'}}>
                            {menu.filter(p => p.categoria === cat.nome).sort((a,b) => (a.posizione || 0) - (b.posizione || 0)).map((p, index) => (
                                    <Draggable key={p.id} draggableId={String(p.id)} index={index} isDragDisabled={!isAccountAttivo}>
                                        {(provided, snapshot) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, flexDirection:'row', justifyContent:'space-between', background: snapshot.isDragging ? '#e3f2fd' : 'white', border: editId === p.id ? '2px solid #2196f3' : '1px solid #eee', opacity: isAccountAttivo ? 1 : 0.6}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                    <span style={{color:'#ccc', cursor: isAccountAttivo ? 'grab' : 'not-allowed', fontSize:'20px'}}>☰</span>
                                                    {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                    <div style={{flex:1}}>
                                                        <div><strong>{p.nome}</strong>{p.sottocategoria && <span style={{fontSize:'11px', background:'#eee', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>{p.sottocategoria}</span>}</div>
                                                        {p.descrizione && (<div style={{fontSize:'12px', color:'#777', fontStyle:'italic', marginTop:'2px', lineHeight:'1.2'}}>{p.descrizione.length > 60 ? p.descrizione.substring(0,60) + "..." : p.descrizione}</div>)}
                                                        <div style={{fontSize:'12px', fontWeight:'bold', marginTop:'3px'}}>{p.prezzo}€</div>
                                                    </div>
                                                </div>
                                                {isAccountAttivo && (
                                                    <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                        <button onClick={() => avviaModifica(p)} style={{background:'#f1c40f', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>✏️</button>
                                                        <button onClick={() => duplicaPiatto(p)} style={{background:'#3498db', padding:'5px 10px', borderRadius:'4px', border:'none', color:'white', cursor:'pointer'}}>❐</button>
                                                        <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>🗑️</button>
                                                    </div>
                                                )}
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
  );
}

export default AdminMenu;