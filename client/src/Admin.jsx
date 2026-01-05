// client/src/Admin.jsx - VERSIONE DRAG & DROP TOTALE (CATEGORIE + PIATTI) 🚀
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Admin() {
  const [tab, setTab] = useState('menu'); 
  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  const [config, setConfig] = useState({ ordini_abilitati: false, servizio_attivo: false });
  
  const [uploading, setUploading] = useState(false);
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', immagine_url: '' });
  const [nuovaCat, setNuovaCat] = useState("");

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    caricaTutto();
  }, []);

  const caricaTutto = () => {
    // Scarica Menu e Configurazione
    fetch(`${API_URL}/api/menu/${user.slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
    fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d=>setConfig(d));
    caricaCategorie();
  };

  const caricaCategorie = () => {
    fetch(`${API_URL}/api/categorie/${user.id}`)
      .then(res => res.json())
      .then(data => {
          setCategorie(data);
          // Se stiamo aggiungendo un piatto e non c'è categoria selezionata, metti la prima di default
          if(data.length > 0 && !nuovoPiatto.categoria) {
              setNuovoPiatto(prev => ({...prev, categoria: data[0].nome}));
          }
      });
  };

  // --- GESTORE UNICO DRAG & DROP ---
  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    // A. SE STIAMO SPOSTANDO UNA CATEGORIA
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
        // Ricarichiamo tutto per essere sicuri che l'ordine visivo dei piatti segua le categorie
        caricaTutto();
        return;
    }

    // B. SE STIAMO SPOSTANDO UN PIATTO (DISH)
    if (result.type === 'DISH') {
        // Capiamo da quale categoria partiamo e dove arriviamo (togliamo il prefisso "cat-")
        const sourceCat = result.source.droppableId.replace("cat-", "");
        const destCat = result.destination.droppableId.replace("cat-", "");

        // 1. Troviamo il piatto spostato
        const piattoId = parseInt(result.draggableId);
        const piattoSpostato = menu.find(p => p.id === piattoId);
        if (!piattoSpostato) return;

        // 2. Creiamo una copia del menu senza il piatto spostato
        let nuovoMenu = menu.filter(p => p.id !== piattoId);

        // 3. Aggiorniamo la categoria del piatto (nel caso sia cambiata)
        const piattoAggiornato = { ...piattoSpostato, categoria: destCat };

        // 4. Ora dobbiamo inserirlo nella posizione giusta all'interno della categoria di destinazione.
        //    Isoliamo i piatti della categoria di destinazione attuali (già senza il piatto spostato)
        const piattiDestinazione = nuovoMenu.filter(p => p.categoria === destCat);
        
        //    Inseriamo il piatto nell'array locale della categoria
        piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);

        // 5. Ricostruiamo l'array globale MENU:
        //    Tutti i piatti che NON sono della categoria destinazione + i piatti della categoria destinazione riordinati
        const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
        
        //    IMPORTANTE: Riassegnamo le posizioni numeriche ai piatti della categoria toccata
        const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));

        //    Mettiamo tutto insieme
        const menuFinale = [...altriPiatti, ...piattiDestinazioneFinali];
        setMenu(menuFinale);

        // 6. Salviamo sul server
        await fetch(`${API_URL}/api/prodotti/riordina`, { 
            method: 'PUT', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ 
                prodotti: piattiDestinazioneFinali.map(p => ({ 
                    id: p.id, 
                    posizione: p.posizione, 
                    categoria: destCat // Mandiamo la categoria aggiornata
                })) 
            }) 
        });
    }
  };

  /* --- FUNZIONI STANDARD (CRUD) --- */
  const aggiungiCategoria = async () => { if(!nuovaCat) return; await fetch(`${API_URL}/api/categorie`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nome:nuovaCat, ristorante_id:user.id}) }); setNuovaCat(""); caricaCategorie(); };
  const cancellaCategoria = async (id) => { if(confirm("Eliminare categoria?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); caricaCategorie(); }};
  
  const handleAggiungiPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Dati mancanti"); 
      if(categorie.length===0) return alert("Crea prima una categoria!"); 
      
      const cat = nuovoPiatto.categoria || categorie[0].nome; 
      
      await fetch(`${API_URL}/api/prodotti`, {
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body:JSON.stringify({...nuovoPiatto, categoria:cat, ristorante_id:user.id})
      }); 
      
      setNuovoPiatto({nome:'',prezzo:'',categoria:categorie[0].nome,immagine_url:''}); 
      caricaTutto(); 
      alert("Piatto aggiunto!"); 
  };
  
  const handleFileChange = async (e) => { const f=e.target.files[0]; if(!f)return; setUploading(true); const fd=new FormData(); fd.append('photo',f); const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); setUploading(false); };
  const toggleServizio = async () => { const n=!config.servizio_attivo; setConfig({...config, servizio_attivo:n}); await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({servizio_attivo:n})}); };
  const cancellaPiatto = async (id) => { if(confirm("Eliminare piatto?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); caricaTutto(); }};

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
            <button onClick={() => setTab('menu')} style={{background: tab==='menu'?'#333':'#ccc'}}>🍔 Menu & Piatti</button>
            <button onClick={() => setTab('categorie')} style={{background: tab==='categorie'?'#333':'#ccc'}}>📂 Gestisci Categorie</button>
        </div>
      </header>

      {/* --- UNICO CONTESTO DRAG & DROP --- */}
      <DragDropContext onDragEnd={handleOnDragEnd}>

        {/* TAB 1: GESTIONE CATEGORIE (ORDINAMENTO CATEGORIE) */}
        {tab === 'categorie' && (
            <div className="card">
                <h3>Gestisci Categorie (Trascina per ordinare)</h3>
                <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <input placeholder="Nuova Categoria" value={nuovaCat} onChange={e=>setNuovaCat(e.target.value)} />
                    <button onClick={aggiungiCategoria} className="btn-invia">Crea</button>
                </div>
                
                <Droppable droppableId="all-categories" type="CATEGORY">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {categorie.map((cat, index) => (
                                <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, padding:'15px', flexDirection:'row', justifyContent:'space-between', borderLeft:'5px solid #333'}}>
                                            <span>☰ <strong>{cat.nome}</strong></span>
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
        )}

        {/* TAB 2: MENU (ORDINAMENTO PIATTI DENTRO E TRA CATEGORIE) */}
        {tab === 'menu' && (
            <>
                <div className="card" style={{border: '2px solid #333', background: '#fff3cd'}}>
                    <button onClick={toggleServizio} style={{background: config.servizio_attivo ? '#2ecc71':'#e74c3c', width:'100%', padding:'10px', color:'white', fontWeight:'bold'}}>
                        {config.servizio_attivo ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}
                    </button>
                </div>

                <div className="card" style={{background: '#f8f9fa', border: '2px dashed #ccc'}}>
                    <h3>➕ Aggiungi Piatto</h3>
                    <form onSubmit={handleAggiungiPiatto} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <input placeholder="Nome" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
                        <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} />
                        <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={{padding:'10px'}}>
                            {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                        </select>
                        <div style={{background:'white', padding:'10px'}}><input type="file" onChange={handleFileChange} />{uploading && "Caricamento..."}{nuovoPiatto.immagine_url && "✅ Foto"}</div>
                        <button type="submit" className="btn-invia">SALVA</button>
                    </form>
                </div>

                {/* VISUALIZZAZIONE BOX PER OGNI CATEGORIA */}
                {categorie.map(cat => (
                    <div key={cat.id} style={{marginBottom: '20px'}}>
                        <h3 style={{borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555', marginTop:'30px'}}>{cat.nome}</h3>
                        
                        <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                            {(provided, snapshot) => (
                                <div 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef} 
                                    className="menu-list"
                                    style={{
                                        background: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                        minHeight: '50px', // Importante per poter trascinare in box vuoti
                                        border: snapshot.isDraggingOver ? '2px dashed #ccc' : 'none',
                                        borderRadius: '8px',
                                        padding: '5px'
                                    }}
                                >
                                    {menu
                                        .filter(p => p.categoria === cat.nome)
                                        .map((p, index) => (
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
                                                            boxShadow: snapshot.isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                            <span style={{color:'#ccc', cursor:'grab', fontSize:'20px'}}>☰</span>
                                                            {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', objectFit:'cover', borderRadius:'4px'}}/>}
                                                            <div><strong>{p.nome}</strong><br/><small>{p.prezzo}€</small></div>
                                                        </div>
                                                        <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred', padding:'5px'}}>🗑️</button>
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
            </>
        )}

      </DragDropContext>
    </div>
  );
}

export default Admin;