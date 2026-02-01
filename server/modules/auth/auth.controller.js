// server/modules/auth/auth.controller.js
const pool = require('../../config/db');

// --- LOGIN GENERALE ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]);
        
        if (r.rows.length > 0) {
            await pool.query("UPDATE utenti SET ultimo_accesso = NOW() WHERE id = $1", [r.rows[0].id]);
            res.json({ success: true, user: r.rows[0] });
        } else {
            res.json({ success: false, error: "Credenziali errate" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Errore login" });
    }
};

// --- LOGIN CASSA (Postazione Fissa) ---
exports.loginCassa = async (req, res) => {
    try {
        const { slug, password } = req.body;
        const result = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        
        const rist = result.rows[0];
        // Controllo Password Cassa
        if (password === rist.pw_cassa) { // Nota: In produzione usa hash!
             res.json({ success: true, role: 'cassa', ristorante_id: rist.id });
        } else {
             res.status(401).json({ error: "PIN Cassa Errato" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- GESTIONE UTENTI CRUD ---
exports.getUsers = async (req, res) => {
    try {
        const { ristorante_id, mode } = req.query;
        let query = "SELECT * FROM utenti WHERE ristorante_id = $1";
        // Se mode=staff nascondi i clienti, se mode=clienti mostra solo clienti, etc.
        // Per ora manteniamo semplice:
        const r = await pool.query(query, [ristorante_id]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { nome, email, password, ruolo, ristorante_id, telefono } = req.body;
        // Check duplicati
        const check = await pool.query("SELECT id FROM utenti WHERE email = $1", [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email già in uso" });

        await pool.query(
            "INSERT INTO utenti (nome, email, password, ruolo, ristorante_id, telefono) VALUES ($1, $2, $3, $4, $5, $6)",
            [nome, email, password, ruolo, ristorante_id, telefono]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { nome, email, password, telefono, indirizzo, ruolo } = req.body;
        await pool.query(
            `UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`, 
            [nome, email, password, telefono, indirizzo, ruolo, req.params.id]
        ); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
};

exports.deleteUser = async (req, res) => { 
    try { 
        await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
};