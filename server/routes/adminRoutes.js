const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { upload, cloudinary } = require('../config/storage');
const { authenticator } = require('otplib');
const https = require('https');
const http = require('http');

// ==========================================
// 1. GESTIONE RISTORANTE (CONFIG & STYLE)
// ==========================================

// Configurazione Ristorante (Lettura)
router.get('/api/ristorante/config/:id', async (req, res) => { 
    try { 
        const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); 
        if (r.rows.length > 0) res.json(r.rows[0]); 
        else res.status(404).json({ error: "Not Found" }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

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

// Update Servizio (Attiva/Disattiva Ordini)
router.put('/api/ristorante/servizio/:id', async (req, res) => { 
    try { 
        const { id } = req.params; 
        
        // Ordini Abilitati
        if (req.body.ordini_abilitati !== undefined) 
            await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]); 
        
        // Servizio Attivo (Legacy)
        if (req.body.servizio_attivo !== undefined) 
            await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]);
            
        // --- NUOVO: Aggiorna Suite (Cucina/Bar/Pizzeria) ---
        if (req.body.cucina_super_active !== undefined) 
            await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]);

        res.json({ success: true }); 
    } catch (e) { res.status(500).json({error:"Err"}); } 
});

// Update Password Reparti (Sicurezza)
router.put('/api/ristorante/security/:id', async (req, res) => { 
    try { 
        const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino } = req.body; 
        await pool.query(
            `UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4, pw_haccp=$5, pw_magazzino=$6 WHERE id=$7`, 
            [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino, req.params.id]
        ); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

// Update Dati Fiscali
router.put('/api/ristorante/dati-fiscali/:id', async (req, res) => { 
    try { 
        const { dati_fiscali } = req.body; 
        await pool.query('UPDATE ristoranti SET dati_fiscali = $1 WHERE id = $2', [dati_fiscali, req.params.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

// ==========================================
// 2. SUPER ADMIN (MODIFICATO E CORRETTO)
// ==========================================

// Login Super Admin
router.post('/api/super/login', (req, res) => { 
    try { 
        const { email, password, code2fa } = req.body; 
        const adminEmail = process.env.ADMIN_EMAIL; 
        const adminPass = process.env.ADMIN_PASSWORD; 
        const adminSecret = process.env.ADMIN_2FA_SECRET; 
        
        if (!adminEmail || !adminPass || !adminSecret) return res.status(500).json({ success: false, error: "Configurazione Server Incompleta" }); 
        if (email !== adminEmail || password !== adminPass) return res.json({ success: false, error: "Credenziali non valide" }); 
        
        const isValidToken = authenticator.check(code2fa, adminSecret); 
        if (!isValidToken) return res.json({ success: false, error: "Codice 2FA Errato o Scaduto" }); 
        
        res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" }); 
    } catch (e) { res.status(500).json({ success: false, error: "Errore interno server" }); } 
});

// Lista Ristoranti
router.get('/api/super/ristoranti', async (req, res) => { 
    try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } 
    catch (e) { res.status(500).json({error:"Err"}); } 
});

// Crea Ristorante
router.post('/api/super/ristoranti', async (req, res) => { 
    try { 
        const b = req.body;
await pool.query(`
    INSERT INTO ristoranti 
    (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active,
     modulo_menu_digitale, modulo_ordini_clienti, modulo_magazzino, modulo_haccp, modulo_utenti, modulo_cassa, cassa_full_suite, data_scadenza) 
    VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE, $6, $7, $8, $9, $10, $11, $12, $13)`, 
    [
        b.nome, b.slug, b.email, b.telefono, b.password || 'tonystark',
        b.modulo_menu_digitale ?? true,
        b.modulo_ordini_clienti ?? true,
        b.modulo_magazzino ?? false,
        b.modulo_haccp ?? false,
        b.modulo_utenti ?? false,
        b.modulo_cassa ?? true, // <--- NUOVO CAMPO
        b.cassa_full_suite ?? true,
        b.data_scadenza || new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    ]
); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({error: "Err: " + e.message}); } 
});

// UPDATE RISTORANTE (FIXED: COALESCE per evitare cancellazione dati)
router.put('/api/super/ristoranti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;

        const sql = `
            UPDATE ristoranti SET 
                nome = COALESCE($1, nome),
                slug = COALESCE($2, slug),
                email = COALESCE($3, email),
                telefono = COALESCE($4, telefono),
                account_attivo = COALESCE($5, account_attivo),
                data_scadenza = COALESCE($6, data_scadenza),
                
                modulo_menu_digitale = COALESCE($7, modulo_menu_digitale),
                modulo_ordini_clienti = COALESCE($8, modulo_ordini_clienti),
                modulo_magazzino = COALESCE($9, modulo_magazzino),
                modulo_haccp = COALESCE($10, modulo_haccp),
modulo_utenti = COALESCE($11, modulo_utenti),
modulo_cassa = COALESCE($12, modulo_cassa),  // <--- AGGIUNTO (nota gli indici successivi che slittano)
cassa_full_suite = COALESCE($13, cassa_full_suite), // Era $12, ora è $13
password = CASE WHEN $14::text IS NOT NULL AND $14::text <> '' THEN $14 ELSE password END
WHERE id = $15
        `;

        const params = [
            b.nome || null,
            b.slug || null,
            b.email || null,
            b.telefono || null,
            b.account_attivo !== undefined ? b.account_attivo : null, 
            b.data_scadenza || null,
            
            b.modulo_menu_digitale !== undefined ? b.modulo_menu_digitale : null,
            b.modulo_ordini_clienti !== undefined ? b.modulo_ordini_clienti : null,
            b.modulo_magazzino !== undefined ? b.modulo_magazzino : null,
            b.modulo_haccp !== undefined ? b.modulo_haccp : null,
            b.modulo_utenti !== undefined ? b.modulo_utenti : null,
b.modulo_cassa !== undefined ? b.modulo_cassa : null, // <--- NUOVO
b.cassa_full_suite !== undefined ? b.cassa_full_suite : null,

b.password || null,
id
];
        
        await pool.query(sql, params);
        res.json({ success: true });
    } catch (e) {
        console.error("❌ ERRORE SUPERADMIN UPDATE:", e);
        res.status(500).json({ error: e.message });
    }
});

// Fix Modulo Cassa (Nuovo campo)
router.get('/api/db-fix-module-cassa', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // Default TRUE per non bloccare i clienti esistenti
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_cassa BOOLEAN DEFAULT TRUE");
            res.send("✅ DB AGGIORNATO: Modulo Cassa aggiunto!");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Delete Ristorante
router.delete('/api/super/ristoranti/:id', async (req, res) => { 
    try { 
        const id = req.params.id; 
        await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); 
        await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); 
        await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); 
        await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({error: "Err"}); } 
});

// ==========================================
// 3. LOGIN & AUTH GENERICA
// ==========================================

// Login Ristorante Owner
router.post('/api/login', async (req, res) => { 
    const { email, password } = req.body; 
    try { 
        const result = await pool.query("SELECT * FROM ristoranti WHERE email = $1", [email]); 
        if (result.rows.length > 0) { 
            const ristorante = result.rows[0]; 
            if (ristorante.password === password) { 
                return res.json({ success: true, user: { id: ristorante.id, nome: ristorante.nome, slug: ristorante.slug } }); 
            } 
        } 
        res.status(401).json({ success: false, error: "Credenziali errate" }); 
    } catch (e) { res.status(500).json({ success: false, error: "Errore interno" }); } 
});

// Auth Station (Cassa, Cucina, Magazzino, ecc.)
router.post('/api/auth/station', async (req, res) => { 
    try { 
        const { ristorante_id, role, password } = req.body; 
        const roleMap = { 
            'cassa': 'pw_cassa', 
            'cucina': 'pw_cucina', 
            'pizzeria': 'pw_pizzeria', 
            'bar': 'pw_bar', 
            'haccp': 'pw_haccp',
            'magazzino': 'pw_magazzino' 
        }; 
        const colonnaPwd = roleMap[role]; 
        if (!colonnaPwd) return res.json({ success: false, error: "Ruolo non valido" }); 
        
        const r = await pool.query(`SELECT * FROM ristoranti WHERE id = $1`, [ristorante_id]); 
        if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" }); 
        
        const storedPwd = r.rows[0][colonnaPwd];
        if (String(storedPwd) === String(password)) res.json({ success: true, nome_ristorante: r.rows[0].nome }); 
        else res.json({ success: false, error: "Password Errata" }); 
    } catch (e) { res.status(500).json({ error: "Err: " + e.message }); } 
});

// ==========================================
// 4. UTILITY (UPLOAD & PROXY)
// ==========================================

router.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));

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

// ==========================================
// 5. DB FIXES & MIGRATIONS (RACCOLTA COMPLETA)
// ==========================================

// Fix Base Moduli & Scadenza
router.get('/api/db-fix-modules-v2', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_menu_digitale BOOLEAN DEFAULT TRUE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_ordini_clienti BOOLEAN DEFAULT TRUE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_magazzino BOOLEAN DEFAULT FALSE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_haccp BOOLEAN DEFAULT FALSE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_utenti BOOLEAN DEFAULT FALSE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS cassa_full_suite BOOLEAN DEFAULT TRUE");
            await client.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS data_scadenza DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year')");
            res.send("✅ DATABASE AGGIORNATO: Moduli, Suite e Scadenza pronti!");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Fix Magazzino V3 (Codice Articolo & Sconto)
router.get('/api/db-fix-magazzino-v3', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            res.send("✅ DB AGGIORNATO V3: Aggiunti campi 'codice_articolo' e 'sconto'.");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Init Magazzino Pro (Struttura Base)
router.get('/api/db-init-magazzino-pro', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS magazzino_prodotti (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                marca TEXT,
                ean_barcode TEXT,
                categoria TEXT DEFAULT 'Generale',
                reparto TEXT,
                unita_misura TEXT DEFAULT 'Pz',
                confezione_da NUMERIC(10,2) DEFAULT 1,
                giacenza NUMERIC(10,2) DEFAULT 0,
                scorta_minima NUMERIC(10,2) DEFAULT 0,
                prezzo_ultimo NUMERIC(10,2) DEFAULT 0,
                prezzo_medio NUMERIC(10,2) DEFAULT 0,
                iva NUMERIC(5,2) DEFAULT 0,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS magazzino_id INTEGER");
        res.send("✅ ARCHITETTURA MAGAZZINO V2 ATTIVATA.");
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Fix Magazzino Full (Fiscale)
router.get('/api/db-fix-magazzino-full', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query(`
                ALTER TABLE magazzino_prodotti 
                ADD COLUMN IF NOT EXISTS data_bolla DATE DEFAULT CURRENT_DATE,
                ADD COLUMN IF NOT EXISTS numero_bolla TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS lotto TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS tipo_unita TEXT DEFAULT 'Pz',
                ADD COLUMN IF NOT EXISTS peso_per_unita NUMERIC(10,3) DEFAULT 1,
                ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC(10,3) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS aliquota_iva NUMERIC(5,2) DEFAULT 22,
                ADD COLUMN IF NOT EXISTS valore_totale_netto NUMERIC(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS valore_totale_iva NUMERIC(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS valore_totale_lordo NUMERIC(12,2) DEFAULT 0;
            `);
            res.send("✅ DB MAGAZZINO AGGIORNATO: Aggiunti campi fiscali.");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Fix Magazzino V2 (Prezzi su HACCP Merci)
router.get('/api/db-fix-magazzino-v2', async (req, res) => {
    try {
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS ora TEXT DEFAULT ''");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT 'Pz'");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo_unitario NUMERIC(10,2) DEFAULT 0");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS iva NUMERIC(5,2) DEFAULT 0");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10,2) DEFAULT 0");
        res.send("✅ DATABASE AGGIORNATO: Colonne Magazzino create con successo!");
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Fix Password Magazzino
router.get('/api/db-fix-security-magazzino', async (req, res) => {
    try {
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_magazzino TEXT DEFAULT '1234'");
        res.send("✅ DATABASE AGGIORNATO: Aggiunta password Magazzino!");
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// Fix Menu & Ristorante (Opzioni generali)
router.get('/api/db-fix-menu', async (req, res) => { 
    try { 
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10,2) DEFAULT 0");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS nascondi_euro BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS prezzo_coperto NUMERIC(10,2) DEFAULT 0");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_giorno TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_pdf TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS info_footer TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_allergeni TEXT DEFAULT ''");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_footer_text TEXT DEFAULT '#888888'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS dimensione_footer TEXT DEFAULT '12'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS allineamento_footer TEXT DEFAULT 'center'");
        
        await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT ''");
        await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS qta_minima NUMERIC(10,2) DEFAULT 1");
        
        await pool.query("ALTER TABLE ordini ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0");
        
        res.send("✅ DATABASE AGGIORNATO (Coperti, Minimo Qta, Unità, Euro)!"); 
    } catch (e) { res.status(500).send("Errore DB: " + e.message); } 
});

// Fix Emergenza (Colonne finali)
router.get('/api/db-fix-emergency-columns', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE DEFAULT CURRENT_DATE");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT DEFAULT ''");
            res.send("✅ DATABASE FIX COMPLETATO: Colonne mancanti create ovunque.");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB Fix: " + e.message); }
});

module.exports = router;