// client/src/components_admin/AdminGrafica.jsx - FULL WIDTH FIX
import { useState } from 'react';

function AdminGrafica({ user, config, setConfig, API_URL }) {
  const [loadingField, setLoadingField] = useState(null);

  // --- UPLOAD IMMAGINI ---
  const handleUpload = async (e, type) => {
      const f = e.target.files[0]; 
      if(!f) return;
      setLoadingField(type);
      const fd = new FormData(); 
      fd.append('photo', f);
      try {
        const r = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
        if (!r.ok) throw new Error("Errore server upload");
        const d = await r.json();
        if(d.url) setConfig(prev => ({...prev, [type]: d.url}));
        else alert("Errore: URL mancante.");
      } catch(err) { alert("Errore caricamento: " + err.message); } 
      finally { setLoadingField(null); }
  };

  const removeImage = (type) => {
      if(confirm("Vuoi rimuovere questa immagine?")) setConfig(prev => ({...prev, [type]: ''}));
  };

  const handleSaveStyle = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        if(res.ok) alert("✨ Design salvato con successo!");
        else alert("Errore salvataggio");
      } catch (e) { alert("Errore di connessione"); }
  };

  // --- COMPONENTE UPLOAD ---
  const ImageUploader = ({ label, type, currentUrl, icon }) => (
      <div style={{flex:1}}>
          <label style={styles.label}>{label}</label>
          {currentUrl ? (
              <div style={{position:'relative', border:'2px solid #27ae60', borderRadius:'10px', overflow:'hidden', height:'100px', background:'#f9f9f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <img src={currentUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  <button onClick={() => removeImage(type)} style={styles.removeBtn}>🗑️ RIMUOVI</button>
              </div>
          ) : (
              <div style={styles.fileInputWrapper}>
                  {loadingField === type ? (
                      <span style={{color:'#3498db', fontWeight:'bold'}}>⏳ Caricamento...</span>
                  ) : (
                      <>
                        <span style={{fontSize:'24px'}}>{icon}</span>
                        <span style={{fontSize:'12px', color:'#555', marginTop:5}}>Carica {label}</span>
                        <input
  type="color"
  value={isTransparent ? "#ffffff" : val}
  onChange={(e) => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
  onInput={(e) => setConfig(prev => ({ ...prev, [field]: e.target.value }))} // ✅ live mentre trascini
  style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
/>
                      </>
                  )}
              </div>
          )}
      </div>
  );

  // --- COMPONENTE COLORE SMART ---
  const SmartColorPicker = ({ label, value, field, def }) => {
      const val = value || def || '#000000';
      const isTransparent = val === 'transparent' || val === 'rgba(0,0,0,0)';

      return (
        <div style={styles.colorWrapper}>
            <label style={styles.colorLabel}>{label}</label>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'5px'}}>
                <div style={{position:'relative', width:'40px', height:'40px', borderRadius:'50%', overflow:'hidden', border:'1px solid #ccc', background: val}}>
                    <input 
                        type="color" 
                        value={isTransparent ? '#ffffff' : val} 
                        onChange={e => setConfig(prev => ({...prev, [field]: e.target.value}))}
onInput={e => setConfig(prev => ({...prev, [field]: e.target.value}))} // ✅ live mentre trascini
                        style={{opacity:0, width:'100%', height:'100%', cursor:'pointer'}}
                    />
                </div>
                <input 
  type="color" 
  value={isTransparent ? '#ffffff' : val} 
  onChange={e => setConfig(prev => ({...prev, [field]: e.target.value}))}
  onInput={e => setConfig(prev => ({...prev, [field]: e.target.value}))}
  style={{opacity:0, width:'100%', height:'100%', cursor:'pointer'}}
/>
                <button 
                    onClick={() => setConfig({...config, [field]: 'transparent'})}
                    title="Rendi Trasparente"
                    style={{background:'transparent', border:'1px solid #ccc', borderRadius:'5px', cursor:'pointer', padding:'5px', fontSize:'16px'}}
                >
                    🚫
                </button>
            </div>
        </div>
      );
  };

  return (
      <div style={styles.container}>
          {/* COLONNA SINISTRA: EDITOR */}
          <div style={styles.editorColumn}>
              <div style={styles.header}>
                  <h2 style={{margin:0, color:'#2c3e50'}}>🎨 Studio Grafico</h2>
                  <p style={{margin:'5px 0 0', color:'#7f8c8d'}}>Personalizza ogni dettaglio.</p>
              </div>

              {/* 1. BRAND */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>📸 Immagini Brand</h4>
                  <div style={styles.row}>
                      <ImageUploader label="Logo (Quadrato)" type="logo_url" currentUrl={config.logo_url} icon="🖼️" />
                      <ImageUploader label="Cover (Orizzontale)" type="cover_url" currentUrl={config.cover_url} icon="🌄" />
                  </div>
              </div>

              {/* 2. COLORI GLOBALI */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🌍 Sfondo & Testi Base</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Sfondo Pagina" value={config.colore_sfondo} field="colore_sfondo" def="#222222" />
                      <SmartColorPicker label="Titoli Principali" value={config.colore_titolo} field="colore_titolo" def="#ffffff" />
                      <SmartColorPicker label="Testi Descrizioni" value={config.colore_testo} field="colore_testo" def="#cccccc" />
                  </div>
              </div>

              {/* 3. INFO TAVOLO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🍽️ Etichetta Tavolo</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Sfondo Numero" value={config.colore_tavolo_bg} field="colore_tavolo_bg" def="#27ae60" />
                      <SmartColorPicker label="Testo Numero" value={config.colore_tavolo_text} field="colore_tavolo_text" def="#ffffff" />
                  </div>
              </div>

              {/* 4. SCHEDA PRODOTTO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🥡 Scheda Prodotto</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Sfondo Card" value={config.colore_card} field="colore_card" def="#ffffff" />
                      <SmartColorPicker label="Bordi Card" value={config.colore_border} field="colore_border" def="#eeeeee" />
                      <SmartColorPicker label="Prezzo" value={config.colore_prezzo} field="colore_prezzo" def="#27ae60" />
                      <SmartColorPicker label="Sfondo Tasto +" value={config.colore_btn} field="colore_btn" def="#27ae60" />
                      <SmartColorPicker label="Icona Tasto +" value={config.colore_btn_text} field="colore_btn_text" def="#ffffff" />
                  </div>
              </div>
              <div style={styles.card}>
  <h4 style={styles.sectionTitle}>📌 Categorie & Layout</h4>

  <div style={styles.grid}>
    <SmartColorPicker
      label="Sfondo Categorie (Primi, Secondi...)"
      value={config.colore_categoria_bg}
      field="colore_categoria_bg"
      def="#2a2a2a"
    />
  </div>

  <div style={{ marginTop: 15 }}>
    <label style={styles.label}>Posizione Foto Piatti</label>
    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
      <button
        onClick={() => setConfig(prev => ({ ...prev, posizione_immagine_piatto: "left" }))}
        style={{
          flex: 1,
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          cursor: "pointer",
          background: (config.posizione_immagine_piatto || "left") === "left" ? "#333" : "white",
          color: (config.posizione_immagine_piatto || "left") === "left" ? "white" : "#333",
          fontWeight: "bold",
        }}
      >
        ⬅️ Sinistra
      </button>

      <button
        onClick={() => setConfig(prev => ({ ...prev, posizione_immagine_piatto: "right" }))}
        style={{
          flex: 1,
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          cursor: "pointer",
          background: config.posizione_immagine_piatto === "right" ? "#333" : "white",
          color: config.posizione_immagine_piatto === "right" ? "white" : "#333",
          fontWeight: "bold",
        }}
      >
        ➡️ Destra
      </button>
    </div>
  </div>
</div>

              {/* 5. CARRELLO & CHECKOUT */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🛒 Carrello & Riepilogo</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Barra Sfondo" value={config.colore_carrello_bg} field="colore_carrello_bg" def="#222222" />
                      <SmartColorPicker label="Barra Testo" value={config.colore_carrello_text} field="colore_carrello_text" def="#ffffff" />
                      <SmartColorPicker label="Modale Sfondo" value={config.colore_checkout_bg} field="colore_checkout_bg" def="#222222" />
                      <SmartColorPicker label="Modale Testo" value={config.colore_checkout_text} field="colore_checkout_text" def="#ffffff" />
                  </div>
              </div>

              {/* 6. MODALE PRODOTTO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>⚙️ Configuratore (Tasto +)</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Sfondo Modale" value={config.colore_modal_bg} field="colore_modal_bg" def="#ffffff" />
                      <SmartColorPicker label="Testo Modale" value={config.colore_modal_text} field="colore_modal_text" def="#000000" />
                  </div>
              </div>

             {/* 7. STILE FOOTER (SOLO GRAFICA) */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>ℹ️ Stile Info Legali & Footer</h4>
                  
                  <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                      
                      {/* COLORE */}
                      <SmartColorPicker 
                          label="Colore Testo Footer" 
                          value={config.colore_footer_text} 
                          field="colore_footer_text" 
                          def="#888888" 
                      />

                      {/* DIMENSIONE E ALLINEAMENTO (Affiancati) */}
                      <div style={{display:'flex', gap:'15px'}}>
                          <div style={{flex:1}}>
                              <label style={styles.label}>Dimensione (px)</label>
                              <input 
                                type="number" 
                                value={config.dimensione_footer || 12} 
                                onChange={e => setConfig({...config, dimensione_footer: e.target.value})}
                                style={{width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ddd'}}
                              />
                          </div>

                          <div style={{flex:1}}>
                              <label style={styles.label}>Allineamento</label>
                              <div style={{display:'flex', border:'1px solid #ddd', borderRadius:'5px', overflow:'hidden'}}>
                                  {['left', 'center', 'right'].map(align => (
                                      <button 
                                          key={align}
                                          onClick={() => setConfig({...config, allineamento_footer: align})}
                                          style={{
                                              flex:1, padding:'10px', border:'none', cursor:'pointer', fontSize:'14px',
                                              background: (config.allineamento_footer === align || (!config.allineamento_footer && align === 'center')) ? '#333' : 'white',
                                              color: (config.allineamento_footer === align || (!config.allineamento_footer && align === 'center')) ? 'white' : '#333'
                                          }}
                                      >
                                          {align === 'left' ? '⬅️' : align === 'center' ? '⏺️' : '➡️'}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <p style={{fontSize:'11px', color:'#999', marginTop:'15px', fontStyle:'italic'}}>
                      Nota: Per modificare il testo o caricare il PDF allergeni, vai nella sezione "Menu".
                  </p>
              </div>

              {/* 8. FONT */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🔤 Font</h4>
                  <select value={config.font_style} onChange={e => setConfig({...config, font_style: e.target.value})} style={styles.select}>
                      <option value="sans-serif">Moderno (Sans-Serif)</option>
                      <option value="serif">Elegante (Serif)</option>
                      <option value="'Courier New', monospace">Vintage</option>
                      <option value="'Brush Script MT', cursive">Corsivo</option>
                  </select>
              </div>

              <button onClick={handleSaveStyle} style={styles.saveButton}>💾 SALVA MODIFICHE</button>
          </div>

          {/* COLONNA DESTRA: ANTEPRIMA */}
          <div style={styles.previewColumn}>
              <div style={styles.phoneMockup}>
                  {/* SCHERMO */}
                  <div style={{
                      width: '100%', height: '100%', 
                      background: config.colore_sfondo || '#222', 
                      borderRadius: '32px', overflowY: 'auto', overflowX: 'hidden', position: 'relative',
                      fontFamily: config.font_style || 'sans-serif',
                      display: 'flex', flexDirection: 'column'
                  }}>
                      
                      {/* HEADER */}
                      <div style={{
                          minHeight:'120px', 
                          background: config.cover_url ? `url(${config.cover_url})` : '#333',
                          backgroundSize:'cover', backgroundPosition:'center',
                          position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center',
                          paddingBottom:'10px', flexShrink: 0
                      }}>
                          {config.logo_url && (
                              <img src={config.logo_url} style={{
                                  width:60, height:60, borderRadius:'50%', border:'3px solid white', 
                                  position:'absolute', bottom:-30, objectFit:'cover', zIndex:10
                              }}/>
                          )}
                      </div>
                      
                      <div style={{marginTop:40, textAlign:'center', padding:'0 10px', flexShrink: 0}}>
                           <h3 style={{margin:'0 0 5px 0', color:config.colore_titolo || 'white'}}>Tuo Locale</h3>
                      </div>

                      {/* ESEMPIO CARD PRODOTTO */}
                      <div style={{
                          background: config.colore_card || 'white', 
                          margin:'20px 15px', padding:15, borderRadius:0, 
                          borderBottom: `1px solid ${config.colore_border||'#eee'}`,
                          display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0
                      }}>
                          <div style={{width:60, height:60, background:'#ddd', borderRadius:5}}></div>
                          <div style={{flex:1}}>
                              <div style={{color: config.colore_testo||'#333', fontWeight:'bold', fontSize:'14px'}}>Pizza Margherita</div>
                              <div style={{color:config.colore_prezzo||'green', fontWeight:'bold', fontSize:'13px'}}>€ 8.00</div>
                          </div>
                          <button style={{
                              background:config.colore_btn||'green', 
                              color:config.colore_btn_text||'white', 
                              border:'none', borderRadius:'50%', 
                              width:'30px', height:'30px', fontSize:'18px', 
                              display:'flex', alignItems:'center', justifyContent:'center'
                          }}>+</button>
                      </div>

                      {/* SPACER PER SPINGERE IL FOOTER */}
                      <div style={{flex:1}}></div>

                      {/* FOOTER ANTEPRIMA */}
                      <div style={{padding:'20px 15px', marginTop:'auto', opacity: 0.9}}>
                          <p style={{
                              margin:0,
                              whiteSpace: 'pre-line',
                              color: config.colore_footer_text || '#888',
                              fontSize: `${config.dimensione_footer || 12}px`,
                              textAlign: config.allineamento_footer || 'center'
                          }}>
                              {config.info_footer || "Coperto € 2.00\nP.IVA 123456789\nInfo allergeni allo staff"}
                          </p>
                          {config.url_allergeni && (
                              <div style={{
                                  marginTop:'10px', 
                                  textAlign: config.allineamento_footer || 'center',
                                  fontSize: '10px', 
                                  color: config.colore_footer_text || '#888',
                                  border: `1px solid ${config.colore_footer_text || '#888'}`,
                                  padding: '5px', borderRadius: '15px'
                              }}>
                                  📋 LISTA ALLERGENI
                              </div>
                          )}
                      </div>

                      {/* BARRA CARRELLO */}
                      <div style={{
                          padding: '10px 15px', flexShrink: 0,
                          background: config.colore_carrello_bg || '#333',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                           <span style={{color: config.colore_carrello_text || 'white', fontSize:'12px'}}>1 prodotto</span>
                           <button style={{
                               background: '#f1c40f', border:'none', borderRadius:'20px', 
                               padding:'5px 15px', fontSize:'10px', fontWeight:'bold'
                           }}>VEDI</button>
                      </div>

                  </div>
              </div>
          </div>
      </div>
  );
}

const styles = {
    // MODIFICATO QUI: maxWidth 100%
    container: { display: 'flex', flexWrap: 'wrap', gap: '40px', width: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif", alignItems: 'flex-start' },
    editorColumn: { flex: '1 1 500px', paddingBottom:'50px' },
    previewColumn: { flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', position:'sticky', top:'20px' },
    header: { marginBottom: '30px', borderLeft: '5px solid #3498db', paddingLeft: '15px' },
    card: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
    sectionTitle: { margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#95a5a6', fontWeight: '700', borderBottom: '1px solid #f5f5f5', paddingBottom: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
    row: { display: 'flex', gap: '20px' },
    colorWrapper: { background: '#fff', borderRadius: '8px', padding: '5px 0', display:'flex', flexDirection:'column' },
    colorLabel: { fontSize: '12px', fontWeight: '600', color: '#333' },
    label: { fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block', color: '#333' },
    fileInputWrapper: { border: '2px dashed #ddd', borderRadius: '10px', height:'100px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor: 'pointer', position: 'relative', background: '#fafafa' },
    fileInputHidden: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
    removeBtn: { position:'absolute', bottom:5, right:5, background:'red', color:'white', border:'none', borderRadius:'5px', padding:'5px', cursor:'pointer', fontSize:'10px', fontWeight:'bold' },
    select: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', fontSize: '14px', cursor: 'pointer' },
    saveButton: { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(39, 174, 96, 0.3)', marginTop:'20px' },
    phoneMockup: { width: '300px', height: '650px', background: '#111', borderRadius: '40px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', boxSizing: 'border-box' },
};

export default AdminGrafica;