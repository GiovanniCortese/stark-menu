const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { upload, cloudinary } = require('../config/storage');
const { authenticator } = require('otplib');
const https = require('https');
const http = require('http');

// Configurazione Ristorante
router.get('/api/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); if (r.rows.length > 0) res.json(r.rows[0]); else res.status(404).json({ error: "Not Found" }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// UPDATE STYLE (Gestisce anche prezzo_coperto e nascondi_euro)
router.put('/api/ristorante/style/:id', async (req, res) => { 
    try { 
        const { logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, colore_card, colore_btn, colore_btn_text, colore_border, colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text, colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text, font_style, info_footer, url_allergeni, url_menu_giorno, url_menu_pdf, nascondi_euro, prezzo_coperto } = req.body; 
        
        await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, colore_card=$7, colore_btn=$8, colore_btn_text=$9, colore_border=$10, colore_tavolo_bg=$11, colore_tavolo_text=$12, colore_carrello_bg=$13, colore_carrello_text=$14, colore_checkout_bg=$15, colore_checkout_text=$16, colore_modal_bg=$17, colore_modal_text=$18, font_style=$19, info_footer=$20, url_allergeni=$21, url_menu_giorno=$22, url_menu_pdf=$23, nascondi_euro=$24, prezzo_coperto=$25 WHERE id=$26`, 
        [logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, colore_card, colore_btn, colore_btn_text, colore_border, colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text, colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text, font_style, info_footer, url_allergeni, url_menu_giorno, url_menu_pdf, nascondi_euro, prezzo_coperto || 0, req.params.id]); 
        
        res.json({ success: true }); 
    } catch (err) { 
        console.error("Errore salvataggio style:", err);
        res.status(500).json({ error: "Errore salvataggio: " + err.message }); 
    } 
});

router.put('/api/ristorante/servizio/:id', async (req, res) => { try { const { id } = req.params; if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]); if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
router.put('/api/ristorante/security/:id', async (req, res) => { try { const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp } = req.body; await pool.query(`UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4, pw_haccp=$5 WHERE id=$6`, [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.put('/api/ristorante/dati-fiscali/:id', async (req, res) => { try { const { dati_fiscali } = req.body; await pool.query('UPDATE ristoranti SET dati_fiscali = $1 WHERE id = $2', [dati_fiscali, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// --- DB FIX FORZATO (AGGIORNATO) ---
router.get('/api/db-fix-menu', async (req, res) => { 
    try { 
        // Ristoranti
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10,2) DEFAULT 0");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS nascondi_euro BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS prezzo_coperto NUMERIC(10,2) DEFAULT 0"); // NUOVO
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_giorno TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_pdf TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS info_footer TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_allergeni TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_footer_text TEXT DEFAULT '#888888'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS dimensione_footer TEXT DEFAULT '12'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS allineamento_footer TEXT DEFAULT 'center'");
        
        // Prodotti
        await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT ''");
        await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS qta_minima NUMERIC(10,2) DEFAULT 1"); // NUOVO

        // Ordini
        await pool.query("ALTER TABLE ordini ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0"); // NUOVO
        
        res.send("✅ DATABASE AGGIORNATO (Coperti, Minimo Qta, Unità, Euro)!"); 
    } catch (e) { 
        console.error("Errore DB Fix:", e);
        res.status(500).send("Errore DB: " + e.message); 
    } 
});

// Login Ristorante Owner
router.post('/api/login', async (req, res) => { const { email, password } = req.body; try { const result = await pool.query("SELECT * FROM ristoranti WHERE email = $1", [email]); if (result.rows.length > 0) { const ristorante = result.rows[0]; if (ristorante.password === password) { return res.json({ success: true, user: { id: ristorante.id, nome: ristorante.nome, slug: ristorante.slug } }); } } res.status(401).json({ success: false, error: "Credenziali errate" }); } catch (e) { res.status(500).json({ success: false, error: "Errore interno" }); } });

// Auth Station
router.post('/api/auth/station', async (req, res) => { try { const { ristorante_id, role, password } = req.body; const roleMap = { 'cassa': 'pw_cassa', 'cucina': 'pw_cucina', 'pizzeria': 'pw_pizzeria', 'bar': 'pw_bar', 'haccp': 'pw_haccp' }; const colonnaPwd = roleMap[role]; if (!colonnaPwd) return res.json({ success: false, error: "Ruolo non valido" }); const r = await pool.query(`SELECT id, nome, ${colonnaPwd} as password_reparto FROM ristoranti WHERE id = $1`, [ristorante_id]); if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" }); if (String(r.rows[0].password_reparto) === String(password)) res.json({ success: true, nome_ristorante: r.rows[0].nome }); else res.json({ success: false, error: "Password Errata" }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// Super Admin
router.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
router.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
router.put('/api/super/ristoranti/:id', async (req, res) => { try { const { id } = req.params; if (req.body.account_attivo !== undefined) { await pool.query('UPDATE ristoranti SET account_attivo = $1 WHERE id = $2', [req.body.account_attivo, id]); return res.json({ success: true }); } if (req.body.cucina_super_active !== undefined) { await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
router.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
router.post('/api/super/login', (req, res) => { try { const { email, password, code2fa } = req.body; const adminEmail = process.env.ADMIN_EMAIL; const adminPass = process.env.ADMIN_PASSWORD; const adminSecret = process.env.ADMIN_2FA_SECRET; if (!adminEmail || !adminPass || !adminSecret) return res.status(500).json({ success: false, error: "Configurazione Server Incompleta" }); if (email !== adminEmail || password !== adminPass) return res.json({ success: false, error: "Credenziali non valide" }); const isValidToken = authenticator.check(code2fa, adminSecret); if (!isValidToken) return res.json({ success: false, error: "Codice 2FA Errato o Scaduto" }); res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" }); } catch (e) { res.status(500).json({ success: false, error: "Errore interno server" }); } });

// Upload Generico
router.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));

// Proxy Download
router.get('/api/proxy-download', async (req, res) => {
    const fileUrl = req.query.url;
    const fileName = req.query.name || 'documento.pdf';
    if (!fileUrl) return res.status(400).send("URL mancante");
    try {
        const parts = fileUrl.split('/upload/');
        if (parts.length < 2) return res.status(400).send("URL non valido");
        let path = parts[1].replace(/^v\d+\//, ''); 
        const publicId = path.replace(/\.[^/.]+$/, "");
        let resource;
        try { resource = await cloudinary.api.resource(publicId, { resource_type: 'image' }); } catch (e) { try { resource = await cloudinary.api.resource(publicId + ".pdf", { resource_type: 'raw' }); } catch(e2){} }
        if (!resource) return res.status(404).send("File non trovato.");
        const downloadUrl = cloudinary.url(resource.public_id, { resource_type: resource.resource_type, type: resource.type, sign_url: true, format: resource.format, version: resource.version, secure: true });
        const client = downloadUrl.startsWith('https') ? https : http;
        client.get(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                client.get(response.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
                    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                    res.setHeader('Content-Type', 'application/pdf');
                    res2.pipe(res);
                });
                return;
            }
            if (response.statusCode !== 200) return res.status(response.statusCode).send("Errore download file.");
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/pdf');
            response.pipe(res);
        }).on('error', (err) => res.status(500).send("Errore rete."));
    } catch (e) { console.error("Proxy Error:", e.message); res.status(500).send("Errore interno."); }
});

// --- NUOVO FIX PER AGGIUNGERE ORA E UDM AL MAGAZZINO ---
router.get('/api/db-fix-haccp-merci', async (req, res) => {
    try {
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS ora TEXT DEFAULT ''");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT ''");
        res.send("✅ DATABASE AGGIORNATO: Aggiunte colonne 'ora' e 'unita_misura' a haccp_merci!");
    } catch (e) {
        console.error("Errore DB Fix Merci:", e);
        res.status(500).send("Errore DB: " + e.message);
    }
});

module.exports = router;