// server/utils/whatsappClient.js

/**
 * ⚡️ VERSIONE LIGHT (NO CRASH)
 * Abbiamo rimosso whatsapp-web.js per evitare il crash su Render.
 * Questa funzione simula l'invio senza caricare Puppeteer.
 */

const sendWA = async (numero, messaggio) => {
    console.log("-----------------------------------------");
    console.log(`📡 [MOCK WA] Destinatario: ${numero}`);
    console.log(`💬 Messaggio: ${messaggio}`);
    console.log("⚠️ Sistema in attesa di migrazione a Meta API ufficiale.");
    console.log("-----------------------------------------");
    
    return { success: true, status: 'mock_sent' };
};

// Esportiamo solo la funzione. 
// NON chiamare mai client.initialize() qui dentro!
module.exports = { sendWA };