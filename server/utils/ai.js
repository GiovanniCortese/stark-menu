// PERCORSO FILE: server/utils/ai.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// LISTA INTELLIGENTE: Se il primo fallisce, prova il secondo, ecc.
const MODELS_TO_TRY = [
    "gemini-3-flash-preview", // Modello 2026 (quello nuovo)
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",       
    "gemini-1.5-flash-002",
    "gemini-pro"
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
            
            // Se arriviamo qui, ha funzionato!
            return JSON.parse(responseText);

        } catch (e) {
            // Se è un errore 404 (modello non trovato) proviamo il prossimo
            if (e.message.includes("404") || e.message.includes("not found")) {
                console.warn(`⚠️ Modello ${modelName} non disponibile. Provo il prossimo...`);
                lastError = e;
                continue; 
            }
            throw e; // Altri errori (es. chiave scaduta) fermano tutto
        }
    }

    throw new Error(`Tutti i modelli AI hanno fallito. Ultimo errore: ${lastError?.message}`);
}

module.exports = { analyzeImageWithGemini };