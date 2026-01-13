// client/src/components_admin/AdminMenu.jsx - VERSIONE V40 (FIX GERARCHIA PERMESSI) 🛡️
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const LISTA_ALLERGENI = ["Glutine 🌾", "Crostacei 🦐", "Uova 🥚", "Pesce 🐟", "Arachidi 🥜", "Soia 🫘", "Latte 🥛", "Frutta a guscio 🌰", "Sedano 🥬", "Senape 🌭", "Sesamo 🍔", "Solfiti 🍷", "Lupini 🌼", "Molluschi 🐙"];

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
      
      // 1. Parsing Varianti (Da Testo a JSONB)
      let variantiJson = [];
      if (nuovoPiatto.varianti_str) {
          variantiJson = nuovoPiatto.varianti_str.split(',').map(v => {
              const [nome, prezzo] = v.split(':');
              if(nome && prezzo) return { nome: nome.trim(), prezzo: parseFloat(prezzo) };
              return null;
          }).filter(Boolean);
      }

      // 2. Parsing Ingredienti Base (Da Testo a Array Semplice)
      let ingredientiBaseArr = [];
      if (nuovoPiatto.ingredienti_base) {
          ingredientiBaseArr = nuovoPiatto.ingredienti_base.split(',').map(i => i.trim()).filter(Boolean);
      }

      // Struttura finale JSONB
      const variantiFinali = {
          base: ingredientiBaseArr,
          aggiunte: variantiJson
      };

      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      
      const payload = {
          ...nuovoPiatto, 
          categoria: cat, 
          ristorante_id: user.id,
          varianti: JSON.stringify(variantiFinali) // Salviamo il JSON nel DB
      };
      
      // Rimuoviamo i campi temporanei usati per l'input text
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

  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModifica = (piatto) => { 
      setEditId(piatto.id);
      
      // Recuperiamo il JSON dal DB
      let variantiObj = { base: [], aggiunte: [] };
      try {
          if(piatto.varianti) {
              // Se arriva come stringa dal server (molto probabile con pg), parse
              variantiObj = typeof piatto.varianti === 'string' ? JSON.parse(piatto.varianti) : piatto.varianti;
          }
      } catch(e) { console.error("Err parse varianti", e); }

      // Convertiamo JSON in Testo per gli input
      const strBase = (variantiObj.base || []).join(', ');
      const strAggiunte = (variantiObj.aggiunte || []).map(v => `${v.nome}:${v.prezzo}`).join(', ');

      setNuovoPiatto({
          ...piatto, 
          ingredienti_base: strBase,
          varianti_str: strAggiunte
      }); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const annullaModifica = () => { setEditId(null); setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome || '', sottocategoria: '', descrizione:'', immagine_url:''}); };
  const duplicaPiatto = async (piattoOriginale) => { if(!confirm(`Duplicare?`)) return; const copia = { ...piattoOriginale, nome: `${piattoOriginale.nome} (Copia)`, ristorante_id: user.id }; await fetch(`${API_URL}/api/prodotti`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(copia) }); ricaricaDati(); };

// --- LOGICA DRAG & DROP PIATTI (FIX DEFINITIVO) ---
const onDragEnd = async (result) => {
    if (!result.destination) return;

    // 1. Logica visiva (React)
    const sourceCat = result.source.droppableId.replace("cat-", "");
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);

    // Clona menu
    let nuovoMenu = [...menu];
    const piattoSpostato = nuovoMenu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;

    // Rimuovi dalla vecchia posizione
    nuovoMenu = nuovoMenu.filter(p => p.id !== piattoId);
    
    // Aggiorna dati piatto
    const piattoAggiornato = { ...piattoSpostato, categoria: destCat };

    // Inserisci nella nuova posizione
    const piattiDestinazione = nuovoMenu
        .filter(p => p.categoria === destCat)
        .sort((a,b) => (a.posizione||0) - (b.posizione||0)); // Ordine essenziale!
    
    piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);

    // Ricostruisci menu globale
    const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
    
    // Assegna nuove posizioni (0, 1, 2...)
    const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));
    
    const menuFinale = [...altriPiatti, ...piattiDestinazioneFinali];
    setMenu(menuFinale);

    // 2. Chiamata Server (Payload pulito)
    // Inviamo solo quelli che sono cambiati (la categoria di destinazione)
    await fetch(`${API_URL}/api/prodotti/riordina`, { 
        method: 'PUT', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ 
            prodotti: piattiDestinazioneFinali.map(p => ({ 
                id: p.id, 
                posizione: p.posizione, 
                categoria: destCat 
            })) 
        }) 
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
                      <input placeholder="Nome Piatto" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required />
                      
                      <div style={{display:'flex', gap:'10px'}}>
                        <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{flex:1, padding:'10px'}}>
                            {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                        </select>
                        <input placeholder="Sottocategoria (es. Bianchi)" value={nuovoPiatto.sottocategoria} onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})} style={{flex:1}} />
                      </div>
                      
                      <textarea placeholder="Descrizione" value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{padding:'10px', minHeight:'60px'}}/>
                      <textarea 
    placeholder="Descrizione" 
    value={nuovoPiatto.descrizione} 
    onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} 
    style={{padding:'10px', minHeight:'60px'}}
/>

{/* ⬇️⬇️ INCOLLA QUI IL BLOCCO ALLERGENI ⬇️⬇️ */}
{/* SEZIONE ALLERGENI */}
<div style={{background:'#f9f9f9', padding:'10px', borderRadius:'5px', marginBottom:'10px', border:'1px solid #eee'}}>
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
{/* ⬆️⬆️ FINE BLOCCO ALLERGENI ⬆️⬆️ */}

                      {/* --- NUOVA SEZIONE VARIANTI JSON --- */}
                      <div style={{background:'#fff3cd', padding:'10px', borderRadius:'5px', border:'1px dashed #f39c12'}}>
                          <label style={{fontWeight:'bold', fontSize:'12px', display:'block', marginBottom:'5px'}}>🧂 INGREDIENTI BASE (Separati da virgola)</label>
                          <input 
                              placeholder="Es: Pomodoro, Mozzarella, Basilico (Il cliente potrà toglierli)" 
                              value={nuovoPiatto.ingredienti_base || ""} 
                              onChange={e => setNuovoPiatto({...nuovoPiatto, ingredienti_base: e.target.value})} 
                              style={{width:'100%', marginBottom:'10px'}}
                          />
                          
                          <label style={{fontWeight:'bold', fontSize:'12px', display:'block', marginBottom:'5px'}}>➕ AGGIUNTE A PAGAMENTO (Formato: Nome:Prezzo)</label>
                          <textarea 
                              placeholder="Es: Bufala:2.00, Salame Piccante:1.50, Patatine:1.00" 
                              value={nuovoPiatto.varianti_str || ""} 
                              onChange={e => setNuovoPiatto({...nuovoPiatto, varianti_str: e.target.value})} 
                              style={{width:'100%', minHeight:'50px'}}
                          />
                      </div>

                      <div style={{display:'flex', gap:'10px'}}>
                          <input type="number" placeholder="Prezzo Base" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={{flex:1}} step="0.10" required />
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
                                                            {/* DESCRIZIONE */}
                                                            {p.descrizione && (<div style={{fontSize:'12px', color:'#777', fontStyle:'italic', marginTop:'2px', lineHeight:'1.2'}}>{p.descrizione.length > 60 ? p.descrizione.substring(0,60) + "..." : p.descrizione}</div>)}
                                                            
                                                            {/* VISUALIZZAZIONE INGREDIENTI BASE (NUOVO) */}
                                                            {(() => {
                                                                try {
                                                                    const v = typeof p.varianti === 'string' ? JSON.parse(p.varianti || '{}') : (p.varianti || {});
                                                                    if (v.base && v.base.length > 0) {
                                                                        return (
                                                                            <div style={{fontSize:'11px', color:'#000000ff', marginTop:'3px', fontWeight:'500'}}>
                                                                                🧂 {v.base.join(', ')}
                                                                            </div>
                                                                        );
                                                                    }
                                                                } catch(e) {}
                                                                return null;
                                                            })()}
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