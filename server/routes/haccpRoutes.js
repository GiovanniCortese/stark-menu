// server/routes/haccpRoutes.js - FIXED PREZZI, TOTALI & CALCOLI (MAGAZZINO CENTRIC V3)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getItalyDateComponents, getTimeItaly } = require('../utils/time'); 
const { uploadFile, cloudinary } = require('../config/storage'); 
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');
const stream = require('stream');
const { analyzeImageWithGemini } = require('../utils/ai');

// =================================================================================
// 0. DB FIX (LANCIARE UNA VOLTA: /api/db-fix-magazzino-full)
// =================================================================================
router.get('/api/db-fix-magazzino-full', async (req, res) => {
    try {
        const client = await pool.connect();
        // Aggiungiamo i campi per la visione dettagliata "Documento"
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE");
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT"); // Num Fattura/Bolla
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS fornitore_full TEXT"); // Dati completi fornitore
        
        // Totali Monetari
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC DEFAULT 0");
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_netto NUMERIC DEFAULT 0");
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_iva NUMERIC DEFAULT 0");
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_lordo NUMERIC DEFAULT 0");

        // Timestamp inserimento
        await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_inserimento TIMESTAMP DEFAULT NOW()");

        client.release();
        res.send("✅ DATABASE AGGIORNATO: Colonne Fattura e Totali create!");
    } catch (e) {
        res.status(500).send("Errore DB Fix: " + e.message);
    }
});

// =================================================================================
// 1. CANCELLAZIONE MULTIPLA (BULK DELETE)
// =================================================================================
router.post('/api/magazzino/delete-bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ids } = req.body; // Array di ID [1, 2, 55]
        if (!ids || ids.length === 0) return res.json({ success: true });

        await client.query('BEGIN');
        
        // 1. Elimina dal registro storico (haccp_merci)
        await client.query("DELETE FROM haccp_merci WHERE id = ANY($1::int[])", [ids]);

        await client.query('COMMIT');
        res.json({ success: true, deleted: ids.length });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// =================================================================================
// HELPER: GESTIONE CENTRALE MAGAZZINO (CALCOLO PREZZI + AGGIORNAMENTO)
// =================================================================================
async function gestisciMagazzino(client, data) {
    const { ristorante_id, prodotto, quantita, prezzo_unitario, iva, fornitore, unita_misura, lotto, data_bolla, numero_bolla, codice_articolo, sconto } = data;
    
    // 1. Normalizzazione numeri
    const qta = parseFloat(quantita) || 0;
    const przUnit = parseFloat(prezzo_unitario) || 0;
    const aliIva = parseFloat(iva) || 0;
    const sc = parseFloat(sconto) || 0;

    // 2. CALCOLI MATEMATICI (Il cuore del fix)
    // Prezzo unitario scontato
    const prezzoNettoUnitario = przUnit * (1 - (sc / 100));
    
    // Totali riga
    const totaleNetto = qta * prezzoNettoUnitario;
    const totaleIva = totaleNetto * (aliIva / 100);
    const totaleLordo = totaleNetto + totaleIva;

    // 3. Cerca se esiste in Magazzino (Case Insensitive)
    const check = await client.query(
        `SELECT id, giacenza, prezzo_medio FROM magazzino_prodotti WHERE ristorante_id = $1 AND LOWER(nome) = LOWER($2)`,
        [ristorante_id, prodotto.trim()]
    );

    let magazzinoId = null;

    if (check.rows.length > 0) {
        // --- UPDATE ESISTENTE ---
        const existing = check.rows[0];
        magazzinoId = existing.id;
        const oldGiacenza = parseFloat(existing.giacenza) || 0;
        const oldPrezzo = parseFloat(existing.prezzo_medio) || 0;
        
        // Calcolo nuovo prezzo medio ponderato
        let newPrezzoMedio = oldPrezzo;
        if ((oldGiacenza + qta) > 0) {
            newPrezzoMedio = ((oldGiacenza * oldPrezzo) + (qta * prezzoNettoUnitario)) / (oldGiacenza + qta);
        }

        await client.query(
            `UPDATE magazzino_prodotti SET 
                giacenza = giacenza + $1,
                
                -- Aggiornamento Prezzi Unitari
                prezzo_ultimo = $2,
                prezzo_medio = $3,
                prezzo_unitario_netto = $4,
                
                -- Aggiornamento Totali (Valore attuale dell'ultima fornitura)
                valore_totale_netto = $5,
                valore_totale_iva = $6,
                valore_totale_lordo = $7,
                
                sconto = $8,
                aliquota_iva = $9,
                
                codice_articolo = COALESCE(NULLIF($10, ''), codice_articolo),
                data_bolla = $11,
                numero_bolla = $12,
                lotto = COALESCE(NULLIF($13, ''), lotto),
                updated_at = NOW()
             WHERE id = $14`,
            [
                qta, 
                prezzoNettoUnitario, newPrezzoMedio, prezzoNettoUnitario, // $2, $3, $4
                totaleNetto, totaleIva, totaleLordo, // $5, $6, $7 (I CAMPI CHE PRIMA ERANO A ZERO)
                sc, aliIva, // $8, $9
                codice_articolo, data_bolla, numero_bolla, lotto, // $10, $11, $12, $13
                magazzinoId // $14
            ]
        );
    } else {
        // --- INSERT NUOVO ---
        const resInsert = await client.query(
            `INSERT INTO magazzino_prodotti 
            (ristorante_id, nome, marca, unita_misura, giacenza, scorta_minima, 
             prezzo_ultimo, prezzo_medio, prezzo_unitario_netto,
             valore_totale_netto, valore_totale_iva, valore_totale_lordo,
             aliquota_iva, codice_articolo, sconto,
             data_bolla, numero_bolla, lotto)
            VALUES ($1, $2, $3, $4, $5, 5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
            [
                ristorante_id, prodotto.trim(), fornitore || '', unita_misura || 'Pz', 
                qta, // $5
                prezzoNettoUnitario, prezzoNettoUnitario, prezzoNettoUnitario, // $6, $7, $8
                totaleNetto, totaleIva, totaleLordo, // $9, $10, $11 (I CAMPI NUOVI)
                aliIva, codice_articolo || '', sc, // $12, $13, $14
                data_bolla, numero_bolla, lotto // $15, $16, $17
            ]
        );
        magazzinoId = resInsert.rows[0].id;
    }
    
    // IMPORTANTE: Ritorniamo i totali calcolati per usarli nell'HACCP senza ricalcolarli
    return { id: magazzinoId, totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario };
}


// =================================================================================
// 1. ASSETS (MACCHINE)
// =================================================================================
router.get('/api/haccp/assets/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY tipo, nome", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/assets', async (req, res) => { try { const { ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato || 'attivo']); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.put('/api/haccp/assets/:id', async (req, res) => { try { const { nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4, marca=$5, modello=$6, serial_number=$7, foto_url=$8, etichetta_url=$9, stato=$10 WHERE id=$11`, [nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/assets/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// =================================================================================
// 2. LOGS (TEMPERATURE, ECC)
// =================================================================================
router.get('/api/haccp/logs/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let query = `SELECT l.*, a.nome as nome_asset FROM haccp_logs l LEFT JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`; const params = [req.params.ristorante_id]; if (start && end) { query += ` AND l.data_ora >= $2 AND l.data_ora <= $3 ORDER BY l.data_ora ASC`; params.push(start, end); } else { query += ` AND l.data_ora >= NOW() - INTERVAL '7 days' ORDER BY l.data_ora DESC`; } const r = await pool.query(query, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/logs', async (req, res) => { try { const { ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url } = req.body; await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.put('/api/haccp/logs/:id', async (req, res) => { try { const { valore, conformita, azione_correttiva, foto_prova_url } = req.body; await pool.query("UPDATE haccp_logs SET valore=$1, conformita=$2, azione_correttiva=$3, foto_prova_url=$4 WHERE id=$5", [valore, conformita, azione_correttiva, foto_prova_url, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.delete('/api/haccp/logs/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_logs WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

// =================================================================================
// 3. ETICHETTE PRODUZIONE
// =================================================================================
router.post('/api/haccp/labels', async (req, res) => { try { const { ristorante_id, prodotto, data_scadenza, operatore, tipo_conservazione, ingredienti } = req.body; const t = getItalyDateComponents(); const lotto = `L-${t.year}${t.month}${t.day}-${t.hour}${t.minute}`; const r = await pool.query("INSERT INTO haccp_labels (ristorante_id, prodotto, lotto, data_produzione, data_scadenza, operatore, tipo_conservazione, ingredienti) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *", [ristorante_id, prodotto, lotto, data_scadenza, operatore, tipo_conservazione, ingredienti || '']); res.json({success:true, label: r.rows[0]}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.get('/api/haccp/labels/storico/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_produzione >= $2 AND data_produzione <= $3 ORDER BY data_produzione ASC"; params.push(start, end); } else { sql += " AND data_produzione >= NOW() - INTERVAL '7 days' ORDER BY data_produzione DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error: "Errore recupero storico"}); } });

// 4. RICEVIMENTO MERCI (CRUD & LISTA & IMPORT)
router.get('/api/haccp/merci/:ristorante_id', async (req, res) => {
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
            // Se ci sono date specifiche (dal calendario), usale
            sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`;
            params.push(start, end);
        } else {
            // DEFAULT: ULTIMI 7 GIORNI
            sql += ` AND data_ricezione >= CURRENT_DATE - INTERVAL '7 days'`;
        }

        sql += " ORDER BY data_ricezione DESC, id DESC"; 
        
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch(e) { res.status(500).json({error:"Err"}); }
});

// --- NUOVA ROTTA: AGGIORNAMENTO MASSIVO (BULK UPDATE) ---
router.post('/api/haccp/merci/update-bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        const { merci } = req.body;
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Dati non validi" });

        await client.query('BEGIN');

        for (const m of merci) {
            // Se ha un ID, è un UPDATE
            if (m.id) {
                 // Ricalcoli sicurezza
                 const qta = parseFloat(m.quantita) || 0;
                 const przUnit = parseFloat(m.prezzo_unitario) || 0;
                 const sc = parseFloat(m.sconto) || 0;
                 const aliIva = parseFloat(m.iva) || 0;
                 
                 const prezzoNettoUnitario = przUnit * (1 - (sc / 100));
                 const totaleNetto = qta * prezzoNettoUnitario;
                 const totaleIva = totaleNetto * (aliIva / 100);
                 const totaleLordo = totaleNetto + totaleIva;

                 await client.query(
                    `UPDATE haccp_merci SET 
                        data_documento=$1, riferimento_documento=$2, fornitore=$3, 
                        codice_articolo=$4, prodotto=$5, quantita=$6, unita_misura=$7, 
                        prezzo_unitario=$8, sconto=$9, iva=$10, 
                        prezzo_unitario_netto=$11, totale_netto=$12, totale_iva=$13, totale_lordo=$14,
                        lotto=$15, scadenza=$16
                     WHERE id=$17`,
                    [
                        m.data_documento, m.riferimento_documento, m.fornitore,
                        m.codice_articolo, m.prodotto, qta, m.unita_misura,
                        przUnit, sc, aliIva,
                        prezzoNettoUnitario, totaleNetto, totaleIva, totaleLordo,
                        m.lotto, m.scadenza || null,
                        m.id
                    ]
                 );
            }
            // Se non ha ID (nuova riga aggiunta in revisione), potresti gestire un INSERT qui se vuoi
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Bulk Update Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// --- INSERIMENTO SINGOLO MANUALE (MAGAZZINO CENTRIC + CALCOLI) ---
router.post('/api/haccp/merci', async (req, res) => { 
    const client = await pool.connect();
    try { 
        await client.query('BEGIN');
        
        const { 
            ristorante_id, data_ricezione, ora, fornitore, prodotto, 
            lotto, scadenza, temperatura, conforme, integro, note, 
            operatore, quantita, unita_misura, allegato_url, destinazione, 
            prezzo_unitario, iva, is_haccp 
        } = req.body; 

        // 1. UPDATE/INSERT MAGAZZINO (SEMPRE)
        // Usa la funzione centralizzata che calcola i totali
        const resMag = await gestisciMagazzino(client, {
            ristorante_id, prodotto, quantita, prezzo_unitario, iva, fornitore, 
            unita_misura, lotto, data_bolla: data_ricezione
        });

        // 2. INSERT HACCP (SOLO SE CIBO)
        if (is_haccp === true || is_haccp === 'true') {
            await client.query(
                `INSERT INTO haccp_merci (
                    ristorante_id, magazzino_id, data_ricezione, ora, fornitore, prodotto, 
                    lotto, scadenza, temperatura, conforme, integro, note, operatore, 
                    quantita, unita_misura, allegato_url, destinazione, 
                    prezzo_unitario, prezzo_unitario_netto, iva, 
                    totale_netto, totale_iva, totale_lordo, is_haccp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, true)`, 
                [
                    ristorante_id, resMag.id, data_ricezione, ora || '', fornitore, prodotto, 
                    lotto, scadenza || null, temperatura, conforme, integro, note, operatore, 
                    quantita, unita_misura || '', allegato_url, destinazione, 
                    parseFloat(prezzo_unitario)||0, resMag.prezzoNettoUnitario, parseFloat(iva)||0,
                    resMag.totaleNetto, resMag.totaleIva, resMag.totaleLordo // Salva i totali anche qui
                ]
            );
        }

        await client.query('COMMIT');
        res.json({success:true, message: is_haccp ? "Salvato HACCP + Magazzino" : "Salvato solo Magazzino (No HACCP)"}); 
    } catch(e) { 
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({error:"Err: " + e.message}); 
    } finally {
        client.release();
    }
});

// --- IMPORT MASSIVO / SCAN (NON-BLOCKING & CALCOLI FIX) ---
router.post('/api/haccp/merci/import', async (req, res) => {
    try {
        const { merci } = req.body; 
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Formato non valido" });

        let inserted = 0;
        let errors = [];
        
        for (const m of merci) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Dati base
                const sconto = parseFloat(m.sconto) || 0;
                const qta = parseFloat(m.quantita) || 0;
                const przUnit = parseFloat(m.prezzo_unitario) || 0;
                const iva = parseFloat(m.iva) || 0;
                const dataDoc = m.data_documento || m.data_ricezione; 
                const numDoc = m.riferimento_documento || ''; 

                // 1. GESTIONE MAGAZZINO (MASTER) & CALCOLO
                const resultMagazzino = await gestisciMagazzino(client, {
                    ristorante_id: m.ristorante_id,
                    prodotto: m.prodotto,
                    quantita: qta,
                    prezzo_unitario: przUnit,
                    iva: iva,
                    fornitore: m.fornitore,
                    unita_misura: m.unita_misura,
                    lotto: m.lotto,
                    data_bolla: dataDoc,        
                    numero_bolla: numDoc,       
                    codice_articolo: m.codice_articolo, 
                    sconto: sconto
                });

                const magazzinoId = resultMagazzino.id;
                
                // Recuperiamo i totali calcolati dalla funzione gestisciMagazzino
                const { totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario } = resultMagazzino;

                // 2. GESTIONE HACCP (STORICO)
                if (m.is_haccp === true || m.is_haccp === 'true') {
                    // Check duplicati
                    const checkHaccp = await client.query(`
                        SELECT id FROM haccp_merci 
                        WHERE ristorante_id = $1 
                        AND magazzino_id = $2
                        AND riferimento_documento = $3 
                        AND lotto = $4
                    `, [m.ristorante_id, magazzinoId, numDoc, m.lotto || '']);

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
                                m.data_ricezione, dataDoc, numDoc, 
                                m.fornitore, m.prodotto, m.codice_articolo || '',
                                qta, m.unita_misura, 
                                przUnit, prezzoNettoUnitario, sconto, iva, // $11, $12, $13, $14
                                totaleNetto, totaleIva, totaleLordo,       // $15, $16, $17 (INSERIAMO I TOTALI ANCHE NELLO STORICO)
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
                console.error(`Errore importazione riga: ${m.prodotto}`, innerError.message);
                errors.push({ prodotto: m.prodotto, errore: innerError.message });
            } finally {
                client.release();
            }
        }

        res.json({ 
            success: true, 
            message: `Importato: ${inserted}. Saltati/Errori: ${errors.length}`,
            dettagli_errori: errors 
        });

    } catch (e) {
        console.error("Errore Generale Import:", e);
        res.status(500).json({ error: "Errore critico server: " + e.message });
    }
});

// Update standard (solo campi HACCP)
// AGGIORNAMENTO COMPLETO DELLA RIGA (Modifica Manuale)
router.put('/api/haccp/merci/:id', async (req, res) => { 
    try { 
        // 1. Recuperiamo tutti i dati dal frontend
        const { 
            data_ricezione, // Data Inserimento/Arrivo Merce
            data_documento, // Data Fattura (NUOVO)
            riferimento_documento, // Numero Fattura (NUOVO)
            fornitore, 
            prodotto, 
            codice_articolo, // (NUOVO)
            lotto, 
            scadenza, 
            temperatura, 
            conforme, 
            integro, 
            note, 
            operatore, 
            quantita, 
            unita_misura, // (NUOVO)
            allegato_url, 
            destinazione, 
            // Prezzi e Totali
            prezzo_unitario, // Listino
            sconto, // (NUOVO)
            iva // Aliquota %
        } = req.body; 

        // 2. Normalizzazione Numeri (Per evitare errori di calcolo)
        const qta = parseFloat(quantita) || 0;
        const przListino = parseFloat(prezzo_unitario) || 0;
        const sc = parseFloat(sconto) || 0;
        const aliIva = parseFloat(iva) || 0;

        // 3. RICALCOLO DEI TOTALI (Logica identica all'Import)
        // Prezzo unitario scontato
        const prezzoNettoUnitario = przListino * (1 - (sc / 100));
        
        // Totali riga
        const totaleNetto = qta * prezzoNettoUnitario;
        const totaleIva = totaleNetto * (aliIva / 100);
        const totaleLordo = totaleNetto + totaleIva;

        // 4. ESECUZIONE UPDATE
        // Nota: Aggiorniamo sia i campi descrittivi che quelli contabili calcolati
        await pool.query(
            `UPDATE haccp_merci SET 
                data_ricezione=$1, 
                data_documento=$2,
                riferimento_documento=$3,
                fornitore=$4, 
                prodotto=$5, 
                codice_articolo=$6,
                lotto=$7, 
                scadenza=$8, 
                temperatura=$9, 
                conforme=$10, 
                integro=$11, 
                note=$12, 
                operatore=$13, 
                quantita=$14, 
                unita_misura=$15,
                allegato_url=$16, 
                destinazione=$17, 
                
                -- Sezione Contabile Ricalcolata
                prezzo_unitario=$18, 
                sconto=$19,
                iva=$20,
                prezzo_unitario_netto=$21,
                totale_netto=$22,
                totale_iva=$23,
                totale_lordo=$24

            WHERE id=$25`, 
            [
                data_ricezione, // $1
                data_documento || data_ricezione, // $2 (Se manca data doc, usa data ricezione)
                riferimento_documento || '', // $3
                fornitore, // $4
                prodotto, // $5
                codice_articolo || '', // $6
                lotto, // $7
                scadenza || null, // $8
                temperatura, // $9
                conforme, // $10
                integro, // $11
                note, // $12
                operatore, // $13
                qta, // $14
                unita_misura || '', // $15
                allegato_url, // $16
                destinazione, // $17
                
                // Valori Numerici
                przListino, // $18
                sc, // $19
                aliIva, // $20
                prezzoNettoUnitario, // $21
                totaleNetto, // $22
                totaleIva, // $23
                totaleLordo, // $24
                
                req.params.id // $25 (ID della riga)
            ]
        ); 
        
        res.json({ success: true, message: "Riga aggiornata e ricalcolata" }); 
    } catch(e) { 
        console.error("Errore Update HACCP:", e);
        res.status(500).json({ error: "Errore salvataggio: " + e.message }); 
    } 
});

router.delete('/api/haccp/merci/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_merci WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// =================================================================================
// 5. PULIZIE
// =================================================================================
router.get('/api/haccp/pulizie/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_cleaning WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_ora >= $2 AND data_ora <= $3 ORDER BY data_ora ASC"; params.push(start, end); } else { sql += " AND data_ora >= NOW() - INTERVAL '7 days' ORDER BY data_ora DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/pulizie', async (req, res) => { try { const { ristorante_id, area, prodotto, operatore, conformita, data_ora } = req.body; await pool.query("INSERT INTO haccp_cleaning (ristorante_id, area, prodotto, operatore, conformita, data_ora) VALUES ($1, $2, $3, $4, $5, $6)", [ristorante_id, area, prodotto, operatore, conformita !== undefined ? conformita : true, data_ora || new Date()]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/pulizie/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_cleaning WHERE id = $1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

// =================================================================================
// 6. STATISTICHE FORNITORI & SPESE
// =================================================================================
router.get('/api/haccp/stats/magazzino/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const speseFornitori = await pool.query(`SELECT fornitore, SUM(prezzo) as totale, COUNT(*) as numero_bolle FROM haccp_merci WHERE ristorante_id = $1 GROUP BY fornitore ORDER BY totale DESC`, [ristorante_id]);
        const storico = await pool.query(`SELECT * FROM haccp_merci WHERE ristorante_id = $1 ORDER BY data_ricezione DESC LIMIT 500`, [ristorante_id]);
        const topProdotti = await pool.query(`SELECT prodotto, SUM(prezzo) as totale_speso, COUNT(*) as acquisti FROM haccp_merci WHERE ristorante_id = $1 GROUP BY prodotto ORDER BY totale_speso DESC LIMIT 10`, [ristorante_id]);
        res.json({ fornitori: speseFornitori.rows, storico: storico.rows, top_prodotti: topProdotti.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DB FIX ---
router.get('/api/db-fix-magazzino-v2', async (req, res) => {
    try {
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS is_haccp BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS magazzino_id INTEGER");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS ora TEXT DEFAULT ''");
        res.send("✅ DATABASE AGGIORNATO: is_haccp, magazzino_id, ora");
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Helper Date
function normalizzaData(dataStr) {
    if (!dataStr) return new Date().toISOString().split('T')[0];
    try {
        const clean = dataStr.replace(/[^0-9\/\-\.]/g, ''); 
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
        let parts = clean.split(/[\/\-\.]/);
        if (parts.length === 3) {
            if (parts[2].length === 2) parts[2] = "20" + parts[2]; 
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
    } catch(e) { return new Date().toISOString().split('T')[0]; }
    return new Date().toISOString().split('T')[0];
}

// 7. MAGIC SCAN SUPER (Versione 4.0 - PINETA SRL FIX)
router.post('/api/haccp/scan-bolla', uploadFile.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });

        // PROMPT OTTIMIZZATO PER FATTURE ITALIANE COMPLESSE
        const prompt = `
        Sei un contabile esperto italiano. Analizza questa immagine di fattura o DDT.
        Devi estrarre i dati con estrema precisione.

        ISTRUZIONI PER L'INTESTAZIONE:
        1. **DATA DOCUMENTO**: Cerca date in alto a destra o sinistra. Attento ai formati estesi come "martedì 4 giugno 2024". Converti SEMPRE in formato ISO "YYYY-MM-DD".
        2. **NUMERO DOCUMENTO**: Cerca numeri isolati in alto (es. "110201", "N. 402").
        3. **FORNITORE**: Cerca la ragione sociale in alto (es. "PINETA SRL").

        ISTRUZIONI PER LA TABELLA PRODOTTI (Riga per Riga):
        Esamina ogni riga della tabella articoli. Estrai:
        - "codice_articolo": Il codice numerico o alfanumerico (es. "21038.1", "23585.1"). Spesso è la prima colonna.
        - "nome": Descrizione del prodotto.
        - "quantita": La quantità fatturata. ATTENZIONE: Se ci sono colonne "Colli", "Cartoni" o "Pezzi", cerca di capire la quantità totale unitaria.
        - "unita_misura": 
           - Se vedi "CA", "CT", "CART" -> scrivi "Ct".
           - Se vedi "PZ", "PEZZI" -> scrivi "Pz".
           - Se vedi "KG" -> scrivi "Kg".
        - "prezzo_unitario": Il prezzo del singolo pezzo/kg (NON il totale riga).
        - "sconto": Se c'è una colonna sconto (es. "10", "50"), riporta il numero. Se vuoto metti 0.
        - "iva": Cerca l'aliquota (4, 10, 22). Se non è scritta sulla riga, prova a dedurla o metti 0.
        - "lotto": Cerca codici come "L.", "Lotto".
        - "scadenza": Cerca date future sulla riga.
        - "is_haccp": TRUE se cibo/bevanda, FALSE se detersivo/carta.

        OUTPUT JSON PURO (Senza Markdown):
        {
            "fornitore": "PINETA SRL",
            "data_documento": "2024-06-04", 
            "numero_documento": "110201",
            "prodotti": [
                { 
                  "codice_articolo": "21038.1",
                  "nome": "RISO ARBORIO ARCO KG.5", 
                  "quantita": 2, 
                  "unita_misura": "Ct", 
                  "prezzo_unitario": 9.506, 
                  "sconto": 0,
                  "iva": 4, 
                  "lotto": "",
                  "scadenza": "",
                  "is_haccp": true
                }
            ]
        }`;

        const data = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);
        
        // Post-processing date e ore
        data.data_documento_iso = normalizzaData(data.data_documento);
        const now = new Date();
        data.ora_inserimento = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        res.json({ success: true, data });

    } catch (e) {
        console.error("Errore Scan Bolla:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    }
});

// =================================================================================
// 8. GESTIONE RICETTE & AUTO-MATCHING
// =================================================================================
router.get('/api/haccp/ricette/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const query = `
            SELECT r.id, r.nome, r.descrizione, 
            COALESCE(JSON_AGG(ri.ingrediente_nome) FILTER (WHERE ri.ingrediente_nome IS NOT NULL), '[]') as ingredienti
            FROM haccp_ricette r
            LEFT JOIN haccp_ricette_ingredienti ri ON r.id = ri.ricetta_id
            WHERE r.ristorante_id = $1
            GROUP BY r.id ORDER BY r.nome ASC
        `;
        const result = await pool.query(query, [ristorante_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/haccp/ricette', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { ristorante_id, nome, ingredienti } = req.body; 
        const resRicetta = await client.query("INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id", [ristorante_id, nome]);
        const ricettaId = resRicetta.rows[0].id;
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query("INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)", [ricettaId, ing]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

router.get('/api/haccp/ricette/match/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const { ristorante_id } = req.query;
        const ingRes = await pool.query("SELECT ingrediente_nome FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [id]);
        const ingredientiRichiesti = ingRes.rows.map(r => r.ingrediente_nome);
        const risultati = [];

        for (const ingName of ingredientiRichiesti) {
            // MATCH SUL MAGAZZINO (più preciso di HACCP)
            const matchQuery = `
                SELECT nome as prodotto, marca as fornitore, lotto, updated_at as data_ricezione
                FROM magazzino_prodotti 
                WHERE ristorante_id = $1 
                AND nome ILIKE $2 
                AND giacenza > 0
                LIMIT 1
            `;
            const matchRes = await pool.query(matchQuery, [ristorante_id, `%${ingName}%`]);

            if (matchRes.rows.length > 0) {
                const item = matchRes.rows[0];
                risultati.push({ ingrediente_base: ingName, found: true, text: `${item.prodotto} (L:${item.lotto || 'N/D'})`, dati_match: item });
            } else {
                risultati.push({ ingrediente_base: ingName, found: false, text: `${ingName} (MANCANTE)`, dati_match: null });
            }
        }
        res.json({ success: true, risultati });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/haccp/ricette/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_ricette WHERE id = $1", [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

router.put('/api/haccp/ricette/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { nome, ingredienti } = req.body;
        await client.query("UPDATE haccp_ricette SET nome = $1 WHERE id = $2", [nome, req.params.id]);
        await client.query("DELETE FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [req.params.id]);
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query("INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)", [req.params.id, ing]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

// =================================================================================
// 9. API MAGAZZINO REALE (Giacenze & Anagrafica)
// =================================================================================
router.get('/api/magazzino/lista/:ristorante_id', async (req, res) => {
    try {
        const query = `
            SELECT *,
            to_char(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI') as ultima_modifica_it,
            to_char(data_bolla, 'YYYY-MM-DD') as data_bolla_iso
            FROM magazzino_prodotti WHERE ristorante_id = $1 ORDER BY nome ASC
        `;
        const r = await pool.query(query, [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Errore loading" }); }
});

router.put('/api/magazzino/update-full/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const qta = parseFloat(body.giacenza) || 0;
        const unitNetto = parseFloat(body.prezzo_unitario_netto) || 0;
        const iva = parseFloat(body.aliquota_iva) || 0;
        const totNetto = qta * unitNetto;
        const totIva = totNetto * (iva / 100);
        const totLordo = totNetto + totIva;

        await pool.query(
            `UPDATE magazzino_prodotti SET 
                giacenza = $1, prezzo_unitario_netto = $2, aliquota_iva = $3,
                valore_totale_netto = $4, valore_totale_iva = $5, valore_totale_lordo = $6,
                nome = COALESCE($7, nome), marca = COALESCE($8, marca), lotto = COALESCE($9, lotto),
                data_bolla = COALESCE($10, data_bolla), tipo_unita = COALESCE($11, tipo_unita), updated_at = NOW()
            WHERE id = $12`,
            [qta, unitNetto, iva, totNetto, totIva, totLordo, body.nome, body.marca, body.lotto, body.data_bolla, body.tipo_unita, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore update" }); }
});

router.delete('/api/magazzino/prodotto/:id', async (req, res) => { try { await pool.query("DELETE FROM magazzino_prodotti WHERE id = $1", [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Errore cancellazione" }); } });

// =================================================================================
// 10. EXPORTS (PDF & EXCEL)
// =================================================================================
router.get('/api/haccp/export/labels/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const { format, start, end, rangeName } = req.query; 
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const azienda = ristRes.rows[0];
        let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1";
        const params = [ristorante_id];
        if (start && end) { sql += " AND data_produzione >= $2 AND data_produzione <= $3"; params.push(start, end); }
        sql += " ORDER BY data_produzione ASC";
        const r = await pool.query(sql, params);
        const titoloReport = "REGISTRO PRODUZIONE";
        const headers = ["Data Prod.", "Prodotto", "Ingredienti", "Tipo", "Lotto", "Scadenza", "Operatore"];
        const rows = r.rows.map(l => [new Date(l.data_produzione).toLocaleDateString('it-IT'), l.prodotto, l.ingredienti, l.tipo_conservazione, l.lotto, new Date(l.data_scadenza).toLocaleDateString('it-IT'), l.operatore]);
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="produzione.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(azienda.nome, { align: 'center' });
            doc.fontSize(10).text(azienda.dati_fiscali || "", { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`${titoloReport}: ${rangeName}`, { align: 'center' });
            doc.moveDown();
            await doc.table({ headers, rows }, { width: 750, prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8) });
            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
            xlsx.utils.book_append_sheet(wb, ws, "Produzione");
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', `attachment; filename="produzione.xlsx"`);
            res.send(buffer);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/api/haccp/export/:tipo/:ristorante_id', async (req, res) => {
    try {
        const { tipo, ristorante_id } = req.params;
        const { start, end, rangeName, format } = req.query; 
        const ristRes = await pool.query("SELECT nome, dati_fiscali FROM ristoranti WHERE id = $1", [ristorante_id]);
        const aziendaInfo = ristRes.rows[0];
        let headers = [], rows = [], sheetName = "Export", titoloReport = "REPORT";
        
        if (tipo === 'temperature') {
            sheetName = "Temperature"; titoloReport = "REGISTRO TEMPERATURE";
            headers = ["Data", "Ora", "Macchina", "Temp", "Esito", "Az. Correttiva", "Op."];
            let sql = `SELECT l.data_ora, a.nome as asset, l.valore, l.conformita, l.azione_correttiva, l.operatore FROM haccp_logs l JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND l.data_ora >= $2 AND l.data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY l.data_ora ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => { const d = new Date(row.data_ora); return [d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), row.asset, `${row.valore}°C`, row.conformita ? "OK" : "NO", row.azione_correttiva, row.operatore]; });
        } else if (tipo === 'merci') { 
            sheetName = "Registro Acquisti"; titoloReport = "CONTABILITÀ MAGAZZINO & ACQUISTI";
            headers = ["Data", "Fornitore", "Prodotto", "Qta", "Unitario €", "Imponibile €", "IVA %", "Totale IVA €", "Totale Lordo €", "Lotto/Doc", "HACCP?"];
            let sql = `SELECT * FROM haccp_merci WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ricezione ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => {
                const qta = parseFloat(row.quantita)||0; const unit = parseFloat(row.prezzo_unitario)||0; const imp = qta * unit; const ivaV = imp * (parseFloat(row.iva)/100);
                return [new Date(row.data_ricezione).toLocaleDateString('it-IT'), row.fornitore, row.prodotto, qta, `€ ${unit.toFixed(2)}`, `€ ${imp.toFixed(2)}`, `${row.iva}%`, `€ ${ivaV.toFixed(2)}`, `€ ${(imp+ivaV).toFixed(2)}`, row.lotto, row.is_haccp ? "SI" : "NO"];
            });
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(aziendaInfo.nome, { align: 'center' });
            doc.fontSize(12).text(`${titoloReport} - ${rangeName}`, { align: 'center' }); doc.moveDown();
            await doc.table({ headers, rows }, { width: 500, prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8) });
            doc.end();
            return; 
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.xlsx"`);
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/api/db-fix-haccp-columns-final', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // Aggiungiamo TUTTE le colonne che potrebbero mancare in HACCP_MERCI
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE DEFAULT CURRENT_DATE");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT DEFAULT ''");
            
            // Colonne Totali (se mancavano)
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_netto NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_iva NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_lordo NUMERIC DEFAULT 0");

            res.send("✅ DB FIX COMPLETATO: Tabella haccp_merci allineata con codice_articolo e totali.");
        } finally {
            client.release();
        }
    } catch (e) {
        res.status(500).send("Errore DB: " + e.message);
    }
});

module.exports = router;