const fs = require('fs');
const path = require('path');

// CONFIGURAZIONE
const API_URL = 'https://stark-backend-gg17.onrender.com/api/haccp/scan-bolla';
const TEST_IMAGE_PATH = './test-invoice.jpg'; // Metti qui un'immagine di prova di una bolla

async function testBollaScanning() {
    console.log("🚀 Avvio Test Scansione AI...");

    // 1. Verifica esistenza immagine di test
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
        console.error(`❌ Errore: Immagine di test non trovata in ${TEST_IMAGE_PATH}`);
        console.log("Per favore inserisci un'immagine chiamata 'test-invoice.jpg' in questa cartella.");
        return;
    }

    // 2. Prepara il Form Data (Simula l'upload del Frontend)
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    // Nota: in Node.js puro Blob potrebbe richiedere Node 18+ o polyfill, 
    // ma qui simuliamo la struttura che fetch si aspetta.
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('photo', blob, 'test-invoice.jpg');

    try {
        console.log(`📡 Invio richiesta a ${API_URL}...`);
        const startTime = Date.now();

        // 3. Esegui la richiesta
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const endTime = Date.now();
        console.log(`⏱️ Tempo di risposta: ${(endTime - startTime) / 1000}s`);

        // 4. Gestione Risposta
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Errore Server (${response.status}): ${errorText}`);
        }

        const json = await response.json();
        
        console.log("\n✅ SUCCESSO! Il Server ha risposto:");
        console.log("---------------------------------------------------");
        console.log(JSON.stringify(json, null, 2));
        console.log("---------------------------------------------------");

        // 5. Validazione Logica
        if (json.success && json.data) {
            console.log("\n🔍 Validazione Dati:");
            console.log(`   - Fornitore: ${json.data.fornitore || 'MANCANTE ❌'}`);
            console.log(`   - Data: ${json.data.data_ricezione || 'MANCANTE ❌'}`);
            console.log(`   - Prodotti Trovati: ${json.data.prodotti ? json.data.prodotti.length : 0}`);
        } else {
            console.warn("⚠️ Risposta valida ma estrazione dati fallita.");
        }

    } catch (error) {
        console.error("\n🔥 TEST FALLITO:");
        console.error(error.message);
    }
}

testBollaScanning();