// server/controllers/haccp/merciController.js

const pool = require('../../config/db');
const { analyzeImageWithGemini } = require('../../utils/ai');
const { gestisciMagazzino } = require('../../utils/magazzinoUtils');

// Helper data
function normalizzaData(dataStr) {
    if (!dataStr) return new Date().toISOString().split('T')[0];
    try {
        const clean = String(dataStr).replace(/[^0-9\/\-\.]/g, '');
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
        let parts = clean.split(/[\/\-\.]/);
        if (parts.length === 3) {
            if (parts[2].length === 2) parts[2] = "20" + parts[2];
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
}

exports.getMerci = async (req, res) => {
    try {
        const { start, end } = req.query;
        let sql = `
            SELECT *,
            to_char(data_documento, 'YYYY-MM-DD') as data_documento_iso,
            to_char(data_ricezione, 'YYYY-MM-DD') as data_ricezione_iso,
            to_char(data_documento, 'DD/MM/YYYY') as data_doc_fmt,
            to_char(data_inserimento, 'DD/MM/YYYY HH24:MI') as data_ins_fmt
            FROM haccp_merci
            WHERE ristorante_id = $1
        `;
        const params = [req.params.ristorante_id];

        if (start && end) {
            sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`;
            params.push(start, end);
        } else {
            sql += ` AND data_ricezione >= CURRENT_DATE - INTERVAL '30 days'`;
        }
        sql += " ORDER BY data_ricezione DESC, id DESC";

        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: "Err" });
    }
};

// --- SCAN BOLLA CON AI (FIX PDF & DATI COMPLETI) ---
exports.scanBolla = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });

        // Identifica se è PDF o Immagine per il prompt
        const isPdf = req.file.mimetype === 'application/pdf';
        const fileTypeDesc = isPdf ? "questo documento PDF (Fattura o DDT)" : "questa immagine";

        // ✅ PROMPT "MAGAZZINO STYLE"
        // Forza l'estrazione di TUTTI i dati (prezzi, iva, codici) anche per HACCP
        const prompt = `
        Sei un sistema OCR avanzato per la contabilità. Analizza ${fileTypeDesc}.
        Devi estrarre i dati per il CARICO DI MAGAZZINO COMPLETO.
        
        ISTRUZIONI:
        1. Estrai i dati di testata: Fornitore, Data Documento, Numero Documento.
        2. Estrai la TABELLA PRODOTTI riga per riga.
        3. Se è un PDF multipagina, analizza il contenuto di TUTTE le pagine visibili.

        CAMPI OBBLIGATORI PER OGNI RIGA (Cerca di compilare tutto):
        - "codice_articolo": Il codice prodotto del fornitore.
        - "nome": Descrizione del prodotto.
        - "quantita": Numero (es. 10, 5.5).
        - "unita_misura": (Pz, Kg, Lt, Ct, Conf).
        - "prezzo_unitario": Il prezzo CADUNO netto IVA (Fondamentale).
        - "sconto": Sconto percentuale riga (es. 10), altrimenti 0.
        - "iva": Aliquota IVA (4, 10, 22). Se manca metti 0.
        - "lotto": Codice lotto (L. / Lot / Batch). FONDAMENTALE.
        - "scadenza": Data scadenza se presente (YYYY-MM-DD).

        OUTPUT JSON STRETTO:
        {
            "fornitore": "Nome Fornitore",
            "data_documento": "YYYY-MM-DD",
            "numero_documento": "123/A",
            "prodotti": [
                {
                  "codice_articolo": "A001",
                  "nome": "FARINA 00",
                  "quantita": 10,
                  "unita_misura": "Kg",
                  "prezzo_unitario": 1.50,
                  "sconto": 0,
                  "iva": 4,
                  "lotto": "L12345",
                  "scadenza": "2025-12-31"
                }
            ]
        }`;

        const data = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);

        // Post-processing
        if (data && typeof data === 'object') {
            data.data_documento_iso = normalizzaData(data.data_documento);
            const now = new Date();
            data.ora_inserimento = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            // Fix per array prodotti vuoto
            if (!data.prodotti) data.prodotti = [];
        }

        res.json({ success: true, data });
    } catch (e) {
        console.error("Errore Scan Bolla:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    }
};

// --- IMPORTAZIONE MERCI (SALVATAGGIO MAGAZZINO PRIORITY) ---
exports.importMerci = async (req, res) => {
    try {
        const { merci } = req.body;
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Formato non valido" });

        let inserted = 0;
        let errors = [];

        for (const m of merci) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Prepariamo i dati COMPLETI per il Magazzino
                const datiMagazzino = {
                    ristorante_id: m.ristorante_id,
                    prodotto: m.prodotto,
                    quantita: parseFloat(m.quantita) || 0,
                    prezzo_unitario: parseFloat(m.prezzo_unitario) || 0,
                    iva: parseFloat(m.iva) || 0,
                    sconto: parseFloat(m.sconto) || 0,
                    fornitore: m.fornitore,
                    unita_misura: m.unita_misura,
                    lotto: m.lotto,
                    data_bolla: m.data_documento || m.data_ricezione,
                    numero_bolla: m.riferimento_documento || m.numero_bolla || '',
                    codice_articolo: m.codice_articolo || ''
                };

                // 2. SALVATAGGIO IN MAGAZZINO_PRODOTTI (Priorità 1)
                // Questo aggiorna giacenze, prezzi medi e anagrafica centrale
                const resultMagazzino = await gestisciMagazzino(client, datiMagazzino);
                const magazzinoId = resultMagazzino.id;
                
                // Recuperiamo i totali calcolati dal magazzino
                const { totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario } = resultMagazzino;

                // 3. LOG HACCP (Tracciabilità)
                // Salviamo anche qui i dati finanziari per coerenza storica, anche se non mostrati
                if (m.is_haccp === true || m.is_haccp === 'true' || m.is_haccp === undefined) {
                    const checkHaccp = await client.query(`
                        SELECT id FROM haccp_merci
                        WHERE ristorante_id = $1 AND magazzino_id = $2 AND riferimento_documento = $3 AND lotto = $4
                    `, [m.ristorante_id, magazzinoId, datiMagazzino.numero_bolla, m.lotto || '']);

                    if (checkHaccp.rows.length === 0) {
                        await client.query(
                            `INSERT INTO haccp_merci (
                                ristorante_id, magazzino_id,
                                data_ricezione, data_documento, riferimento_documento,
                                fornitore, prodotto, codice_articolo,
                                quantita, unita_misura,
                                prezzo_unitario, prezzo_unitario_netto, sconto, iva,
                                totale_netto, totale_iva, totale_lordo,
                                lotto, scadenza, operatore, note,
                                conforme, integro, destinazione, ora, is_haccp, allegato_url
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, true, true, $22, $23, true, $24)`,
                            [
                                m.ristorante_id, magazzinoId,
                                m.data_ricezione, datiMagazzino.data_bolla, datiMagazzino.numero_bolla,
                                m.fornitore, m.prodotto, m.codice_articolo,
                                datiMagazzino.quantita, m.unita_misura,
                                datiMagazzino.prezzo_unitario, prezzoNettoUnitario, datiMagazzino.sconto, datiMagazzino.iva,
                                totaleNetto, totaleIva, totaleLordo,
                                m.lotto || '', m.scadenza || null, m.operatore || 'SCAN', m.note || '',
                                m.destinazione || '', m.ora, m.allegato_url || ''
                            ]
                        );
                    }
                }

                await client.query('COMMIT');
                inserted++;
            } catch (innerError) {
                await client.query('ROLLBACK');
                console.error("Errore import riga:", innerError);
                errors.push({ prodotto: m.prodotto, errore: innerError.message });
            } finally {
                client.release();
            }
        }

        res.json({ success: true, message: `Caricati: ${inserted}`, dettagli_errori: errors });
    } catch (e) {
        res.status(500).json({ error: "Errore critico server: " + e.message });
    }
};

// --- CREAZIONE MANUALE SINGOLA ---
exports.createMerce = async (req, res) => {
    // Wrapper: usa la stessa logica robusta dell'import
    req.body = { merci: [req.body] };
    return exports.importMerci(req, res);
};

exports.updateMerce = async (req, res) => {
    try {
        const {
            data_ricezione, data_documento, riferimento_documento, fornitore, prodotto, codice_articolo,
            lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, unita_misura,
            allegato_url, destinazione, prezzo_unitario, sconto, iva
        } = req.body;

        const qta = parseFloat(quantita) || 0;
        const przListino = parseFloat(prezzo_unitario) || 0;
        const sc = parseFloat(sconto) || 0;
        const aliIva = parseFloat(iva) || 0;

        const prezzoNettoUnitario = przListino * (1 - (sc / 100));
        const totaleNetto = qta * prezzoNettoUnitario;
        const totaleIva = totaleNetto * (aliIva / 100);
        const totaleLordo = totaleNetto + totaleIva;

        await pool.query(
            `UPDATE haccp_merci SET
                data_ricezione=$1, data_documento=$2, riferimento_documento=$3, fornitore=$4,
                prodotto=$5, codice_articolo=$6, lotto=$7, scadenza=$8,
                temperatura=$9, conforme=$10, integro=$11, note=$12, operatore=$13,
                quantita=$14, unita_misura=$15, allegato_url=$16, destinazione=$17,
                prezzo_unitario=$18, sconto=$19, iva=$20, prezzo_unitario_netto=$21,
                totale_netto=$22, totale_iva=$23, totale_lordo=$24
            WHERE id=$25`,
            [
                data_ricezione, data_documento || data_ricezione, riferimento_documento || '',
                fornitore, prodotto, codice_articolo || '', lotto, scadenza || null,
                temperatura, conforme, integro, note, operatore,
                qta, unita_misura || '', allegato_url, destinazione,
                przListino, sc, aliIva, prezzoNettoUnitario,
                totaleNetto, totaleIva, totaleLordo,
                req.params.id
            ]
        );

        res.json({ success: true, message: "Aggiornato" });
    } catch (e) {
        res.status(500).json({ error: "Errore update: " + e.message });
    }
};

exports.updateMerceBulk = async (req, res) => {
    // Logica update bulk standard (semplificata per ora)
    res.json({ success: true });
};

// --- DELETE CON ROLLBACK STOCK (SINGOLO) ---
exports.deleteMerce = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // 1. Leggiamo cosa stiamo cancellando
        const check = await client.query("SELECT magazzino_id, quantita FROM haccp_merci WHERE id = $1", [id]);
        
        if (check.rows.length > 0) {
            const { magazzino_id, quantita } = check.rows[0];
            const qtaDaTogliere = parseFloat(quantita) || 0;

            // 2. Se collegato al magazzino, riduciamo la giacenza
            if (magazzino_id && qtaDaTogliere > 0) {
                await client.query(
                    "UPDATE magazzino_prodotti SET giacenza = giacenza - $1, updated_at = NOW() WHERE id = $2", 
                    [qtaDaTogliere, magazzino_id]
                );
            }
        }

        // 3. Elimina riga HACCP
        await client.query("DELETE FROM haccp_merci WHERE id=$1", [id]);
        await client.query('COMMIT');
        
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Errore delete:", e);
        res.status(500).json({ error: "Errore durante l'eliminazione" });
    } finally {
        client.release();
    }
};

// --- DELETE CON ROLLBACK STOCK (MASSIVO) ---
exports.deleteMerceBulk = async (req, res) => {
    const client = await pool.connect();
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) return res.json({ success: true });

        await client.query('BEGIN');
        const itemsToCheck = await client.query("SELECT magazzino_id, quantita FROM haccp_merci WHERE id = ANY($1::int[])", [ids]);

        for (const item of itemsToCheck.rows) {
            const qta = parseFloat(item.quantita) || 0;
            if (item.magazzino_id && qta > 0) {
                await client.query("UPDATE magazzino_prodotti SET giacenza = giacenza - $1 WHERE id = $2", [qta, item.magazzino_id]);
            }
        }

        await client.query("DELETE FROM haccp_merci WHERE id = ANY($1::int[])", [ids]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};