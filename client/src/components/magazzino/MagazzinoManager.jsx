import React, { useState, useEffect } from 'react';
import MagazzinoUpload from './MagazzinoUpload';
import MagazzinoStaging from './MagazzinoStaging';
import MagazzinoList from './MagazzinoList';

const MagazzinoManager = ({ ristoranteId, API_URL }) => {
    // Stati
    const [view, setView] = useState('list'); // 'list', 'upload', 'staging'
    const [stagingData, setStagingData] = useState([]); // Dati letti dall'AI/Excel in attesa di conferma
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Per ricaricare la lista

    // Funzione chiamata quando l'Upload (AI o Excel) ha finito di leggere i dati
    const handleDataLoaded = (data) => {
        // Normalizziamo i dati per assicurarci che abbiano i campi giusti
        const normalized = data.map((item, index) => ({
            tempId: Date.now() + index, // ID temporaneo per l'editing
            prodotto: item.nome || item.prodotto || '',
            quantita: item.quantita || 1,
            unita_misura: item.unita_misura || 'pz',
            prezzo: item.prezzo || 0,
            scadenza: item.scadenza || '',
            lotto: item.lotto || '',
            fornitore: item.fornitore || 'Generico'
        }));

        setStagingData(normalized);
        setView('staging'); // Passiamo alla vista di revisione
    };

    // Funzione chiamata quando l'utente conferma i dati in staging
    const handleConfirmStaging = async (prodottiConfermati) => {
        try {
            // Prepariamo il payload per l'import massivo esistente nel backend
            const payload = {
                merci: prodottiConfermati.map(p => ({
                    ...p,
                    ristorante_id: ristoranteId,
                    data_ricezione: new Date().toISOString().split('T')[0],
                    ora: new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}),
                    is_haccp: true // Di default lo mettiamo in HACCP, poi vedremo
                }))
            };

            const res = await fetch(`${API_URL}/api/haccp/merci/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ Merce caricata con successo!");
                setStagingData([]);
                setView('list');
                setRefreshTrigger(prev => prev + 1); // Ricarica la lista
            } else {
                alert("Errore nel salvataggio.");
            }
        } catch (error) {
            console.error("Errore save:", error);
            alert("Errore di connessione.");
        }
    };

    return (
        <div style={{ padding: '20px', background: '#ecf0f1', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0, color: '#2c3e50' }}>📦 Magazzino & Acquisti</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {view !== 'list' && (
                        <button onClick={() => setView('list')} style={{ padding: '10px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            ⬅ Torna alla Lista
                        </button>
                    )}
                    {view === 'list' && (
                        <button onClick={() => setView('upload')} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ➕ CARICA FATTURA / BOLLA
                        </button>
                    )}
                </div>
            </div>

            {/* VISTE */}
            {view === 'list' && (
                <MagazzinoList ristoranteId={ristoranteId} API_URL={API_URL} refreshTrigger={refreshTrigger} />
            )}

            {view === 'upload' && (
                <MagazzinoUpload API_URL={API_URL} onDataLoaded={handleDataLoaded} />
            )}

            {view === 'staging' && (
                <MagazzinoStaging 
                    initialData={stagingData} 
                    onConfirm={handleConfirmStaging} 
                    onCancel={() => setView('list')} 
                />
            )}
        </div>
    );
};

export default MagazzinoManager;