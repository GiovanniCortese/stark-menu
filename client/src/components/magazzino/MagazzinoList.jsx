import React, { useState } from 'react';

const formatTimeDate = (dateStr, timeStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' });
    let time = timeStr;
    if (!time) {
        time = date.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
    }
    
    return (
        <div>
            <div style={{fontWeight:'bold', color:'#2c3e50'}}>{day}</div>
            <div style={{fontSize:'11px', color:'#7f8c8d'}}>ore {time}</div>
        </div>
    );
};

const MagazzinoList = ({ storico, ricaricaDati, API_URL, handleFileAction, avviaModifica, openDownloadModal }) => {
    const [filtro, setFiltro] = useState("");

    const datiSicuri = Array.isArray(storico) ? storico : [];

    const eliminaMerce = async (id) => {
        if(!window.confirm("Eliminare questa riga?")) return;
        await fetch(`${API_URL}/api/haccp/merci/${id}`, {method:'DELETE'});
        ricaricaDati();
    };

    const renderRowData = (r) => {
        const qta = parseFloat(r.quantita) || 0;
        const unit = parseFloat(r.prezzo_unitario) || 0;
        const imp = parseFloat(r.prezzo) || (qta * unit); 
        const ivaPerc = parseFloat(r.iva) || 0;
        const ivaVal = imp * (ivaPerc / 100);
        return { imp: imp.toFixed(2), ivaVal: ivaVal.toFixed(2), totIvato: (imp + ivaVal).toFixed(2) };
    };

const movimentiFiltrati = datiSicuri.filter(r => (r.prodotto + r.fornitore + (r.note||"") + r.data_ricezione).toLowerCase().includes(filtro.toLowerCase()));    
    const totaleVista = movimentiFiltrati.reduce((acc, r) => {
        const d = renderRowData(r);
        return { imp: acc.imp + parseFloat(d.imp), iva: acc.iva + parseFloat(d.ivaVal), tot: acc.tot + parseFloat(d.totIvato) };
    }, { imp: 0, iva: 0, tot: 0 });

    return (
        <div style={{background:'white', padding:25, borderRadius:15, boxShadow:'0 4px 10px rgba(0,0,0,0.05)', marginTop:20}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                <h3>📦 Storico</h3>
                <div style={{display:'flex', gap:10}}>
                     <button onClick={openDownloadModal} style={{background:'#e67e22', color:'white', border:'none', padding:'8px 15px', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>⬇ Report</button>
                     <input type="text" placeholder="Cerca..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{padding:8, borderRadius:5, border:'1px solid #ddd'}} />
                </div>
            </div>
            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                        <tr style={{background:'#f0f0f0', textAlign:'left', color:'#333', borderBottom:'2px solid #ddd'}}>
                            <th style={{padding:10}}>Data</th>
                            <th style={{padding:10}}>Fornitore</th>
                            <th style={{padding:10}}>Prodotto</th>
                            <th style={{padding:10}}>Qta</th>
                            <th style={{padding:10}}>UdM</th>
                            <th style={{padding:10}}>Unit.</th>
                            <th style={{padding:10}}>Tot. Imp.</th>
                            <th style={{padding:10}}>IVA %</th>
                            <th style={{padding:10}}>Tot. IVA</th>
                            <th style={{padding:10}}>Tot. Ivato</th>
                            <th style={{padding:10}}>Doc</th>
                            <th style={{padding:10}}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimentiFiltrati.slice(0, 100).map((r, i) => {
                            const calcs = renderRowData(r);
                            return (
                                <tr key={i} style={{borderBottom:'1px solid #f1f1f1'}}>
                                    <td style={{padding:10}}>{formatTimeDate(r.data_ricezione, r.ora)}</td>
                                    <td style={{padding:10}}>{r.fornitore}</td>
                                    <td style={{padding:10, fontWeight:'bold'}}>{r.prodotto}</td>
                                    <td style={{padding:10}}>{r.quantita}</td>
                                    <td style={{padding:10, fontWeight:'bold', color:'#34495e'}}>{r.unita_misura || 'Pz'}</td>
                                    <td style={{padding:10}}>€ {r.prezzo_unitario || '-'}</td>
                                    <td style={{padding:10}}>€ {calcs.imp}</td>
                                    <td style={{padding:10}}>{r.iva ? r.iva + '%' : '-'}</td>
                                    <td style={{padding:10, color:'#e67e22'}}>€ {calcs.ivaVal}</td>
                                    <td style={{padding:10, fontWeight:'bold', color:'#27ae60'}}>€ {calcs.totIvato}</td>
                                    <td style={{padding:10}}>
                                    {r.allegato_url && <button onClick={() => handleFileAction(r.allegato_url, `Doc_${r.data_ricezione}`)} style={{background:'#3498db', color:'white', border:'none', borderRadius:3, padding:'2px 6px', cursor:'pointer'}}>📎</button>}
                                    </td>
                                    <td style={{padding:10, display:'flex', gap:5}}>
                                        <button onClick={()=>avviaModifica(r)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Modifica">✏️</button>
                                        <button onClick={()=>eliminaMerce(r.id)} style={{border:'none', background:'none', cursor:'pointer', fontSize:18}} title="Elimina">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot style={{background:'#2c3e50', color:'white', fontWeight:'bold'}}>
                        <tr>
                            <td colSpan={6} style={{padding:15, textAlign:'right'}}>TOTALE:</td>
                            <td style={{padding:15}}>€ {totaleVista.imp.toFixed(2)}</td>
                            <td></td>
                            <td style={{padding:15}}>€ {totaleVista.iva.toFixed(2)}</td>
                            <td style={{padding:15, color:'#2ecc71'}}>€ {totaleVista.tot.toFixed(2)}</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default MagazzinoList;