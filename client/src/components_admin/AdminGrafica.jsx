// client/src/components_admin/AdminGrafica.jsx - VERSIONE FIXED (Upload Multiplo + Delete)
import { useState } from 'react';

function AdminGrafica({ user, config, setConfig, API_URL }) {
  // Gestiamo quale campo sta caricando (null, 'logo_url', o 'cover_url')
  const [loadingField, setLoadingField] = useState(null);

  // --- UPLOAD IMMAGINI ---
  const handleUpload = async (e, type) => {
      const f = e.target.files[0]; 
      if(!f) return;
      
      setLoadingField(type); // Diciamo al sistema COSA sta caricando
      
      const fd = new FormData(); 
      fd.append('photo', f);
      
      try {
        const r = await fetch(`${API_URL}/api/upload`, { method:'POST', body:fd });
        if (!r.ok) throw new Error("Errore server upload");
        
        const d = await r.json();
        if(d.url) {
            // Aggiorniamo subito lo stato locale per vedere l'anteprima
            setConfig(prev => ({...prev, [type]: d.url}));
        } else {
            alert("Errore: URL mancante.");
        }
      } catch(err) { 
          alert("Errore caricamento: " + err.message); 
      } finally {
          setLoadingField(null); // SBLOCCA IL CARICAMENTO
      }
  };

  // --- ELIMINA IMMAGINE ---
  const removeImage = (type) => {
      if(confirm("Vuoi rimuovere questa immagine?")) {
          setConfig(prev => ({...prev, [type]: ''}));
      }
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

  // Componente interno per il caricamento file
  const ImageUploader = ({ label, type, currentUrl, icon }) => (
      <div style={{flex:1}}>
          <label style={styles.label}>{label}</label>
          
          {/* SE C'È L'IMMAGINE: MOSTRA ANTEPRIMA + TASTO ELIMINA */}
          {currentUrl ? (
              <div style={{position:'relative', border:'2px solid #27ae60', borderRadius:'10px', overflow:'hidden', height:'100px', background:'#f9f9f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <img src={currentUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  <button 
                    onClick={() => removeImage(type)}
                    style={{position:'absolute', bottom:5, right:5, background:'red', color:'white', border:'none', borderRadius:'5px', padding:'5px', cursor:'pointer', fontSize:'10px', fontWeight:'bold'}}
                  >
                      🗑️ RIMUOVI
                  </button>
              </div>
          ) : (
              /* SE NON C'È: MOSTRA UPLOAD */
              <div style={styles.fileInputWrapper}>
                  {loadingField === type ? (
                      <span style={{color:'#3498db', fontWeight:'bold'}}>⏳ Caricamento...</span>
                  ) : (
                      <>
                        <span style={{fontSize:'24px'}}>{icon}</span>
                        <span style={{fontSize:'12px', color:'#555', marginTop:5}}>Carica {label}</span>
                        <input type="file" onChange={(e) => handleUpload(e, type)} style={styles.fileInputHidden} />
                      </>
                  )}
              </div>
          )}
      </div>
  );

  // Componente Colore (identico a prima)
  const ColorPicker = ({ label, value, field, def }) => (
      <div style={styles.colorWrapper}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input 
                  type="color" 
                  value={value || def || '#000000'} 
                  onChange={e => setConfig({...config, [field]: e.target.value})} 
                  style={styles.colorInput}
              />
              <div style={{display:'flex', flexDirection:'column'}}>
                  <span style={styles.colorLabel}>{label}</span>
                  <span style={styles.colorHex}>{value || def}</span>
              </div>
          </div>
      </div>
  );

  return (
      <div style={styles.container}>
          <div style={styles.editorColumn}>
              <div style={styles.header}>
                  <h2 style={{margin:0, color:'#2c3e50'}}>🎨 Studio Grafico</h2>
                  <p style={{margin:'5px 0 0', color:'#7f8c8d'}}>Carica foto e scegli i colori.</p>
              </div>

              {/* 1. BRAND (FIXED) */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>📸 Immagini Brand</h4>
                  <div style={styles.row}>
                      <ImageUploader label="Logo (Quadrato)" type="logo_url" currentUrl={config.logo_url} icon="🖼️" />
                      <ImageUploader label="Cover (Orizzontale)" type="cover_url" currentUrl={config.cover_url} icon="🌄" />
                  </div>
              </div>

              {/* 2. COLORI GLOBALI */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🌍 Colori Generali</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Pagina" value={config.colore_sfondo} field="colore_sfondo" def="#222222" />
                      <ColorPicker label="Titoli Principali" value={config.colore_titolo} field="colore_titolo" def="#ffffff" />
                      <ColorPicker label="Testi Descrizioni" value={config.colore_testo} field="colore_testo" def="#cccccc" />
                  </div>
              </div>

              {/* 3. INFO TAVOLO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🍽️ Etichetta Tavolo</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Numero" value={config.colore_tavolo_bg} field="colore_tavolo_bg" def="#27ae60" />
                      <ColorPicker label="Testo Numero" value={config.colore_tavolo_text} field="colore_tavolo_text" def="#ffffff" />
                  </div>
              </div>

              {/* 4. SCHEDA PRODOTTO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🥡 Scheda Prodotto</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Card" value={config.colore_card} field="colore_card" def="#ffffff" />
                      <ColorPicker label="Bordi" value={config.colore_border} field="colore_border" def="#eeeeee" />
                      <ColorPicker label="Prezzo" value={config.colore_prezzo} field="colore_prezzo" def="#27ae60" />
                      <ColorPicker label="Sfondo Btn +" value={config.colore_btn} field="colore_btn" def="#27ae60" />
                      <ColorPicker label="Icona Btn +" value={config.colore_btn_text} field="colore_btn_text" def="#ffffff" />
                  </div>
              </div>

              {/* 5. CARRELLO & CHECKOUT */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🛒 Carrello & Riepilogo</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Barra Sfondo" value={config.colore_carrello_bg} field="colore_carrello_bg" def="#222222" />
                      <ColorPicker label="Barra Testo" value={config.colore_carrello_text} field="colore_carrello_text" def="#ffffff" />
                      <ColorPicker label="Modale Sfondo" value={config.colore_checkout_bg} field="colore_checkout_bg" def="#222222" />
                      <ColorPicker label="Modale Testo" value={config.colore_checkout_text} field="colore_checkout_text" def="#ffffff" />
                  </div>
              </div>

              {/* 6. FONT */}
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

          {/* ANTEPRIMA */}
          <div style={styles.previewColumn}>
              <div style={styles.phoneMockup}>
                  <div style={styles.phoneScreen(config.colore_sfondo || '#222')}>
                      
                      {/* HEADER CON COVER E LOGO */}
                      <div style={{
                          height:'120px', 
                          background: config.cover_url ? `url(${config.cover_url})` : '#333',
                          backgroundSize:'cover', backgroundPosition:'center',
                          position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center',
                          paddingBottom:'10px'
                      }}>
                          {config.logo_url && (
                              <img src={config.logo_url} style={{
                                  width:60, height:60, borderRadius:'50%', border:'3px solid white', 
                                  position:'absolute', bottom:-30, objectFit:'cover'
                              }}/>
                          )}
                      </div>
                      
                      <div style={{marginTop:40, textAlign:'center', fontFamily: config.font_style}}>
                           <h3 style={{margin:0, color:config.colore_titolo}}>Tuo Locale</h3>
                           <span style={{background: config.colore_tavolo_bg||'green', color:config.colore_tavolo_text||'white', padding:'2px 8px', borderRadius:4, fontSize:10}}>Tavolo 5</span>
                      </div>

                      {/* CARD */}
                      <div style={{background: config.colore_card || 'white', margin:'20px 10px', padding:10, borderRadius:8, border:`1px solid ${config.colore_border||'#eee'}`}}>
                          <div style={{color:config.colore_titolo||'#333', fontFamily: config.font_style, fontWeight:'bold'}}>Pizza Margherita</div>
                          <div style={{color:config.colore_prezzo||'green', fontWeight:'bold'}}>€ 8.00</div>
                          <button style={{background:config.colore_btn||'green', color:config.colore_btn_text||'white', border:'none', borderRadius:20, marginTop:5, padding:'5px 10px'}}>+ AGGIUNGI</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

const styles = {
    container: { display: 'flex', flexWrap: 'wrap', gap: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    editorColumn: { flex: '1 1 500px' },
    previewColumn: { flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px' },
    header: { marginBottom: '30px', borderLeft: '5px solid #3498db', paddingLeft: '15px' },
    card: { background: 'white', borderRadius: '16px', padding: '25px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
    sectionTitle: { margin: '0 0 20px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#95a5a6', fontWeight: '700', borderBottom: '1px solid #f5f5f5', paddingBottom: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' },
    row: { display: 'flex', gap: '20px' },
    colorWrapper: { background: '#f9f9f9', borderRadius: '10px', padding: '10px', border: '1px solid #eee', cursor: 'pointer' },
    colorInput: { width: '40px', height: '40px', border: 'none', borderRadius: '50%', cursor: 'pointer', marginRight: '10px', padding:0, background:'none' },
    colorLabel: { fontSize: '12px', fontWeight: '600', color: '#333', display: 'block' },
    colorHex: { fontSize: '10px', color: '#777', fontFamily: 'monospace' },
    label: { fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block', color: '#333' },
    fileInputWrapper: { border: '2px dashed #ddd', borderRadius: '10px', height:'100px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor: 'pointer', position: 'relative', background: '#fafafa' },
    fileInputHidden: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
    select: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', fontSize: '14px', cursor: 'pointer' },
    saveButton: { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(39, 174, 96, 0.3)' },
    phoneMockup: { width: '300px', height: '600px', background: '#111', borderRadius: '40px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'sticky', top: '20px', boxSizing: 'border-box' },
    phoneScreen: (bg) => ({ width: '100%', height: '100%', background: bg || '#222', borderRadius: '32px', overflow: 'hidden', position: 'relative' })
};

export default AdminGrafica;