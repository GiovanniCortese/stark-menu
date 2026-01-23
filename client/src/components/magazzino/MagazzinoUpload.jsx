import React, { useState } from 'react';

const MagazzinoUpload = ({ API_URL, onDataLoaded }) => {
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Gestione Drag & Drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('photo', file); // 'photo' è il nome campo atteso da multer nel backend

        try {
            // Chiamiamo la rotta AI esistente (Scan Bolla)
            const res = await fetch(`${API_URL}/api/haccp/scan-bolla`, {
                method: 'POST',
                body: formData
            });
            const responseJson = await res.json();

            if (responseJson.success) {
                // L'AI restituisce { data: { prodotti: [...] } }
                // Passiamo i dati al manager senza salvare
                if (responseJson.data && responseJson.data.prodotti) {
                    onDataLoaded(responseJson.data.prodotti);
                } else {
                    alert("L'AI non ha trovato prodotti leggibili.");
                }
            } else {
                alert("Errore analisi file: " + responseJson.error);
            }
        } catch (error) {
            console.error(error);
            alert("Errore caricamento file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag} 
            onDrop={handleDrop}
            style={{
                background: 'white', padding: '40px', borderRadius: '15px',
                border: dragActive ? '3px dashed #3498db' : '2px dashed #ccc',
                textAlign: 'center', transition: 'all 0.3s',
                minHeight: '300px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center'
            }}
        >
            {loading ? (
                <div>
                    <div style={{fontSize: '3rem'}}>🤖</div>
                    <h3>Analisi Documento in corso...</h3>
                    <p>Sto leggendo la fattura con l'AI, attendi un attimo.</p>
                </div>
            ) : (
                <>
                    <div style={{fontSize: '4rem', marginBottom: '20px'}}>📄</div>
                    <h2 style={{color: '#2c3e50'}}>Trascina qui la Fattura o Bolla</h2>
                    <p style={{color: '#7f8c8d'}}>Supporta PDF e Immagini (Foto smartphone)</p>
                    
                    <label style={{
                        marginTop: '20px', padding: '12px 30px', 
                        background: '#3498db', color: 'white', 
                        borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold'
                    }}>
                        SELEZIONA FILE
                        <input type="file" onChange={handleChange} style={{display: 'none'}} accept="image/*,application/pdf" />
                    </label>
                </>
            )}
        </div>
    );
};

export default MagazzinoUpload;