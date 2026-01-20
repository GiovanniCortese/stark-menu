const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getItalyDateComponents } = require('../utils/time');
const { uploadFile } = require('../config/storage'); // <--- QUESTA MANCAVA
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');
const OpenAI = require('openai'); // Aggiungi questo import in alto

// Assets
router.get('/api/haccp/assets/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY tipo, nome", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/assets', async (req, res) => { try { const { ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato || 'attivo']); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.put('/api/haccp/assets/:id', async (req, res) => { try { const { nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4, marca=$5, modello=$6, serial_number=$7, foto_url=$8, etichetta_url=$9, stato=$10 WHERE id=$11`, [nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/assets/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// Logs (Temperature, ecc)
router.get('/api/haccp/logs/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let query = `SELECT l.*, a.nome as nome_asset FROM haccp_logs l LEFT JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`; const params = [req.params.ristorante_id]; if (start && end) { query += ` AND l.data_ora >= $2 AND l.data_ora <= $3 ORDER BY l.data_ora ASC`; params.push(start, end); } else { query += ` AND l.data_ora >= NOW() - INTERVAL '7 days' ORDER BY l.data_ora DESC`; } const r = await pool.query(query, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/logs', async (req, res) => { try { const { ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url } = req.body; await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.put('/api/haccp/logs/:id', async (req, res) => { try { const { valore, conformita, azione_correttiva, foto_prova_url } = req.body; await pool.query("UPDATE haccp_logs SET valore=$1, conformita=$2, azione_correttiva=$3, foto_prova_url=$4 WHERE id=$5", [valore, conformita, azione_correttiva, foto_prova_url, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.delete('/api/haccp/logs/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_logs WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

// Etichette Produzione
router.post('/api/haccp/labels', async (req, res) => { try { const { ristorante_id, prodotto, data_scadenza, operatore, tipo_conservazione, ingredienti } = req.body; const t = getItalyDateComponents(); const lotto = `L-${t.year}${t.month}${t.day}-${t.hour}${t.minute}`; const r = await pool.query("INSERT INTO haccp_labels (ristorante_id, prodotto, lotto, data_produzione, data_scadenza, operatore, tipo_conservazione, ingredienti) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *", [ristorante_id, prodotto, lotto, data_scadenza, operatore, tipo_conservazione, ingredienti || '']); res.json({success:true, label: r.rows[0]}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.get('/api/haccp/labels/storico/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_produzione >= $2 AND data_produzione <= $3 ORDER BY data_produzione ASC"; params.push(start, end); } else { sql += " AND data_produzione >= NOW() - INTERVAL '7 days' ORDER BY data_produzione DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error: "Errore recupero storico"}); } });

// Ricevimento Merci
router.get('/api/haccp/merci/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_merci WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_ricezione >= $2 AND data_ricezione <= $3 ORDER BY data_ricezione ASC"; params.push(start, end); } else { sql += " AND data_ricezione >= NOW() - INTERVAL '7 days' ORDER BY data_ricezione DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/merci', async (req, res) => { 
    try { 
        const { ristorante_id, data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo } = req.body; 
        await pool.query(`INSERT INTO haccp_merci (ristorante_id, data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, 
        [ristorante_id, data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, prezzo || 0]); 
        res.json({success:true}); 
    } catch(e) { console.error(e); res.status(500).json({error:"Err"}); } 
});
router.put('/api/haccp/merci/:id', async (req, res) => { try { const { data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione } = req.body; await pool.query(`UPDATE haccp_merci SET data_ricezione=$1, fornitore=$2, prodotto=$3, lotto=$4, scadenza=$5, temperatura=$6, conforme=$7, integro=$8, note=$9, operatore=$10, quantita=$11, allegato_url=$12, destinazione=$13 WHERE id=$14`, [data_ricezione, fornitore, prodotto, lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, allegato_url, destinazione, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });
router.delete('/api/haccp/merci/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_merci WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

// Pulizie
router.get('/api/haccp/pulizie/:ristorante_id', async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_cleaning WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_ora >= $2 AND data_ora <= $3 ORDER BY data_ora ASC"; params.push(start, end); } else { sql += " AND data_ora >= NOW() - INTERVAL '7 days' ORDER BY data_ora DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/api/haccp/pulizie', async (req, res) => { try { const { ristorante_id, area, prodotto, operatore, conformita, data_ora } = req.body; await pool.query("INSERT INTO haccp_cleaning (ristorante_id, area, prodotto, operatore, conformita, data_ora) VALUES ($1, $2, $3, $4, $5, $6)", [ristorante_id, area, prodotto, operatore, conformita !== undefined ? conformita : true, data_ora || new Date()]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/api/haccp/pulizie/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_cleaning WHERE id = $1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

// Statistiche Fornitori & Spese
router.get('/api/haccp/stats/magazzino/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        
        // 1. Totale speso per fornitore
        const speseFornitori = await pool.query(`
            SELECT fornitore, SUM(prezzo) as totale, COUNT(*) as numero_bolle 
            FROM haccp_merci WHERE ristorante_id = $1 
            GROUP BY fornitore ORDER BY totale DESC
        `, [ristorante_id]);

        // 2. Ultimi movimenti (Log completo)
        const storico = await pool.query(`
            SELECT * FROM haccp_merci WHERE ristorante_id = $1 ORDER BY data_ricezione DESC LIMIT 500
        `, [ristorante_id]);

        // 3. Top prodotti acquistati (per spesa)
        const topProdotti = await pool.query(`
            SELECT prodotto, SUM(prezzo) as totale_speso, COUNT(*) as acquisti 
            FROM haccp_merci WHERE ristorante_id = $1 
            GROUP BY prodotto ORDER BY totale_speso DESC LIMIT 10
        `, [ristorante_id]);

        res.json({ 
            fornitori: speseFornitori.rows, 
            storico: storico.rows,
            top_prodotti: topProdotti.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ROTTA INTELLIGENTE: Scansione Bolla con AI
router.post('/api/haccp/scan-bolla', uploadFile.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessuna foto inviata" });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Manca API Key OpenAI" });

        // 1. Converti immagine in Base64
        const base64Image = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // 2. Chiedi a GPT-4o di analizzare
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Sei un esperto contabile e HACCP. Analizza l'immagine di questa bolla/fattura.
Estrai i dati e restituisci SOLO un oggetto JSON valido con questa struttura:
{
    "fornitore": Str,
    "data_ricezione": "YYYY-MM-DD", 
    "prodotti": [
        { "nome": Str, "quantita": Str, "prezzo": Number (totale riga o unitario, stima tu), "lotto": Str (o null), "scadenza": "YYYY-MM-DD" (o null) }
    ]
}.
Se i prodotti sono tanti, elencali tutti.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analizza questa bolla." },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 1000
        });

        // 3. Pulisci e invia il JSON
        let text = response.choices[0].message.content;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data;
try {
    data = JSON.parse(text);
} catch (e) {
    console.error("Risposta IA non valida:", text);
    // Restituisci un errore gentile al frontend invece di far esplodere il server
    return res.status(400).json({ error: "L'IA non è riuscita a leggere la foto. Riprova con una più nitida." });
}

        res.json({ success: true, data });

    } catch (e) {
        console.error("Errore AI:", e);
        res.status(500).json({ error: "Errore durante l'analisi AI: " + e.message });
    }
});

// --- GESTIONE RICETTE & AUTO-MATCHING ---
// 1. Prendi tutte le ricette del ristorante
router.get('/api/haccp/ricette/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        // Prende ricette e, in un array aggregato, gli ingredienti
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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Crea una nuova Ricetta
router.post('/api/haccp/ricette', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { ristorante_id, nome, ingredienti } = req.body; // ingredienti è un array ["Farina", "Uova"]
        
        // Inserisci testata ricetta
        const resRicetta = await client.query(
            "INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id",
            [ristorante_id, nome]
        );
        const ricettaId = resRicetta.rows[0].id;

        // Inserisci ingredienti
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query(
                    "INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)",
                    [ricettaId, ing]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 3. LA LOGICA "SMART MATCH" (Il cuore della richiesta)
router.get('/api/haccp/ricette/match/:id', async (req, res) => {
    try {
        const { id } = req.params; // ID della ricetta
        const { ristorante_id } = req.query;

        // Recupera gli ingredienti richiesti dalla ricetta
        const ingRes = await pool.query("SELECT ingrediente_nome FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [id]);
        const ingredientiRichiesti = ingRes.rows.map(r => r.ingrediente_nome);

        const risultati = [];

        // Per ogni ingrediente richiesto, cerca nel magazzino
        for (const ingName of ingredientiRichiesti) {
            // Cerca il prodotto più recente in magazzino che contenga il nome (ILIKE = case insensitive)
            // Esclude prodotti scaduti
            const matchQuery = `
                SELECT prodotto, fornitore, lotto, scadenza 
                FROM haccp_merci 
                WHERE ristorante_id = $1 
                AND prodotto ILIKE $2 
                AND (scadenza IS NULL OR scadenza >= CURRENT_DATE)
                ORDER BY data_ricezione DESC 
                LIMIT 1
            `;
            // %nome% permette di trovare "Farina 00" cercando "Farina"
            const matchRes = await pool.query(matchQuery, [ristorante_id, `%${ingName}%`]);

            if (matchRes.rows.length > 0) {
                // TROVATO!
                const item = matchRes.rows[0];
                risultati.push({
                    ingrediente_base: ingName,
                    found: true,
                    text: `${item.prodotto} - ${item.fornitore} (L:${item.lotto})`,
                    dati_match: item
                });
            } else {
                // NON TROVATO (O SCADUTO)
                risultati.push({
                    ingrediente_base: ingName,
                    found: false,
                    text: `${ingName} (MANCANTE)`,
                    dati_match: null
                });
            }
        }

        res.json({ success: true, risultati });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Elimina Ricetta
router.delete('/api/haccp/ricette/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_ricette WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Modifica Ricetta
router.put('/api/haccp/ricette/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { nome, ingredienti } = req.body;
        
        // Aggiorna nome
        await client.query("UPDATE haccp_ricette SET nome = $1 WHERE id = $2", [nome, req.params.id]);

        // Aggiorna ingredienti (Strategia: Cancella tutti e reinserisci)
        await client.query("DELETE FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [req.params.id]);
        
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query(
                    "INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)",
                    [req.params.id, ing]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 6. Export Ricette (Excel)
router.get('/api/haccp/export-ricette/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const query = `
            SELECT r.nome, 
            STRING_AGG(ri.ingrediente_nome, ', ') as ingredienti
            FROM haccp_ricette r
            LEFT JOIN haccp_ricette_ingredienti ri ON r.id = ri.ricetta_id
            WHERE r.ristorante_id = $1
            GROUP BY r.id, r.nome
            ORDER BY r.nome ASC
        `;
        const result = await pool.query(query, [ristorante_id]);

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(result.rows); // Colonne: nome, ingredienti
        xlsx.utils.book_append_sheet(wb, ws, "Ricette");
        
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="ricettario.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 7. Import Ricette (Excel)
// Formato atteso Excel: Colonna A "Nome", Colonna B "Ingredienti" (separati da virgola)
router.post('/api/haccp/import-ricette', uploadFile.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File mancante" });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); // Array di oggetti

        const { ristorante_id } = req.body;

        for (const row of data) {
            const nome = row['nome'] || row['Nome'];
            const ingString = row['ingredienti'] || row['Ingredienti'];

            if (nome && ingString) {
                // Crea Ricetta
                const resRic = await client.query(
                    "INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id",
                    [ristorante_id, nome]
                );
                const newId = resRic.rows[0].id;

                // Splitta ingredienti e inserisci
                const ingArr = ingString.split(',').map(s => s.trim());
                for (const ing of ingArr) {
                    if(ing) {
                        await client.query(
                            "INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)",
                            [newId, ing]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "Errore Import: " + e.message });
    } finally {
        client.release();
    }
});

// EXPORT Labels
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
            const rowAzienda = [azienda.dati_fiscali || azienda.nome];
            const rowPeriodo = [`Periodo: ${rangeName || 'Tutto lo storico'}`];
            const rowTitolo = [titoloReport];
            const rowEmpty = [""];
            const finalData = [rowAzienda, rowPeriodo, rowTitolo, rowEmpty, headers, ...rows];
            const ws = xlsx.utils.aoa_to_sheet(finalData);
            const wscols = [{wch:12}, {wch:25}, {wch:50}, {wch:15}, {wch:20}, {wch:12}, {wch:15}];
            ws['!cols'] = wscols;
            if(!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
            ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
            ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } });
            xlsx.utils.book_append_sheet(wb, ws, "Produzione");
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="produzione_${rangeName || 'export'}.xlsx"`);
            res.send(buffer);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// EXPORT Generic
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
            sheetName = "Ricevimento Merci";
            titoloReport = "REGISTRO RICEVIMENTO MERCI";
            headers = ["Data", "Fornitore", "Prodotto", "Condizione Prodotti", "Lotto", "Kg", "Scadenza", "Note"];
            let sql = `SELECT * FROM haccp_merci WHERE ristorante_id = $1`;
            const params = [ristorante_id];
            if(start && end) { sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`; params.push(start, end); }
            sql += ` ORDER BY data_ricezione ASC`; 
            const r = await pool.query(sql, params);
            rows = r.rows.map(row => { let condizione = "CONFORME"; if (!row.conforme) condizione = "TEMP KO"; if (!row.integro) condizione = "PACCO ROTTO"; if (!row.conforme && !row.integro) condizione = "DANNEGGIATO"; return [new Date(row.data_ricezione).toLocaleDateString('it-IT'), String(row.fornitore || ''), String(row.prodotto || ''), condizione, String(row.lotto || ''), String(row.quantita || ''), row.scadenza ? new Date(row.scadenza).toLocaleDateString('it-IT') : "-", String(row.note || '')]; });
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