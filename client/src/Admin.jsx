// client/src/Admin.jsx - VERSIONE V10 (FIX LETTURA ID) 🛠️
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function Admin() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // STATI DATI
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(''); // Per vedere errori a schermo

  const [menu, setMenu] = useState([]); 
  const [categorie, setCategorie] = useState([]); 
  const [tab, setTab] = useState('menu'); 

  // STATI CONFIG & EDIT
  const [config, setConfig] = useState({ 
      ordini_abilitati: false, servizio_attivo: false,
      logo_url: '', cover_url: '',
      colore_sfondo: '#222', colore_titolo: '#fff', colore_testo: '#ccc', colore_prezzo: '#27ae60',
      font_style: 'sans-serif'
  });
  const [uploading, setUploading] = useState(false);
  const [nuovoPiatto, setNuovoPiatto] = useState({ nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '' });
  const [nuovaCat, setNuovaCat] = useState({ nome: '', descrizione: '' });
  const [editCatId, setEditCatId] = useState(null); 
  const [editId, setEditId] = useState(null); 
  const [fileExcel, setFileExcel] = useState(null);

  const API_URL = "https://stark-backend-gg17.onrender.com";

  // --- 1. INIZIALIZZAZIONE ---
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
        setLoading(true);
        setErrorMsg('');

        // A. CONTROLLO PASS (GOD MODE o PASSWORD)
        const sessionKey = `stark_session_${slug}`;
        const isGodMode = localStorage.getItem(sessionKey); 
        
        if (!isGodMode) {
            const pass = prompt(`🔒 Admin: ${slug}\nInserisci Password:`);
            if (pass !== "tonystark") {
                alert("Password Errata");
                window.location.href = "/"; // Torna alla home
                return;
            }
            localStorage.setItem(sessionKey, "true");
        }

        // B. RECUPERO DATI (CORRETTO PER IL TUO BACKEND)
        try {
            const res = await fetch(`${API_URL}/api/menu/${slug}`);
            const data = await res.json();

            // VERIFICA CHE I DATI ESISTANO
            // In App.jsx usi: data.id (numero) e data.ristorante (nome stringa)
            if (data && data.id) {
                
                // Creiamo l'oggetto user manualmente per uniformare il codice
                const userData = {
                    id: data.id,
                    nome: data.ristorante, // Era solo una stringa!
                    slug: slug
                };
                setUser(userData);
                
                setMenu(data.menu || []);
                
                // Carichiamo il resto usando l'ID corretto
                caricaConfigurazioniExtra(userData.id);

            } else {
                console.error("Dati ricevuti strani:", data);
                setErrorMsg("Ristorante non trovato o errore dati server.");
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("Errore di connessione al server.");
        } finally {
            setLoading(false);
        }
    };

    init();
  }, [slug]);

  const caricaConfigurazioniExtra = (id) => {
      // 1. Configurazione Stile
      fetch(`${API_URL}/api/ristorante/config/${id}`)
        .then(r=>r.json())
        .then(d=>setConfig(prev => ({...prev, ...d})))
        .catch(e => console.error("Err config", e));
      
      // 2. Categorie
      fetch(`${API_URL}/api/categorie/${id}`)
        .then(r=>r.json())
        .then(cats => {
            setCategorie(cats);
            if(cats.length > 0) setNuovoPiatto(prev => ({...prev, categoria: cats[0].nome}));
        })
        .catch(e => console.error("Err categorie", e));
  };

  const ricaricaDati = () => {
      if(!user) return;
      fetch(`${API_URL}/api/menu/${slug}`).then(r=>r.json()).then(d=>setMenu(d.menu || []));
      fetch(`${API_URL}/api/categorie/${user.id}`).then(r=>r.json()).then(setCategorie);
  };

  // --- GESTIONE INTERFACCIA ---
  const handleLogout = () => {
      if(confirm("Uscire dal pannello?")) {
          localStorage.removeItem(`stark_session_${slug}`);
          navigate('/');
      }
  };

  // --- CRUD & LOGICA (INVARIATE) ---
  const handleSaveStyle = async () => {
      await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config)});
      alert("🎨 Grafica aggiornata!");
  };

  const handleUpload = async (e, type) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const fd = new FormData(); fd.append('photo', f);
      const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
      const d = await r.json();
      if(d.url) {
          if(type === 'logo') setConfig(p => ({...p, logo_url: d.url}));
          if(type === 'cover') setConfig(p => ({...p, cover_url: d.url}));
          if(type === 'dish') setNuovoPiatto(p => ({...p, immagine_url: d.url}));
      }
      setUploading(false);
  };

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.type === 'CATEGORY') {
        const items = Array.from(categorie);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        const updatedItems = items.map((item, index) => ({ ...item, posizione: index }));
        setCategorie(updatedItems);
        await fetch(`${API_URL}/api/categorie/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ categorie: updatedItems }) });
        ricaricaDati();
    } else if (result.type === 'DISH') {
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
        setMenu([...altriPiatti, ...piattiDestinazioneFinali]);
        await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: piattiDestinazioneFinali.map(p => ({ id: p.id, posizione: p.posizione, categoria: destCat })) }) });
    }
  };

  const handleSalvaCategoria = async () => { 
      if(!nuovaCat.nome) return; 
      const url = editCatId ? `${API_URL}/api/categorie/${editCatId}` : `${API_URL}/api/categorie`;
      const method = editCatId ? 'PUT' : 'POST';
      await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...nuovaCat, ristorante_id: user.id}) });
      setNuovaCat({ nome: '', descrizione: '' }); setEditCatId(null); ricaricaDati(); 
  };
  const cancellaCategoria = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/categorie/${id}`, {method:'DELETE'}); ricaricaDati(); }};

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      const cat = nuovoPiatto.categoria || (categorie[0]?.nome || "");
      const url = editId ? `${API_URL}/api/prodotti/${editId}` : `${API_URL}/api/prodotti`;
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify({...nuovoPiatto, categoria:cat, ristorante_id:user.id}) }); 
      setNuovoPiatto({nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:''}); setEditId(null); ricaricaDati(); 
  };
  const cancellaPiatto = async (id) => { if(confirm("Eliminare?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  const avviaModifica = (piatto) => { setEditId(piatto.id); setNuovoPiatto(piatto); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  
  const handleImportExcel = async () => {
    if(!fileExcel) return alert("Manca il file");
    const fd = new FormData(); fd.append('file', fileExcel); fd.append('ristorante_id', user.id);
    setUploading(true);
    await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: fd });
    setUploading(false); alert("Importazione completata"); ricaricaDati();
  };
  const handleExportExcel = () => { window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank'); };
  
  const toggleServizio = async () => { 
      const n=!config.servizio_attivo; setConfig({...config, servizio_attivo:n}); 
      await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({servizio_attivo:n})}); 
  };

  // --- RENDER (Con Debug Errori) ---
  if (loading) return <div style={{padding:'50px', textAlign:'center', fontSize:'24px'}}>🔄 Caricamento Admin <strong>{slug}</strong>...</div>;
  
  if (errorMsg) return (
      <div style={{padding:'50px', textAlign:'center', color:'red'}}>
          <h2>⛔ Errore Critico</h2>
          <p>{errorMsg}</p>
          <button onClick={() => navigate('/')}>Torna alla Home</button>
      </div>
  );

  return (
    <div className="container" style={{maxWidth:'1200px', margin:'0 auto', paddingBottom:'50px'}}>
      
      {/* HEADER */}
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #ddd', paddingBottom:'15px'}}>
        <div>
            <h1 style={{margin:0}}>⚙️ {user.nome}</h1>
            <small style={{color:'#666'}}>Admin Panel / {slug}</small>
        </div>
        <button onClick={handleLogout} style={{background:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>
            🚪 ESCI
        </button>
      </header>

      {/* NAV TABS */}
      <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'20px'}}>
        {['menu', 'categorie', 'style', 'excel'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
                flex:1, padding:'10px', border:'none', cursor:'pointer', fontWeight:'bold',
                background: tab===t ? '#333' : '#ddd', color: tab===t ? 'white' : 'black'
            }}>
                {t.toUpperCase()}
            </button>
        ))}
      </div>

      {/* TAB STYLE */}
      {tab === 'style' && (
          <div className="card">
              <h3>🎨 Grafica</h3>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px'}}>
                  <div>
                      <h4>Logo</h4>
                      <input type="file" onChange={(e)=>handleUpload(e, 'logo')} />
                      {config.logo_url && <img src={config.logo_url} height="50" style={{marginTop:'5px', border:'1px solid #ccc'}}/>}
                  </div>
                  <div>
                      <h4>Cover</h4>
                      <input type="file" onChange={(e)=>handleUpload(e, 'cover')} />
                      {config.cover_url && <img src={config.cover_url} height="50" style={{marginTop:'5px', border:'1px solid #ccc'}}/>}
                  </div>
                  <div>
                      <h4>Colori</h4>
                      <input type="color" value={config.colore_sfondo} onChange={e=>setConfig({...config, colore_sfondo:e.target.value})} title="Sfondo"/>
                      <input type="color" value={config.colore_titolo} onChange={e=>setConfig({...config, colore_titolo:e.target.value})} title="Titoli"/>
                  </div>
                  <div>
                      <h4>Font</h4>
                      <select value={config.font_style} onChange={e=>setConfig({...config, font_style:e.target.value})} style={{width:'100%', padding:'5px'}}>
                          <option value="sans-serif">Moderno</option>
                          <option value="serif">Classico</option>
                          <option value="'Courier New', monospace">Typewriter</option>
                      </select>
                  </div>
              </div>
              <button onClick={handleSaveStyle} className="btn-invia" style={{marginTop:'15px', background:'#9b59b6'}}>💾 Salva Grafica</button>
          </div>
      )}

      {/* TAB EXCEL */}
      {tab === 'excel' && (
          <div className="card">
              <h3>📊 Import/Export</h3>
              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button onClick={handleExportExcel} className="btn-invia" style={{background:'#27ae60', flex:1}}>📥 Scarica Excel</button>
                <div style={{flex:1, display:'flex', gap:'5px'}}>
                    <input type="file" onChange={(e)=>setFileExcel(e.target.files[0])} />
                    <button onClick={handleImportExcel} className="btn-invia" disabled={uploading}>📤 Carica</button>
                </div>
              </div>
          </div>
      )}

      {/* TAB MENU */}
      {tab === 'menu' && (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <div className="card" style={{background: config.servizio_attivo ? '#d4edda':'#f8d7da', textAlign:'center', border: config.servizio_attivo ? '1px solid green' : '1px solid red'}}>
              <h3 style={{margin:'0 0 10px 0'}}>Stato Servizio: {config.servizio_attivo ? "APERTO 🟢" : "CHIUSO 🔴"}</h3>
              <button onClick={toggleServizio} style={{padding:'5px 20px', cursor:'pointer'}}>CAMBIA STATO</button>
          </div>

          <div className="card" style={{borderLeft: editId ? '5px solid #2196f3' : '5px solid #333'}}>
              <h3>{editId ? "✏️ Modifica Piatto" : "➕ Nuovo Piatto"}</h3>
              <form onSubmit={handleSalvaPiatto} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  <div style={{display:'flex', gap:'10px'}}>
                    <input placeholder="Nome" value={nuovoPiatto.nome} onChange={e=>setNuovoPiatto({...nuovoPiatto, nome:e.target.value})} style={{flex:2}} />
                    <input placeholder="Prezzo" value={nuovoPiatto.prezzo} onChange={e=>setNuovoPiatto({...nuovoPiatto, prezzo:e.target.value})} style={{flex:1}} />
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <select value={nuovoPiatto.categoria} onChange={e=>setNuovoPiatto({...nuovoPiatto, categoria:e.target.value})} style={{flex:1}}>
                        {categorie.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <input placeholder="Sottocategoria" value={nuovoPiatto.sottocategoria || ''} onChange={e=>setNuovoPiatto({...nuovoPiatto, sottocategoria:e.target.value})} style={{flex:1}} />
                  </div>
                  <textarea placeholder="Descrizione" value={nuovoPiatto.descrizione || ''} onChange={e=>setNuovoPiatto({...nuovoPiatto, descrizione:e.target.value})} style={{minHeight:'60px'}} />
                  <input type="file" onChange={(e)=>handleUpload(e, 'dish')} />
                  <div style={{display:'flex', gap:'10px'}}>
                      <button type="submit" className="btn-invia" style={{background: editId ? '#2196f3':'#333'}}>{editId ? "Aggiorna" : "Aggiungi"}</button>
                      {editId && <button type="button" onClick={()=>{setEditId(null); setNuovoPiatto({nome:'', prezzo:'', categoria:categorie[0]?.nome, sottocategoria:'', descrizione:'', immagine_url:''})}} style={{padding:'10px'}}>Annulla</button>}
                  </div>
              </form>
          </div>

          {categorie.map(cat => (
              <div key={cat.id}>
                  <h3 style={{borderBottom:'2px solid #eee', padding:'20px 0 5px', color:'#555'}}>{cat.nome}</h3>
                  <Droppable droppableId={`cat-${cat.nome}`} type="DISH">
                      {(provided, snapshot) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} style={{background: snapshot.isDraggingOver ? '#f9f9f9' : 'transparent', minHeight:'50px'}}>
                              {menu.filter(p=>p.categoria===cat.nome).map((p, idx) => (
                                  <Draggable key={p.id} draggableId={String(p.id)} index={idx}>
                                      {(prov) => (
                                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="card" style={{...prov.draggableProps.style, padding:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:'3px solid #ccc'}}>
                                              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                  {p.immagine_url && <img src={p.immagine_url} style={{width:'40px', height:'40px', borderRadius:'4px', objectFit:'cover'}}/>}
                                                  <div><strong>{p.nome}</strong> <small>({p.prezzo}€)</small></div>
                                              </div>
                                              <div>
                                                  <button onClick={()=>avviaModifica(p)} style={{marginRight:'5px'}}>✏️</button>
                                                  <button onClick={()=>cancellaPiatto(p.id)} style={{background:'#e74c3c', color:'white'}}>🗑️</button>
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

      {/* TAB CATEGORIE */}
      {tab === 'categorie' && (
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <div className="card">
                <h3>Gestione Categorie</h3>
                <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <input placeholder="Nome Categoria" value={nuovaCat.nome} onChange={e=>setNuovaCat({...nuovaCat, nome:e.target.value})} style={{flex:2}}/>
                    <button onClick={handleSalvaCategoria} className="btn-invia" style={{flex:1, background: editCatId?'#f1c40f':'#333'}}>{editCatId?'Aggiorna':'Crea'}</button>
                    {editCatId && <button onClick={()=>{setEditCatId(null); setNuovaCat({nome:'', descrizione:''})}}>Annulla</button>}
                </div>
                <Droppable droppableId="cats" type="CATEGORY">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {categorie.map((c, idx) => (
                                <Draggable key={c.id} draggableId={String(c.id)} index={idx}>
                                    {(prov) => (
                                        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="card" style={{...prov.draggableProps.style, marginBottom:'10px', display:'flex', justifyContent:'space-between', padding:'15px', borderLeft:'5px solid #333'}}>
                                            <span>☰ <strong>{c.nome}</strong></span>
                                            <div>
                                                <button onClick={()=>{setEditCatId(c.id); setNuovaCat(c)}} style={{marginRight:'5px'}}>✏️</button>
                                                <button onClick={()=>cancellaCategoria(c.id)} style={{background:'red', color:'white'}}>X</button>
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
      )}
    </div>
  );
}

export default Admin;