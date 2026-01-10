import { useState } from 'react';

function AdminGrafica({ user, config, setConfig, API_URL }) {
  const [uploading, setUploading] = useState(false);

  // Funzione salvataggio
  const handleSaveStyle = async () => {
      try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        alert("🎨 Grafica aggiornata con successo!");
      } catch (e) { alert("Errore salvataggio"); }
  };

  // Funzione upload immagini
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

  // Helper per input colore
  const ColorInput = ({ label, val, field }) => (
      <div style={{flex: '1 1 45%', minWidth: '150px'}}>
          <label style={{display:'block', fontSize:'12px', fontWeight:'bold', color:'#555', marginBottom:'5px'}}>{label}</label>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input 
                  type="color" 
                  value={val || '#000000'} 
                  onChange={e => setConfig({...config, [field]: e.target.value})} 
                  style={{width:'50px', height:'40px', border:'none', cursor:'pointer', background:'none'}}
              />
              <span style={{fontSize:'12px', fontFamily:'monospace'}}>{val}</span>
          </div>
      </div>
  );

  return (
      <div style={{display:'flex', gap:'20px', flexWrap:'wrap', alignItems:'flex-start'}}>
          
          {/* COLONNA SINISTRA: EDITOR */}
          <div className="card" style={{flex:1, minWidth:'300px', padding:'25px'}}>
              <h3 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px'}}>🎨 Personalizzazione Totale</h3>

              {/* SEZIONE 1: IMMAGINI */}
              <div style={sectionStyle}>
                  <h4 style={titleStyle}>📸 Immagini & Brand</h4>
                  <div style={{marginBottom:'15px'}}>
                      <label style={labelStyle}>Logo Ristorante</label>
                      <input type="file" onChange={(e) => handleUpload(e, 'logo_url')} />
                      {uploading && <small>Caricamento...</small>}
                  </div>
                  <div>
                      <label style={labelStyle}>Immagine Copertina (Header)</label>
                      <input type="file" onChange={(e) => handleUpload(e, 'cover_url')} />
                  </div>
              </div>

              {/* SEZIONE 2: COLORI GENERALI */}
              <div style={sectionStyle}>
                  <h4 style={titleStyle}>🌍 Sfondo e Testi Generali</h4>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'15px'}}>
                      <ColorInput label="Sfondo Pagina" val={config.colore_sfondo} field="colore_sfondo" />
                      <ColorInput label="Colore Titoli" val={config.colore_titolo} field="colore_titolo" />
                      <ColorInput label="Testo Paragrafi" val={config.colore_testo} field="colore_testo" />
                  </div>
              </div>

              {/* SEZIONE 3: CARD PRODOTTI */}
              <div style={sectionStyle}>
                  <h4 style={titleStyle}>🥡 Scheda Prodotto</h4>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'15px'}}>
                      <ColorInput label="Sfondo Card" val={config.colore_card} field="colore_card" />
                      <ColorInput label="Bordi & Linee" val={config.colore_border} field="colore_border" />
                      <ColorInput label="Prezzo Evidenziato" val={config.colore_prezzo} field="colore_prezzo" />
                  </div>
              </div>

              {/* SEZIONE 4: BOTTONI & UI */}
              <div style={sectionStyle}>
                  <h4 style={titleStyle}>🔘 Bottoni & Interazione</h4>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'15px'}}>
                      <ColorInput label="Sfondo Bottoni" val={config.colore_btn} field="colore_btn" />
                      <ColorInput label="Testo Bottoni" val={config.colore_btn_text} field="colore_btn_text" />
                  </div>
              </div>

              {/* SEZIONE 5: FONT */}
              <div style={sectionStyle}>
                  <h4 style={titleStyle}>🔤 Tipografia</h4>
                  <select value={config.font_style} onChange={e => setConfig({...config, font_style: e.target.value})} style={{width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ddd'}}>
                      <option value="sans-serif">Moderno (Sans-Serif)</option>
                      <option value="serif">Elegante (Serif)</option>
                      <option value="'Courier New', monospace">Vintage / Macchina da scrivere</option>
                      <option value="'Brush Script MT', cursive">Corsivo / Pizzeria</option>
                  </select>
              </div>

              <button onClick={handleSaveStyle} style={{width:'100%', padding:'15px', background:'#27ae60', color:'white', fontSize:'16px', fontWeight:'bold', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'20px'}}>
                  💾 SALVA IL MIO STILE
              </button>
          </div>

          {/* COLONNA DESTRA: ANTEPRIMA LIVE */}
          <div style={{flex:1, minWidth:'300px', position:'sticky', top:'20px'}}>
              <div style={{background: config.colore_sfondo || '#f4f4f4', padding:'20px', borderRadius:'15px', border:'2px solid #333', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                  <h3 style={{textAlign:'center', color: config.colore_titolo}}>📱 Anteprima Live</h3>
                  
                  {/* FINTA CARD PRODOTTO */}
                  <div style={{
                      background: config.colore_card || 'white', 
                      borderRadius:'12px', 
                      padding:'15px', 
                      border: `1px solid ${config.colore_border || '#eee'}`,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                      fontFamily: config.font_style
                  }}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                          <div>
                              <strong style={{color: config.colore_titolo, fontSize:'1.1rem'}}>Pizza Margherita</strong>
                              <p style={{color: config.colore_testo, fontSize:'0.9rem', margin:'5px 0'}}>Pomodoro San Marzano, Mozzarella, Basilico.</p>
                          </div>
                          <div style={{color: config.colore_prezzo, fontWeight:'bold', fontSize:'1.2rem'}}>€ 8.00</div>
                      </div>
                      <div style={{marginTop:'15px', display:'flex', justifyContent:'flex-end'}}>
                          <button style={{
                              background: config.colore_btn || '#27ae60', 
                              color: config.colore_btn_text || 'white', 
                              border:'none', padding:'8px 15px', borderRadius:'20px', fontWeight:'bold'
                          }}>
                              AGGIUNGI +
                          </button>
                      </div>
                  </div>

                  {/* FINTA INTESTAZIONE */}
                  <div style={{marginTop:'20px', textAlign:'center'}}>
                      {config.logo_url && <img src={config.logo_url} alt="logo" style={{width:'60px', borderRadius:'50%', border:'2px solid white'}} />}
                      <h2 style={{color: config.colore_titolo, fontFamily: config.font_style, margin:'10px 0'}}>Il Tuo Locale</h2>
                  </div>

              </div>
              <p style={{textAlign:'center', color:'#777', fontSize:'0.8rem', marginTop:'10px'}}>
                  Nota: Questa è solo un'anteprima. Il menu reale userà questi colori.
              </p>
          </div>
      </div>
  );
}

// STILI CSS IN JS
const sectionStyle = { marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px dashed #ddd' };
const titleStyle = { margin:'0 0 15px 0', color:'#2c3e50', fontSize:'1rem' };
const labelStyle = { display:'block', marginBottom:'5px', fontSize:'0.9rem', fontWeight:'bold', color:'#555' };

export default AdminGrafica;