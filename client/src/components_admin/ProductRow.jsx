// client/src/components_admin/ProductRow.jsx
import { memo } from 'react';

const ProductRow = memo(({ prodotto, avviaModifica, eliminaProdotto, isDragging }) => {
    
    // Stile grafico della Card (staccato dalla logica di posizionamento)
    const cardStyle = {
        background: isDragging ? '#f0f9ff' : 'white', // Colore leggermente diverso se lo stai trascinando
        border: isDragging ? '1px solid #2980b9' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
        // NESSUNA TRANSITION QUI!
    };

    return (
        <div className="product-card-inner" style={cardStyle}>
            {/* LATO SINISTRO: MANIGLIA + FOTO + TESTI */}
            <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1}}>
                
                {/* Icona Hamburger (Solo decorativa qui, la presa è gestita dal padre) */}
                <div style={{fontSize:'20px', color:'#ccc', cursor:'grab'}}>
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
                <div style={{overflow:'hidden'}}>
                    <div style={{fontWeight:'bold', fontSize:'15px', color:'#333', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                        {prodotto.nome}
                    </div>
                    <div style={{fontSize:'12px', color:'#777'}}>
                        {Number(prodotto.prezzo).toFixed(2)} € • {prodotto.categoria_nome || prodotto.categoria}
                    </div>
                    
                    {/* Badge Stati */}
                    <div style={{display:'flex', gap:'5px', marginTop:'2px'}}>
                        {!prodotto.disponibile && (
                            <span style={{fontSize:'10px', background:'#e74c3c', color:'white', padding:'1px 5px', borderRadius:'4px'}}>ESAURITO</span>
                        )}
                        {!prodotto.visibile && (
                            <span style={{fontSize:'10px', background:'#95a5a6', color:'white', padding:'1px 5px', borderRadius:'4px'}}>NASCOSTO</span>
                        )}
                        {prodotto.allergeni && prodotto.allergeni.length > 0 && (
                             <span style={{fontSize:'10px', color:'#e67e22', fontWeight:'bold'}}>⚠️ {prodotto.allergeni.length} All.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* LATO DESTRO: PULSANTI AZIONE */}
            <div style={{display:'flex', gap:'8px'}}>
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