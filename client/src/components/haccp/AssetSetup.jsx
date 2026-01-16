import React from 'react';

const AssetSetup = ({ assets, apriModaleAsset, setShowQRModal, setPreviewImage }) => {
    return (
        <div className="no-print">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <h2>Macchinari</h2>
                <button onClick={()=>apriModaleAsset()} style={{background:'#27ae60', color:'white', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:'bold', cursor:'pointer'}}>+ Nuova Macchina</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20}}>
                {assets.map(a => (
                    <div key={a.id} style={{background: 'white', padding:15, borderRadius:10, borderLeft: '4px solid #34495e', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <strong>{a.nome}</strong> 
                            <span style={{fontSize:12, color:'#666'}}>({a.tipo})</span>
                        </div>
                        <div style={{fontSize:12, color:'#7f8c8d', margin:'5px 0'}}>SN: {a.serial_number || '-'}</div>
                        
                        <div style={{marginTop:10, display:'flex', gap:5}}>
                            <button onClick={()=>setShowQRModal(a)} style={{background:'#34495e', color:'white', border:'none', padding:'8px', borderRadius:3, flex:1, cursor:'pointer'}}>QR Code</button>
                            <button onClick={()=>apriModaleAsset(a)} style={{background:'#f39c12', color:'white', border:'none', padding:'8px', borderRadius:3, flex:1, cursor:'pointer'}}>Modifica</button>
                        </div>
                        
                        <div style={{marginTop:10, display:'flex', gap:10, fontSize:13}}>
                              {a.foto_url && <button onClick={() => setPreviewImage(a.foto_url)} style={{background:'none', border:'none', color:'#3498db', cursor:'pointer'}}>📸 Foto</button>}
                              {a.etichetta_url && <button onClick={() => setPreviewImage(a.etichetta_url)} style={{background:'none', border:'none', color:'#e67e22', cursor:'pointer'}}>📄 Etichetta</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssetSetup;