// client/src/components_admin/AdminGrafica.jsx - VERSIONE V3 (Smart Color + Real Preview)
import { useState, useEffect } from 'react';

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
                        <input type="file" onChange={(e) => handleUpload(e, type)} style={styles.fileInputHidden} />
                      </>
                  )}
              </div>
          )}
      </div>
  );

  // --- COMPONENTE COLORE SMART (Con Trasparenza) ---
  const SmartColorPicker = ({ label, value, field, def }) => {
      const val = value || def || '#000000';
      const isTransparent = val === 'transparent' || val === 'rgba(0,0,0,0)';

      return (
        <div style={styles.colorWrapper}>
            <label style={styles.colorLabel}>{label}</label>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'5px'}}>
                {/* 1. Picker Nativo (solo se non è trasparente) */}
                <div style={{position:'relative', width:'40px', height:'40px', borderRadius:'50%', overflow:'hidden', border:'1px solid #ccc', background: val}}>
                    <input 
                        type="color" 
                        value={isTransparent ? '#ffffff' : val} 
                        // Usiamo onInput per fluidità, o onChange se preferisci lo scatto alla fine
                        onChange={e => setConfig({...config, [field]: e.target.value})} 
                        style={{opacity:0, width:'100%', height:'100%', cursor:'pointer'}}
                    />
                </div>

                {/* 2. Input Testo (per RGB/RGBA o Hex manuale) */}
                <input 
                    type="text" 
                    value={val} 
                    onChange={e => setConfig({...config, [field]: e.target.value})}
                    style={{flex:1, padding:'8px', borderRadius:'5px', border:'1px solid #ddd', fontSize:'12px', fontFamily:'monospace'}} 
                />

                {/* 3. Tasto Trasparente */}
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
                      <ImageUploader label="Scheda Allergeni (Foto/PDF)" type="url_allergeni" currentUrl={config.url_allergeni} icon="📋" />
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

              {/* ⬇️ INCOLLA QUI IL NUOVO CODICE ⬇️ */}

              {/* SEZIONE MODALE PRODOTTO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>⚙️ Configuratore (Tasto +)</h4>
                  <div style={styles.grid}>
                      <SmartColorPicker label="Sfondo Modale" value={config.colore_modal_bg} field="colore_modal_bg" def="#ffffff" />
                      <SmartColorPicker label="Testo Modale" value={config.colore_modal_text} field="colore_modal_text" def="#000000" />
                  </div>
              </div>

              {/* SEZIONE INFO EXTRA */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>ℹ️ Info Legali & Allergeni</h4>
                  <div style={{marginBottom:15}}>
                      <label style={styles.label}>Testo a fine pagina (es. Coperto, Surgelati)</label>
                      <textarea 
                          value={config.info_footer || ''}
                          onChange={e => setConfig({...config, info_footer: e.target.value})}
                          style={{width:'100%', padding:10, borderRadius:5, border:'1px solid #ddd', minHeight:60}}
                      />
                  </div>
                  <ImageUploader label="Scheda Allergeni (Foto/PDF)" type="url_allergeni" currentUrl={config.url_allergeni} icon="📋" />
              </div>

              {/* ⬆️ FINE INCOLLA ⬆️ */}
              

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
                      borderRadius: '32px', overflow: 'hidden', position: 'relative',
                      fontFamily: config.font_style || 'sans-serif',
                      display: 'flex', flexDirection: 'column'
                  }}>
                      
                      {/* HEADER */}
                      <div style={{
                          minHeight:'120px', 
                          background: config.cover_url ? `url(${config.cover_url})` : '#333',
                          backgroundSize:'cover', backgroundPosition:'center',
                          position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center',
                          paddingBottom:'10px'
                      }}>
                          {config.logo_url && (
                              <img src={config.logo_url} style={{
                                  width:60, height:60, borderRadius:'50%', border:'3px solid white', 
                                  position:'absolute', bottom:-30, objectFit:'cover', zIndex:10
                              }}/>
                          )}
                      </div>
                      
                      <div style={{marginTop:40, textAlign:'center', padding:'0 10px'}}>
                           <h3 style={{margin:'0 0 5px 0', color:config.colore_titolo || 'white'}}>Tuo Locale</h3>
                           <span style={{
                               background: config.colore_tavolo_bg||'green', 
                               color:config.colore_tavolo_text||'white', 
                               padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:'bold'
                           }}>Tavolo 5</span>
                      </div>

                      {/* ESEMPIO CARD PRODOTTO */}
                      <div style={{
                          background: config.colore_card || 'white', 
                          margin:'20px 15px', padding:15, borderRadius:0, 
                          borderBottom: `1px solid ${config.colore_border||'#eee'}`,
                          display: 'flex', gap: '10px', alignItems: 'center'
                      }}>
                          <div style={{width:60, height:60, background:'#ddd', borderRadius:5}}></div>
                          <div style={{flex:1}}>
                              <div style={{color: config.colore_testo||'#333', fontWeight:'bold', fontSize:'14px'}}>Pizza Margherita</div>
                              <div style={{color:'#777', fontSize:'10px', margin:'2px 0'}}>Pomodoro, mozzarella...</div>
                              <div style={{color:config.colore_prezzo||'green', fontWeight:'bold', fontSize:'13px'}}>€ 8.00</div>
                          </div>
                          <button style={{
                              background:config.colore_btn||'green', 
                              color:config.colore_btn_text||'white', 
                              border:'none', borderRadius:'50%', 
                              width:'35px', height:'35px', fontSize:'20px', 
                              display:'flex', alignItems:'center', justifyContent:'center'
                          }}>+</button>
                      </div>

                      {/* ESEMPIO BARRA CARRELLO (Fixed Bottom) */}
                      <div style={{
                          marginTop: 'auto', padding: '15px', 
                          background: config.colore_carrello_bg || '#333',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                           <span style={{color: config.colore_carrello_text || 'white', fontSize:'12px'}}>1 prodotto</span>
                           <button style={{
                               background: '#f1c40f', border:'none', borderRadius:'20px', 
                               padding:'5px 15px', fontSize:'10px', fontWeight:'bold'
                           }}>VEDI ORDINE</button>
                      </div>

                  </div>
              </div>
              <p style={{textAlign:'center', color:'#777', fontSize:'12px', marginTop:'10px'}}>L'anteprima è indicativa.<br/>Salva per vedere il risultato reale.</p>
          </div>
      </div>
  );
}

const styles = {
    container: { display: 'flex', flexWrap: 'wrap', gap: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", alignItems: 'flex-start' },
    editorColumn: { flex: '1 1 500px', paddingBottom:'50px' },
    previewColumn: { flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', position:'sticky', top:'20px' },
    header: { marginBottom: '30px', borderLeft: '5px solid #3498db', paddingLeft: '15px' },
    card: { background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' },
    sectionTitle: { margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#95a5a6', fontWeight: '700', borderBottom: '1px solid #f5f5f5', paddingBottom: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }, // Allargato per il nuovo picker
    row: { display: 'flex', gap: '20px' },
    colorWrapper: { background: '#fff', borderRadius: '8px', padding: '5px 0', display:'flex', flexDirection:'column' },
    colorLabel: { fontSize: '12px', fontWeight: '600', color: '#333' },
    label: { fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block', color: '#333' },
    fileInputWrapper: { border: '2px dashed #ddd', borderRadius: '10px', height:'100px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor: 'pointer', position: 'relative', background: '#fafafa' },
    fileInputHidden: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
    removeBtn: { position:'absolute', bottom:5, right:5, background:'red', color:'white', border:'none', borderRadius:'5px', padding:'5px', cursor:'pointer', fontSize:'10px', fontWeight:'bold' },
    select: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', fontSize: '14px', cursor: 'pointer' },
    saveButton: { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(39, 174, 96, 0.3)', marginTop:'20px' },
    phoneMockup: { width: '300px', height: '600px', background: '#111', borderRadius: '40px', padding: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', boxSizing: 'border-box' },
};

export default AdminGrafica;