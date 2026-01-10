// client/src/components_admin/AdminGrafica.jsx - VERSIONE PREMIUM UI 🎨
import { useState } from 'react';

function AdminGrafica({ user, config, setConfig, API_URL }) {
  const [uploading, setUploading] = useState(false);

  // --- SALVATAGGIO ---
  const handleSaveStyle = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        if(res.ok) alert("✨ Design aggiornato con successo!");
        else alert("Errore salvataggio");
      } catch (e) { alert("Errore di connessione"); }
  };

  // --- UPLOAD IMMAGINI ---
  const handleUpload = async (e, type) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const fd = new FormData(); fd.append('photo', f);
      try {
        const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
        const d = await r.json();
        if(d.url) setConfig(prev => ({...prev, [type]: d.url}));
      } catch(err) { alert("Errore caricamento immagine"); }
      setUploading(false);
  };

  // --- COMPONENTE INTERNO: PICKER COLORE ---
  const ColorPicker = ({ label, value, field }) => (
      <div style={styles.colorWrapper}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input 
                  type="color" 
                  value={value || '#000000'} 
                  onChange={e => setConfig({...config, [field]: e.target.value})} 
                  style={styles.colorInput}
              />
              <div style={{display:'flex', flexDirection:'column'}}>
                  <span style={styles.colorLabel}>{label}</span>
                  <span style={styles.colorHex}>{value || '#000000'}</span>
              </div>
          </div>
      </div>
  );

  return (
      <div style={styles.container}>
          
          {/* === COLONNA SINISTRA: EDITOR === */}
          <div style={styles.editorColumn}>
              <div style={styles.header}>
                  <h2 style={{margin:0, color:'#2c3e50'}}>🎨 Studio Grafico</h2>
                  <p style={{margin:'5px 0 0', color:'#7f8c8d', fontSize:'0.9rem'}}>Personalizza l'identità del tuo brand.</p>
              </div>

              {/* SEZIONE 1: BRANDING */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>📸 Logo & Copertina</h4>
                  
                  <div style={styles.row}>
                      <div style={{flex:1}}>
                          <label style={styles.label}>Logo (Quadrato)</label>
                          <div style={styles.fileInputWrapper}>
                              <span style={{fontSize:'20px'}}>🖼️</span>
                              <input type="file" onChange={(e) => handleUpload(e, 'logo_url')} style={styles.fileInputHidden} />
                              <span style={{fontSize:'12px', color:'#555'}}>{uploading ? 'Caricamento...' : 'Clicca per caricare logo'}</span>
                          </div>
                      </div>
                      <div style={{flex:1}}>
                          <label style={styles.label}>Cover (Orizzontale)</label>
                          <div style={styles.fileInputWrapper}>
                              <span style={{fontSize:'20px'}}>🌄</span>
                              <input type="file" onChange={(e) => handleUpload(e, 'cover_url')} style={styles.fileInputHidden} />
                              <span style={{fontSize:'12px', color:'#555'}}>{uploading ? 'Caricamento...' : 'Clicca per caricare cover'}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* SEZIONE 2: COLORI GLOBALI */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🌍 Colori Generali</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Pagina" value={config.colore_sfondo} field="colore_sfondo" />
                      <ColorPicker label="Titoli Principali" value={config.colore_titolo} field="colore_titolo" />
                      <ColorPicker label="Testi Descrizioni" value={config.colore_testo} field="colore_testo" />
                  </div>
              </div>

              {/* SEZIONE 3: SCHEDA PRODOTTO */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🥡 Scheda Prodotto (Card)</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Card" value={config.colore_card} field="colore_card" />
                      <ColorPicker label="Bordi / Linee" value={config.colore_border} field="colore_border" />
                      <ColorPicker label="Prezzo" value={config.colore_prezzo} field="colore_prezzo" />
                  </div>
              </div>

              {/* SEZIONE 4: BOTTONI */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🔘 Bottoni & Azioni</h4>
                  <div style={styles.grid}>
                      <ColorPicker label="Sfondo Bottone" value={config.colore_btn} field="colore_btn" />
                      <ColorPicker label="Testo Bottone" value={config.colore_btn_text} field="colore_btn_text" />
                  </div>
              </div>

              {/* SEZIONE 5: FONT */}
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>🔤 Stile Testo (Font)</h4>
                  <select 
                      value={config.font_style} 
                      onChange={e => setConfig({...config, font_style: e.target.value})} 
                      style={styles.select}
                  >
                      <option value="sans-serif">Moderno (Sans-Serif)</option>
                      <option value="serif">Elegante (Serif)</option>
                      <option value="'Courier New', monospace">Vintage / Macchina da scrivere</option>
                      <option value="'Brush Script MT', cursive">Corsivo / Pizzeria</option>
                  </select>
              </div>

              <button onClick={handleSaveStyle} style={styles.saveButton}>
                  💾 SALVA DESIGN
              </button>
          </div>

          {/* === COLONNA DESTRA: ANTEPRIMA IPHONE === */}
          <div style={styles.previewColumn}>
              <div style={styles.phoneMockup}>
                  <div style={styles.phoneNotch}></div>
                  <div style={styles.phoneScreen(config.colore_sfondo)}>
                      
                      {/* HEADER SIMULATO */}
                      <div style={{textAlign:'center', padding:'20px 10px', marginBottom:'10px'}}>
                          {config.logo_url && <img src={config.logo_url} style={{width:'50px', height:'50px', borderRadius:'50%', objectFit:'cover', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}} />}
                          <h3 style={{margin:'5px 0', color: config.colore_titolo, fontFamily: config.font_style}}>Il Tuo Locale</h3>
                          <div style={{fontSize:'10px', color: config.colore_testo}}>Tavolo: 5</div>
                      </div>

                      {/* CARD PRODOTTO SIMULATA */}
                      <div style={{
                          margin: '10px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: config.colore_card || 'white',
                          border: `1px solid ${config.colore_border || '#eee'}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          display: 'flex', alignItems: 'center', gap:'10px'
                      }}>
                          <div style={{width:'50px', height:'50px', background:'#eee', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px'}}>🍕</div>
                          <div style={{flex:1}}>
                              <div style={{fontWeight:'bold', fontSize:'14px', color: config.colore_titolo, fontFamily: config.font_style}}>Pizza Speciale</div>
                              <div style={{fontSize:'10px', color: config.colore_testo, fontFamily: config.font_style}}>Pomodoro, Mozzarella, Basilico</div>
                              <div style={{fontWeight:'bold', fontSize:'12px', color: config.colore_prezzo, marginTop:'2px'}}>€ 8.50</div>
                          </div>
                          <button style={{
                              background: config.colore_btn || '#27ae60',
                              color: config.colore_btn_text || 'white',
                              border: 'none', borderRadius: '50%', width:'30px', height:'30px',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', cursor:'pointer'
                          }}>+</button>
                      </div>

                       {/* ALTRA CARD SIMULATA */}
                       <div style={{
                          margin: '10px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: config.colore_card || 'white',
                          border: `1px solid ${config.colore_border || '#eee'}`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          display: 'flex', alignItems: 'center', gap:'10px'
                      }}>
                          <div style={{width:'50px', height:'50px', background:'#eee', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px'}}>🍺</div>
                          <div style={{flex:1}}>
                              <div style={{fontWeight:'bold', fontSize:'14px', color: config.colore_titolo, fontFamily: config.font_style}}>Birra Media</div>
                              <div style={{fontSize:'10px', color: config.colore_testo, fontFamily: config.font_style}}>Bionda alla spina 0.4l</div>
                              <div style={{fontWeight:'bold', fontSize:'12px', color: config.colore_prezzo, marginTop:'2px'}}>€ 5.00</div>
                          </div>
                          <button style={{
                              background: config.colore_btn || '#27ae60',
                              color: config.colore_btn_text || 'white',
                              border: 'none', borderRadius: '50%', width:'30px', height:'30px',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', cursor:'pointer'
                          }}>+</button>
                      </div>

                  </div>
              </div>
              <p style={{textAlign:'center', color:'#999', fontSize:'12px', marginTop:'15px'}}>Anteprima Mobile in tempo reale</p>
          </div>
      </div>
  );
}

// === CSS IN JS (STILE PREMIUM) ===
const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: "'Inter', sans-serif",
    },
    editorColumn: {
        flex: '1 1 500px', // Si adatta ma non scende sotto 500px se possibile
    },
    previewColumn: {
        flex: '1 1 300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '20px'
    },
    header: {
        marginBottom: '30px',
        borderLeft: '5px solid #3498db',
        paddingLeft: '15px'
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', // Ombra morbida moderna
        border: '1px solid #f0f0f0'
    },
    sectionTitle: {
        margin: '0 0 20px 0',
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: '#95a5a6',
        fontWeight: '700',
        borderBottom: '1px solid #f5f5f5',
        paddingBottom: '10px'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '15px'
    },
    row: {
        display: 'flex',
        gap: '20px'
    },
    // Color Picker Custom
    colorWrapper: {
        background: '#f9f9f9',
        borderRadius: '10px',
        padding: '10px',
        border: '1px solid #eee',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    colorInput: {
        width: '40px',
        height: '40px',
        border: 'none',
        borderRadius: '50%', // Rotondo
        background: 'none',
        cursor: 'pointer',
        padding: 0,
        marginRight: '10px',
        overflow: 'hidden'
    },
    colorLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#333',
        display: 'block'
    },
    colorHex: {
        fontSize: '10px',
        color: '#777',
        fontFamily: 'monospace'
    },
    // File Input Custom
    label: {
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '8px',
        display: 'block',
        color: '#333'
    },
    fileInputWrapper: {
        border: '2px dashed #ddd',
        borderRadius: '10px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '5px',
        background: '#fafafa'
    },
    fileInputHidden: {
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        opacity: 0,
        cursor: 'pointer'
    },
    select: {
        width: '100%',
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid #ddd',
        background: '#fff',
        fontSize: '14px',
        cursor: 'pointer'
    },
    saveButton: {
        width: '100%',
        padding: '18px',
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', // Gradiente bello
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 5px 15px rgba(39, 174, 96, 0.3)',
        transition: 'transform 0.1s'
    },
    // Mockup Smartphone
    phoneMockup: {
        width: '300px',
        height: '600px',
        background: '#111',
        borderRadius: '40px',
        padding: '12px', // Bordo nero del telefono
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: '20px',
        boxSizing: 'border-box'
    },
    phoneNotch: {
        width: '120px',
        height: '25px',
        background: '#111',
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        zIndex: 10
    },
    phoneScreen: (bg) => ({
        width: '100%',
        height: '100%',
        background: bg || '#fff',
        borderRadius: '32px',
        overflow: 'hidden',
        position: 'relative',
        paddingTop: '30px' // Spazio per il notch
    })
};

export default AdminGrafica;