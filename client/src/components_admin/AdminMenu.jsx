// client/src/components_admin/AdminMenu.jsx - VERSIONE V43 (3 LIVELLI) 🔒
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  // --- LOGICA LIVELLI ---
  // 1. Abbonamento (Sito visibile o no)
  const accountAttivo = config.account_attivo !== false;   
  // 2. Pacchetto Cucina (Funzione ordini inclusa o no)
  const pacchettoCucina = config.servizio_attivo !== false; 
  // 3. Stato Giornaliero (Aperto/Chiuso dal ristoratore)
  const cucinaAperta = config.ordini_abilitati;            

  // --- FUNZIONE TOGGLE CUCINA (Livello 3) ---
  const toggleCucina = async () => { 
      // CONTROLLI DI SICUREZZA
      if (!accountAttivo) return alert("⛔ ABBONAMENTO SOSPESO. Contatta l'amministrazione.");
      if (!pacchettoCucina) return alert("⛔ FUNZIONE NON INCLUSA.\nIl tuo piano prevede solo il Menu Digitale.");

      // Se i permessi ci sono, inverte lo stato giornaliero
      const n = !cucinaAperta; 
      setConfig({...config, ordini_abilitati: n}); 
      
      // Invia comando al server su 'ordini_abilitati'
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method:'PUT', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({ ordini_abilitati: n })
          }); 
      } catch (error) {
          alert("Errore di connessione.");
          setConfig({...config, ordini_abilitati: !n}); // Revert in caso di errore
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

    const newMenuState = menu.map(p => {
        if (p.id === piattoId) return { ...p, categoria: destCat };
        return p;
    });

    const piattiDestinazione = newMenuState
        .filter(p => p.categoria === destCat && p.id !== piattoId)
        .sort((a, b) => (a.posizione || 0) - (b.posizione || 0));

    piattiDestinazione.splice(result.destination.index, 0, { ...piattoSpostato, categoria: destCat });

    const updatePayload = piattiDestinazione.map((p, idx) => ({
        id: p.id,
        posizione: idx,
        categoria: destCat
    }));

    const finalMenu = newMenuState.map(p => {
        const updatedP = updatePayload.find(up => up.id === p.id);
        return updatedP ? { ...p, ...updatedP } : p;
    });
    setMenu(finalMenu);

    try {
        await fetch(`${API_URL}/api/prodotti/riordina`, { 
            method: 'PUT', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ prodotti: updatePayload }) 
        });
    } catch (error) {
        alert("❌ ERRORE DI RETE");
        ricaricaDati();
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        {/* BLOCCO COMANDI (Gestione Stati) */}
        <div className="card" style={{border: accountAttivo ? '2px solid #333' : '2px solid red', background: accountAttivo ? '#fff' : '#ffecec', marginBottom:'20px', textAlign:'center', padding:'15px'}}>
              
              {!accountAttivo ? (
                  /* CASO 1: ABBONAMENTO SCADUTO */
                  <div>
                      <h2 style={{color:'red', margin:0}}>⛔ ABBONAMENTO SCADUTO</h2>
                      <p style={{color:'#c0392b', margin:'5px 0'}}>Contatta l'amministrazione per riattivare il servizio.</p>
                  </div>
              ) : !pacchettoCucina ? (
                  /* CASO 2: PACCHETTO SOLO MENU */
                  <div style={{color:'#555'}}>
                      <h3 style={{margin:0, color:'#2980b9'}}>📄 MENU DIGITALE ATTIVO</h3>
                      <p style={{fontSize:'13px', margin:'5px 0'}}>Il tuo piano attuale <b>non include</b> la ricezione ordini al tavolo.</p>
                      <button disabled style={{background:'#ccc', border:'none', padding:'10px', borderRadius:'5px', cursor:'not-allowed'}}>Cucina Disabilitata</button>
                  </div>
              ) : (
                  /* CASO 3: PACCHETTO COMPLETO -> TASTO APRI/CHIUDI */
                  <div>
                      <div style={{fontSize:'12px', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Gestione Servizio</div>
                      <button onClick={toggleCucina} style={{
                          background: cucinaAperta ? '#2ecc71':'#e74c3c', 
                          width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', 
                          border:'none', borderRadius:'5px', cursor:'pointer'
                      }}>
                          {cucinaAperta ? "✅ ORDINI APERTI (Clicca per Chiudere)" : "🛑 ORDINI CHIUSI (Clicca per Aprire)"}
                      </button>
                  </div>
              )}
        </div>

        {/* RESTO DEL PANNELLO (Edit/List) - Disabilitato visivamente se abbonamento scaduto */}
        <div style={{
            opacity: accountAttivo ? 1 : 0.4, 
            pointerEvents: accountAttivo ? 'auto' : 'none', 
            filter: accountAttivo ? 'none' : 'grayscale(100%)'
        }}>
            
            {/* Form Aggiungi/Modifica */}
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

            {/* Lista Piatti */}
            {categorie.map(cat => (
                <div key={cat.id} style={{marginBottom: '20px'}}>
                    <h3 style={{marginTop:'30px', borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome} {cat.is_bar && "🍹"} {cat.is_pizzeria && "🍕"}</h3>
                    <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                        {(provided, snapshot) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="menu-list" style={{background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent', minHeight: '50px', padding: '5px'}}>
                                {menu
                                    .filter(p => p.categoria === cat.nome)
                                    .sort((a,b) => (a.posizione || 0) - (b.posizione || 0)) 
                                    .map((p, index) => (
                                        <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, flexDirection:'row', justifyContent:'space-between', background: snapshot.isDragging ? '#e3f2fd' : 'white', border: editId === p.id ? '2px solid #2196f3' : '1px solid #eee'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                                                        <span style={{color:'#ccc', cursor:'grab', fontSize:'20px'}}>☰</span>
                                                        {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                        <div style={{flex:1}}>
                                                            <div><strong>{p.nome}</strong>{p.sottocategoria && <span style={{fontSize:'11px', background:'#eee', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>{p.sottocategoria}</span>}</div>
                                                            {p.descrizione && (<div style={{fontSize:'12px', color:'#777', fontStyle:'italic', marginTop:'2px', lineHeight:'1.2'}}>{p.descrizione.length > 60 ? p.descrizione.substring(0,60) + "..." : p.descrizione}</div>)}
                                                            <div style={{fontSize:'12px', fontWeight:'bold', marginTop:'3px'}}>{p.prezzo}€</div>
                                                        </div>
                                                    </div>
                                                    <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                        <button onClick={() => avviaModifica(p)} style={{background:'#f1c40f', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>✏️</button>
                                                        <button onClick={() => duplicaPiatto(p)} style={{background:'#3498db', padding:'5px 10px', borderRadius:'4px', border:'none', color:'white', cursor:'pointer'}}>❐</button>
                                                        <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>🗑️</button>
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
        </div>
    </DragDropContext>
  );
}

export default AdminMenu;