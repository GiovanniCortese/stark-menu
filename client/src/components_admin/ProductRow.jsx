// client/src/components_admin/ProductRow.jsx
import { memo } from 'react';

const ProductRow = memo(({ prodotto, avviaModifica, eliminaProdotto, isDragging }) => {
    
    // 1. ANALISI ALLERGENI E SURGELATO
    const tuttiAllergeni = prodotto.allergeni || [];
    const isSurgelato = tuttiAllergeni.some(a => a.includes("Surgelato") || a.includes("❄️"));
    const allergeniReali = tuttiAllergeni.filter(a => !a.includes("Surgelato") && !a.includes("❄️"));

    // 2. PARSING VARIANTI E INGREDIENTI
    let variantiObj = { base: [], aggiunte: [] };
    try {
        variantiObj = typeof prodotto.varianti === 'string' 
            ? JSON.parse(prodotto.varianti) 
            : (prodotto.varianti || { base: [], aggiunte: [] });
    } catch (e) {
        console.error("Errore parsing varianti", e);
    }

    const ingredientiStr = (variantiObj.base || []).join(', ');
    const aggiunteList = variantiObj.aggiunte || [];

    // 3. STILE GRAFICO CARD
    const cardStyle = {
        background: isDragging ? '#f0f9ff' : 'white', 
        border: isDragging ? '1px solid #2980b9' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px', // Un po' più di spazio
        display: 'flex',
        alignItems: 'center', // Allinea al centro verticalmente se è corto, o in alto se lungo? Meglio 'flex-start' se c'è molto testo
        justifyContent: 'space-between',
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
        minHeight: '80px' // Altezza minima per contenere le info
    };

    return (
        <div className="product-card-inner" style={cardStyle}>
            {/* LATO SINISTRO: MANIGLIA + FOTO + TESTI */}
            <div style={{display:'flex', alignItems:'flex-start', gap:'15px', flex:1, overflow:'hidden'}}>
                
                {/* Icona Hamburger (Centrata verticalmente rispetto alla foto) */}
                <div style={{fontSize:'20px', color:'#ccc', cursor:'grab', minWidth:'20px', marginTop:'15px'}}>
                    ☰
                </div>

                {/* Immagine */}
                <div style={{width:'60px', height:'60px', borderRadius:'6px', overflow:'hidden', background:'#eee', flexShrink: 0, marginTop:'5px'}}>
                    {prodotto.immagine_url ? (
                        <img src={prodotto.immagine_url} alt={prodotto.nome} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        <span style={{display:'block', textAlign:'center', lineHeight:'60px', fontSize:'24px'}}>🍽️</span>
                    )}
                </div>

                {/* --- BLOCCO DATI TESTUALI COMPLETI --- */}
                <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column', gap:'2px'}}>
                    
                    {/* RIGA 1: NOME + PREZZO + CATEGORIA */}
                    <div style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:'8px'}}>
                        <span style={{fontWeight:'bold', fontSize:'16px', color:'#2c3e50'}}>
                            {prodotto.nome}
                        </span>
                        <span style={{fontSize:'13px', color:'#27ae60', fontWeight:'bold', background:'#e8f8f5', padding:'2px 6px', borderRadius:'4px'}}>
                            {Number(prodotto.prezzo).toFixed(2)} €
                        </span>
                    </div>

                    {/* RIGA 2: DESCRIZIONE (se c'è) */}
                    {prodotto.descrizione && (
                        <div style={{fontSize:'12px', color:'#7f8c8d', fontStyle:'italic', lineHeight:'1.2'}}>
                            {prodotto.descrizione}
                        </div>
                    )}

                    {/* RIGA 3: INGREDIENTI BASE (se ci sono) */}
                    {ingredientiStr && (
                        <div style={{fontSize:'11px', color:'#555', marginTop:'2px'}}>
                            <span style={{fontWeight:'bold'}}>🧂 Ingr:</span> {ingredientiStr}
                        </div>
                    )}

                    {/* RIGA 4: VARIANTI/AGGIUNTE (se ci sono) */}
                    {aggiunteList.length > 0 && (
                        <div style={{fontSize:'11px', color:'#d35400', marginTop:'1px', display:'flex', flexWrap:'wrap', gap:'4px'}}>
                            <span style={{fontWeight:'bold'}}>➕ Extra:</span> 
                            {aggiunteList.map((agg, idx) => (
                                <span key={idx} style={{background:'#fef5e7', padding:'1px 4px', borderRadius:'3px', border:'1px solid #fdebd0'}}>
                                    {agg.nome} (+{Number(agg.prezzo).toFixed(2)}€)
                                </span>
                            ))}
                        </div>
                    )}

                    {/* RIGA 5: BADGE SURGELATO E ALLERGENI */}
                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'6px'}}>
                        {/* SURGELATO */}
                        {isSurgelato && (
                            <span style={{fontSize:'10px', background:'#3498db', color:'white', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>
                                ❄️ SURGELATO
                            </span>
                        )}

                        {/* ALLERGENI */}
                        {allergeniReali.length > 0 && (
                             <span style={{
                                 fontSize:'10px', 
                                 background:'#fff3e0', 
                                 color:'#e67e22', 
                                 border:'1px solid #ffe0b2',
                                 padding:'2px 6px', 
                                 borderRadius:'4px', 
                                 fontWeight:'bold'
                             }}>
                                ⚠️ {allergeniReali.join(', ')}
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