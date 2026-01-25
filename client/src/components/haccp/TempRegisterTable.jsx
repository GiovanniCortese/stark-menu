import React from 'react';

const TempRegisterTable = ({ assets, logs, currentDate, setCurrentDate, onEditLog, openDownloadModal }) => {
    
    // 1. Genera i giorni del mese corrente
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => {
            const d = new Date(year, month, i + 1);
            // Fix fuso orario per confronto stringhe
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); 
            return d.toISOString().split('T')[0];
        });
    };

    const days = getDaysInMonth(currentDate);

    // 2. Filtra solo gli asset di tipo "macchina" (no aree pulizia)
    const activeAssets = assets.filter(a => ['frigo', 'cella', 'vetrina', 'congelatore', 'abbattitore'].includes(a.tipo));

    // 3. Helper per trovare il log di una cella specifica
    const findLog = (dateStr, assetId) => {
        return logs.find(l => {
            // Confronto sicuro delle date (YYYY-MM-DD)
            const logDate = l.data_ora.split('T')[0]; 
            return logDate === dateStr && l.asset_id === assetId;
        });
    };

    // 4. Cambio Mese
    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    return (
        <div className="temp-register-container" style={{ background: 'white', padding: 20, borderRadius: 10, marginTop: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            
            {/* INTESTAZIONE E CONTROLLI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap:'wrap', gap:10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: '#eee', borderRadius: 5, cursor: 'pointer', padding: '5px 10px', fontWeight:'bold' }}>◀</button>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', minWidth: 180, textAlign: 'center', color:'#2c3e50' }}>
                        {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => changeMonth(1)} style={{ border: 'none', background: '#eee', borderRadius: 5, cursor: 'pointer', padding: '5px 10px', fontWeight:'bold' }}>▶</button>
                </div>
                
                <button onClick={() => openDownloadModal('temperature_matrix')} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' }}>
                    ⬇ Scarica Registro Mensile
                </button>
            </div>

            {/* TABELLA MATRICE SCORREVOLE */}
            <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#34495e', color: 'white' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'center', position: 'sticky', left: 0, background: '#34495e', zIndex: 2, width: 60, borderRight:'1px solid #555' }}>GIORNO</th>
                            {activeAssets.map(asset => (
                                <th key={asset.id} style={{ padding: '10px 5px', borderLeft: '1px solid #46627f', minWidth: 100, textAlign: 'center' }}>
                                    {asset.nome}
                                    <div style={{ fontSize: 9, fontWeight: 'normal', opacity: 0.8, marginTop:2 }}>
                                        ({asset.range_min}° / {asset.range_max}°)
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(dayStr => {
                            const dateObj = new Date(dayStr);
                            const isToday = dayStr === new Date().toISOString().split('T')[0];
                            const giornoNum = dateObj.getDate();
                            const giornoSettimana = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
                            const isWeekend = giornoSettimana === 'dom' || giornoSettimana === 'sab';

                            return (
                                <tr key={dayStr} style={{ borderBottom: '1px solid #eee', background: isToday ? '#e8f8f5' : (isWeekend ? '#f9f9f9' : 'white') }}>
                                    
                                    {/* COLONNA DATA (STICKY) */}
                                    <td style={{ 
                                        padding: '8px 5px', fontWeight: 'bold', color: '#555', textAlign:'center',
                                        position: 'sticky', left: 0, 
                                        background: isToday ? '#e8f8f5' : (isWeekend ? '#f9f9f9' : 'white'), 
                                        borderRight: '2px solid #ddd', zIndex:1
                                    }}>
                                        <div style={{fontSize:14}}>{giornoNum}</div>
                                        <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#999' }}>{giornoSettimana}</div>
                                    </td>

                                    {/* COLONNE FRIGORIFERI */}
                                    {activeAssets.map(asset => {
                                        const log = findLog(dayStr, asset.id);
                                        return (
                                            <td key={asset.id} style={{ padding: 5, textAlign: 'center', borderLeft: '1px solid #eee' }}>
                                                {log ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ 
                                                            fontWeight: 'bold', 
                                                            color: log.conformita ? '#27ae60' : '#c0392b',
                                                            fontSize: 14 
                                                        }}>
                                                            {log.valore === 'OFF' ? 'OFF' : `${log.valore}°`}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop:2 }}>
                                                            {log.operatore && <span style={{ fontSize: 9, color: '#7f8c8d' }}>{log.operatore.substring(0, 8)}</span>}
                                                            <button 
                                                                onClick={() => onEditLog(asset, dayStr, log)} 
                                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 0 }} 
                                                                title="Modifica"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => onEditLog(asset, dayStr, null)} 
                                                        style={{ 
                                                            border: '1px dashed #ccc', background: 'transparent', 
                                                            color: '#ccc', borderRadius: 4, width: '100%', padding: '5px',
                                                            cursor: 'pointer', fontSize: 10
                                                        }}
                                                        title="Inserisci dato mancante"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TempRegisterTable;