// server/server.js - VERSIONE JARVIS V38 (AI DIRECT INTEGRATION) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // <--- Importiamo Multer qui
const OpenAI = require('openai'); // <--- Importiamo OpenAI qui

const app = express();
const port = process.env.PORT || 3000;

// --- 0. CONFIGURAZIONE AI & UPLOAD (DIRETTA) ---
const storage = multer.memoryStorage();
const uploadAI = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limite 10MB per sicurezza
});

// --- 1. DIAGNOSTICA AVVIO ---
console.log("------------------------------------------------");
console.log("🚀 JARVIS SERVER V38 (AI DIRECT) IN AVVIO...");
if (process.env.OPENAI_API_KEY) {
    console.log(`🔑 STATO OPENAI: Chiave trovata! (${process.env.OPENAI_API_KEY.substring(0, 7)}...)`);
} else {
    console.error("❌ STATO OPENAI: CHIAVE MANCANTE! Verifica le variabili su Render.");
}
console.log("------------------------------------------------");

// --- 2. LOGGER DI PRIMO LIVELLO ---
app.use((req, res, next) => {
    // Logghiamo tutto per vedere se la richiesta arriva
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] INGRESSO: ${req.method} ${req.url}`);
    next();
});

// --- 3. CONFIGURAZIONE CORS ---
const allowedOrigins = [
    'https://www.cosaedovemangiare.com',
    'https://cosaedovemangiare.com',
    'https://www.cosaedovemangiare.it',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({ 
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`🚫 CORS BLOCCATO: Origine non valida -> ${origin}`);
            callback(new Error('Accesso negato dalla policy CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
}));

// --- 4. ROTTA SPECIALE AI (DEFINITA QUI PER SICUREZZA) ---
// La mettiamo PRIMA di tutte le altre rotte per evitare conflitti o errori 405
app.post('/api/haccp/scan-bolla', uploadAI.single('photo'), async (req, res) => {
    try {
        console.log("🤖 AI SCAN: Richiesta ricevuta nel Core Server!");

        if (!req.file) {
            console.error("❌ AI SCAN: Nessun file arrivato.");
            return res.status(400).json({ error: "Nessuna foto inviata" });
        }
        
        console.log(`📸 AI SCAN: File in RAM (${req.file.size} bytes). Invio a OpenAI...`);

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: "Server Error: Manca API Key" });
        }

        const base64Image = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Sei un assistente data-entry. Estrai i dati dalla bolla in JSON rigoroso: { "fornitore": "...", "data_ricezione": "YYYY-MM-DD", "prodotti": [{ "nome": "...", "quantita": "...", "lotto": "...", "scadenza": "YYYY-MM-DD" }] }`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Estrai dati." },
                        { type: "image_url", image_url: { url: dataUrl, detail: "low" } }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0
        });

        console.log("✅ AI SCAN: Risposta ricevuta da OpenAI!");
        let text = response.choices[0].message.content;
        // Pulizia JSON markdown se presente
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const data = JSON.parse(text);
        res.json({ success: true, data });

    } catch (e) {
        console.error("🔥 ERRORE CRITICO AI:", e);
        res.status(500).json({ error: "Errore interno: " + e.message });
    }
});
// ---------------------------------------------------------

// --- 5. SETUP STANDARD EXPRESS ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 6. IMPORT ROTTE CLASSICHE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 7. ROUTE DI VERIFICA ---
app.get('/', (req, res) => res.redirect('https://www.cosaedovemangiare.it'));

// --- AVVIO SERVER ---
app.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V38 ONLINE su porta ${port}`);
});

module.exports = app;