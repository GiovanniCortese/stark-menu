import { useState } from 'react';

function AdminExcel({ user, API_URL, ricaricaDati }) {
  const [fileExcel, setFileExcel] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleExportExcel = () => { window.open(`${API_URL}/api/export-excel/${user.id}`, '_blank'); };

  const handleImportExcel = async () => {
    if(!fileExcel) return alert("Seleziona un file .xlsx prima!");
    const formData = new FormData(); formData.append('file', fileExcel); formData.append('ristorante_id', user.id);
    try {
        setUploading(true);
        const res = await fetch(`${API_URL}/api/import-excel`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { alert(data.message); ricaricaDati(); } else { alert("ERRORE: " + (data.error || "Sconosciuto")); }
    } catch(err) { alert("Errore connessione"); } 
    finally { setUploading(false); setFileExcel(null); }
  };

  return (
      <div className="card">
          <h3>Gestione Massiva (Excel)</h3>
          <div style={{margin:'20px 0', padding:'20px', background:'#f0f0f0', borderRadius:'10px'}}>
              <h4>📤 Esporta Menu</h4>
              <button onClick={handleExportExcel} className="btn-invia" style={{background:'#27ae60'}}>Scarica Excel</button>
          </div>
          <div style={{margin:'20px 0', padding:'20px', background:'#f0f0f0', borderRadius:'10px'}}>
              <h4>📥 Importa Menu</h4>
              <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileExcel(e.target.files[0])} />
              <button onClick={handleImportExcel} className="btn-invia" disabled={uploading} style={{marginTop:10}}>
                  {uploading ? "Caricamento..." : "Carica Excel"}
              </button>
          </div>
      </div>
  );
}

export default AdminExcel;