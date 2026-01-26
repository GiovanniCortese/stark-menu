import React from 'react';

const AssetSetup = ({ assets, apriModaleAsset, handlePrintQR, setPreviewImage, handleFileAction, openDownloadModal, onDeleteAsset }) => {
    
    // Funzione helper per la cancellazione sicura
    const handleDeleteClick = (asset) => {
        if (window.confirm(`Sei sicuro di voler eliminare definitivamente "${asset.nome}"? Perderai lo storico temperature associato!`)) {
            if(onDeleteAsset) onDeleteAsset(asset.id);
        }
    };

    return (
        <div className="no-print">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10}}>
                <h2>Macchinari & Frigoriferi</h2>
                <div style={{display:'flex', gap:10}}>
                    <button onClick={()=>openDownloadModal('assets')} style={{background:'#34495e', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>⬇ Scarica Lista</button>
                    <button onClick={()=>apriModaleAsset()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>+ Nuova Macchina</button>
                </div>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
                {assets.map(a => (
                    <div key={a.id} style={{background: 'white', padding:15, borderRadius:10, borderLeft: `4px solid ${a.stato === 'spento' ? '#e74c3c' : '#34495e'}`, boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
    <div>
        <strong style={{fontSize:18}}>{a.nome}</strong> 
        {/* AGGIUNTA: Mostra il locale se presente */}
        <div style={{fontSize:14, color:'#2980b9', fontWeight:'bold'}}>
            📍 {a.locale || 'N/D'}
        </div>
        <div style={{fontSize:12, color:'#666', marginTop:2}}>({a.tipo})</div>
    </div>
    {a.stato === 'spento' && <span style={{background:'#e74c3c', color:'white', padding:'2px 6px', borderRadius:4, fontSize:10}}>SPENTO</span>}
</div>
                        
                        <div style={{marginTop:10, fontSize:13, color:'#555'}}>
                            <div>🌡️ Range: {a.range_min}° / {a.range_max}°</div>
                            <div>🏷️ Marca: {a.marca || '-'}</div>
                            <div>🔢 S/N: {a.serial_number || '-'}</div>
                        </div>

                        <div style={{marginTop:15, display:'flex', gap:5}}>
                            <button onClick={()=>handlePrintQR(a)} style={{background:'#34495e', color:'white', border:'none', padding:'8px', borderRadius:3, flex:1, cursor:'pointer', fontSize:12}}>QR Code 🖨️</button>
                            <button onClick={()=>apriModaleAsset(a)} style={{background:'#f39c12', color:'white', border:'none', padding:'8px', borderRadius:3, flex:1, cursor:'pointer', fontSize:12}}>Modifica</button>
                        </div>
                        
                        <div style={{marginTop:5, display:'flex', gap:10, fontSize:12, justifyContent:'space-between', alignItems:'center'}}>
                              <div style={{display:'flex', gap:10}}>
                                  {a.foto_url ? (
                                      <button onClick={() => handleFileAction(a.foto_url)} style={{background:'none', border:'none', color:'#3498db', cursor:'pointer'}}>📸 Foto</button>
                                  ) : <span style={{color:'#ccc'}}>No Foto</span>}
                                  
                                  {a.etichetta_url ? (
                                      <button onClick={() => handleFileAction(a.etichetta_url)} style={{background:'none', border:'none', color:'#e67e22', cursor:'pointer'}}>📄 Etichetta</button>
                                  ) : <span style={{color:'#ccc'}}>No Etichetta</span>}
                              </div>
                              
                              <button onClick={() => handleDeleteClick(a)} style={{background:'none', border:'none', color:'#c0392b', cursor:'pointer', fontSize:12}}>🗑️ Elimina</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssetSetup;