// client/src/Admin.jsx - CON DRAG & DROP CATEGORIE 🖐️
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Admin() {
  const [tab, setTab] = useState('menu'); // 'menu' o 'categorie'
  const [menu, setMenu] = useState([]);
  const [categorie, setCategorie] = useState([]); // Lista categorie dal DB
  const [config, setConfig] = useState({ ordini_abilitati: false, servizio_attivo: false });
  
  const [uploading, setUploading] = useState(false);
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', immagine_url: '' });
  const [nuovaCat, setNuovaCat] = useState(""); // Per input nuova categoria

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = "https://stark-backend-gg17.onrender.com";

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    caricaTutto();
  }, []);

  const caricaTutto = () => {
    // 1. Menu
    fetch(`${API_URL}/api/menu/${user.slug}`).then(r=>r.json()).then(d=>{if(d.menu) setMenu(d.menu)});
    // 2. Config
    fetch(`${API_URL}/api/ristorante/config/${user.id}`).then(r=>r.json()).then(d=>setConfig(d));
    // 3. Categorie
    caricaCategorie();
  };

  const caricaCategorie = () => {
    fetch(`${API_URL}/api/categorie/${user.id}`)
      .then(res => res.json())
      .then(data => {
          setCategorie(data);
          // Se stiamo aggiungendo un piatto e non c'è categoria, metti la prima di default
          if(data.length > 0 && !nuovoPiatto.categoria) {
              setNuovoPiatto(prev => ({...prev, categoria: data[0].nome}));
          }
      });
  };

  // --- LOGICA CATEGORIE (Drag & Drop) ---
  const aggiungiCategoria = async () => {
    if(!nuovaCat) return;
    await fetch(`${API_URL}/api/categorie`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nome: nuovaCat, ristorante_id: user.id })
    });
    setNuovaCat("");
    caricaCategorie();
  };

  const cancellaCategoria = async (id) => {
      if(confirm("Eliminare categoria? Attenzione: i piatti associati rimarranno ma senza categoria.")) {
          await fetch(`${API_URL}/api/categorie/${id}`, { method: 'DELETE' });
          caricaCategorie();
      }
  }

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;
    
    // Riordiniamo l'array locale
    const items = Array.from(categorie);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Aggiorniamo la posizione numerica interna
    const updatedItems = items.map((item, index) => ({ ...item, posizione: index }));
    setCategorie(updatedItems);

    // Salviamo sul server
    await fetch(`${API_URL}/api/categorie/riordina`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ categorie: updatedItems })
    });
  };

  // --- LOGICA PIATTI ---
  const handleAggiungiPiatto = async (e) => {
    e.preventDefault();
    if(!nuovoPiatto.nome || !nuovoPiatto.prezzo) return alert("Dati mancanti");
    
    // Se non ci sono categorie, obblighiamo a crearne una
    if(categorie.length === 0) return alert("Crea prima almeno una categoria!");

    const catDaUsare = nuovoPiatto.categoria || categorie[0].nome;

    await fetch(`${API_URL}/api/prodotti`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...nuovoPiatto, categoria: catDaUsare, ristorante_id: user.id }) 
    });
    setNuovoPiatto({ nome: '', prezzo: '', categoria: categorie[0].nome, immagine_url: '' }); 
    caricaTutto(); alert("Piatto aggiunto!");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if(!file) return; setUploading(true);
    const formData = new FormData(); formData.append('photo', file);
    const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if(data.url) setNuovoPiatto(prev => ({ ...prev, immagine_url: data.url }));
    setUploading(false);
  };
  
  const toggleServizio = async () => { /* Logica uguale a prima... */
     const nuovo = !config.servizio_attivo; setConfig({...config, servizio_attivo: nuovo});
     await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({servizio_attivo:nuovo})});
  };

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

      {/* --- TAB GESTIONE CATEGORIE --- */}
      {tab === 'categorie' && (
        <div className="card">
            <h3>Gestisci Categorie (Trascina per ordinare)</h3>
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                <input placeholder="Nuova Categoria (es. Vini)" value={nuovaCat} onChange={e=>setNuovaCat(e.target.value)} />
                <button onClick={aggiungiCategoria} className="btn-invia">Crea</button>
            </div>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="categories">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {categorie.map((cat, index) => (
                                <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                                    {(provided) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.draggableProps} 
                                            {...provided.dragHandleProps}
                                            style={{
                                                padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '5px',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                ...provided.draggableProps.style
                                            }}
                                        >
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

      {/* --- TAB GESTIONE MENU --- */}
      {tab === 'menu' && (
        <>
            <div className="card" style={{border: '2px solid #333', background: '#fff3cd'}}>
                <h3>🚦 Stato Servizio</h3>
                {!config.ordini_abilitati ? <p style={{color:'red'}}>Non abilitato dal Super Admin</p> : 
                <button onClick={toggleServizio} style={{background: config.servizio_attivo ? '#2ecc71':'#e74c3c', width:'100%', padding:'10px', color:'white', fontWeight:'bold'}}>
                    {config.servizio_attivo ? "✅ ORDINI APERTI" : "🛑 ORDINI CHIUSI"}
                </button>}
            </div>

            <div className="card" style={{background: '#f8f9fa', border: '2px dashed #ccc'}}>
                <h3>➕ Aggiungi Piatto</h3>
                <form onSubmit={handleAggiungiPiatto} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <input placeholder="Nome" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} />
                    <input type="number" placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} />
                    
                    {/* SELECT DINAMICA CATEGORIE */}
                    <label>Categoria:</label>
                    <select 
                        value={nuovoPiatto.categoria} 
                        onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})}
                        style={{padding:'10px', borderRadius:'5px'}}
                    >
                        {categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                    </select>

                    <div style={{background:'white', padding:'10px'}}><input type="file" onChange={handleFileChange} />{uploading && "Caricamento..."}{nuovoPiatto.immagine_url && "✅ Foto OK"}</div>
                    <button type="submit" className="btn-invia">SALVA</button>
                </form>
            </div>

            <div className="menu-list">
                {menu.map((p) => (
                <div key={p.id} className="card" style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <div><strong>{p.nome}</strong> <br/><small>{p.categoria}</small></div>
                    <button onClick={() => cancellaPiatto(p.id)} style={{background:'darkred'}}>🗑️</button>
                </div>
                ))}
            </div>
        </>
      )}
    </div>
  );
}
export default Admin;