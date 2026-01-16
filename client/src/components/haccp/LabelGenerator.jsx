import React from 'react';

const LabelGenerator = ({ labelData, setLabelData, handleLabelTypeChange, handlePrintLabel, lastLabel }) => {
    return (
        <div className="no-print" style={{display:'flex', gap:20}}>
           <div style={{background:'white', padding:20, borderRadius:10, flex:1}}>
               <h3>Genera Etichetta Interna</h3>
               <form onSubmit={handlePrintLabel} style={{display:'flex', flexDirection:'column', gap:10}}>
                  <input placeholder="Prodotto" required value={labelData.prodotto} onChange={e=>setLabelData({...labelData, prodotto:e.target.value})} style={{padding:10, border:'1px solid #ccc'}} />
                  <select value={labelData.tipo} onChange={handleLabelTypeChange} style={{padding:10, border:'1px solid #ccc'}}>
                      <option value="positivo">Positivo (+3°C) - 3gg</option>
                      <option value="negativo">Negativo (-18°C) - 180gg</option>
                      <option value="sottovuoto">Sottovuoto - 10gg</option>
                  </select>
                  <label style={{fontSize:12}}>Giorni scadenza:</label>
                  <input type="number" value={labelData.giorni_scadenza} onChange={e=>setLabelData({...labelData, giorni_scadenza:e.target.value})} style={{padding:10, border:'1px solid #ccc'}} />
                  <input placeholder="Operatore" value={labelData.operatore} onChange={e=>setLabelData({...labelData, operatore:e.target.value})} style={{padding:10, border:'1px solid #ccc'}} />
                  <button style={{background:'#2980b9', color:'white', border:'none', padding:10, borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>STAMPA ETICHETTA</button>
               </form>
           </div>
           
           <div style={{flex:1, background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10}}>
               {lastLabel ? (
                   <div style={{background:'white', padding:15, border:'2px solid black', width:250}}>
                       <h2 style={{margin:'0 0 10px 0', borderBottom:'1px solid black', fontSize:18}}>{lastLabel.prodotto}</h2>
                       <div style={{fontSize:12}}>PROD: {new Date(lastLabel.data_produzione).toLocaleDateString()}</div>
                       <div style={{fontSize:16, fontWeight:'bold', marginTop:5}}>SCAD: {new Date(lastLabel.data_scadenza).toLocaleDateString()}</div>
                       <div style={{fontSize:10, color:'#555', marginTop:5}}>Lotto: {lastLabel.lotto}</div>
                   </div>
               ) : <p style={{color:'#999'}}>Anteprima stampa</p>}
           </div>
        </div>
    );
};

export default LabelGenerator;