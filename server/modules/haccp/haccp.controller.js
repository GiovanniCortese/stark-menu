// server/modules/haccp/haccp.controller.js
const pool = require('../../config/db');
const { sendWA } = require('../../utils/whatsappClient');

// --- 1. GESTIONE ASSETS (Frighi, Congelatori, ecc) ---
exports.getAssets = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1 ORDER BY nome ASC", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveAsset = async (req, res) => {
    try {
        const { id, ristorante_id, nome, tipo, temperatura_target, tolleranza } = req.body;
        // Se c'è un file foto, usa quello, altrimenti usa l'URL passato nel body
        const foto_url = req.file ? req.file.path : req.body.foto_url;

        if (id) {
            await pool.query(
                "UPDATE haccp_assets SET nome=$1, tipo=$2, temperatura_target=$3, tolleranza=$4, foto_url=COALESCE($5, foto_url) WHERE id=$6",
                [nome, tipo, temperatura_target, tolleranza, foto_url, id]
            );
        } else {
            await pool.query(
                "INSERT INTO haccp_assets (ristorante_id, nome, tipo, temperatura_target, tolleranza, foto_url) VALUES ($1, $2, $3, $4, $5, $6)",
                [ristorante_id, nome, tipo, temperatura_target, tolleranza, foto_url]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteAsset = async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_assets WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 2. REGISTRAZIONE TEMPERATURE (Con WhatsApp Alert 🚨) ---
exports.getLogs = async (req, res) => {
    try {
        // Recupera ultimi 300 logs (per non appesantire)
        const r = await pool.query("SELECT * FROM haccp_logs WHERE ristorante_id = $1 ORDER BY data_ora DESC LIMIT 300", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createLog = async (req, res) => {
    try {
        const { ristorante_id, asset_id, valore, operatore, note } = req.body;
        const foto_url = req.file ? req.file.path : null;
        
        await pool.query(
            "INSERT INTO haccp_logs (ristorante_id, asset_id, valore, operatore, note, foto_url) VALUES ($1, $2, $3, $4, $5, $6)",
            [ristorante_id, asset_id, valore, operatore, note, foto_url]
        );

        // --- 🚨 JARVIS SENTINEL: CONTROLLO ALLARME ---
        // Recuperiamo i limiti dell'asset
        const assetRes = await pool.query("SELECT nome, temperatura_target, tolleranza FROM haccp_assets WHERE id = $1", [asset_id]);
        
        if (assetRes.rows.length > 0) {
            const asset = assetRes.rows[0];
            const tempRilevata = parseFloat(valore);
            const target = parseFloat(asset.temperatura_target || 0);
            const tolleranza = parseFloat(asset.tolleranza || 5); // Default 5 gradi

            const limiteMax = target + tolleranza;
            const limiteMin = target - tolleranza;

            // Se fuori range...
            if (tempRilevata > limiteMax || tempRilevata < limiteMin) {
                console.log(`🔥 ALLARME HACCP: ${asset.nome} segna ${tempRilevata}°C (Target: ${target}°C)`);
                
                // Recupera numero titolare
                const ownerRes = await pool.query("SELECT telefono, nome_titolare FROM ristoranti WHERE id = $1", [ristorante_id]);
                if (ownerRes.rows.length > 0 && ownerRes.rows[0].telefono) {
                    const { telefono, nome_titolare } = ownerRes.rows[0];
                    
                    // Invia WhatsApp (Template o Testo)
                    await sendWA(telefono, {
                        name: "allarme_haccp", // Assicurati di avere questo template su Meta
                        params: [asset.nome, `${tempRilevata}°C`, "Verificare impianto!"]
                    }, true); 
                }
            }
        }

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 3. PULIZIE ---
exports.getPulizie = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM haccp_pulizie WHERE ristorante_id = $1 ORDER BY data_ora DESC LIMIT 100", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPulizia = async (req, res) => {
    try {
        const { ristorante_id, area, operatore, prodotto, conformita } = req.body;
        await pool.query(
            "INSERT INTO haccp_pulizie (ristorante_id, area, operatore, prodotto, conformita) VALUES ($1, $2, $3, $4, $5)",
            [ristorante_id, area, operatore, prodotto, conformita]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deletePulizia = async (req, res) => {
    try {
        await pool.query("DELETE FROM haccp_pulizie WHERE id=$1", [req.params.id]);
        res.json({success:true});
    } catch (e) { res.status(500).json({error:e.message}); }
};

// --- 4. RICETTE (Per Etichettatura) ---
exports.getRicette = async (req, res) => {
    try {
        // Query complessa per ottenere ricetta + ingredienti in un array
        const query = `
            SELECT r.id, r.nome, r.descrizione, 
            COALESCE(JSON_AGG(ri.ingrediente_nome) FILTER (WHERE ri.ingrediente_nome IS NOT NULL), '[]') as ingredienti
            FROM haccp_ricette r
            LEFT JOIN haccp_ricette_ingredienti ri ON r.id = ri.ricetta_id
            WHERE r.ristorante_id = $1
            GROUP BY r.id ORDER BY r.nome ASC
        `;
        const r = await pool.query(query, [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveRicetta = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id, ristorante_id, nome, ingredienti } = req.body; // ingredienti è array stringhe
        await client.query('BEGIN');

        let ricettaId = id;

        if (id) {
            await client.query("UPDATE haccp_ricette SET nome = $1 WHERE id = $2", [nome, id]);
            // Rimuovi vecchi ingredienti per reinserirli
            await client.query("DELETE FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [id]);
        } else {
            const resIns = await client.query("INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id", [ristorante_id, nome]);
            ricettaId = resIns.rows[0].id;
        }

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
    } finally {
        client.release();
    }
};

// --- 5. ETICHETTE PRODUZIONE ---
exports.createLabel = async (req, res) => {
    try {
        const { ristorante_id, prodotto, ingredienti, data_scadenza, lotto, operatore, quantita } = req.body;
        await pool.query(
            "INSERT INTO haccp_labels (ristorante_id, prodotto, ingredienti, data_scadenza, lotto, operatore, quantita) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [ristorante_id, prodotto, ingredienti, data_scadenza, lotto, operatore, quantita]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getLabelsHistory = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM haccp_labels WHERE ristorante_id = $1 ORDER BY data_produzione DESC LIMIT 50", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};