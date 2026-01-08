// client/src/components_admin/AdminCategorie.jsx - VERSIONE V45 (FIX SALVATAGGIO ROBUSTO) 📂
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function AdminCategorie({ user, categorie, setCategorie, API_URL, ricaricaDati }) {
  const [nuovaCat, setNuovaCat] = useState({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false });
  const [editCatId, setEditCatId] = useState(null); 

  const handleSalvaCategoria = async () => { 
      if(!nuovaCat.nome) return; 
      const payload = { ...nuovaCat, ristorante_id: user.id };

      try {
          if (editCatId) {
              await fetch(`${API_URL}/api/categorie/${editCatId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
              alert("Categoria modificata!"); setEditCatId(null);
          } else {
              await fetch(`${API_URL}/api/categorie`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
              alert("Categoria creata!");
          }
          setNuovaCat({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false });
          ricaricaDati(); 
      } catch(e) { alert("Errore connessione"); }
  };

  const cancellaCategoria = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModificaCat = (cat) => { setEditCatId(cat.id); setNuovaCat({ nome: cat.nome, descrizione: cat.descrizione||'', is_bar: cat.is_bar, is_pizzeria: cat.is_pizzeria }); };

  // --- LOGICA DRAG & DROP CATEGORIE (FIX DEFINITIVO) ---
    const onDragEnd = async (result) => {
    if (!result.destination) return;

    // Creiamo una copia e riordiniamo
    const items = Array.from(categorie);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Assegniamo la nuova posizione sequenziale (0, 1, 2...)
    const updatedItems = items.map((item, index) => ({
        ...item,
        posizione: index
    }));

    setCategorie(updatedItems); // Aggiorna UI istantaneamente

    try {
        await fetch(`${API_URL}/api/categorie/riordina`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categorie: updatedItems.map(c => ({ id: c.id, posizione: c.posizione })) })
        });
    } catch (error) {
        console.error("Errore riordino:", error);
        ricaricaDati(); // Revert in caso di errore
    }
};

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="card" style={{flexDirection:'column', alignItems:'flex-start', background:'#e8f6f3', border:'2px dashed #1abc9c'}}>
            <h3>{editCatId ? "✏️ Modifica Categoria" : "📂 Nuova Categoria"}</h3>
            <div style={{display:'flex', gap:'10px', width:'100%', marginBottom:'10px'}}>
                <input placeholder="Nome (es. Antipasti)" value={nuovaCat.nome} onChange={e => setNuovaCat({...nuovaCat, nome: e.target.value})} style={{flex:2}} />
                <input placeholder="Descrizione (opzionale)" value={nuovaCat.descrizione} onChange={e => setNuovaCat({...nuovaCat, descrizione: e.target.value})} style={{flex:3}} />
            </div>
            <div style={{display:'flex', gap:'15px', marginBottom:'10px'}}>
                <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                    <input type="checkbox" checked={nuovaCat.is_bar} onChange={e => setNuovaCat({...nuovaCat, is_bar: e.target.checked})} />
                    🍹 Reparto Bar
                </label>
                <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                    <input type="checkbox" checked={nuovaCat.is_pizzeria} onChange={e => setNuovaCat({...nuovaCat, is_pizzeria: e.target.checked})} />
                    🍕 Reparto Pizzeria
                </label>
            </div>
            <button onClick={handleSalvaCategoria} className="btn-invia" style={{background: editCatId ? '#f39c12' : '#1abc9c'}}>{editCatId ? "AGGIORNA" : "CREA CATEGORIA"}</button>
            {editCatId && <button onClick={() => {setEditCatId(null); setNuovaCat({ nome: '', descrizione: '', is_bar: false, is_pizzeria: false });}} style={{marginTop:'5px', background:'#7f8c8d', color:'white', border:'none', padding:'5px 10px', borderRadius:'4px'}}>Annulla</button>}
        </div>

        <div style={{marginTop:'20px'}}>
            <Droppable droppableId="lista-categorie">
    {(provided) => (
        <div {...provided.droppableProps} ref={provided.innerRef}>
            {categorie
                // AGGIUNGI QUESTA RIGA QUI SOTTO:
                .sort((a, b) => (a.posizione || 0) - (b.posizione || 0)) 
                .map((cat, index) => (
                    <Draggable key={cat.id} draggableId={String(cat.id)} index={index}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="card" style={{...provided.draggableProps.style, padding:'15px', flexDirection:'row', justifyContent:'space-between', borderLeft:'5px solid #333', marginBottom:'10px'}}>
                                <div>
                                    <span style={{fontSize:'18px'}}>☰ <strong>{cat.nome}</strong> {cat.is_bar && "🍹"} {cat.is_pizzeria && "🍕"}</span>
                                    {cat.descrizione && <div style={{fontSize:'12px', color:'#666'}}>{cat.descrizione}</div>}
                                </div>
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button onClick={() => avviaModificaCat(cat)} style={{background:'#f1c40f', padding:'5px 10px', borderRadius:4, border:'none', cursor:'pointer'}}>✏️</button>
                                    <button onClick={()=>cancellaCategoria(cat.id)} style={{background:'red', padding:'5px 10px', color:'white', borderRadius:4, border:'none', cursor:'pointer'}}>X</button>
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