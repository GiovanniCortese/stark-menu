const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { uploadFile } = require('../config/storage'); // Importa se serve uploadFile qui, altrimenti rimuovi
const xlsx = require('xlsx');

// Login Utente (Staff e Clienti)
router.post('/api/auth/login', async (req, res) => { 
    try { 
        const { email, password } = req.body; 
        // Recuperiamo tutto l'utente
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]); 
        
        if (r.rows.length > 0) {
            const utente = r.rows[0];
            // Risposta pulita
            res.json({ success: true, user: utente }); 
        } else {
            res.json({ success: false, error: "Credenziali errate" }); 
        }
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore login" }); 
    } 
});

// Registrazione
router.post('/api/register', async (req, res) => { try { const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body; const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]); if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" }); const r_id = ristorante_id ? ristorante_id : null; const r = await pool.query('INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo, ristorante_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [nome, email, password, telefono, indirizzo, ruolo || 'cliente', r_id]); res.json({ success: true, user: r.rows[0] }); } catch (e) { res.status(500).json({ error: e.message }); } });

// Get Utenti (MODIFICATO PER VISIONE TOTALE SUPER ADMIN)
router.get('/api/utenti', async (req, res) => { 
    try { 
        const { mode, ristorante_id } = req.query; 

        // 👁️ MODALITÀ SUPER ADMIN: VEDI TUTTO
        if (mode === 'super') { 
            const query = `
                SELECT 
                    u.*, 
                    r.nome as nome_ristorante_collegato,
                    to_char(u.ultimo_accesso, 'DD/MM/YYYY HH24:MI') as ultimo_login_formattato
                FROM utenti u
                LEFT JOIN ristoranti r ON u.ristorante_id = r.id
                ORDER BY u.id DESC
            `;
            const r = await pool.query(query); 
            return res.json(r.rows); 
        } 

        // ... (MANTIENI LE ALTRE MODALITÀ STAFF E CLIENTI COME SONO) ...
        if (mode === 'staff' && ristorante_id) { 
             const r = await pool.query("SELECT * FROM utenti WHERE ristorante_id = $1 ORDER BY nome", [ristorante_id]); 
             return res.json(r.rows); 
        } 
        if ((mode === 'clienti' || mode === 'clienti_ordini') && ristorante_id) { 
             const r = await pool.query(`SELECT u.id, u.nome, u.email, u.telefono, COUNT(o.id) as totale_ordini, MAX(o.data_ora) as ultimo_ordine FROM utenti u INNER JOIN ordini o ON u.id = o.utente_id WHERE o.ristorante_id = $1 GROUP BY u.id, u.nome, u.email, u.telefono ORDER BY ultimo_ordine DESC`, [ristorante_id]); 
             return res.json(r.rows); 
        } 
        res.json([]); 
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    } 
});

const { sendWA } = require('../utils/whatsappClient');

router.post('/api/register', async (req, res) => {
    try {
        const { nome, email, password, telefono, ristorante_id } = req.body;
        
        // 1. Genera OTP a 6 cifre
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Inserimento nel DB come NON verificato
        const r = await pool.query(
            "INSERT INTO utenti (nome, email, password, telefono, ristorante_id, codice_otp, account_verificato) VALUES ($1, $2, $3, $4, $5, $6, FALSE) RETURNING id",
            [nome, email, password, telefono, ristorante_id, otp]
        );

        // 3. Invio WhatsApp
        const msg = `Ciao ${nome}! Benvenuto su JARVIS. Il tuo codice di verifica è: *${otp}*`;
        await sendWA(telefono, msg);

        res.json({ success: true, userId: r.rows[0].id, message: "Codice inviato su WhatsApp" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Import Utenti Excel
router.post('/api/utenti/import/excel', uploadFile.single('file'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "File mancante" }); const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const sheetName = workbook.SheetNames[0]; const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); for (const row of data) { const ruolo = row.ruolo || 'cliente'; if(!row.email) continue; const check = await pool.query("SELECT id FROM utenti WHERE email = $1", [row.email]); if (check.rows.length > 0) { await pool.query("UPDATE utenti SET nome=$1, password=$2, telefono=$3, indirizzo=$4, ruolo=$5 WHERE email=$6", [row.nome, row.password, row.telefono, row.indirizzo, ruolo, row.email]); } else { await pool.query("INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo) VALUES ($1, $2, $3, $4, $5, $6)", [row.nome, row.email, row.password, row.telefono, row.indirizzo, ruolo]); } } res.json({ success: true, message: "Importazione completata" }); } catch (e) { console.error(e); res.status(500).json({ error: "Errore Import" }); } });

// Gestione CRUD Utenti Singoli
router.get('/api/cliente/stats/:id', async (req, res) => { try { const r = await pool.query(`SELECT u.*, COUNT(o.id) as num_ordini FROM utenti u LEFT JOIN ordini o ON u.id = o.utente_id WHERE u.id = $1 GROUP BY u.id`, [req.params.id]); if(r.rows.length === 0) return res.status(404).json({error: "Utente non trovato"}); const user = r.rows[0]; const n = parseInt(user.num_ordini); let livello = { nome: "Novizio 🌱", colore: "#95a5a6", affidabilita: "Nuovo" }; if (n >= 5) livello = { nome: "Buongustaio 🥉", colore: "#cd7f32", affidabilita: "Ok" }; if (n >= 15) livello = { nome: "Cliente Top 🥈", colore: "#bdc3c7", affidabilita: "Affidabile" }; if (n >= 30) livello = { nome: "VIP 🥇", colore: "#f1c40f", affidabilita: "Super Affidabile" }; if (n >= 100) livello = { nome: "Legend 💎", colore: "#3498db", affidabilita: "Divinità" }; res.json({ ...user, livello }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.put('/api/utenti/:id', async (req, res) => { try { const { nome, email, password, telefono, indirizzo, ruolo } = req.body; await pool.query(`UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`, [nome, email, password, telefono, indirizzo, ruolo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.delete('/api/utenti/:id', async (req, res) => { try { await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// Staff Docs
router.post('/api/staff/docs', async (req, res) => { try { const { utente_id, tipo_doc, nome_file, url } = req.body; await pool.query("INSERT INTO staff_docs (utente_id, tipo_doc, nome_file, url) VALUES ($1, $2, $3, $4)", [utente_id, tipo_doc, nome_file, url]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.get('/api/staff/docs/:utente_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM staff_docs WHERE utente_id = $1 ORDER BY data_caricamento DESC", [req.params.utente_id]); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete('/api/staff/docs/:id', async (req, res) => { try { await pool.query("DELETE FROM staff_docs WHERE id = $1", [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// server/routes/authRoutes.js - VERSIONE FIX CASSA LOGIN 🛠️
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// --- 1. LOGIN UTENTI (Staff e Clienti) ---
router.post('/api/auth/login', async (req, res) => { 
    try { 
        const { email, password } = req.body; 
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]); 
        
        if (r.rows.length > 0) {
            const utente = r.rows[0];
            res.json({ success: true, user: utente }); 
        } else {
            res.json({ success: false, error: "Credenziali errate" }); 
        }
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore login" }); 
    } 
});

// --- 2. LOGIN SPECIFICO CASSA (QUELLO CHE MANCAVA) 💰 ---
router.post('/api/cassa/login', async (req, res) => {
    try {
        const { slug, password } = req.body;
        
        // Cerca il ristorante tramite lo slug
        const result = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Ristorante non trovato" });
        }

        const ristorante = result.rows[0];

        // Confronta la password (assumendo che sia salvata in chiaro o hash semplice come per gli utenti)
        if (password === ristorante.password_hash) {
             res.json({ success: true });
        } else {
             res.status(401).json({ success: false, error: "Password errata" });
        }

    } catch (err) {
        console.error("Errore Login Cassa:", err);
        res.status(500).json({ success: false, error: "Errore server interno" });
    }
});

// --- 3. REGISTRAZIONE ---
router.post('/api/register', async (req, res) => { 
    try { 
        const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body; 
        
        // Check se esiste già
        const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]); 
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" }); 
        
        const r_id = ristorante_id ? ristorante_id : null; 
        
        await pool.query(
            `INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo, ristorante_id, data_creazione) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, 
            [nome, email, password, telefono, indirizzo, ruolo || 'cliente', r_id]
        );
        
        res.json({ success: true }); 
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore registrazione" }); 
    } 
});

// --- 4. GESTIONE UTENTI (CRUD) ---
router.get('/api/utenti', async (req, res) => { 
    try { 
        const mode = req.query.mode;
        let query = 'SELECT * FROM utenti ORDER BY id DESC';
        
        // Se non è super admin, nascondiamo le password o filtriamo
        if (mode !== 'super') {
            // Logica opzionale per admin normali
        }
        
        const r = await pool.query(query); 
        // Arricchiamo con il nome del ristorante se serve
        // (Opzionale, richiede JOIN o seconda query, qui lo lasciamo semplice)
        res.json(r.rows); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

router.put('/api/utenti/:id', async (req, res) => { 
    try { 
        const { nome, email, password, telefono, indirizzo, ruolo } = req.body; 
        // Aggiorna anche password solo se inviata, altrimenti mantieni vecchia (logica base qui: aggiorna tutto)
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

// --- 5. STAFF DOCS ---
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