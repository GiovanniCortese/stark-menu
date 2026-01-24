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

router.get('/api/db-fix-magazzino-v3', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // Aggiungiamo Codice Articolo e Sconto sia al Magazzino Master che allo Storico HACCP
            
            // 1. Tabella HACCP_MERCI (Storico Bolle)
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");

            // 2. Tabella MAGAZZINO_PRODOTTI (Giacenze)
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            
            res.send("✅ DB AGGIORNATO V3: Aggiunti campi 'codice_articolo' e 'sconto'.");
        } finally {
            client.release();
        }
    } catch (e) {
        res.status(500).send("Errore DB: " + e.message);
    }
});

router.get('/api/db-init-magazzino-pro', async (req, res) => {
    try {
        // 1. Creiamo la tabella MASTER del magazzino
        // Questa tabella comanda su tutto. HACCP farà riferimento a questa.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS magazzino_prodotti (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                marca TEXT,
                ean_barcode TEXT,
                categoria TEXT DEFAULT 'Generale',
                reparto TEXT, -- Es. Cucina, Bar, Pizzeria
                unita_misura TEXT DEFAULT 'Pz',
                confezione_da NUMERIC(10,2) DEFAULT 1, -- Es. Cartone da 6
                
                -- Gestione Stock
                giacenza NUMERIC(10,2) DEFAULT 0,
                scorta_minima NUMERIC(10,2) DEFAULT 0,
                
                -- Gestione Economica
                prezzo_ultimo NUMERIC(10,2) DEFAULT 0,
                prezzo_medio NUMERIC(10,2) DEFAULT 0,
                iva NUMERIC(5,2) DEFAULT 0,
                
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. Colleghiamo HACCP al Magazzino (aggiungiamo colonna link se non c'è)
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS magazzino_id INTEGER");

        res.send("✅ ARCHITETTURA MAGAZZINO V2 ATTIVATA: Tabella 'magazzino_prodotti' creata e collegata!");
    } catch (e) {
        console.error(e);
        res.status(500).send("Errore DB: " + e.message);
    }
});

router.get('/api/db-fix-magazzino-full', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // Aggiungiamo campi contabili e logistici precisi
            await client.query(`
                ALTER TABLE magazzino_prodotti 
                ADD COLUMN IF NOT EXISTS data_bolla DATE DEFAULT CURRENT_DATE,
                ADD COLUMN IF NOT EXISTS numero_bolla TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS lotto TEXT DEFAULT '',
                
                ADD COLUMN IF NOT EXISTS tipo_unita TEXT DEFAULT 'Pz', -- Es: Kg, Pz, Colli, Lt
                ADD COLUMN IF NOT EXISTS peso_per_unita NUMERIC(10,3) DEFAULT 1, -- Es: 1 Collo = 6 Pz
                
                ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC(10,3) DEFAULT 0, -- Prezzo singolo imponibile
                ADD COLUMN IF NOT EXISTS aliquota_iva NUMERIC(5,2) DEFAULT 22, -- 4, 10, 22
                ADD COLUMN IF NOT EXISTS valore_totale_netto NUMERIC(12,2) DEFAULT 0, -- (Qta * Unitario Netto)
                ADD COLUMN IF NOT EXISTS valore_totale_iva NUMERIC(12,2) DEFAULT 0, -- (TotNetto * Iva)
                ADD COLUMN IF NOT EXISTS valore_totale_lordo NUMERIC(12,2) DEFAULT 0; -- (TotNetto + TotIva)
            `);
            
            res.send("✅ DB MAGAZZINO AGGIORNATO: Aggiunti campi fiscali (IVA, Netto, Lordo) e logistici (Colli, Kg).");
        } finally {
            client.release();
        }
    } catch (e) {
        res.status(500).send("Errore DB: " + e.message);
    }
});

// AGGIUNGI QUESTO IN server/routes/adminRoutes.js
router.get('/api/db-fix-magazzino-v2', async (req, res) => {
    try {
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS ora TEXT DEFAULT ''");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT 'Pz'");
        
        // Già che ci siamo, assicuriamoci che ci siano anche le colonne per i prezzi se mancavano
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo_unitario NUMERIC(10,2) DEFAULT 0");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS iva NUMERIC(5,2) DEFAULT 0");
        await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10,2) DEFAULT 0");

        res.send("✅ DATABASE AGGIORNATO: Colonne Magazzino create con successo!");
    } catch (e) {
        res.status(500).send("Errore DB: " + e.message);
    }
});

// AGGIUNGI QUESTO ROUTE IN adminRoutes.js
router.get('/api/db-fix-security-magazzino', async (req, res) => {
    try {
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_magazzino TEXT DEFAULT '1234'");
        res.send("✅ DATABASE AGGIORNATO: Aggiunta password Magazzino!");
    } catch (e) {
        res.status(500).send("Errore DB: " + e.message);
    }
});

router.put('/api/ristorante/servizio/:id', async (req, res) => { try { const { id } = req.params; if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]); if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
router.put('/api/ristorante/security/:id', async (req, res) => { 
    try { 
        // AGGIUNTO pw_magazzino nel destructuring
        const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino } = req.body; 
        
        await pool.query(
            `UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4, pw_haccp=$5, pw_magazzino=$6 WHERE id=$7`, 
            [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino, req.params.id]
        ); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});
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
router.post('/api/auth/station', async (req, res) => { 
    try { 
        const { ristorante_id, role, password } = req.body; 
        
        // AGGIUNTO 'magazzino': 'pw_magazzino' alla mappa
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
        
        // Nota: Assicurati di selezionare anche la nuova colonna nella query se non usi SELECT *
        // Se usi SELECT * va bene, ma per sicurezza cambiamo la query per essere espliciti o dinamici
        const r = await pool.query(`SELECT * FROM ristoranti WHERE id = $1`, [ristorante_id]); 
        
        if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" }); 
        
        // Controllo password
        const storedPwd = r.rows[0][colonnaPwd];
        
        if (String(storedPwd) === String(password)) 
            res.json({ success: true, nome_ristorante: r.rows[0].nome }); 
        else 
            res.json({ success: false, error: "Password Errata" }); 
    } catch (e) { res.status(500).json({ error: "Err: " + e.message }); } 
});

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

// AGGIUNGI QUESTA ROTTA IN FONDO O DOVE VUOI
router.get('/api/db-fix-emergency-columns', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            console.log("AVVIO FIX EMERGENZA COLONNE...");

            // 1. FIX TABELLA MAGAZZINO (Giacenze Master)
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");

            // 2. FIX TABELLA HACCP (Storico Ricevimento)
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            
            // 3. FIX SICUREZZA (Già che ci siamo, per evitare altri errori futuri)
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE DEFAULT CURRENT_DATE");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT DEFAULT ''");

            res.send("✅ DATABASE FIX COMPLETATO: Colonne 'codice_articolo' e 'sconto' create ovunque.");
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Errore Fix:", e);
        res.status(500).send("Errore DB Fix: " + e.message);
    }
});

module.exports = router;