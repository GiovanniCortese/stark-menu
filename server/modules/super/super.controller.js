// server/modules/super/super.controller.js

const pool = require('../../config/db');

// Login SuperAdmin (Hardcoded o DB, qui semplice per il God Mode)
exports.superLogin = async (req, res) => {
    const { email, password, code2fa } = req.body;
    // Logica semplificata: In produzione usa hash e DB
    if (email === "admin@jarvis.it" && password === "stark2026") {
        res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" });
    } else {
        res.status(401).json({ error: "Credenziali non valide" });
    }
};

// Ottieni TUTTI i ristoranti
exports.getAllRistoranti = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM ristoranti ORDER BY id DESC");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Crea Ristorante
exports.createRistorante = async (req, res) => {
    try {
        const { nome, slug, email, password } = req.body;
        // Inserimento base (espandi con tutti i campi se necessario)
        await pool.query(
            "INSERT INTO ristoranti (nome, slug, email, password, account_attivo, data_creazione) VALUES ($1, $2, $3, $4, TRUE, NOW())",
            [nome, slug, email, password]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Aggiorna Ristorante (Toggle moduli, date scadenza)
exports.updateRistorante = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const fields = Object.keys(data);
        const values = Object.values(data);
        
        if (fields.length === 0) return res.json({ success: true });

        const setClause = fields.map((f, i) => `${f} = $${i+1}`).join(', ');
        
        await pool.query(`UPDATE ristoranti SET ${setClause} WHERE id = $${fields.length+1}`, [...values, id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Elimina Ristorante
exports.deleteRistorante = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const id = req.params.id;
        // Cascata manuale
        const tables = ['haccp_logs', 'haccp_merci', 'haccp_assets', 'ordini', 'prodotti', 'categorie', 'tavoli', 'utenti'];
        for(let t of tables) {
            await client.query(`DELETE FROM ${t} WHERE ristorante_id = $1`, [id]);
        }
        await client.query("DELETE FROM ristoranti WHERE id = $1", [id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};