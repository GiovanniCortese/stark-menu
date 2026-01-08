// client/src/components_admin/AdminMenu.jsx - VERSIONE V40 (FIX GERARCHIA PERMESSI) 🛡️
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  // --- LOGICA STATI (V40) ---
  // account_attivo = ABBONAMENTO (Gestito da SuperAdmin, blocca tutto)
  // cucina_super_active = MASTER SWITCH (Gestito da SuperAdmin, blocca solo cucina)
  // ordini_abilitati = INTERRUTTORE RISTORATORE (Gestito qui)
  
  const isAbbonamentoAttivo = config.account_attivo !== false; // Default true
  const isMasterBlock = config.cucina_super_active === false;  // Se false, è bloccato dagli admin
  const isCucinaAperta = config.ordini_abilitati;

  // --- FUNZIONI DI SERVIZIO ---
  const toggleCucina = async () => { 
      // 1. BLOCCO SICUREZZA
      if (!isAbbonamentoAttivo) return alert("⛔ ABBONAMENTO SOSPESO."); 
      if (isMasterBlock) return alert("⛔ CUCINA BLOCCATA DAGLI ADMIN.");

      // 2. TOGGLE CUCINA (ordini_abilitati)
      const nuovoStatoCucina = !isCucinaAperta; 
      
      // Aggiornamento Ottimistico
      setConfig({...config, ordini_abilitati: nuovoStatoCucina}); 
      
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {
              method:'PUT', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({ ordini_abilitati: nuovoStatoCucina })
          }); 
      } catch (error) {
          alert("Errore di connessione.");
          setConfig({...config, ordini_abilitati: !nuovoStatoCucina}); // Revert
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

// --- LOGICA DRAG & DROP PIATTI (FIX DEFINITIVO) ---
const onDragEnd = async (result) => {
    if (!result.destination) return; // Droppato fuori

    // 1. Identifica IDs
    const startCat = result.source.droppableId.replace("cat-", "");
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);

    // 2. Clona il menu attuale
    const nuovoMenu = Array.from(menu);
    
    // 3. Trova e rimuovi l'elemento dalla posizione originale
    // Nota: findIndex è più sicuro di splice basato solo su source.index quando si usano filtri
    const indexOriginale = nuovoMenu.findIndex(p => p.id === piattoId);
    if(indexOriginale === -1) return;
    
    const [piattoSpostato] = nuovoMenu.splice(indexOriginale, 1);

    // 4. Aggiorna la categoria del piatto
    piattoSpostato.categoria = destCat;

    // 5. Calcola dove inserirlo
    // Dobbiamo trovare l'indice corretto nell'array GLOBALE 'nuovoMenu'
    // Filtriamo gli elementi della destinazione per capire dove va
    const itemsDestinazione = nuovoMenu.filter(p => p.categoria === destCat);
    
    // Inseriamo "visivamente"
    itemsDestinazione.splice(result.destination.index, 0, piattoSpostato);

    // 6. Ricostruiamo il menu ordinato per il backend
    // Creiamo un payload solo con gli elementi della categoria toccata
    const payloadUpdate = itemsDestinazione.map((p, index) => ({
        id: p.id,
        posizione: index, // 0, 1, 2...
        categoria: destCat
    }));

    // 7. Aggiorniamo lo stato locale (per non far scattare l'interfaccia)
    // Rimuoviamo tutti i vecchi item di questa categoria e mettiamo i nuovi ordinati
    const menuFinale = [
        ...nuovoMenu.filter(p => p.categoria !== destCat), 
        ...itemsDestinazione
    ];
    setMenu(menuFinale);

    // 8. Chiamata Server (Usa la logica V33)
    await fetch(`${API_URL}/api/prodotti/riordina`, { 
        method: 'PUT', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ prodotti: payloadUpdate }) 
    });
};

  // --- DEFINIZIONE STILI CARD STATO ---
  let cardBg = '#fff3cd'; 
  let cardBorder = '2px solid #333';
  
  if (!isAbbonamentoAttivo) {
      cardBg = '#ffecec'; cardBorder = '2px solid red';
  } else if (isMasterBlock) {
      cardBg = '#fadbd8'; cardBorder = '2px solid #c0392b';
  } else if (!isCucinaAperta) {
      cardBg = '#f8d7da';
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        {/* Pulsante Servizio (CONTROLLO GERARCHICO) */}
        <div className="card" style={{
            border: cardBorder, 
            background: cardBg, 
            marginBottom:'20px', textAlign:'center', padding: '15px'
        }}>
              {!isAbbonamentoAttivo ? (
                  /* CASO 1: ABBONAMENTO SCADUTO (Blocco Totale) */
                  <div>
                      <h2 style={{color:'red', margin:0, fontSize:'1.5rem'}}>⛔ ABBONAMENTO SOSPESO</h2>
                      <p style={{color:'#c0392b', fontWeight:'bold', margin:'5px 0'}}>Contatta l'amministrazione per sbloccare il pannello.</p>
                  </div>
              ) : isMasterBlock ? (
                  /* CASO 2: BLOCCO SUPER ADMIN (Cucina Disabilitata Centralmente) */
                  <div>
                      <h2 style={{color:'#c0392b', margin:0, fontSize:'1.5rem'}}>👮 CUCINA BLOCCATA DAGLI ADMIN</h2>
                      <p style={{color:'#c0392b', fontWeight:'bold', margin:'5px 0'}}>La gestione ordini è disabilitata temporaneamente.</p>
                  </div>
              ) : (
                  /* CASO 3: NORMALE -> MOSTRA BOTTONE */
                  <button onClick={toggleCucina} style={{
                      background: isCucinaAperta ? '#2ecc71':'#e74c3c', 
                      width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', 
                      border:'none', borderRadius:'5px', cursor:'pointer'
                  }}>
                      {isCucinaAperta ? "✅ ORDINI APERTI (Clicca per Chiudere)" : "🛑 ORDINI CHIUSI (Clicca per Aprire)"}
                  </button>
              )}
        </div>

        {/* --- SEZIONE EDITING (Disabilitata visivamente se sospeso) --- */}
        <div style={{
            opacity: isAbbonamentoAttivo ? 1 : 0.4, 
            pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none', 
            filter: isAbbonamentoAttivo ? 'none' : 'grayscale(100%)'
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