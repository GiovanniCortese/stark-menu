import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  const toggleServizio = async () => { 
      if (!user.superAdminAbilitato) { alert("⛔ Bloccato dal Super Admin"); return; }
      const n = !config.servizio_attivo; 
      setConfig({...config, servizio_attivo:n}); 
      await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({servizio_attivo:n})}); 
  };

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      const payload = {...nuovoPiatto, categoria:cat, ristorante_id:user.id};
      
      if(editId) {
          await fetch(`${API_URL}/api/prodotti/${editId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
          alert("Piatto modificato!");
      } else {
          if(categorie.length===0) return alert("Crea prima una categoria!"); 
          await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
          alert("Piatto aggiunto!");
      }
      setNuovoPiatto({nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:''}); 
      setEditId(null);
      ricaricaDati(); 
  };

  const handleFileChange = async (e) => { 
      const f=e.target.files[0]; if(!f)return; setUploading(true); 
      const fd=new FormData(); fd.append('photo',f); 
      const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); 
      if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); setUploading(false); 
  };

  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModifica = (piatto) => { setEditId(piatto.id); setNuovoPiatto(piatto); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const annullaModifica = () => { setEditId(null); setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome || '', sottocategoria: '', descrizione:'', immagine_url:''}); };
  const duplicaPiatto = async (piattoOriginale) => { if(!confirm(`Duplicare?`)) return; const copia = { ...piattoOriginale, nome: `${piattoOriginale.nome} (Copia)`, ristorante_id: user.id }; try { await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(copia) }); ricaricaDati(); } catch(e) { alert("Errore"); } };

  const onDragEnd = async (result) => {
    if (!result.destination || result.type !== 'DISH') return;
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);
    const piattoSpostato = menu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;

    piattoSpostato.categoria = destCat;
    const menuSenzaPiatto = menu.filter(p => p.id !== piattoId);
    const nuovoMenu = [...menuSenzaPiatto]; nuovoMenu.push(piattoSpostato); 
    setMenu(nuovoMenu); // Update locale rapido

    const piattiDestinazione = menu.filter(p => p.categoria === destCat && p.id !== piattoId);
    piattiDestinazione.splice(result.destination.index, 0, piattoSpostato);
    const updatePayload = piattiDestinazione.map((p, idx) => ({ id: p.id, posizione: idx, categoria: destCat }));

    await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: updatePayload }) });
    ricaricaDati(); 
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="card" style={{border: user.superAdminAbilitato ? '2px solid #333' : '2px solid red', background: user.superAdminAbilitato ? (config.servizio_attivo ? '#fff3cd' : '#f8d7da') : '#ffecec', marginBottom:'20px', textAlign:'center'}}>
              {!user.superAdminAbilitato ? (
                  <div><h2 style={{color:'red', margin:0}}>⛔ SERVIZIO DISABILITATO DAL SUPER ADMIN</h2></div>
              ) : (
                  <button onClick={toggleServizio} style={{background: config.servizio_attivo ? '#2ecc71':'#e74c3c', width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', border:'none', borderRadius:'5px', cursor:'pointer'}}>{config.servizio_attivo ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}</button>
              )}
        </div>

        <div className="card" style={{background: editId ? '#e3f2fd' : '#f8f9fa', border: editId ? '2px solid #2196f3' : '2px dashed #ccc'}}>
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

        {categorie.map(cat => (
            <div key={cat.id} style={{marginBottom: '20px'}}>
                <h3 style={{marginTop:'30px', borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome} {cat.is_bar && "🍹"} {cat.is_pizzeria && "🍕"}</h3>
                <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                    {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="menu-list" style={{background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent', minHeight: '50px', padding: '5px'}}>
                            {menu.filter(p => p.categoria === cat.nome).map((p, index) => (
                                <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                    {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, flexDirection:'row', justifyContent:'space-between', background: snapshot.isDragging ? '#e3f2fd' : 'white', border: editId === p.id ? '2px solid #2196f3' : '1px solid #eee'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                <span style={{color:'#ccc', cursor:'grab', fontSize:'20px'}}>☰</span>
                                                {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                <div><strong>{p.nome}</strong>{p.sottocategoria && <span style={{fontSize:'11px', background:'#eee', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>{p.sottocategoria}</span>}<div style={{fontSize:'12px', fontWeight:'bold'}}>{p.prezzo}€</div></div>
                                            </div>
                                            <div style={{display:'flex', gap:'5px'}}>
                                                <button onClick={() => avviaModifica(p)} style={{background:'#f1c40f', padding:'5px 10px', borderRadius:'4px', border:'none'}}>✏️</button>
                                                <button onClick={() => duplicaPiatto(p)} style={{background:'#3498db', padding:'5px 10px', borderRadius:'4px', border:'none', color:'white'}}>❐</button>
                                                <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px 10px', borderRadius:'4px', border:'none'}}>🗑️</button>
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
  );
}

export default AdminMenu;