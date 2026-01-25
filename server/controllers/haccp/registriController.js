const pool = require('../../config/db');
const { getItalyDateComponents } = require('../../utils/time'); 

// 1. ASSETS
exports.getAssets = async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY tipo, nome", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } };
exports.createAsset = async (req, res) => { try { const { ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato || 'attivo']); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } };
exports.updateAsset = async (req, res) => { try { const { nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato } = req.body; await pool.query(`UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4, marca=$5, modello=$6, serial_number=$7, foto_url=$8, etichetta_url=$9, stato=$10 WHERE id=$11`, [nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url, stato, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } };
exports.deleteAsset = async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } };

// 2. LOGS (TEMPERATURE) - FIX DATE
exports.getLogs = async (req, res) => { try { const { start, end } = req.query; let query = `SELECT l.*, a.nome as nome_asset FROM haccp_logs l LEFT JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1`; const params = [req.params.ristorante_id]; if (start && end) { query += ` AND l.data_ora >= $2 AND l.data_ora <= $3 ORDER BY l.data_ora ASC`; params.push(start, end); } else { query += ` AND l.data_ora >= NOW() - INTERVAL '7 days' ORDER BY l.data_ora DESC`; } const r = await pool.query(query, params); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } };

exports.createLog = async (req, res) => { 
    try { 
        // FIX: Accetta data_ora dal body. Se null, usa default DB (NOW())
        const { ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora } = req.body; 
        
        if (data_ora) {
            // Inserimento retroattivo (es. cliccando sulla cella vuota del calendario)
            await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9)", [ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url, data_ora]); 
        } else {
            // Inserimento live (pulsante normale)
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