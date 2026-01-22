// PERCORSO: server/utils/ai.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

/* CONFIGURAZIONE PRIORITÀ MODELLI
   Il sistema proverà questi modelli in ordine sequenziale.
   
   STRATEGIA ATTUALE (TEST): 
   1. Prova PRO (Massima qualità).
   2. Se fallisce (es. limiti superati), usa FLASH (Alta velocità/Limiti alti).
   
   NOTA PER IL FUTURO: Quando vorrai "Solo Pro", basterà rimuovere i modelli Flash da questa lista.
*/
const MODELS_TO_TRY = [
    // --- LIVELLO 1: QUALITÀ MASSIMA (PRO) ---
    "gemini-1.5-pro",         // Versione stabile Pro
    "gemini-1.5-pro-latest",  // Versione Pro più recente
    
    // --- LIVELLO 2: SALVAGENTE (FLASH - Usato se Pro fallisce/supera limiti) ---
    "gemini-3-flash-preview", // Modello 2026 (dal tuo log)
    "gemini-1.5-flash",       // Flash standard stabile
    "gemini-1.5-flash-002"    // Flash versione specifica
];

async function analyzeImageWithGemini(buffer, mimeType, promptText) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Manca GEMINI_API_KEY nel file .env");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let lastError = null;

    // CICLO DI TENTATIVI (FALLBACK)
    for (const modelName of MODELS_TO_TRY) {
        try {
            // Decommenta per vedere nei log quale modello sta usando
            // console.log(`🤖 Tentativo AI con modello: ${modelName}...`);
            
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
            
            // Se arriviamo qui, il modello ha funzionato! Restituiamo i dati.
            return JSON.parse(responseText);

        } catch (e) {
            // Analisi errore per capire se riprovare
            const isRateLimit = e.message.includes("429") || e.message.includes("Too Many Requests") || e.message.includes("quota");
            const isNotFound = e.message.includes("404") || e.message.includes("not found");
            const isOverloaded = e.message.includes("503") || e.message.includes("overloaded");

            if (isRateLimit || isNotFound || isOverloaded) {
                console.warn(`⚠️ Modello ${modelName} non disponibile (Err: ${isRateLimit ? 'Rate Limit' : 'Errore'}). Passo al prossimo...`);
                lastError = e;
                continue; // Passa al prossimo modello nella lista
            }
            
            // Se è un errore grave (es. chiave API non valida), fermati subito.
            throw e; 
        }
    }

    throw new Error(`Tutti i modelli AI hanno fallito. Ultimo errore: ${lastError?.message}`);
}

module.exports = { analyzeImageWithGemini };