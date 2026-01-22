const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getItalyDateComponents, getTimeItaly } = require('../utils/time'); 
const { uploadFile, cloudinary } = require('../config/storage'); 
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');
const stream = require('stream');

// --- SOSTITUZIONE OPENAI CON GEMINI ---
const { GoogleGenerativeAI } = require("@google/generative-ai");

// =================================================================================
// 1. ASSETS (MACCHINE)
// =================================================================================
router.get('/api/haccp/assets/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY tipo, nome", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/assets', async (req, res) => { try { const { ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato || 'attivo']); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.put('/api/haccp/assets/:id', async (req, res) => { try { const { nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4, marca=$5, modello=$6, serial_number=$7, foto_url=$8, etichetta_url=$9, stato=$10 WHERE id=$11`, [nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/assets/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// =================================================================================
// 2. LOGS (TEMPERATURE)
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

// =================================================================================
// 4. RICEVIMENTO MERCI (CRUD & LISTA)
// =================================================================================
router.get('/api/haccp/merci/:ristorante_id', async (req, res) => {
    try {
        const { start, end, mode } = req.query; // mode = 'haccp' (solo alimenti) o 'all' (tutto)
        
        let sql = "SELECT * FROM haccp_merci WHERE ristorante_id = $1";
        const params = [req.params.ristorante_id];
        let paramIndex = 2;

        // Filtro Mode
        if (mode === 'haccp') {
            sql += " AND is_haccp = TRUE";
        }

        // Filtro Date
        if (start && end) {
            sql += ` AND data_ricezione >= $${paramIndex} AND data_ricezione <= $${paramIndex + 1}`;
            params.push(start, end);
        } else {
            sql += " AND data_ricezione >= NOW() - INTERVAL '60 days'";
        }

        sql += " ORDER BY data_ricezione DESC, ora DESC"; 
        
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch(e) { res.status(500).json({error:"Err"}); }
});

router.post('/api/haccp/merci', async (req, res) => { 
    try { 
        const { 
            ristorante_id, data_ricezione, ora, fornitore, prodotto, 
            lotto, scadenza, temperatura, conforme, integro, note, 
            operatore, quantita, unita_misura, allegato_url, destinazione, 
            prezzo, prezzo_unitario, iva 
        } = req.body; 

        await pool.query(
            `INSERT INTO haccp_merci (
                ristorante_id, data_ricezione, ora, fornitore, prodotto, lotto, 
                scadenza, temperatura, conforme, integro, note, operatore, 
                quantita, unita_misura, allegato_url, destinazione, prezzo, prezzo_unitario, iva
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`, 
            [
                ristorante_id, data_ricezione, ora || '', fornitore, prodotto, lotto, 
                scadenza, temperatura, conforme, integro, note, operatore, 
                quantita, unita_misura || '', allegato_url, destinazione, 
                prezzo || 0, prezzo_unitario || 0, iva || 0
            ]
        ); 
        res.json({success:true}); 
    } catch(e) { 
        console.error(e);
        res.status(500).json({error:"Err"}); 
    } 
});

router.put('/api/haccp/merci/:id', async (req, res) => { 
    try { 
        const { data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo, prezzo_unitario, iva } = req.body; 
        await pool.query(
            `UPDATE haccp_merci SET 
                data_ricezione=$1, fornitore=$2, prodotto=$3, lotto=$4, scadenza=$5, 
                temperatura=$6, conforme=$7, integro=$8, note=$9, operatore=$10, 
                quantita=$11, allegato_url=$12, destinazione=$13, prezzo=$14, 
                prezzo_unitario=$15, iva=$16 
            WHERE id=$17`, 
            [data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo || 0, prezzo_unitario || 0, iva || 0, req.params.id]
        ); 
        res.json({success:true}); 
    } catch(e) { res.status(500).json({error:"Err"}); } 
});

router.delete('/api/haccp/merci/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_merci WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// =================================================================================
// 5. IMPORT MASSIVO (EXCEL)
// =================================================================================
router.post('/api/haccp/merci/import', async (req, res) => {
    const client = await pool.connect();
    try {
        const { merci } = req.body;
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Formato non valido" });

        await client.query('BEGIN');
        let updated = 0, inserted = 0;
        
        for (const m of merci) {
            const checkSql = `
                SELECT id FROM haccp_merci 
                WHERE ristorante_id = $1 
                AND LOWER(prodotto) = LOWER($2) 
                AND LOWER(fornitore) = LOWER($3)
                AND (note = $4 OR (note IS NULL AND $4 IS NULL))
            `;
            const checkRes = await client.query(checkSql, [m.ristorante_id, m.prodotto, m.fornitore, m.note]);

            const qta = parseFloat(m.quantita) || 0;
            const przUnit = parseFloat(m.prezzo_unitario) || 0;
            const prezzoTot = parseFloat(m.prezzo) || (qta * przUnit);
            const oraCarico = m.ora || getTimeItaly(); 
            const isHaccp = m.is_haccp === true || m.is_haccp === 'true' || m.is_haccp === 1;

            if (checkRes.rows.length > 0) {
                // UPDATE
                await client.query(
                    `UPDATE haccp_merci SET 
                        quantita = $1, prezzo = $2, prezzo_unitario = $3, 
                        data_ricezione = $4, ora = $5, is_haccp = $6, scadenza = $7
                     WHERE id = $8`,
                    [qta, prezzoTot, przUnit, m.data_ricezione, oraCarico, isHaccp, m.scadenza, checkRes.rows[0].id]
                );
                updated++;
            } else {
                // INSERT
                await client.query(
                    `INSERT INTO haccp_merci (
                        ristorante_id, data_ricezione, ora, fornitore, prodotto, 
                        quantita, prezzo, prezzo_unitario, lotto, scadenza, 
                        operatore, note, conforme, integro, destinazione, is_haccp, allegato_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true, $13, $14, $15)`,
                    [
                        m.ristorante_id, m.data_ricezione, oraCarico, m.fornitore, m.prodotto,
                        qta, prezzoTot, przUnit, m.lotto||'', m.scadenza||null,
                        m.operatore||'IMPORT', m.note||'', m.destinazione||'', isHaccp, m.allegato_url||''
                    ]
                );
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, inserted, updated });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Errore Import Excel:", e);
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// =================================================================================
// 6. MAGIC SCAN CON GEMINI 1.5 FLASH (AI)
// =================================================================================
router.post('/api/haccp/scan-bolla', uploadFile.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });

        // 1. Upload su Cloudinary (Backup e URL pubblico)
        const uploadToCloud = () => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'auto', folder: 'haccp_docs' },
                    (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
                );
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);
                bufferStream.pipe(uploadStream);
            });
        };

        const fileUrl = await uploadToCloud();
        const isPdf = req.file.mimetype === 'application/pdf';

        // 2. Se è PDF, restituiamo solo URL (Gemini Vision lavora meglio con immagini per ora)
        if (isPdf) {
            return res.json({ 
                success: true, 
                message: "PDF caricato. L'AI per i PDF richiede conversione immagini.",
                data: { allegato_url: fileUrl, prodotti: [] }
            });
        }

        // 3. Controllo Configurazione
        if (!process.env.GEMINI_API_KEY) {
            return res.json({ success: true, message: "AI non configurata (Manca API Key).", data: { allegato_url: fileUrl } });
        }

        // 4. Chiamata a GEMINI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Usiamo il modello Flash: economico, veloce e ottimizzato per JSON
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" } 
        });

        const prompt = `
        Analizza questa bolla di consegna o fattura. Estrai i dati in formato JSON rigoroso.
        
        Regole di estrazione:
        1. "ora_consegna": Cerca un orario nel documento. Se non c'è, lascia stringa vuota "".
        2. "prodotti": Lista array. Per ogni prodotto cerca di capire se è alimentare/HACCP ("is_haccp": true) o materiale generico/pulizia ("is_haccp": false).
        
        Schema JSON richiesto:
        {
            "fornitore": "Nome Fornitore",
            "data_ricezione": "YYYY-MM-DD", 
            "ora_consegna": "HH:MM",
            "numero_documento": "123",
            "prodotti": [
                { "nome": "Farina 00", "quantita": "10", "prezzo": 15.50, "scadenza": null, "is_haccp": true },
                { "nome": "Detersivo", "quantita": "1", "prezzo": 5.00, "scadenza": null, "is_haccp": false }
            ]
        }
        `;

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Parsing della risposta JSON
        let data = JSON.parse(responseText);

        // Fallback orario se non trovato dall'AI
        if (!data.ora_consegna) {
             const now = new Date();
             data.ora_consegna = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        }

        data.allegato_url = fileUrl;
        res.json({ success: true, data });

    } catch (e) {
        console.error("Errore Scan Gemini:", e);
        res.status(500).json({ error: "Errore server AI: " + e.message });
    }
});

// =================================================================================
// 7. PULIZIE
// =================================================================================
router.get('/api/haccp/pulizie/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_cleaning WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_ora >= $2 AND data_ora <= $3 ORDER BY data_ora ASC"; params.push(start, end); } else { sql += " AND data_ora >= NOW() - INTERVAL '7 days' ORDER BY data_ora DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/pulizie', async (req, res) => { try { const { ristorante_id, area, prodotto, operatore, conformita, data_ora } = req.body; await pool.query("INSERT INTO haccp_cleaning (ristorante_id, area, prodotto, operatore, conformita, data_ora) VALUES ($1, $2, $3, $4, $5, $6)", [ristorante_id, area, prodotto, operatore, conformita !== undefined ? conformita : true, data_ora || new Date()]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/pulizie/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_cleaning WHERE id = $1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

// =================================================================================
// 8. STATISTICHE & DB FIX
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

router.get('/api/db-fix-magazzino-v2', async (req, res) => {
    try {
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS is_haccp BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS ora TEXT DEFAULT ''");
        res.send("✅ DATABASE AGGIORNATO: Aggiunto flag 'is_haccp' e 'ora'!");
    } catch (e) {
        console.error("Errore DB Fix:", e);
        res.status(500).send("Errore DB: " + e.message);
    }
});

// =================================================================================
// 9. GESTIONE RICETTE & AUTO-MATCHING
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
            GROUP BY r.id
            ORDER BY r.nome ASC
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
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

router.get('/api/haccp/ricette/match/:id', async (req, res) => {
    try {
        const { id } = req.params; const { ristorante_id } = req.query;
        const ingRes = await pool.query("SELECT ingrediente_nome FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [id]);
        const ingredientiRichiesti = ingRes.rows.map(r => r.ingrediente_nome);
        const risultati = [];
        for (const ingName of ingredientiRichiesti) {
            const matchQuery = `SELECT prodotto, fornitore, lotto, scadenza FROM haccp_merci WHERE ristorante_id = $1 AND prodotto ILIKE $2 AND (scadenza IS NULL OR scadenza >= CURRENT_DATE) ORDER BY data_ricezione DESC LIMIT 1`;
            const matchRes = await pool.query(matchQuery, [ristorante_id, `%${ingName}%`]);
            if (matchRes.rows.length > 0) {
                const item = matchRes.rows[0];
                risultati.push({ ingrediente_base: ingName, found: true, text: `${item.prodotto} - ${item.fornitore} (L:${item.lotto})`, dati_match: item });
            } else {
                risultati.push({ ingrediente_base: ingName, found: false, text: `${ingName} (MANCANTE)`, dati_match: null });
            }
        }
        res.json({ success: true, risultati });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/haccp/ricette/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_ricette WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// =================================================================================
// 10. EXPORT & IMPORT UTILS (RICETTE & EXPORT GLOBALE)
// =================================================================================
router.get('/api/haccp/export-ricette/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const result = await pool.query(`SELECT r.nome, STRING_AGG(ri.ingrediente_nome, ', ') as ingredienti FROM haccp_ricette r LEFT JOIN haccp_ricette_ingredienti ri ON r.id = ri.ricetta_id WHERE r.ristorante_id = $1 GROUP BY r.id, r.nome ORDER BY r.nome ASC`, [ristorante_id]);
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(wb, ws, "Ricette");
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="ricettario.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/haccp/import-ricette', uploadFile.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File mancante" });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const { ristorante_id } = req.body;

        for (const row of data) {
            const nome = row['nome'] || row['Nome'];
            const ingString = row['ingredienti'] || row['Ingredienti'];
            if (nome && ingString) {
                const resRic = await client.query("INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id", [ristorante_id, nome]);
                const newId = resRic.rows[0].id;
                const ingArr = ingString.split(',').map(s => s.trim());
                for (const ing of ingArr) {
                    if(ing) await client.query("INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)", [newId, ing]);
                }
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "Errore Import: " + e.message });
    } finally { client.release(); }
});

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
        const headers = ["Data Prod.", "Prodotto", "Ingredienti (Produttore/Lotto)", "Tipo", "Lotto Produzione", "Scadenza", "Operatore"];
        const rows = r.rows.map(l => [new Date(l.data_produzione).toLocaleDateString('it-IT'), String(l.prodotto || ''), String(l.ingredienti || '').replace(/, /g, '\n'), String(l.tipo_conservazione || ''), String(l.lotto || ''), new Date(l.data_scadenza).toLocaleDateString('it-IT'), String(l.operatore || '')]);
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="produzione_${rangeName || 'export'}.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(String(azienda.nome), { align: 'center' });
            doc.fontSize(10).text(String(azienda.dati_fiscali || ""), { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`${titoloReport}: ${rangeName || 'Completo'}`, { align: 'center' });
            doc.moveDown();
            await doc.table({ headers, rows }, { width: 750, columnsSize: [70, 100, 250, 60, 100, 70, 80], prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8) });
            doc.end();
        } else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
            xlsx.utils.book_append_sheet(wb, ws, "Produzione");
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="produzione_${rangeName || 'export'}.xlsx"`);
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
        let headers = []; let rows = []; let sheetName = "Export"; let titoloReport = "REPORT HACCP";
        
        if (tipo === 'temperature') {
            sheetName = "Temperature";
            titoloReport = "REGISTRO TEMPERATURE";
            headers = ["Data", "Ora", "Macchina", "Temp", "Esito", "Az. Correttiva", "Op."];
            let sql = `SELECT l.data_ora, a.nome as asset, l.valore, l.conformita, l.azione_correttiva, l.operatore FROM haccp_logs l JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND l.data_ora >= $2 AND l.data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY l.data_ora ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => { const d = new Date(row.data_ora); return [d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), String(row.asset || ''), String(row.valore === 'OFF' ? 'SPENTO' : `${row.valore}°C`), row.conformita ? "OK" : "NO", String(row.azione_correttiva || ""), String(row.operatore || "")]; });
        } else if (tipo === 'merci') { 
            sheetName = "Registro Acquisti";
            titoloReport = "CONTABILITÀ MAGAZZINO & ACQUISTI";
            headers = ["Data", "Fornitore", "Prodotto", "Qta", "Unitario €", "Imponibile €", "IVA %", "Totale IVA €", "Totale Lordo €", "Num. Doc", "Note"];
            
            let sql = `SELECT * FROM haccp_merci WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ricezione ASC`; 
            
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => {
                const qta = parseFloat(row.quantita) || 0;
                const unit = parseFloat(row.prezzo_unitario) || 0;
                const imponibile = parseFloat(row.prezzo) || (qta * unit);
                const ivaPerc = parseFloat(row.iva) || 0;
                const ivaValore = imponibile * (ivaPerc / 100);
                const totaleLordo = imponibile + ivaValore;

                return [
                    new Date(row.data_ricezione).toLocaleDateString('it-IT'),
                    String(row.fornitore || ''),
                    String(row.prodotto || ''),
                    String(qta),
                    `€ ${unit.toFixed(2)}`,       
                    `€ ${imponibile.toFixed(2)}`, 
                    `${ivaPerc}%`,                
                    `€ ${ivaValore.toFixed(2)}`,  
                    `€ ${totaleLordo.toFixed(2)}`,
                    String(row.lotto || '-'),     
                    String(row.note || '')
                ];
            });
        
        } else if (tipo === 'assets') { 
            sheetName = "Lista Macchine";
            titoloReport = "LISTA MACCHINE E ATTREZZATURE";
            headers = ["Stato", "Nome", "Tipo", "Marca", "Matricola", "Range"];
            const r = await pool.query(`SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY nome ASC`, [ristorante_id]);
            rows = r.rows.map(row => [String(row.stato ? row.stato.toUpperCase() : "ATTIVO"), String(row.nome || ''), String(row.tipo || ''), String(row.marca || ''), String(row.serial_number || '-'), `${row.range_min}°C / ${row.range_max}°C`]);
        } else if (tipo === 'pulizie') {
            sheetName = "Registro Pulizie";
            titoloReport = "REGISTRO PULIZIE E SANIFICAZIONI";
            headers = ["Data", "Ora", "Area/Attrezzatura", "Detergente", "Operatore", "Esito"];
            let sql = `SELECT * FROM haccp_cleaning WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ora >= $2 AND data_ora <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ora ASC`;
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => [new Date(row.data_ora).toLocaleDateString('it-IT'), new Date(row.data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}), String(row.area || ''), String(row.prodotto || ''), String(row.operatore || ''), row.conformita ? "OK" : "NON CONFORME"]);
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}.pdf"`);
            doc.pipe(res);
            doc.fontSize(16).text(String(aziendaInfo.nome), { align: 'center' });
            doc.fontSize(10).text(String(aziendaInfo.dati_fiscali || ""), { align: 'center' });
            doc.moveDown(0.5); 
            doc.fontSize(12).text(`${titoloReport} - ${rangeName || 'Completo'}`, { align: 'center' }); 
            doc.moveDown(1);
            const table = { headers: headers, rows: rows };
            await doc.table(table, { width: 500, prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8), prepareRow: () => doc.font("Helvetica").fontSize(8).fillColor('black') });
            doc.end();
            return; 
        }

        const wb = xlsx.utils.book_new();
        const rowAzienda = [aziendaInfo.dati_fiscali || aziendaInfo.nome];
        const rowPeriodo = [`Periodo: ${rangeName || 'Tutto lo storico'}`];
        const rowTitolo = [titoloReport];
        const rowEmpty = [""];
        const finalData = [rowAzienda, rowPeriodo, rowTitolo, rowEmpty, headers, ...rows];
        const ws = xlsx.utils.aoa_to_sheet(finalData);
        if(!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }); 
        ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }); 
        ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }); 
        const wscols = headers.map(() => ({wch: 20}));
        ws['!cols'] = wscols;
        xlsx.utils.book_append_sheet(wb, ws, sheetName);
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="haccp_${tipo}_export.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { if (!res.headersSent) res.status(500).json({ error: "Errore Export: " + err.message }); }
});

module.exports = router;