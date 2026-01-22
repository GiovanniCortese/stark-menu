// PERCORSO: server/utils/ai.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* CONFIGURAZIONE MODELLI 2026
   Basata sui log aggiornati:
   - gemini-1.5-pro è deprecato/rinominato.
   - Il nuovo standard è "gemini-3-pro-preview" o "gemini-2.0-pro-exp".
*/
const MODELS_TO_TRY = [
    "gemini-3-pro-preview",    // <--- IL NUOVO STANDARD (dal tuo log)
    "gemini-2.0-pro-exp",      // <--- FALLBACK STABILE
    "gemini-1.5-pro-latest",   // Tentativo legacy
    "gemini-pro"               // Ultima spiaggia (modello base sempre attivo)
];

async function analyzeImageWithGemini(buffer, mimeType, promptText) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Manca GEMINI_API_KEY nel file .env");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let lastError = null;

    // TENTA I MODELLI UNO PER UNO
    for (const modelName of MODELS_TO_TRY) {
        try {
            // console.log(`Tentativo con modello: ${modelName}`); // Debug
            
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
            // Se il modello non esiste (404) o è sovraccarico, passa al prossimo
            console.warn(`⚠️ Modello ${modelName} fallito (${e.message}). Provo il prossimo...`);
            lastError = e;
            continue; 
        }
    }

    // Se arrivi qui, tutti i modelli hanno fallito.
    throw new Error(`Tutti i modelli AI hanno restituito errore. Ultimo tentativo: ${lastError?.message}`);
}

module.exports = { analyzeImageWithGemini };