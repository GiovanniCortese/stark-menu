// PERCORSO: server/utils/ai.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* CONFIGURAZIONE MODELLI
   Lasciamo gemini-3-pro-preview come PRIMA SCELTA assoluta.
*/
const MODELS_TO_TRY = [
    "gemini-3-pro-preview",    // <--- IL TUO PREFERITO (Funziona benissimo)
    "gemini-2.0-pro-exp",      // Fallback
    "gemini-1.5-pro",
    "gemini-pro"
];

// Funzione Helper interna per provare i modelli in cascata
async function tryGeminiModels(api_key, promptParts, jsonMode = true) {
    if (!api_key) throw new Error("Manca GEMINI_API_KEY nel file .env");
    
    const genAI = new GoogleGenerativeAI(api_key);
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            const config = jsonMode ? { responseMimeType: "application/json" } : {};
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: config
            });

            const result = await model.generateContent(promptParts);
            const responseText = result.response.text();
            
            // Se jsonMode è attivo, parsiamo qui per essere sicuri che sia valido
            return jsonMode ? JSON.parse(responseText) : responseText;

        } catch (e) {
            console.warn(`⚠️ Modello ${modelName} fallito (${e.message}). Provo il prossimo...`);
            lastError = e;
            continue; 
        }
    }
    throw new Error(`Tutti i modelli AI hanno fallito. Ultimo errore: ${lastError?.message}`);
}

// 1. Analisi Immagini (Menu cartacei, Bolle)
async function analyzeImageWithGemini(buffer, mimeType, promptText) {
    const imagePart = {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType: mimeType
        }
    };
    return await tryGeminiModels(process.env.GEMINI_API_KEY, [promptText, imagePart], true);
}

// 2. Generazione Testo (Per TRADUZIONI Menu) - NUOVA FUNZIONE
async function generateTextWithGemini(promptText) {
    return await tryGeminiModels(process.env.GEMINI_API_KEY, [promptText], true);
}

module.exports = { analyzeImageWithGemini, generateTextWithGemini };