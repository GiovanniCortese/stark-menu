// server/controllers/haccp/registriController.js
const pool = require('../../config/db');
const { getItalyDateComponents } = require('../../utils/time'); 

// --- FUNZIONE AUTO-FIX COLONNE MANCANTI ---
const ensureMerciColumnsExist = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS haccp_merci (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER,
                data_arrivo TIMESTAMP,
                fornitore TEXT,
                prodotto TEXT,
                quantita TEXT,
                unita_misura TEXT,
                prezzo_unitario TEXT,
                totale TEXT,
                lotto TEXT,
                scadenza DATE,
                destinazione TEXT,
                allegato_url TEXT,
                is_haccp BOOLEAN DEFAULT TRUE
            );
        `);
        // Aggiunge le colonne se mancano (Magazzino Update)
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS numero_bolla TEXT;");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT;");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS note TEXT;");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS condizioni TEXT DEFAULT 'conforme';");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS rif_documento TEXT;"); // Legacy support
    } catch (e) {
        console.log("Auto-fix DB Merci: Colonne già presenti o errore non critico.");
    }
};

// 1. ASSETS
exports.getAssets = async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY tipo, nome", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } };

exports.createAsset = async (req, res) => { 
    try { 
        const { ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, locale } = req.body; 
        await pool.query(
            `INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, locale) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, 
            [ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato || 'attivo', locale || 'Cucina'] 
        ); 
        res.json({success:true}); 
    } catch(e) { res.status(500).json({error:e.message}); } 
};

exports.updateAsset = async (req, res) => { 
    try { 
        const { nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, locale } = req.body; 
        await pool.query(
            `UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4, marca=$5, modello=$6, serial_number=$7, foto_url=$8, etichetta_url=$9, stato=$10, locale=$11 WHERE id=$12`, 
            [nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, locale, req.params.id]
        ); 
        res.json({success:true}); 
    } catch(e) { res.status(500).json({error:e.message}); } 
};
exports.deleteAsset = async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } };

// 2. LOGS (TEMPERATURE) - FIX TIMEZONE ITALIA
exports.getLogs = async (req, res) => { 
    try { 
        const { start, end } = req.query; 
        let query = `
            SELECT l.*, a.nome as nome_asset 
            FROM haccp_logs l 
            LEFT JOIN haccp_assets a ON l.asset_id = a.id 
            WHERE l.ristorante_id = $1
        `;
        const params = [req.params.ristorante_id]; 
        
        if (start && end) { 
            query += ` 
                AND (l.data_ora AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome') >= $2::timestamp 
                AND (l.data_ora AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome') <= $3::timestamp 
                ORDER BY l.data_ora ASC
            `; 
            params.push(start, end); 
        } else { 
            query += ` AND l.data_ora >= NOW() - INTERVAL '3 months' ORDER BY l.data_ora DESC`; 
        } 
        const r = await pool.query(query, params); 
        res.json(r.rows); 
    } catch(e) { console.error("Errore getLogs", e); res.status(500).json({error:"Err"}); } 
};

exports.createLog = async (req, res) => { 
    try { 
        const { ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora } = req.body; 
        if (data_ora) {
            await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9)", [ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora]); 
        } else {
            await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url]); 
        }
        res.json({success:true}); 
    } catch(e) { res.status(500).json({error:"Err"}); } 
};

exports.updateLog = async (req, res) => { 
    try { 
        const { valore, conformita, azione_correttiva, foto_prova_url } = req.body; 
        await pool.query("UPDATE haccp_logs SET valore=$1, conformita=$2, azione_correttiva=$3, foto_prova_url=$4 WHERE id=$5", [valore, conformita, azione_correttiva, foto_prova_url, req.params.id]); 
        res.json({success:true}); 
    } catch(e) { res.status(500).json({error:"Err"}); } 
};

exports.deleteLog = async (req, res) => { try { await pool.query("DELETE FROM haccp_logs WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } };

// 3. ETICHETTE PRODUZIONE
exports.createLabel = async (req, res) => { try { const { ristorante_id, prodotto, data_scadenza, operatore, tipo_conservazione, ingredienti } = req.body; const t = getItalyDateComponents(); const lotto = `L-${t.year}${t.month}${t.day}-${t.hour}${t.minute}`; const r = await pool.query("INSERT INTO haccp_labels (ristorante_id, prodotto, lotto, data_produzione, data_scadenza, operatore, tipo_conservazione, ingredienti) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *", [ristorante_id, prodotto, lotto, data_scadenza, operatore, tipo_conservazione, ingredienti || '']); res.json({success:true, label: r.rows[0]}); } catch(e) { res.status(500).json({error:"Err"}); } };
exports.getLabelsHistory = async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_labels WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_produzione >= $2 AND data_produzione <= $3 ORDER BY data_produzione ASC"; params.push(start, end); } else { sql += " AND data_produzione >= NOW() - INTERVAL '7 days' ORDER BY data_produzione DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error: "Errore recupero storico"}); } };

// 4. PULIZIE
exports.getPulizie = async (req, res) => { try { const { start, end } = req.query; let sql = "SELECT * FROM haccp_cleaning WHERE ristorante_id = $1"; const params = [req.params.ristorante_id]; if (start && end) { sql += " AND data_ora >= $2 AND data_ora <= $3 ORDER BY data_ora ASC"; params.push(start, end); } else { sql += " AND data_ora >= NOW() - INTERVAL '7 days' ORDER BY data_ora DESC"; } const r = await pool.query(sql, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } };
exports.createPulizia = async (req, res) => { try { const { ristorante_id, area, prodotto, operatore, conformita, data_ora } = req.body; await pool.query("INSERT INTO haccp_cleaning (ristorante_id, area, prodotto, operatore, conformita, data_ora) VALUES ($1, $2, $3, $4, $5, $6)", [ristorante_id, area, prodotto, operatore, conformita !== undefined ? conformita : true, data_ora || new Date()]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } };
exports.deletePulizia = async (req, res) => { try { await pool.query("DELETE FROM haccp_cleaning WHERE id = $1", [req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } };

// 5. MERCI (CON AUTO-FIX DB)
exports.getMerci = async (req, res) => {
    try {
        const { start, end, mode } = req.query;
        let sql = "SELECT * FROM haccp_merci WHERE ristorante_id = $1";
        const params = [req.params.ristorante_id];
        
        if (mode === 'haccp') sql += " AND is_haccp = true";

        if (start && end) {
            sql += " AND data_arrivo >= $2 AND data_arrivo <= $3 ORDER BY data_arrivo DESC";
            params.push(start, end);
        } else {
            sql += " AND data_arrivo >= '2020-01-01' ORDER BY data_arrivo DESC";
        }
        
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch(e) { 
        if (e.code === '42P01') return res.json([]);
        res.status(500).json({error: "Errore recupero merci"}); 
    }
};

exports.createMerci = async (req, res) => {
    try {
        await ensureMerciColumnsExist(); // Auto-crea colonne mancanti

        const { 
            ristorante_id, data_ricezione, ora, fornitore, 
            numero_bolla, codice_articolo, 
            prodotto, quantita, unita_misura, 
            prezzo_unitario, totale, lotto, scadenza, destinazione,
            condizioni, note,
            allegato_url, is_haccp
        } = req.body;

        // Gestione data
        const dateStr = data_ricezione ? data_ricezione.split('T')[0] : new Date().toISOString().split('T')[0];
        const timePart = ora || '12:00';
        const data_arrivo = `${dateStr}T${timePart}:00`;

        await pool.query(
            `INSERT INTO haccp_merci 
            (ristorante_id, data_arrivo, fornitore, numero_bolla, codice_articolo, prodotto, quantita, unita_misura, prezzo_unitario, totale, lotto, scadenza, destinazione, condizioni, note, allegato_url, is_haccp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [ristorante_id, data_arrivo, fornitore, numero_bolla, codice_articolo, prodotto, quantita, unita_misura, prezzo_unitario, totale, lotto, scadenza || null, destinazione, condizioni, note, allegato_url, is_haccp !== undefined ? is_haccp : true]
        );
        
        res.json({success: true});
    } catch (e) {
        console.error("Errore createMerci", e);
        res.status(500).json({error: "Errore inserimento merci"});
    }
};

exports.updateMerci = async (req, res) => {
    try {
        await ensureMerciColumnsExist(); // Auto-crea colonne mancanti

        const { 
            data_ricezione, ora, fornitore, 
            numero_bolla, codice_articolo,
            prodotto, quantita, unita_misura, 
            prezzo_unitario, totale, lotto, scadenza, destinazione,
            condizioni, note,
            allegato_url, is_haccp 
        } = req.body;

        const dateStr = data_ricezione ? data_ricezione.split('T')[0] : new Date().toISOString().split('T')[0];
        const timePart = ora || '12:00';
        const data_arrivo = `${dateStr}T${timePart}:00`;

        await pool.query(
            `UPDATE haccp_merci SET 
                data_arrivo=$1, fornitore=$2, numero_bolla=$3, codice_articolo=$4, prodotto=$5, 
                quantita=$6, unita_misura=$7, prezzo_unitario=$8, totale=$9, 
                lotto=$10, scadenza=$11, destinazione=$12, condizioni=$13, note=$14,
                allegato_url=$15, is_haccp=$16
             WHERE id=$17`,
            [data_arrivo, fornitore, numero_bolla, codice_articolo, prodotto, quantita, unita_misura, prezzo_unitario, totale, lotto, scadenza || null, destinazione, condizioni, note, allegato_url, is_haccp, req.params.id]
        );

        res.json({success: true});
    } catch (e) {
        console.error("Errore updateMerci", e);
        res.status(500).json({error: "Errore aggiornamento merci"});
    }
};

exports.deleteMerci = async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_merci WHERE id=$1", [req.params.id]);
        res.json({success: true});
    } catch (e) {
        res.status(500).json({error: "Errore eliminazione"});
    }
};