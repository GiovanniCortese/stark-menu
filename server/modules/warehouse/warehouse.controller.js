// server/modules/warehouse/warehouse.controller.js
const pool = require('../../config/db');
const { analyzeImageWithGemini } = require('../../utils/ai');

// --- HELPER: CALCOLO PREZZO MEDIO PONDERATO (PMP) ---
// Questa logica era in magazzinoUtils.js, ora è qui nel suo modulo.
async function gestisciMovimentoStock(client, data) {
    const { ristorante_id, prodotto, quantita, prezzo_unitario, iva, fornitore, unita_misura, lotto, data_bolla, numero_bolla, codice_articolo, sconto } = data;
    
    const qta = parseFloat(quantita) || 0;
    const przUnit = parseFloat(prezzo_unitario) || 0;
    const aliIva = parseFloat(iva) || 0;
    const sc = parseFloat(sconto) || 0;

    // Calcoli
    const prezzoNettoUnitario = przUnit * (1 - (sc / 100));
    const totaleNetto = qta * prezzoNettoUnitario;
    const totaleIva = totaleNetto * (aliIva / 100);
    const totaleLordo = totaleNetto + totaleIva;

    // Cerca prodotto esistente (Case Insensitive)
    const check = await client.query(
        `SELECT id, giacenza, prezzo_medio FROM magazzino_prodotti WHERE ristorante_id = $1 AND LOWER(nome) = LOWER($2)`,
        [ristorante_id, prodotto.trim()]
    );

    if (check.rows.length > 0) {
        // UPDATE (Ricalcolo PMP)
        const item = check.rows[0];
        const oldGiacenza = parseFloat(item.giacenza) || 0;
        const oldPrezzoMedio = parseFloat(item.prezzo_medio) || 0;
        
        const valoreMagazzinoAttuale = oldGiacenza * oldPrezzoMedio;
        const newTotalePezzi = oldGiacenza + qta;
        
        let newPrezzoMedio = oldPrezzoMedio;
        if (newTotalePezzi > 0) {
            newPrezzoMedio = (valoreMagazzinoAttuale + totaleNetto) / newTotalePezzi;
        }

        await client.query(
            `UPDATE magazzino_prodotti SET 
             giacenza = giacenza + $1, prezzo_medio = $2, prezzo_ultimo = $3,
             valore_totale_netto = $4, valore_totale_iva = $5, valore_totale_lordo = $6,
             sconto = $7, aliquota_iva = $8, codice_articolo = $9, 
             data_bolla = $10, numero_bolla = $11, lotto = $12, updated_at = NOW()
             WHERE id = $13`,
            [qta, newPrezzoMedio, prezzoNettoUnitario, totaleNetto, totaleIva, totaleLordo, sc, aliIva, codice_articolo, data_bolla, numero_bolla, lotto, item.id]
        );
    } else {
        // INSERT NUOVO
        await client.query(
            `INSERT INTO magazzino_prodotti 
            (ristorante_id, nome, marca, unita_misura, giacenza, scorta_minima, 
             prezzo_ultimo, prezzo_medio, prezzo_unitario_netto,
             valore_totale_netto, valore_totale_iva, valore_totale_lordo,
             aliquota_iva, codice_articolo, sconto,
             data_bolla, numero_bolla, lotto)
            VALUES ($1, $2, $3, $4, $5, 5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [ristorante_id, prodotto.trim(), fornitore, unita_misura || 'Pz', qta, prezzoNettoUnitario, prezzoNettoUnitario, prezzoNettoUnitario, totaleNetto, totaleIva, totaleLordo, aliIva, codice_articolo, sc, data_bolla, numero_bolla, lotto]
        );
    }
}

// --- CONTROLLERS ---

// 1. LEGGI MAGAZZINO (Stock Attuale)
exports.getStock = async (req, res) => {
    try {
        const query = `
            SELECT * FROM magazzino_prodotti 
            WHERE ristorante_id = $1 ORDER BY nome ASC
        `;
        const r = await pool.query(query, [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2. MODIFICA MANUALE STOCK (Inventario)
exports.updateStockManual = async (req, res) => {
    try {
        const { id } = req.params;
        const { giacenza, prezzo_unitario_netto, aliquota_iva, scorta_minima } = req.body;
        
        // Calcolo totali base
        const qta = parseFloat(giacenza) || 0;
        const unit = parseFloat(prezzo_unitario_netto) || 0;
        const iva = parseFloat(aliquota_iva) || 0;
        const totNetto = qta * unit;
        const totIva = totNetto * (iva/100);

        await pool.query(
            `UPDATE magazzino_prodotti SET 
             giacenza=$1, prezzo_unitario_netto=$2, aliquota_iva=$3, scorta_minima=$4,
             valore_totale_netto=$5, valore_totale_iva=$6, valore_totale_lordo=$7,
             updated_at=NOW() WHERE id=$8`,
            [qta, unit, iva, scorta_minima, totNetto, totIva, totNetto+totIva, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. AI SCAN BOLLA (Gemini Vision)
exports.scanInvoice = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessuna foto caricata" });

        const prompt = `
            Analizza questa foto di una bolla/fattura italiana.
            Estrai i dati in JSON rigoroso:
            {
                "fornitore": "nome azienda",
                "numero_bolla": "numero documento",
                "data_documento": "YYYY-MM-DD",
                "prodotti": [
                    {
                        "nome": "descrizione prodotto",
                        "quantita": numero (es. 10.5),
                        "unita_misura": "kg/pz/lt",
                        "prezzo_unitario": numero (prezzo singolo netto),
                        "iva": numero (es. 10 o 22),
                        "sconto": numero (es. 0 se assente),
                        "lotto": "codice lotto se visibile",
                        "scadenza": "YYYY-MM-DD se visibile"
                    }
                ]
            }
            Se un campo non è leggibile, metti null o stringa vuota. Non inventare dati.
        `;

        const datiAI = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);
        
        // Rispondiamo al frontend che metterà i dati in STAGING (Tabella temporanea o Stato React)
        res.json({ success: true, data: datiAI });

    } catch (e) {
        console.error("AI Error:", e);
        res.status(500).json({ error: "Errore scansione AI: " + e.message });
    }
};

// 4. IMPORTAZIONE DEFINITIVA (Staging -> Stock + Storico HACCP)
exports.confirmRestock = async (req, res) => {
    const client = await pool.connect();
    try {
        // rows è l'array di prodotti confermati dal frontend (Staging Area)
        const { ristorante_id, rows, header } = req.body; 

        await client.query('BEGIN');

        for (const row of rows) {
            // A. Salva nel registro HACCP (Tracciabilità)
            await client.query(
                `INSERT INTO haccp_merci 
                (ristorante_id, data_arrivo, fornitore, numero_bolla, data_documento, prodotto, quantita, unita_misura, prezzo_unitario, lotto, scadenza, allegato_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    ristorante_id, 
                    header.data_ricezione, // Data inserimento
                    header.fornitore, 
                    header.riferimento_documento, // Numero bolla
                    header.data_documento, // Data fattura
                    row.nome, 
                    row.quantita, 
                    row.unita_misura, 
                    row.prezzo_unitario, 
                    row.lotto, 
                    row.scadenza || null,
                    header.allegato_url || null
                ]
            );

            // B. Aggiorna lo Stock (Magazzino Reale) con PMP
            // Prepariamo l'oggetto dati per la funzione helper
            const stockData = {
                ristorante_id,
                prodotto: row.nome,
                quantita: row.quantita,
                prezzo_unitario: row.prezzo_unitario,
                iva: row.iva,
                sconto: row.sconto,
                fornitore: header.fornitore,
                unita_misura: row.unita_misura,
                lotto: row.lotto,
                data_bolla: header.data_documento,
                numero_bolla: header.riferimento_documento,
                codice_articolo: row.codice_articolo
            };

            await gestisciMovimentoStock(client, stockData);
        }

        await client.query('COMMIT');
        res.json({ success: true });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "Errore importazione: " + e.message });
    } finally {
        client.release();
    }
};

// 5. STORICO MERCI IN ARRIVO (Registro HACCP)
exports.getIncomingGoods = async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT * FROM haccp_merci WHERE ristorante_id = $1 ORDER BY data_arrivo DESC LIMIT 200", 
            [req.params.ristorante_id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Cancellazione riga storico (con rollback stock opzionale - per ora semplice delete)
exports.deleteIncomingLog = async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_merci WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};