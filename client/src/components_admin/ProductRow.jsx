// client/src/components_admin/ProductRow.jsx - LAYOUT VERTICALE AGGIORNATO
import { memo } from 'react';

const ProductRow = memo(({ prodotto, avviaModifica, eliminaProdotto, isDragging }) => {
    
    // --- PARSING SICURO ALLERGENI ---
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

    const isSurgelato = allergeniReali.some(a => a.includes("Surgelato") || a.includes("❄️") || a.includes("Congelato"));
    const listaAllergeniPulita = allergeniReali.filter(a => !a.includes("Surgelato") && !a.includes("❄️") && !a.includes("Congelato"));

    // --- PARSING SICURO VARIANTI ---
    let variantiObj = { base: [], aggiunte: [] };
    try {
        variantiObj = typeof prodotto.varianti === 'string' 
            ? JSON.parse(prodotto.varianti) 
            : (prodotto.varianti || { base: [], aggiunte: [] });
    } catch (e) {}

    const ingredientiStr = (variantiObj.base || []).join(', ');
    const aggiunteList = variantiObj.aggiunte || [];

    // --- STILI ---
    const cardStyle = {
        background: isDragging ? '#f0f9ff' : 'white', 
        border: isDragging ? '1px solid #2980b9' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center', // Allinea verticalmente al centro per maniglia e bottoni
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'background 0.2s, border 0.2s',
        marginBottom: '0'
    };

    return (
        <div style={cardStyle}>
            {/* LATO SINISTRO: DRAG HANDLE + FOTO */}
            <div style={{display:'flex', alignItems:'flex-start', gap:'15px', flex:1, overflow:'hidden'}}>
                
                {/* MANIGLIA DRAG & DROP */}
                <div style={{cursor:'grab', color:'#bdc3c7', fontSize:'20px', paddingRight:'5px', alignSelf:'center'}}>⋮⋮</div>

                {/* FOTO (Opzionale) */}
                {prodotto.immagine_url && (
                    <img 
                        src={prodotto.immagine_url} 
                        alt={prodotto.nome} 
                        style={{width:'60px', height:'60px', borderRadius:'6px', objectFit:'cover', border:'1px solid #eee', marginTop:'2px'}} 
                    />
                )}

                {/* CONTENUTO CENTRALE (Impilato Verticalmente) */}
                <div style={{display:'flex', flexDirection:'column', gap:'3px', minWidth:0, flex:1}}>
                    
                    {/* 1. TITOLO + PREZZO */}
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <strong style={{fontSize:'16px', color:'#2c3e50', lineHeight:'1.2'}}>{prodotto.nome}</strong>
                        <span style={{fontSize:'14px', color:'#27ae60', fontWeight:'bold', background:'#e8f8f5', padding:'2px 6px', borderRadius:'4px'}}>
                            {Number(prodotto.prezzo).toFixed(2)}€
                        </span>
                    </div>

                    {/* 2. DESCRIZIONE */}
                    {prodotto.descrizione && (
                        <div style={{fontSize:'13px', color:'#7f8c8d', fontStyle:'italic'}}>
                            {prodotto.descrizione}
                        </div>
                    )}

                    {/* 3. INGREDIENTI (Varianti Base) */}
                    {ingredientiStr && (
                        <div style={{fontSize:'12px', color:'#555'}}>
                            <span style={{fontWeight:'bold', color:'#d35400'}}>🧂 Ing:</span> {ingredientiStr}
                        </div>
                    )}

                    {/* 4. VARIAZIONI (Conteggio) */}
                    {aggiunteList.length > 0 && (
                        <div style={{fontSize:'11px'}}>
                             <span style={{
                                 background:'#f4f6f7', 
                                 color:'#2980b9', 
                                 border:'1px solid #d6eaf8',
                                 padding:'1px 5px', 
                                 borderRadius:'3px', 
                                 fontWeight:'bold'
                             }}>
                                ✏️ {aggiunteList.length} Variazioni disponibili
                             </span>
                        </div>
                    )}

                    {/* 5. ALLERGENI */}
                    {listaAllergeniPulita.length > 0 && (
                        <div style={{fontSize:'11px', marginTop:'2px'}}>
                             <span style={{
                                 color:'#c0392b', 
                                 fontWeight:'bold'
                             }}>
                                ⚠️ Allergeni: {listaAllergeniPulita.join(', ')}
                             </span>
                        </div>
                    )}

                    {/* 6. SURGELATO */}
                    {isSurgelato && (
                        <div style={{fontSize:'11px', marginTop:'1px'}}>
                             <span style={{
                                 color:'#3498db', 
                                 fontWeight:'bold',
                                 display:'flex',
                                 alignItems:'center',
                                 gap:'4px'
                             }}>
                                ❄️ Prodotto Surgelato
                             </span>
                        </div>
                    )}

                </div>
            </div>

            {/* LATO DESTRO: PULSANTI AZIONE */}
            <div style={{display:'flex', flexDirection:'column', gap:'8px', marginLeft:'15px'}}>
                <button 
                    onClick={(e) => { e.stopPropagation(); avviaModifica(prodotto); }} 
                    style={{background:'#f1c40f', border:'none', borderRadius:'5px', padding:'8px 12px', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}
                    title="Modifica"
                >
                    ✏️
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); eliminaProdotto(prodotto.id); }} 
                    style={{background:'#e74c3c', border:'none', borderRadius:'5px', padding:'8px 12px', color:'white', cursor:'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}
                    title="Elimina"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
});

export default ProductRow;