// client/src/components_admin/ProductRow.jsx
import { memo } from 'react';

const ProductRow = memo(({ prodotto, avviaModifica, eliminaProdotto, isDragging }) => {
    
    // Analisi Allergeni e Surgelato
    const tuttiAllergeni = prodotto.allergeni || [];
    const isSurgelato = tuttiAllergeni.some(a => a.includes("Surgelato") || a.includes("❄️"));
    const allergeniReali = tuttiAllergeni.filter(a => !a.includes("Surgelato") && !a.includes("❄️"));

    // Stile grafico della Card
    const cardStyle = {
        background: isDragging ? '#f0f9ff' : 'white', 
        border: isDragging ? '1px solid #2980b9' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
    };

    return (
        <div className="product-card-inner" style={cardStyle}>
            {/* LATO SINISTRO: MANIGLIA + FOTO + TESTI */}
            <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1, overflow:'hidden'}}>
                
                {/* Icona Hamburger */}
                <div style={{fontSize:'20px', color:'#ccc', cursor:'grab', minWidth:'20px'}}>
                    ☰
                </div>

                {/* Immagine */}
                <div style={{width:'50px', height:'50px', borderRadius:'5px', overflow:'hidden', background:'#eee', flexShrink: 0}}>
                    {prodotto.immagine_url ? (
                        <img src={prodotto.immagine_url} alt={prodotto.nome} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        <span style={{display:'block', textAlign:'center', lineHeight:'50px', fontSize:'20px'}}>🍽️</span>
                    )}
                </div>

                {/* Dati Testuali */}
                <div style={{flex:1, overflow:'hidden'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <div style={{fontWeight:'bold', fontSize:'15px', color:'#333', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                            {prodotto.nome}
                        </div>
                        {/* Prezzo e Categoria */}
                        <div style={{fontSize:'12px', color:'#777', flexShrink:0}}>
                            {Number(prodotto.prezzo).toFixed(2)} € • {prodotto.categoria_nome || prodotto.categoria}
                        </div>
                    </div>

                    {/* Badge Stati, Surgelato e Allergeni */}
                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'4px'}}>
                        {!prodotto.disponibile && (
                            <span style={{fontSize:'10px', background:'#e74c3c', color:'white', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>ESAURITO</span>
                        )}
                        {!prodotto.visibile && (
                            <span style={{fontSize:'10px', background:'#95a5a6', color:'white', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>NASCOSTO</span>
                        )}
                        
                        {/* BADGE SURGELATO (BLU) */}
                        {isSurgelato && (
                            <span style={{fontSize:'10px', background:'#3498db', color:'white', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>
                                ❄️ SURGELATO
                            </span>
                        )}

                        {/* LISTA ALLERGENI (ARANCIO) */}
                        {allergeniReali.length > 0 && (
                             <span style={{
                                 fontSize:'10px', 
                                 background:'#fff3e0', 
                                 color:'#e67e22', 
                                 border:'1px solid #ffe0b2',
                                 padding:'2px 6px', 
                                 borderRadius:'4px', 
                                 fontWeight:'bold',
                                 whiteSpace: 'nowrap',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 maxWidth: '100%'
                             }}>
                                ⚠️ {allergeniReali.join(', ')}
                             </span>
                        )}
                    </div>
                </div>
            </div>

            {/* LATO DESTRO: PULSANTI AZIONE */}
            <div style={{display:'flex', gap:'8px', marginLeft:'10px'}}>
                <button 
                    onClick={(e) => { e.stopPropagation(); avviaModifica(prodotto); }} 
                    style={{background:'#f1c40f', border:'none', borderRadius:'5px', padding:'8px', cursor:'pointer'}}
                    title="Modifica"
                >
                    ✏️
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); eliminaProdotto(prodotto.id); }} 
                    style={{background:'#e74c3c', border:'none', borderRadius:'5px', padding:'8px', color:'white', cursor:'pointer'}}
                    title="Elimina"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
});

export default ProductRow;