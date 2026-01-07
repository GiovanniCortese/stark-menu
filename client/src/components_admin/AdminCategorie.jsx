import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminCategorie({ user, categorie, setCategorie, API_URL, ricaricaDati }) {
  const [nuovaCat, setNuovaCat] = useState({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false });
  const [editCatId, setEditCatId] = useState(null); 

  const handleSalvaCategoria = async () => { 
      if(!nuovaCat.nome) return; 
      const payload = { ...nuovaCat, ristorante_id: user.id };

      if (editCatId) {
          await fetch(`${API_URL}/api/categorie/${editCatId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
          alert("Categoria modificata!"); setEditCatId(null);
      } else {
          await fetch(`${API_URL}/api/categorie`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      }
      setNuovaCat({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false });
      ricaricaDati(); 
  };

  const cancellaCategoria = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModificaCat = (cat) => { setEditCatId(cat.id); setNuovaCat({ nome: cat.nome, descrizione: cat.descrizione || '', is_bar: cat.is_bar || false, is_pizzeria: cat.is_pizzeria || false }); };
  const annullaModificaCat = () => { setEditCatId(null); setNuovaCat({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false }); };

  const onDragEnd = async (result) => {
    if (!result.destination || result.type !== 'CATEGORY') return;
    const items = Array.from(categorie);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({ ...item, posizione: index }));
    setCategorie(updatedItems); 

    await fetch(`${API_URL}/api/categorie/riordina`, { 
        method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ categorie: updatedItems }) 
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="card">
            <h3>{editCatId ? "✏️ Modifica Categoria" : "➕ Gestisci Categorie"}</h3>
            <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px'}}>
                <input placeholder="Nome Categoria" value={nuovaCat.nome} onChange={e=>setNuovaCat({...nuovaCat, nome: e.target.value})} />
                <input placeholder="Descrizione" value={nuovaCat.descrizione} onChange={e=>setNuovaCat({...nuovaCat, descrizione: e.target.value})} />
                
                <div style={{display:'flex', gap:10, background:'#f0f0f0', padding:10, borderRadius:5}}>
                    <input type="checkbox" id="is_bar" checked={nuovaCat.is_bar} onChange={e => setNuovaCat({...nuovaCat, is_bar: e.target.checked})} />
                    <label htmlFor="is_bar">🍹 Categoria BAR</label>
                </div>
                <div style={{display:'flex', gap:10, background:'#fbeee6', padding:10, borderRadius:5}}>
                    <input type="checkbox" id="is_pizzeria" checked={nuovaCat.is_pizzeria} onChange={e => setNuovaCat({...nuovaCat, is_pizzeria: e.target.checked})} />
                    <label htmlFor="is_pizzeria">🍕 Categoria PIZZERIA</label>
                </div>

                <div style={{display:'flex', gap:'5px'}}>
                    <button onClick={handleSalvaCategoria} className="btn-invia" style={{flex:1, background: editCatId ? '#f1c40f' : '#333'}}>{editCatId ? "AGGIORNA" : "CREA"}</button>
                    {editCatId && <button onClick={annullaModificaCat} style={{background:'#777', color:'white', border:'none', padding:'10px', borderRadius:5}}>Annulla</button>}
                </div>
            </div>
            
            <Droppable droppableId="all-categories" type="CATEGORY">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        {categorie.map((cat, index) => (
                            <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, padding:'15px', flexDirection:'row', justifyContent:'space-between', borderLeft:'5px solid #333'}}>
                                        <div>
                                            <span style={{fontSize:'18px'}}>☰ <strong>{cat.nome}</strong> {cat.is_bar && "🍹"} {cat.is_pizzeria && "🍕"}</span>
                                            {cat.descrizione && <div style={{fontSize:'12px', color:'#666'}}>{cat.descrizione}</div>}
                                        </div>
                                        <div style={{display:'flex', gap:'5px'}}>
                                            <button onClick={() => avviaModificaCat(cat)} style={{background:'#f1c40f', padding:'5px 10px', borderRadius:4, border:'none'}}>✏️</button>
                                            <button onClick={()=>cancellaCategoria(cat.id)} style={{background:'red', padding:'5px 10px', color:'white'}}>X</button>
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
    </DragDropContext>
  );
}

export default AdminCategorie;