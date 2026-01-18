const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticator } = require('otplib');
require('dotenv').config();

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]);
        if (r.rows.length > 0) res.json({ success: true, user: r.rows[0] });
        else res.json({ success: false, error: "Credenziali errate" });
    } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

router.post('/register', async (req, res) => {
    try {
        const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body;
        const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" });
        const r = await pool.query('INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo, ristorante_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [nome, email, password, telefono, indirizzo, ruolo || 'cliente', ristorante_id || null]);
        res.json({ success: true, user: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query("SELECT * FROM ristoranti WHERE email = $1", [email]);
        if (result.rows.length > 0 && result.rows[0].password === password) {
            return res.json({ success: true, user: { id: result.rows[0].id, nome: result.rows[0].nome, slug: result.rows[0].slug } });
        }
        res.status(401).json({ success: false, error: "Credenziali errate" });
    } catch (e) { res.status(500).json({ success: false, error: "Errore interno" }); }
});

router.post('/auth/station', async (req, res) => {
    try {
        const { ristorante_id, role, password } = req.body;
        const col = { 'cassa': 'pw_cassa', 'cucina': 'pw_cucina', 'pizzeria': 'pw_pizzeria', 'bar': 'pw_bar', 'haccp': 'pw_haccp' }[role];
        if (!col) return res.json({ success: false, error: "Ruolo non valido" });
        const r = await pool.query(`SELECT id, nome, ${col} as password_reparto FROM ristoranti WHERE id = $1`, [ristorante_id]);
        if (r.rows.length > 0 && String(r.rows[0].password_reparto) === String(password)) res.json({ success: true, nome_ristorante: r.rows[0].nome });
        else res.json({ success: false, error: "Password Errata" });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.post('/super/login', (req, res) => {
    const { email, password, code2fa } = req.body;
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) return res.json({ success: false, error: "Credenziali errate" });
    if (!authenticator.check(code2fa, process.env.ADMIN_2FA_SECRET)) return res.json({ success: false, error: "2FA Errato" });
    res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" });
});

module.exports = router;