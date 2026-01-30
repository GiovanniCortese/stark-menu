// server/routes/authRoutes.js - VERSIONE UNIFICATA 🔐
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { sendWA } = require('../utils/whatsappClient');

// --- 1. LOGIN GENERALE (Staff e Clienti) ---
router.post('/api/auth/login', async (req, res) => { 
    try { 
        const { email, password } = req.body; 
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]); 
        
        if (r.rows.length > 0) {
            // Aggiorna ultimo accesso
            await pool.query("UPDATE utenti SET ultimo_accesso = NOW() WHERE id = $1", [r.rows[0].id]);
            res.json({ success: true, user: r.rows[0] }); 
        } else {
            res.json({ success: false, error: "Credenziali errate" }); 
        }
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore login" }); 
    } 
});

// --- 2. LOGIN CASSA (Specifico per postazione fissa) ---
router.post('/api/cassa/login', async (req, res) => {
    try {
        const { slug, password } = req.body;
        const result = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Ristorante non trovato" });

        const ristorante = result.rows[0];
        // Nota: Idealmente usa hash, qui manteniamo compatibilità col tuo sistema attuale
        if (password === ristorante.password) { 
             res.json({ success: true, nome_ristorante: ristorante.nome });
        } else {
             res.status(401).json({ success: false, error: "Password errata" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: "Errore server" });
    }
});

// --- 3. REGISTRAZIONE UNIFICATA (Crea Utente + Invia OTP WA) ---
router.post('/api/register', async (req, res) => { 
    try { 
        const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body; 
        
        // 1. Controllo Duplicati
        const check = await pool.query('SELECT id FROM utenti WHERE email = $1', [email]); 
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" }); 
        
        // 2. Genera OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const r_id = ristorante_id ? ristorante_id : null; 
        
        // 3. Inserimento nel DB (Non verificato di default)
        const r = await pool.query(
            `INSERT INTO utenti 
            (nome, email, password, telefono, indirizzo, ruolo, ristorante_id, codice_otp, account_verificato, data_registrazione) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW()) 
             RETURNING id`, 
            [nome, email, password, telefono, indirizzo, ruolo || 'cliente', r_id, otp]
        );
        
        // 4. Invio Messaggio WhatsApp
        if (telefono) {
            const msg = `Ciao ${nome}! Benvenuto su JARVIS. 🍷\nIl tuo codice di verifica è: *${otp}*`;
            sendWA(telefono, msg).catch(e => console.error("⚠️ Errore invio WA (non bloccante):", e.message));
        }
        
        res.json({ success: true, userId: r.rows[0].id, message: "Codice inviato su WhatsApp" }); 
    } catch (e) { 
        console.error("Errore Registrazione:", e);
        res.status(500).json({ error: "Errore durante la registrazione: " + e.message }); 
    } 
});

// --- 4. GESTIONE UTENTI CRUD (Staff Docs e Modifiche) ---
router.get('/api/utenti', async (req, res) => { 
    try { 
        const { mode, ristorante_id } = req.query;
        let query = 'SELECT * FROM utenti ORDER BY id DESC';
        let params = [];

        if (mode === 'staff' && ristorante_id) {
            query = "SELECT * FROM utenti WHERE ristorante_id = $1 ORDER BY nome";
            params = [ristorante_id];
        }
        
        const r = await pool.query(query, params); 
        res.json(r.rows); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

router.put('/api/utenti/:id', async (req, res) => { 
    try { 
        const { nome, email, password, telefono, indirizzo, ruolo } = req.body; 
        await pool.query(
            `UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`, 
            [nome, email, password, telefono, indirizzo, ruolo, req.params.id]
        ); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

router.delete('/api/utenti/:id', async (req, res) => { 
    try { 
        await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

// Staff Docs
router.post('/api/staff/docs', async (req, res) => { 
    try { 
        const { utente_id, tipo_doc, nome_file, url } = req.body; 
        await pool.query("INSERT INTO staff_docs (utente_id, tipo_doc, nome_file, url) VALUES ($1, $2, $3, $4)", [utente_id, tipo_doc, nome_file, url]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});

router.get('/api/staff/docs/:utente_id', async (req, res) => { 
    try { 
        const r = await pool.query("SELECT * FROM staff_docs WHERE utente_id = $1 ORDER BY data_caricamento DESC", [req.params.utente_id]); 
        res.json(r.rows); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

router.delete('/api/staff/docs/:id', async (req, res) => { 
    try { 
        await pool.query("DELETE FROM staff_docs WHERE id = $1", [req.params.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

module.exports = router;