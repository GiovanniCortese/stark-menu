import { useState } from 'react';

function AdminGrafica({ user, config, setConfig, API_URL }) {
  const [uploading, setUploading] = useState(false);

  const handleSaveStyle = async () => {
      try {
        await fetch(`${API_URL}/api/ristorante/style/${user.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });
        alert("🎨 Grafica aggiornata!");
      } catch (e) { alert("Errore salvataggio"); }
  };

  const handleUpload = async (e, type) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const fd = new FormData(); fd.append('photo', f);
      const r = await fetch(`${API_URL}/api/upload`, {method:'POST', body:fd});
      const d = await r.json();
      if(d.url) setConfig(prev => ({...prev, [type]: d.url}));
      setUploading(false);
  };

  return (
      <div className="card">
          <h3>🎨 Personalizzazione Grafica</h3>
          <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <div style={{borderBottom:'1px solid #ccc', paddingBottom:'10px'}}>
                  <h4>Logo Attività</h4>
                  <input type="file" onChange={(e) => handleUpload(e, 'logo_url')} />
                  {uploading && <span>Caricamento...</span>}
                  {config.logo_url && (
                      <div style={{marginTop:'10px'}}>
                          <img src={config.logo_url} style={{height:'60px', marginBottom:'5px', border:'1px solid #ccc'}} />
                          <button onClick={() => setConfig({...config, logo_url: ''})} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px', cursor:'pointer'}}>🗑️ Rimuovi</button>
                      </div>
                  )}
              </div>
              
              <div style={{borderBottom:'1px solid #ccc', paddingBottom:'10px'}}>
                  <h4>Sfondo</h4>
                  <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                    <input type="color" value={config.colore_sfondo} onChange={e => setConfig({...config, colore_sfondo: e.target.value})} />
                    <span>Colore Sfondo</span>
                  </div>
                  <input type="file" onChange={(e) => handleUpload(e, 'cover_url')} />
                  {config.cover_url && (
                      <div style={{marginTop:'10px'}}>
                          <img src={config.cover_url} style={{height:'60px', marginBottom:'5px', border:'1px solid #ccc'}} />
                          <button onClick={() => setConfig({...config, cover_url: ''})} style={{background:'#e74c3c', color:'white', border:'none', padding:'5px', cursor:'pointer'}}>🗑️ Rimuovi</button>
                      </div>
                  )}
              </div>

              <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                  <div style={{flex:1}}><h4>Titoli</h4><input type="color" value={config.colore_titolo} onChange={e => setConfig({...config, colore_titolo: e.target.value})} style={{width:'100%', height:'40px'}}/></div>
                  <div style={{flex:1}}><h4>Testo</h4><input type="color" value={config.colore_testo} onChange={e => setConfig({...config, colore_testo: e.target.value})} style={{width:'100%', height:'40px'}}/></div>
                  <div style={{flex:1}}><h4>Prezzi</h4><input type="color" value={config.colore_prezzo} onChange={e => setConfig({...config, colore_prezzo: e.target.value})} style={{width:'100%', height:'40px'}}/></div>
              </div>
              
              <div>
                  <h4>Font</h4>
                  <select value={config.font_style} onChange={e => setConfig({...config, font_style: e.target.value})} style={{width:'100%', padding:'10px'}}>
                      <option value="sans-serif">Moderno</option>
                      <option value="serif">Classico</option>
                      <option value="'Courier New', monospace">Macchina da scrivere</option>
                      <option value="'Brush Script MT', cursive">Corsivo</option>
                  </select>
              </div>
              <button onClick={handleSaveStyle} className="btn-invia" style={{background:'#9b59b6', marginTop:'10px'}}>💾 SALVA MODIFICHE</button>
          </div>
      </div>
  );
}

export default AdminGrafica;