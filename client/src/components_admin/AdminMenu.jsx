// client/src/components_admin/AdminMenu.jsx - AGGIORNATO (Unità Misura & Toggle €)
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ProductRow from './ProductRow';

const LISTA_ALLERGENI = [
  "Glutine 🌾", "Crostacei 🦐", "Uova 🥚", "Pesce 🐟", "Arachidi 🥜", 
  "Soia 🫘", "Latte 🥛", "Frutta a guscio 🌰", "Sedano 🥬", 
  "Senape 🌭", "Sesamo 🍔", "Solfiti 🍷", "Lupini 🌼", "Molluschi 🐙",
  "Prodotto Surgelato/Abbattuto ❄️" 
];

const ImageUploader = ({ type, currentUrl, icon, config, setConfig, API_URL }) => (
    <div style={{marginTop:'5px'}}>
        {currentUrl ? (
            <div style={{
                position:'relative', border:'1px solid #27ae60', borderRadius:'8px', padding:'10px', 
                background:'#f0fff4', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center'
            }}>
                <span style={{fontSize:'24px', marginBottom:'5px'}}>{icon}</span>
                <span style={{fontSize:'12px', fontWeight:'bold', color:'#27ae60'}}>File Caricato!</span>
                <button 
                    onClick={() => setConfig({...config, [type]: ''})} 
                    style={{
                        marginTop:'8px', background:'#e74c3c', color:'white', border:'none', 
                        padding:'5px 10px', borderRadius:'5px', cursor:'pointer', fontSize:'11px', fontWeight:'bold'
                    }}
                >
                    🗑️ RIMUOVI
                </button>
            </div>
        ) : (
            <div style={{
                border:'2px dashed #ccc', borderRadius:'8px', padding:'15px', textAlign:'center', 
                position:'relative', cursor:'pointer', background:'#fafafa', transition:'all 0.3s'
            }}>
                <span style={{fontSize:'24px', opacity:0.5}}>{icon}</span>
                <div style={{fontSize:'11px', color:'#666', marginTop:'5px'}}>Clicca per caricare</div>
                <input 
                    type="file" 
                    onChange={async (e) => {
                        const f = e.target.files[0]; if(!f) return;
                        const fd = new FormData(); fd.append('photo', f);
                        try {
                            const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
                            const d = await r.json();
                            if(d.url) {
                                setConfig(prev => ({...prev, [type]: d.url}));
                            }
                        } catch(err) { alert("Errore caricamento"); }
                    }} 
                    style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} 
                />
            </div>
        )}
    </div>
);

function AdminMenu({ user, menu, setMenu, categorie, config, setConfig, API_URL, ricaricaDati }) {
  const [nuovoPiatto, setNuovoPiatto] = useState({ 
      nome: '', prezzo: '', categoria: '', sottocategoria: '', descrizione: '', immagine_url: '',
      ingredienti_base: '', varianti_str: '', allergeni: [], unita_misura: '' // AGGIUNTO
  });
  
  const [traduzioniInput, setTraduzioniInput] = useState({ 
    en: { nome: '', descrizione: '' },
    de: { nome: '', descrizione: '' }
  });

  const [editId, setEditId] = useState(null); 
  const [uploading, setUploading] = useState(false);

  if (!config || !categorie || !menu) {
      return <div style={{padding:'40px', textAlign:'center', color:'#666'}}>🔄 Caricamento Menu...</div>;
  }

  const isAbbonamentoAttivo = config.account_attivo !== false; 
  const isMasterBlock = config.cucina_super_active === false; 
  const isCucinaAperta = config.ordini_abilitati;

  let headerBg = isCucinaAperta ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
  let headerTitle = isCucinaAperta ? "✅ Servizio Attivo" : "🛑 Servizio Sospeso";
  let headerDesc = isCucinaAperta ? "I clienti possono inviare ordini." : "Gli ordini sono bloccati.";

  if (isMasterBlock) {
      headerBg = 'linear-gradient(135deg, #8e44ad 0%, #c0392b 100%)'; 
      headerTitle = "⛔ BLOCCATO DA SUPER ADMIN";
      headerDesc = "L'amministrazione centrale ha disabilitato gli ordini per questo locale.";
  }

  const handleSaveStyle = async () => {
    try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(config) });
        alert("✨ Impostazioni e footer salvati!");
    } catch(e) { alert("Errore salvataggio"); }
  };

  const toggleCucina = async () => { 
      if (!isAbbonamentoAttivo) return alert("⛔ ABBONAMENTO SOSPESO."); 
      if (isMasterBlock) return alert("⛔ CUCINA BLOCCATA DAL SUPER ADMIN."); 
      const nuovoStatoCucina = !isCucinaAperta; 
      setConfig({...config, ordini_abilitati: nuovoStatoCucina}); 
      try {
          await fetch(`${API_URL}/api/ristorante/servizio/${user.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ordini_abilitati: nuovoStatoCucina }) }); 
      } catch (error) { alert("Errore connessione."); setConfig({...config, ordini_abilitati: !nuovoStatoCucina}); }
  };

  const handleSalvaPiatto = async (e) => { 
      e.preventDefault(); 
      if(!nuovoPiatto.nome) return alert("Nome mancante"); 
      
      let variantiJson = [];
      if (nuovoPiatto.varianti_str) {
          variantiJson = nuovoPiatto.varianti_str.split(',').map(v => {
              const [nome, prezzo] = v.split(':');
              return (nome && prezzo) ? { nome: nome.trim(), prezzo: parseFloat(prezzo) } : null;
          }).filter(Boolean);
      }
      const ingredientiBaseArr = nuovoPiatto.ingredienti_base ? nuovoPiatto.ingredienti_base.split(',').map(i => i.trim()).filter(Boolean) : [];
      const variantiFinali = { base: ingredientiBaseArr, aggiunte: variantiJson };
      const cat = nuovoPiatto.categoria || (categorie.length > 0 ? categorie[0].nome : "");
      
      const payload = { ...nuovoPiatto, categoria: cat, ristorante_id: user.id, varianti: JSON.stringify(variantiFinali) };
      delete payload.varianti_str; delete payload.ingredienti_base;

      payload.traduzioni = traduzioniInput; 

      try {
          const method = editId ? 'PUT' : 'POST';
          const url = editId ? `${API_URL}/api/prodotti/${editId}` : `${API_URL}/api/prodotti`;
          if(!editId && categorie.length === 0) return alert("Crea prima una categoria!"); 
          await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); 
          alert(editId ? "✅ Piatto aggiornato!" : "✅ Piatto creato!");
          
          setNuovoPiatto({ nome:'', prezzo:'', categoria:cat, sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: '', allergeni: [], unita_misura: '' }); 
          setTraduzioniInput({ en: { nome: '', descrizione: '' }, de: { nome: '', descrizione: '' } }); 
          
          setEditId(null); ricaricaDati(); 
      } catch(err) { alert("❌ Errore: " + err.message); }
  };

  const handleFileChange = async (e) => { 
      const f=e.target.files[0]; if(!f)return; setUploading(true); 
      const fd=new FormData(); fd.append('photo', f); 
      try { const r=await fetch(`${API_URL}/api/upload`,{method:'POST',body:fd}); const d=await r.json(); if(d.url) setNuovoPiatto(p=>({...p, immagine_url:d.url})); } catch(e) { console.error(e); } finally { setUploading(false); }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const formData = new FormData(); formData.append('file', file); formData.append('ristorante_id', user.id);
    try { const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData }); const data = await res.json(); if(data.success) { alert(data.message); ricaricaDati(); } else alert("Errore: " + data.error); } catch(err) { alert("Errore Connessione"); }
  };

  const cancellaPiatto = async (id) => { if(confirm("Sei sicuro di voler eliminare questo piatto?")) { await fetch(`${API_URL}/api/prodotti/${id}`, {method:'DELETE'}); ricaricaDati(); }};
  
  const avviaModifica = (piatto) => { 
      setEditId(piatto.id); 
      let variantiObj = { base: [], aggiunte: [] }; 
      try { variantiObj = typeof piatto.varianti === 'string' ? JSON.parse(piatto.varianti) : piatto.varianti || { base: [], aggiunte: [] }; } catch(e) {} 
      
      setNuovoPiatto({ ...piatto, unita_misura: piatto.unita_misura || '', allergeni: piatto.allergeni || [], ingredienti_base: (variantiObj.base || []).join(', '), varianti_str: (variantiObj.aggiunte || []).map(v => `${v.nome}:${v.prezzo}`).join(', ') }); 
      
      const tr = piatto.traduzioni || {};
      setTraduzioniInput({
          en: { nome: tr.en?.nome || '', descrizione: tr.en?.descrizione || '' },
          de: { nome: tr.de?.nome || '', descrizione: tr.de?.descrizione || '' }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const annullaModifica = () => { 
      setEditId(null); 
      setNuovoPiatto({ nome:'', prezzo:'', categoria:categorie.length > 0 ? categorie[0].nome : '', sottocategoria: '', descrizione:'', immagine_url:'', varianti_str: '', ingredienti_base: '', allergeni: [], unita_misura: '' }); 
      setTraduzioniInput({ en: { nome: '', descrizione: '' }, de: { nome: '', descrizione: '' } }); 
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const destCat = result.destination.droppableId.replace("cat-", "");
    const piattoId = parseInt(result.draggableId);
    let nuovoMenu = [...menu];
    const piattoSpostato = nuovoMenu.find(p => p.id === piattoId);
    if (!piattoSpostato) return;
    nuovoMenu = nuovoMenu.filter(p => p.id !== piattoId);
    const piattoAggiornato = { ...piattoSpostato, categoria: destCat };
    const piattiDestinazione = nuovoMenu.filter(p => p.categoria === destCat).sort((a,b) => (a.posizione||0) - (b.posizione||0)); 
    piattiDestinazione.splice(result.destination.index, 0, piattoAggiornato);
    const altriPiatti = nuovoMenu.filter(p => p.categoria !== destCat);
    const piattiDestinazioneFinali = piattiDestinazione.map((p, idx) => ({ ...p, posizione: idx }));
    setMenu([...altriPiatti, ...piattiDestinazioneFinali]);
    await fetch(`${API_URL}/api/prodotti/riordina`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prodotti: piattiDestinazioneFinali.map(p => ({ id: p.id, posizione: p.posizione, categoria: destCat })) }) });
  };

  const containerStyle = { maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#333' };
  const cardStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '25px', marginBottom: '30px', border: '1px solid #f0f0f0', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', background: '#f9f9f9', transition: 'all 0.3s', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={containerStyle}>
        
        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', background: headerBg, color:'white', border:'none'}}>
            <div>
                <h2 style={{margin:0, fontSize:'24px'}}>{headerTitle}</h2>
                <p style={{margin:0, opacity:0.9, fontSize:'14px'}}>{headerDesc}</p>
            </div>
            
            {isAbbonamentoAttivo && !isMasterBlock && (
                <button onClick={toggleCucina} style={{background:'white', color: isCucinaAperta ? '#27ae60' : '#c0392b', border:'none', padding:'12px 25px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                    {isCucinaAperta ? "CHIUDI ORDINI CLIENTE" : "APRI ORDINI CLIENTE"}
                </button>
            )}
        </div>

        <div style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 25px', background:'#f8f9fa'}}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <span style={{fontSize:'24px'}}>📊</span>
                <div>
                    <h4 style={{margin:0, color:'#2c3e50'}}>Import/Export Excel</h4>
                    <p style={{margin:0, fontSize:'12px', color:'#7f8c8d'}}>Gestisci il tuo menu massivamente.</p>
                </div>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank')} style={{background:'white', border:'1px solid #ddd', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', color:'#333'}}>📤 Scarica Menu</button>
                <div style={{position:'relative'}}>
                    <button style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer', fontWeight:'600'}}>📥 Carica Excel (Aggiorna/Crea)</button>
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                </div>
            </div>
        </div>

        <div style={{opacity: isAbbonamentoAttivo ? 1 : 0.5, pointerEvents: isAbbonamentoAttivo ? 'auto' : 'none'}}>
            <div style={{...cardStyle, borderLeft: editId ? '5px solid #3498db' : '5px solid #2ecc71'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                      <h3 style={{margin:0, color:'#2c3e50'}}>{editId ? "✏️ Modifica Piatto" : "✨ Aggiungi Nuovo Piatto"}</h3>
                      {editId && <button onClick={annullaModifica} style={{background:'#eee', color:'#333', border:'none', padding:'5px 15px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold'}}>Annulla Modifica</button>}
                  </div>

                 <form onSubmit={handleSalvaPiatto} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px'}}>
                      
                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div>
                              <label style={labelStyle}>Nome del Piatto *</label>
                              <input placeholder="Es. Spaghetti alle Vongole" value={nuovoPiatto.nome} onChange={e => setNuovoPiatto({...nuovoPiatto, nome: e.target.value})} required style={inputStyle} />
                          </div>
                          <div style={{display:'flex', gap:'15px'}}>
                              <div style={{flex:1}}>
                                  <label style={labelStyle}>Categoria</label>
                                  <select value={nuovoPiatto.categoria} onChange={e => setNuovoPiatto({...nuovoPiatto, categoria: e.target.value})} style={inputStyle}>
                                      {categorie && categorie.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                                  </select>
                              </div>
                              <div style={{flex:1}}>
                                  <label style={labelStyle}>Prezzo</label>
                                  <input type="number" placeholder="0.00" value={nuovoPiatto.prezzo} onChange={e => setNuovoPiatto({...nuovoPiatto, prezzo: e.target.value})} style={inputStyle} step="0.10" required />
                              </div>
                               {/* CAMPO UNITÀ */}
                              <div style={{width:'100px'}}>
                                    <label style={labelStyle}>Unità</label>
                                    <input 
                                        type="text" 
                                        placeholder="es. /hg" 
                                        value={nuovoPiatto.unita_misura || ''} 
                                        onChange={e => setNuovoPiatto({...nuovoPiatto, unita_misura: e.target.value})} 
                                        style={inputStyle} 
                                        title="Utile per carne al peso (es. /hg) o pezzi (es. /pz)"
                                    />
                                </div>
                          </div>
                          <div>
                              <label style={labelStyle}>Descrizione</label>
                              <textarea placeholder="Descrivi il piatto..." value={nuovoPiatto.descrizione} onChange={e => setNuovoPiatto({...nuovoPiatto, descrizione: e.target.value})} style={{...inputStyle, minHeight:'80px', resize:'vertical'}}/>
                          </div>

                          <div style={{background:'#fdfefe', border:'1px solid #e1f5fe', padding:'10px', borderRadius:'8px'}}>
                                <label style={{...labelStyle, color:'#0277bd', marginBottom:'10px'}}>🌍 Traduzioni (Opzionale)</label>
                                <div style={{marginBottom:'10px'}}>
                                    <div style={{fontSize:'12px', fontWeight:'bold', marginBottom:'5px', color:'#555'}}>🇬🇧 Inglese</div>
                                    <input placeholder="Name EN" value={traduzioniInput.en.nome} onChange={e=>setTraduzioniInput({...traduzioniInput, en: {...traduzioniInput.en, nome: e.target.value}})} style={{...inputStyle, marginBottom:'5px', fontSize:'13px'}} />
                                    <textarea placeholder="Description EN" value={traduzioniInput.en.descrizione} onChange={e=>setTraduzioniInput({...traduzioniInput, en: {...traduzioniInput.en, descrizione: e.target.value}})} style={{...inputStyle, minHeight:'50px', fontSize:'13px'}} />
                                </div>
                          </div>

                          <div>
                                <label style={labelStyle}>📷 Foto Piatto</label>
                                <div style={{background: '#f8f9fa', border: '2px dashed #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', cursor: 'pointer', position:'relative', boxSizing:'border-box'}}>
                                    <input type="file" onChange={handleFileChange} style={{position:'absolute', inset:0, opacity:0, cursor:'pointer'}} />
                                    {uploading ? <span style={{color:'#3498db'}}>⏳ Caricamento...</span> : (
                                        nuovoPiatto.immagine_url ? 
                                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
                                            <img src={nuovoPiatto.immagine_url} style={{width:40, height:40, borderRadius:5, objectFit:'cover'}} />
                                            <span style={{color:'#27ae60', fontWeight:'bold'}}>Foto Caricata! (Clicca per cambiare)</span>
                                        </div> : 
                                        <span style={{color:'#888'}}>Trascina qui o clicca per caricare</span>
                                    )}
                                </div>
                          </div>
                      </div>

                      <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                          <div style={{background:'#fffcf0', padding:'15px', borderRadius:'8px', border:'1px solid #f9e79f', boxSizing:'border-box'}}>
                              <label style={{...labelStyle, color:'#d4ac0d'}}>🧂 Varianti & Ingredienti</label>
                              <input placeholder="Ingredienti Base (es: Pomodoro, Mozzarella)" value={nuovoPiatto.ingredienti_base || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, ingredienti_base: e.target.value})} style={{...inputStyle, marginBottom:'10px', background:'white'}} />
                              <textarea placeholder="Aggiunte Extra (es: Bufala:2.00, Salame:1.50)" value={nuovoPiatto.varianti_str || ""} onChange={e => setNuovoPiatto({...nuovoPiatto, varianti_str: e.target.value})} style={{...inputStyle, minHeight:'60px', background:'white'}} />
                          </div>

                          <div style={{background:'#fcfcfc', padding:'15px', borderRadius:'8px', border:'1px solid #eee', boxSizing:'border-box'}}>
                              <label style={labelStyle}>⚠️ Allergeni</label>
                              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                  {LISTA_ALLERGENI.map(all => {
                                      const isSelected = (nuovoPiatto.allergeni || []).includes(all);
                                      return (
                                          <div key={all} 
                                              onClick={() => {
                                                  const current = nuovoPiatto.allergeni || [];
                                                  if (isSelected) setNuovoPiatto({...nuovoPiatto, allergeni: current.filter(x => x !== all)});
                                                  else setNuovoPiatto({...nuovoPiatto, allergeni: [...current, all]});
                                              }}
                                              style={{
                                                  padding:'6px 12px', borderRadius:'20px', fontSize:'11px', cursor:'pointer', fontWeight:'bold',
                                                  background: isSelected ? '#ffebee' : 'white',
                                                  color: isSelected ? '#c0392b' : '#555',
                                                  border: isSelected ? '1px solid #e74c3c' : '1px solid #ddd',
                                                  transition: 'all 0.2s',
                                                  boxSizing: 'border-box'
                                              }}
                                          >
                                              {isSelected ? '✅ ' : ''}{all}
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                          
                          <button type="submit" style={{marginTop:'auto', background: editId ? '#3498db' : '#2ecc71', color:'white', padding:'15px', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
                              {editId ? "💾 AGGIORNA MODIFICHE" : "➕ SALVA PIATTO"}
                          </button>
                      </div>
                  </form>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                {categorie && categorie.map(cat => {
                    const prodottiCategoria = menu
                        .filter(p => p.categoria === cat.nome)
                        .sort((a, b) => (a.posizione || 0) - (b.posizione || 0));

                    return (
                        <div key={cat.id} style={{marginBottom: '40px'}}>
                            <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#2c3e50', borderBottom:'2px solid #eee', paddingBottom:'10px', marginBottom:'20px'}}>
                                <span style={{background:'#eee', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'}}>📂</span> 
                                {cat.nome}
                            </h3>
                            
                            <Droppable droppableId={`cat-${cat.nome}`}>
                                {(provided) => (
                                    <div 
                                        ref={provided.innerRef} 
                                        {...provided.droppableProps} 
                                        style={{paddingBottom:'50px'}}
                                    >
                                        {prodottiCategoria.map((prodotto, index) => (
                                            <Draggable 
                                                key={String(prodotto.id)} 
                                                draggableId={String(prodotto.id)} 
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            marginBottom: '8px',
                                                            userSelect: 'none',
                                                            transform: provided.draggableProps.style?.transform,
                                                        }}
                                                    >
                                                        <ProductRow 
                                                            prodotto={prodotto} 
                                                            avviaModifica={avviaModifica} 
                                                            eliminaProdotto={cancellaPiatto} 
                                                            isDragging={snapshot.isDragging} 
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </DragDropContext>
        </div>

<div style={{ ...cardStyle, borderLeft: '5px solid #8e44ad' }}>
    <h3 style={{ marginBottom: '25px', color: '#2c3e50' }}>⚖️ Configurazione Footer & Allegati</h3>

    <div style={{ marginBottom: '30px' }}>
        <label style={labelStyle}>📝 Testo a piè di pagina (es. Coperto 5€)</label>
        <textarea 
            value={config.info_footer || ''}
            onChange={e => setConfig({...config, info_footer: e.target.value})}
            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '80px', boxSizing: 'border-box' }}
        />
    </div>

    {/* TOGGLE NASCONDI EURO */}
    <div style={{marginBottom:'20px', padding:'15px', background:'#f3e5f5', borderRadius:'8px', border:'1px solid #e1bee7'}}>
         <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontWeight:'bold', color:'#8e44ad'}}>
            <input 
                type="checkbox" 
                checked={config.nascondi_euro || false} 
                onChange={(e) => setConfig({...config, nascondi_euro: e.target.checked})} 
            />
            <span>Nascondi simbolo "€" (Mostra solo il numero)</span>
        </label>
        <p style={{margin:'5px 0 0 25px', fontSize:'12px', color:'#666'}}>Se attivo, "12.00 €" diventerà "12.00"</p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px' }}>
            <label style={labelStyle}>📅 Menù del Giorno</label>
            <ImageUploader 
                type="url_menu_giorno" 
                currentUrl={config.url_menu_giorno} 
                icon="🥗" 
                config={config} setConfig={setConfig} API_URL={API_URL} 
            />
        </div>

        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px' }}>
            <label style={labelStyle}>📄 Menù PDF</label>
            <ImageUploader 
                type="url_menu_pdf" 
                currentUrl={config.url_menu_pdf} 
                icon="📖" 
                config={config} setConfig={setConfig} API_URL={API_URL} 
            />
        </div>

        <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px' }}>
            <label style={labelStyle}>📋 Lista Allergeni</label>
            <ImageUploader 
                type="url_allergeni" 
                currentUrl={config.url_allergeni} 
                icon="⚠️" 
                config={config} setConfig={setConfig} API_URL={API_URL} 
            />
        </div>
    </div>

    <button onClick={handleSaveStyle} style={{ marginTop: '30px', width: '100%', padding:'15px', background:'#8e44ad', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' }}>
        💾 SALVA IMPOSTAZIONI FOOTER
    </button>
</div>
    </div>
  );
}

export default AdminMenu;