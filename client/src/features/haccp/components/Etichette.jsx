// client/src/features/haccp/components/Etichette.jsx

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export default function Etichette({ API_URL, ristoranteId }) {
    const [dati, setDati] = useState({ prodotto: '', data_produzione: new Date().toISOString().split('T')[0], scadenza_gg: 3, operatore: '', lotto: '' });
    
    // Calcolo scadenza
    const dataProd = new Date(dati.data_produzione);
    const dataScad = new Date(dataProd);
    dataScad.setDate(dataProd.getDate() + parseInt(dati.scadenza_gg));
    const dataScadFormatted = dataScad.toLocaleDateString('it-IT');

    const labelRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => labelRef.current,
    });

    const salvaEStampa = async () => {
        // Salva nel DB (Opzionale, per storico)
        await fetch(`${API_URL}/api/haccp/labels`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ristorante_id: ristoranteId,
                prodotto: dati.prodotto,
                data_scadenza: dataScad,
                lotto: dati.lotto,
                operatore: dati.operatore
            })
        });
        handlePrint();
    };

    return (
        <div style={{padding:20, display:'flex', gap:40}}>
            {/* FORM */}
            <div style={{width:300, background:'white', padding:20, borderRadius:10}}>
                <h3>🏷️ Crea Etichetta</h3>
                <input placeholder="Prodotto (es. Ragù)" value={dati.prodotto} onChange={e=>setDati({...dati, prodotto:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                <input type="date" value={dati.data_produzione} onChange={e=>setDati({...dati, data_produzione:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                <div style={{marginBottom:10}}>
                    Scadenza: <input type="number" value={dati.scadenza_gg} onChange={e=>setDati({...dati, scadenza_gg:e.target.value})} style={{width:50}} /> giorni
                </div>
                <input placeholder="Lotto (Opzionale)" value={dati.lotto} onChange={e=>setDati({...dati, lotto:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                <input placeholder="Operatore" value={dati.operatore} onChange={e=>setDati({...dati, operatore:e.target.value})} style={{width:'100%', padding:10, marginBottom:10}} />
                
                <button onClick={salvaEStampa} style={{width:'100%', padding:15, background:'#34495e', color:'white', fontWeight:'bold', cursor:'pointer'}}>STAMPA 🖨️</button>
            </div>

            {/* PREVIEW ETICHETTA */}
            <div>
                <h3>Anteprima di Stampa</h3>
                <div ref={labelRef} style={{
                    width:'300px', height:'200px', border:'2px solid black', padding:'10px', background:'white', fontFamily:'Arial', position:'relative'
                }}>
                    <h2 style={{margin:0, textAlign:'center', textTransform:'uppercase'}}>{dati.prodotto || 'NOME PRODOTTO'}</h2>
                    <hr />
                    <p><strong>Data Prod:</strong> {new Date(dati.data_produzione).toLocaleDateString('it-IT')}</p>
                    <p style={{fontSize:'1.2rem'}}><strong>SCAD: {dataScadFormatted}</strong></p>
                    <p><strong>Lotto:</strong> {dati.lotto || '-'}</p>
                    <p><strong>Op:</strong> {dati.operatore}</p>
                    <div style={{position:'absolute', bottom:5, right:5, fontSize:10}}>HACCP CONTROL</div>
                </div>
            </div>
        </div>
    );
}