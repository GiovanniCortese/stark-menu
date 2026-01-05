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
    fetch(`${API_URL}/api/menu/${user.slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
    fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d=>setConfig(d));
    caricaCategorie();
  };

  const caricaCategorie = () => {
    fetch(`${API_URL}/api/categorie/${user.id}`)
      .then(res => res.json())
      .then(data => {
          setCategorie(data);
          if(data.length > 0 && !nuovoPiatto.categoria) {
              setNuovoPiatto(prev => ({...prev, categoria: data[0].nome}));
          }
      });
  };

  // --- LOGICA DRAG & DROP CATEGORIE ---
  const handleDragCategorie = async (result) => {
    if (!result.destination) return;
    const items = Array.from(categorie);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedItems = items.map((item, index) => ({ ...item, posizione: index }));
    setCategorie(updatedItems);
    await fetch(`${API_URL}/api/categorie/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ categorie: updatedItems }) });
    caricaTutto();
  };

  // --- LOGICA DRAG & DROP PIATTI ---
  const handleDragPiatti = async (result) => {
    if (!result.destination) return;
    
    // Identifichiamo la categoria di partenza e di arrivo
    const sourceCatName = result.source.droppableId.replace("cat-", "");
    const destCatName = result.destination.droppableId.replace("cat-", "");

    // Creiamo una copia del menu per manipolarlo
    let nuovoMenu = Array.from(menu);
    
    // Troviamo il piatto spostato
    const piattoSpostato = nuovoMenu.find(p => String(p.id) === result.draggableId);
    
    // Lo rimuoviamo dalla posizione vecchia
    // (Attenzione: dobbiamo filtrare per trovare l'indice giusto nell'array globale)
    // Strategia semplice: Rimuovilo dall'array globale e reinseriscilo nella nuova posizione logica
    
    // 1. Filtriamo il menu in gruppi per capire l'indice relativo
    const piattiSource = nuovoMenu.filter(p => p.categoria === sourceCatName);
    const piattiDest = sourceCatName === destCatName ? piattiSource : nuovoMenu.filter(p => p.categoria === destCatName);
    
    // L'indice di source.index si riferisce all'array FILTRATO della categoria, non a quello globale
    const itemInSource = piattiSource[result.source.index];
    
    // Rimuoviamo l'item dall'array globale
    nuovoMenu = nuovoMenu.filter(p => p.id !== itemInSource.id);
    
    // Aggiorniamo la categoria se cambiata
    const itemAggiornato = { ...itemInSource, categoria: destCatName };
    
    // Ora dobbiamo inserirlo nella posizione giusta.
    // Dobbiamo trovare l'item che ora occupa la posizione 'destination.index' nella categoria di destinazione
    const piattiDestAggiornati = nuovoMenu.filter(p => p.categoria === destCatName);
    
    // Inseriamo l'item nell'array filtrato di destinazione
    piattiDestAggiornati.splice(result.destination.index, 0, itemAggiornato);
    
    // Ricostruiamo l'array globale:
    // Manteniamo gli altri piatti + i piatti della categoria di destinazione riordinati
    const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCatName);
    
    // Riassegnamo le posizioni numeriche SOLO per la categoria toccata
    const piattiDestFinali = piattiDestAggiornati.map((p, idx) => ({ ...p, posizione: idx }));
    
    const menuFinale = [...altriPiatti, ...piattiDestFinali];
    setMenu(menuFinale);

    // Inviamo al server l'aggiornamento
    await fetch(`${API_URL}/api/prodotti/riordina`, { 
        method: 'PUT', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ 
            prodotti: piattiDestFinali.map(p => ({ 
                id: p.id, 
                posizione: p.posizione,
                categoria: destCatName // Inviamo anche la categoria in caso sia cambiata
            })) 
        }) 
    });
  };

  // Funzioni Standard
  const aggiungiCategoria = async () => { if(!nuovaCat) return; await fetch(`${API_URL}/api/categorie`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nome:nuovaCat, ristorante_id:user.id}) }); setNuovaCat(""); caricaCategorie(); };
  const cancellaCategoria = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); caricaCategorie(); }};
  const handleAggiungiPiatto = async (e) => { e.preventDefault(); if(!nuovoPiatto.nome) return alert("Dati mancanti"); if(categorie.length===0) return alert("Crea categoria!"); const cat = nuovoPiatto.categoria || categorie[0].nome; await fetch(`${API_URL}/api/prodotti`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...nuovoPiatto, categoria:cat, ristorante_id:user.id})}); setNuovoPiatto({nome:'',prezzo:'',categoria:categorie[0].nome,immagine_url:''}); caricaTutto(); alert("Fatto!"); };
  const handleFileChange = async (e) => { const f=e.target.files[0]; if(!f)return; setUploading(true); const fd=new FormData(); fd.append('photo',f); const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); setUploading(false); };
  const toggleServizio = async () => { const n=!config.servizio_attivo; setConfig({...config, servizio_attivo:n}); await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({servizio_attivo:n})}); };
  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); caricaTutto(); }};

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1>⚙️ Admin: {user.nome}</h1>
        <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
            <button onClick={() => setTab('menu')} style={{background: tab==='menu'?'#333':'#ccc'}}>🍔 Piatti</button>
            <button onClick={() => setTab('categorie')} style={{background: tab==='categorie'?'#333':'#ccc'}}>📂 Categorie</button>
        </div>
      </header>

      {tab === 'categorie' && (
        <div className="card">
            <h3>Gestisci Categorie</h3>
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                <input placeholder="Nuova Categoria" value={nuovaCat} onChange={e=>setNuovaCat(e.target.value)} />
                <button onClick={aggiungiCategoria} className="btn-invia">Crea</button>
            </div>
            <DragDropContext onDragEnd={handleDragCategorie}>
                <Droppable droppableId="categories-list">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {categorie.map((cat, index) => (
                                <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, padding:'15px', flexDirection:'row', justifyContent:'space-between'}}>
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
            </DragDropContext>
        </div>
      )}

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

            <DragDropContext onDragEnd={handleDragPiatti}>
                {categorie.map(cat => (
                    <div key={cat.id} style={{marginBottom: '20px'}}>
                        <h3 style={{borderBottom:'2px solid #eee', paddingBottom:'5px', color:'#555'}}>{cat.nome}</h3>
                        <Droppable droppableId={`cat-${cat.nome}`}>
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="menu-list">
                                    {menu.filter(p => p.categoria === cat.nome).map((p, index) => (
                                        <Draggable key={p.id} draggableId={String(p.id)} index={index}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, flexDirection:'row', justifyContent:'space-between', cursor:'grab'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                        <span style={{color:'#ccc'}}>☰</span>
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
            </DragDropContext>
        </>
      )}
    </div>
  );
}
export default Admin;