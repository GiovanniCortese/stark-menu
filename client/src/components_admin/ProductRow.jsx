// Mettilo fuori da AdminMenu o in un file separato ProductRow.jsx
import { Draggable } from '@hello-pangea/dnd';
import { memo } from 'react'; // <--- IL SEGRETO DELLA FLUIDITÀ

// Usiamo 'memo' per dire a React: "Se i dati di questo piatto non cambiano, non ridisegnarlo mentre trascino gli altri"
const ProductRow = memo(({ prodotto, index, avviaModifica, eliminaProdotto, providedStyle, ricaricaDati }) => {
    
    // Stile della Card
    const cardStyle = {
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '8px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        ...providedStyle // <--- FONDAMENTALE: applica lo stile del trascinamento QUI
    };

    return (
        <div className="product-card" style={cardStyle}>
            {/* LATO SINISTRO: FOTO + TESTI */}
            <div style={{display:'flex', alignItems:'center', gap:'15px', flex:1}}>
                {/* Maniglia per trascinare (Icona Hamburger) */}
                <div style={{cursor: 'grab', fontSize:'20px', color:'#ccc', padding:'5px'}}>
                    ☰
                </div>

                {/* Immagine */}
                <div style={{width:'50px', height:'50px', borderRadius:'5px', overflow:'hidden', background:'#eee'}}>
                    {prodotto.immagine_url ? (
                        <img src={prodotto.immagine_url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        <span style={{display:'block', textAlign:'center', lineHeight:'50px', fontSize:'20px'}}>🍽️</span>
                    )}
                </div>

                {/* Testi */}
                <div>
                    <div style={{fontWeight:'bold', fontSize:'15px', color:'#333'}}>
                        {prodotto.nome}
                    </div>
                    <div style={{fontSize:'12px', color:'#777'}}>
                        {prodotto.prezzo} € • {prodotto.categoria_nome || prodotto.categoria}
                    </div>
                    {/* Badge Visibilità */}
                    {!prodotto.disponibile && <span style={{fontSize:'10px', background:'#e74c3c', color:'white', padding:'2px 5px', borderRadius:'4px', marginRight:'5px'}}>ESAURITO</span>}
                    {!prodotto.visibile && <span style={{fontSize:'10px', background:'#95a5a6', color:'white', padding:'2px 5px', borderRadius:'4px'}}>NASCOSTO</span>}
                </div>
            </div>

            {/* LATO DESTRO: AZIONI */}
            <div style={{display:'flex', gap:'8px'}}>
                <button onClick={() => avviaModifica(prodotto)} style={{background:'#f1c40f', border:'none', borderRadius:'5px', padding:'8px', cursor:'pointer'}}>✏️</button>
                <button onClick={() => eliminaProdotto(prodotto.id)} style={{background:'#e74c3c', border:'none', borderRadius:'5px', padding:'8px', color:'white', cursor:'pointer'}}>🗑️</button>
            </div>
        </div>
    );
});