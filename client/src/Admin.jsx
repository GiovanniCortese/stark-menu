// client/src/Admin.jsx - VERSIONE DEFINITIVA V2 (CON EDITING) ✅
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Admin() {
  const [tab, setTab] = useState('menu'); 
  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  const [config, setConfig] = useState({ ordini_abilitati: false, servizio_attivo: false });
  const [uploading, setUploading] = useState(false);
  
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [nuovaCat, setNuovaCat] = useState({ nome: '', descrizione: '' });
  
  // STATO PER MODIFICA
  const [editId, setEditId] = useState(null); // Se diverso da null, stiamo modificando questo ID

  const [fileExcel, setFileExcel] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    caricaTutto();
  }, []);

  const caricaTutto = () => {
    fetch(`${API_URL}/api/menu/${user.slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
    fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d=>setConfig(d));
    caricaCategorie();
  };

  const caricaCategorie = () => {
    fetch(`${API_URL}/api/categorie/${user.id}`)
      .then(res => res.json())
      .then(data => {
          setCategorie(data);
          // Se stiamo creando da zero, mettiamo la prima categoria come default
          if(data.length > 0 && !nuovoPiatto.categoria && !editId) setNuovoPiatto(prev => ({...prev, categoria: data[0].nome}));
      });
  };

  // --- LOGICA EXCEL ---
  const handleImportExcel = async () => {
    if(!fileExcel) return alert("Seleziona un file .xlsx prima!");
    const formData = new FormData();
    formData.append('file', fileExcel);
    formData.append('ristorante_id', user.id);

    try {
        setUploading(true);
        const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData });
        const data = await res.json();
        
        if(data.success) {
            alert(data.message);
            caricaTutto();
        } else {
            alert("ERRORE SERVER: " + (data.error || "Errore sconosciuto"));
        }
    } catch(err) { alert("Errore di connessione al server"); } 
    finally { setUploading(false); setFileExcel(null); }
  };

  const handleExportExcel = () => {
      window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank');
  };

  // --- DRAG & DROP LOGIC ---
  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    if (result.type === 'CATEGORY') {
        const items = Array.from(categorie);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        const updatedItems = items.map((item, index) => ({ ...item, posizione: index }));
        setCategorie(updatedItems);
        
        await fetch(`${API_URL}/api/categorie/riordina`, { 
            method: 'PUT', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ categorie: updatedItems }) 
        });
        caricaTutto();
        return;
    }

    if (result.type === 'DISH') {
        const sourceCat = result.source.droppableId.replace("cat-", "");
        const destCat = result.destination.droppableId.replace("cat-", "");

        const piattoId = parseInt(result.draggableId);
        const piattoSpostato = menu.find(p => p.id === piattoId);
        if (!piattoSpostato) return;

        let nuovoMenu = menu.filter(p => p.id !== piattoId);
        const piattoAggiornato = { ...piattoSpostato, categoria: destCat };

        const piattiDestinazione = nuovoMenu.filter(p => p.categoria === destCat);
        piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);

        const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
        const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));

        const menuFinale = [...altriPiatti, ...piattiDestinazioneFinali];
        setMenu(menuFinale);

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
    }
  };
  
  // --- FUNZIONI CRUD ---

  const aggiungiCategoria = async () => { 
      if(!nuovaCat.nome) return; 
      await fetch(`${API_URL}/api/categorie`, { 
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body:JSON.stringify({
              nome: nuovaCat.nome, 
              descrizione: nuovaCat.descrizione, 
              ristorante_id: user.id
          }) 
      }); 
      setNuovaCat({ nome: '', descrizione: '' }); 
      caricaCategorie(); 
  };

  // GESTIONE SALVATAGGIO (CREA O MODIFICA)
  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      
      if(editId) {
          // SIAMO IN MODIFICA (PUT)
          await fetch(`${API_URL}/api/prodotti/${editId}`, { 
              method:'PUT', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({...nuovoPiatto, categoria:cat, ristorante_id:user.id}) 
          }); 
          alert("Piatto modificato!");
      } else {
          // SIAMO IN CREAZIONE (POST)
          if(categorie.length===0) return alert("Crea prima una categoria!"); 
          await fetch(`${API_URL}/api/prodotti`, { 
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({...nuovoPiatto, categoria:cat, ristorante_id:user.id}) 
          }); 
          alert("Piatto aggiunto!");
      }
      
      // Reset form
      setNuovoPiatto({nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:''}); 
      setEditId(null);
      caricaTutto(); 
  };
  
  // PREPARA IL FORM PER LA MODIFICA
  const avviaModifica = (piatto) => {
      setEditId(piatto.id);
      setNuovoPiatto({
          nome: piatto.nome,
          prezzo: piatto.prezzo,
          categoria: piatto.categoria,
          sottocategoria: piatto.sottocategoria || '',
          descrizione: piatto.descrizione || '',
          immagine_url: piatto.immagine_url || ''
      });
      // Scrolla in alto per vedere il form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const annullaModifica = () => {
      setEditId(null);
      setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome || '', sottocategoria: '', descrizione:'', immagine_url:''}); 
  };

  const cancellaCategoria = async (id) => { if(confirm("Eliminare categoria?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); caricaCategorie(); }};
  const handleFileChange = async (e) => { const f=e.target.files[0]; if(!f)return; setUploading(true); const fd=new FormData(); fd.append('photo',f); const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); setUploading(false); };
  
  const toggleServizio = async () => { const n=!config.servizio_attivo; setConfig({...config, servizio_attivo:n}); await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({servizio_attivo:n})}); };
  
  const cancellaPiatto = async (id) => { if(confirm("Eliminare piatto?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); caricaTutto(); }};

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setTab('menu')} style={{background: tab==='menu'?'#333':'#ccc'}}>🍔 Menu</button>
            <button onClick={() => setTab('categorie')} style={{background: tab==='categorie'?'#333':'#ccc'}}>📂 Categorie</button>
            <button onClick={() => setTab('excel')} style={{background: tab==='excel'?'#27ae60':'#ccc'}}>📊 Excel</button>
        </div>
      </header>

      {/* --- TAB EXCEL --- */}
      {tab === 'excel' && (
          <div className="card">
              <h3>Gestione Massiva (Excel)</h3>
              <p>Carica il tuo menu o fai un backup.</p>
              
              <div style={{margin:'20px 0', padding:'20px', background:'#f0f0f0', borderRadius:'10px'}}>
                  <h4>📤 Esporta Menu</h4>
                  <button onClick={handleExportExcel} className="btn-invia" style={{background:'#27ae60'}}>Scarica Excel</button>
              </div>

              <div style={{margin:'20px 0', padding:'20px', background:'#f0f0f0', borderRadius:'10px'}}>
                  <h4>📥 Importa Menu</h4>
                  <p><small>Colonne richieste: Nome, Prezzo, Categoria, Sottocategoria, Descrizione</small></p>
                  <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileExcel(e.target.files[0])} />
                  <button onClick={handleImportExcel} className="btn-invia" disabled={uploading}>
                      {uploading ? "Caricamento..." : "Carica Excel"}
                  </button>
              </div>
          </div>
      )}

      {/* --- TAB MENU --- */}
      {tab === 'menu' && (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          
          <div className="card" style={{border: '2px solid #333', background: '#fff3cd', marginBottom:'20px'}}>
              <button onClick={toggleServizio} style={{background: config.servizio_attivo ? '#2ecc71':'#e74c3c', width:'100%', padding:'15px', color:'white', fontWeight:'bold', fontSize:'18px', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                  {config.servizio_attivo ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}
              </button>
          </div>

          <div className="card" style={{background: editId ? '#e3f2fd' : '#f8f9fa', border: editId ? '2px solid #2196f3' : '2px dashed #ccc'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h3>{editId ? "✏️ Modifica Piatto" : "➕ Aggiungi Piatto Manuale"}</h3>
                  {editId && <button onClick={annullaModifica} style={{background:'#777', padding:'5px 10px', fontSize:'12px', color:'white', border:'none', borderRadius:'3px', cursor:'pointer'}}>Annulla Modifica</button>}
              </div>

              <form onSubmit={handleSalvaPiatto} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <input placeholder="Nome Piatto" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
                  
                  <div style={{display:'flex', gap:'10px'}}>
                    <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{flex:1, padding:'10px'}}>
                        {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                    </select>
                    {/* INPUT SOTTOCATEGORIA */}
                    <input 
                        placeholder="Sottocategoria (es. Bianchi)" 
                        value={nuovoPiatto.sottocategoria} 
                        onChange={e => setNuovoPiatto({...nuovoPiatto, sottocategoria: e.target.value})}
                        style={{flex:1}} 
                    />
                  </div>
                  
                  <textarea 
                    placeholder="Descrizione / Ingredienti" 
                    value={nuovoPiatto.descrizione} 
                    onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} 
                    style={{padding:'10px', borderRadius:'5px', border:'1px solid #ccc', minHeight:'60px'}}
                  />
                  
                  <div style={{display:'flex', gap:'10px'}}>
                      <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={{flex:1}}/>
                       <div style={{background:'white', padding:'5px', flex:1}}><input type="file" onChange={handleFileChange} />{uploading && "..."}{nuovoPiatto.immagine_url && "✅"}</div>
                  </div>
                  
                  <button type="submit" className="btn-invia" style={{background: editId ? '#2196f3' : '#333'}}>
                      {editId ? "AGGIORNA PIATTO" : "SALVA PIATTO"}
                  </button>
              </form>
          </div>

           {/* VISUALIZZAZIONE DRAG & DROP DEI PIATTI */}
           {categorie.map(cat => (
                <div key={cat.id} style={{marginBottom: '20px'}}>
                    <h3 style={{marginTop:'30px', borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome}</h3>
                    
                    <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                        {(provided, snapshot) => (
                            <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className="menu-list"
                                style={{
                                    background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                    minHeight: '50px',
                                    padding: '5px'
                                }}
                            >
                                {menu.filter(p => p.categoria === cat.nome).map((p, index) => (
                                    <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef} 
                                                {...provided.draggableProps} 
                                                {...provided.dragHandleProps} 
                                                className="card" 
                                                style={{
                                                    ...provided.draggableProps.style, 
                                                    flexDirection:'row', 
                                                    justifyContent:'space-between',
                                                    background: snapshot.isDragging ? '#e3f2fd' : 'white',
                                                    border: editId === p.id ? '2px solid #2196f3' : '1px solid #eee'
                                                }}
                                            >
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span style={{color:'#ccc', cursor:'grab', fontSize:'20px'}}>☰</span>
                                                    {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                    <div>
                                                        <strong>{p.nome}</strong>
                                                        {p.sottocategoria && <span style={{fontSize:'11px', background:'#eee', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>{p.sottocategoria}</span>}
                                                        <div style={{fontSize:'12px', fontWeight:'bold'}}>{p.prezzo}€</div>
                                                    </div>
                                                </div>
                                                <div style={{display:'flex', gap:'5px'}}>
                                                    {/* TASTO MODIFICA */}
                                                    <button onClick={() => avviaModifica(p)} style={{background:'#f1c40f', padding:'5px', borderRadius:'4px', border:'none', cursor:'pointer'}}>✏️</button>
                                                    {/* TASTO CANCELLA */}
                                                    <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px', borderRadius:'4px', border:'none', cursor:'pointer'}}>🗑️</button>
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
      )}

      {/* --- TAB CATEGORIE --- */}
      {tab === 'categorie' && (
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <div className="card">
                <h3>Gestisci Categorie</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px'}}>
                    <input placeholder="Nome Categoria" value={nuovaCat.nome} onChange={e=>setNuovaCat({...nuovaCat, nome: e.target.value})} />
                    <input placeholder="Descrizione" value={nuovaCat.descrizione} onChange={e=>setNuovaCat({...nuovaCat, descrizione: e.target.value})} style={{fontSize: '14px'}}/>
                    <button onClick={aggiungiCategoria} className="btn-invia">Crea</button>
                </div>
                
                <Droppable droppableId="all-categories" type="CATEGORY">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {categorie.map((cat, index) => (
                                <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, padding:'15px', flexDirection:'row', justifyContent:'space-between', borderLeft:'5px solid #333'}}>
                                            <div>
                                                <span>☰ <strong>{cat.nome}</strong></span>
                                                {cat.descrizione && <div style={{fontSize:'12px', color:'#666', marginLeft:'20px'}}>{cat.descrizione}</div>}
                                            </div>
                                            <button onClick={()=>cancellaCategoria(cat.id)} style={{background:'red', padding:'5px 10px'}}>X</button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </DragDropContext>
      )}
    </div>
  );
}

export default Admin;