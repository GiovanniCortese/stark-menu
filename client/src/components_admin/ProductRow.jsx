// client/src/components_admin/ProductRow.jsx - FIX CRASH ALLERGENI
import { memo } from 'react';

const ProductRow = memo(({ prodotto, avviaModifica, eliminaProdotto, isDragging }) => {
    
    // --- FIX DI SICUREZZA PER GLI ALLERGENI ---
    // Se arriva come stringa "['Latte']", lo convertiamo in array vero.
    let allergeniReali = [];
    try {
        const raw = prodotto.allergeni;
        if (Array.isArray(raw)) {
            allergeniReali = raw;
        } else if (typeof raw === 'string') {
            allergeniReali = JSON.parse(raw);
        }
    } catch (e) {
        allergeniReali = [];
    }
    // ------------------------------------------

    const isSurgelato = allergeniReali.some(a => a.includes("Surgelato") || a.includes("❄️"));
    const listaAllergeniPulita = allergeniReali.filter(a => !a.includes("Surgelato") && !a.includes("❄️"));

    // PARSING VARIANTI E INGREDIENTI (Già sicuro)
    let variantiObj = { base: [], aggiunte: [] };
    try {
        variantiObj = typeof prodotto.varianti === 'string' 
            ? JSON.parse(prodotto.varianti) 
            : (prodotto.varianti || { base: [], aggiunte: [] });
    } catch (e) {}

    const ingredientiStr = (variantiObj.base || []).join(', ');
    const aggiunteList = variantiObj.aggiunte || [];

    // STILE GRAFICO CARD
    const cardStyle = {
        background: isDragging ? '#f0f9ff' : 'white', 
        border: isDragging ? '1px solid #2980b9' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'background 0.2s, border 0.2s',
        marginBottom: '0'
    };

    return (
        <div style={cardStyle}>
            {/* LATO SINISTRO: INFO PIATTO */}
            <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1, overflow:'hidden'}}>
                
                {/* MANIGLIA DRAG & DROP */}
                <div style={{cursor:'grab', color:'#bdc3c7', fontSize:'20px', paddingRight:'5px'}}>⋮⋮</div>

                {/* FOTO */}
                {prodotto.immagine_url && (
                    <img 
                        src={prodotto.immagine_url} 
                        alt={prodotto.nome} 
                        style={{width:'50px', height:'50px', borderRadius:'6px', objectFit:'cover', border:'1px solid #eee'}} 
                    />
                )}

                <div style={{minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                        <strong style={{fontSize:'15px', color:'#2c3e50'}}>{prodotto.nome}</strong>
                        <span style={{fontSize:'14px', color:'#27ae60', fontWeight:'bold'}}>{Number(prodotto.prezzo).toFixed(2)}€</span>
                        {isSurgelato && <span style={{fontSize:'12px'}}>❄️</span>}
                    </div>

                    {/* Descrizione / Ingredienti */}
                    <div style={{fontSize:'12px', color:'#7f8c8d', marginTop:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                        {ingredientiStr || prodotto.descrizione || <em style={{opacity:0.5}}>Nessuna descrizione</em>}
                    </div>

                    {/* Badge Varianti & Allergeni */}
                    <div style={{display:'flex', gap:'5px', marginTop:'4px', flexWrap:'wrap'}}>
                        {aggiunteList.length > 0 && (
                             <span style={{
                                 fontSize:'10px', 
                                 background:'#e8f8f5', 
                                 color:'#1abc9c', 
                                 border:'1px solid #d1f2eb',
                                 padding:'2px 6px', 
                                 borderRadius:'4px', 
                                 fontWeight:'bold'
                             }}>
                                +{aggiunteList.length} VAR
                             </span>
                        )}
                        {listaAllergeniPulita.length > 0 && (
                             <span style={{
                                 fontSize:'10px', 
                                 background:'#fff3e0', 
                                 color:'#e67e22', 
                                 border:'1px solid #ffe0b2',
                                 padding:'2px 6px', 
                                 borderRadius:'4px', 
                                 fontWeight:'bold'
                             }}>
                                ⚠️ ALLERGENI: {listaAllergeniPulita.join(', ')}
                             </span>
                        )}
                    </div>
                </div>
            </div>

            {/* LATO DESTRO: PULSANTI AZIONE */}
            <div style={{display:'flex', flexDirection:'column', gap:'5px', marginLeft:'10px'}}>
                <button 
                    onClick={(e) => { e.stopPropagation(); avviaModifica(prodotto); }} 
                    style={{background:'#f1c40f', border:'none', borderRadius:'5px', padding:'8px 12px', cursor:'pointer'}}
                    title="Modifica"
                >
                    ✏️
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); eliminaProdotto(prodotto.id); }} 
                    style={{background:'#e74c3c', border:'none', borderRadius:'5px', padding:'8px 12px', color:'white', cursor:'pointer'}}
                    title="Elimina"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
});

export default ProductRow;