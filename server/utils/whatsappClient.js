const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inizializzazione del client con salvataggio sessione
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    // Questo QR apparirà nei log del tuo terminale (o di Render)
    console.log('📱 SCANSIONA IL QR CODE PER CONNETTERE WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp JARVIS è pronto a inviare messaggi!');
});

client.initialize();

/**
 * Invia un messaggio WhatsApp
 * @param {string} numero - Formato: 393471234567
 * @param {string} messaggio 
 */
const sendWA = async (numero, messaggio) => {
    try {
        const cleanNumber = numero.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('39') ? cleanNumber : `39${cleanNumber}`;
        const chatId = `${finalNumber}@c.us`;
        await client.sendMessage(chatId, messaggio);
        return { success: true };
    } catch (error) {
        console.error("❌ Errore WhatsApp:", error);
        return { success: false, error };
    }
};

module.exports = { sendWA };