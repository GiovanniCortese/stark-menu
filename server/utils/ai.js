// PERCORSO: server/utils/ai.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* CONFIGURAZIONE MODELLI: SOLO PRO
   Dato che hai attivato la fatturazione, usiamo SOLO i modelli PRO
   per garantire la massima precisione sui PDF complessi.
*/
const MODELS_TO_TRY = [
    "gemini-1.5-pro",         // Versione stabile Pro
    "gemini-1.5-pro-latest",  // Versione più recente
    "gemini-1.5-pro-002"      // Versione specifica (molto stabile)
];

async function analyzeImageWithGemini(buffer, mimeType, promptText) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Manca GEMINI_API_KEY nel file .env");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let lastError = null;

    // TENTA I MODELLI PRO UNO PER UNO
    for (const modelName of MODELS_TO_TRY) {
        try {
            // console.log(`🤖 Analisi in corso con: ${modelName}...`);
            
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });

            const imagePart = {
                inlineData: {
                    data: buffer.toString("base64"),
                    mimeType: mimeType
                }
            };

            const result = await model.generateContent([promptText, imagePart]);
            const responseText = result.response.text();
            
            return JSON.parse(responseText);

        } catch (e) {
            // Se fallisce, logga e prova la prossima versione PRO
            console.warn(`⚠️ Errore con ${modelName}: ${e.message}. Riprovo con variante...`);
            lastError = e;
            continue; 
        }
    }

    throw new Error(`Analisi fallita. Assicurati che la chiave API sia attiva e con fatturazione abilitata. Errore: ${lastError?.message}`);
}

module.exports = { analyzeImageWithGemini };