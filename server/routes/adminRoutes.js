// server/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { upload, cloudinary } = require("../config/storage");
const https = require("https");
const http = require("http");

// --- IMPORTIAMO IL GESTORE ORARIO ITALIANO ---
const { getNowItaly } = require("../utils/time");

// ✅ DB boot: esegui migrazioni senza top-level await (CJS safe)
(async function ensureDbColumns() {
  try {
    // 1. Design columns
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_footer_text VARCHAR(30)`);
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS dimensione_footer INTEGER`);
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS allineamento_footer VARCHAR(10)`);
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_categoria_bg VARCHAR(30)`);
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_categoria_bg_active VARCHAR(30)`);
    await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS posizione_immagine_piatto VARCHAR(10)`);
    
    // 2. User tracking columns
    await pool.query(`ALTER TABLE utenti ADD COLUMN IF NOT EXISTS ultimo_accesso TIMESTAMP`);

    console.log(`✅ [${getNowItaly()}] DB Admin OK.`);
  } catch (e) {
    console.error(`❌ DB Error:`, e.message);
  }
})();

// ==========================================
// 1. GESTIONE RISTORANTE (CONFIG & STYLE)
// ==========================================

// Configurazione Ristorante (Lettura)
router.get("/api/ristorante/config/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ristoranti WHERE id = $1", [req.params.id]);
    if (r.rows.length > 0) res.json(r.rows[0]);
    else res.status(404).json({ error: "Not Found" });
  } catch (e) {
    res.status(500).json({ error: "Err" });
  }
});

// UPDATE STYLE
router.put("/api/ristorante/style/:id", async (req, res) => {
  try {
    const {
      logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo,
      colore_card, colore_btn, colore_btn_text, colore_border,
      colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text,
      colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text,
      font_style, info_footer, url_allergeni, url_menu_giorno, url_menu_pdf,
      colore_footer_text, dimensione_footer, allineamento_footer,
      colore_categoria_bg, colore_categoria_bg_active, posizione_immagine_piatto,
      nascondi_euro, prezzo_coperto,
    } = req.body;

    await pool.query(
      `UPDATE ristoranti SET
        logo_url=$1, cover_url=$2,
        colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6,
        colore_card=$7, colore_btn=$8, colore_btn_text=$9, colore_border=$10,
        colore_tavolo_bg=$11, colore_tavolo_text=$12,
        colore_carrello_bg=$13, colore_carrello_text=$14,
        colore_checkout_bg=$15, colore_checkout_text=$16,
        colore_modal_bg=$17, colore_modal_text=$18,
        font_style=$19,
        info_footer=$20, url_allergeni=$21, url_menu_giorno=$22, url_menu_pdf=$23,
        colore_footer_text=$24, dimensione_footer=$25, allineamento_footer=$26,
        colore_categoria_bg=$27, colore_categoria_bg_active=$28, posizione_immagine_piatto=$29,
        nascondi_euro=$30, prezzo_coperto=$31
      WHERE id=$32`,
      [
        logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo,
        colore_card, colore_btn, colore_btn_text, colore_border,
        colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text,
        colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text,
        font_style, info_footer, url_allergeni, url_menu_giorno, url_menu_pdf,
        colore_footer_text, parseInt(dimensione_footer || 12, 10), allineamento_footer,
        colore_categoria_bg, colore_categoria_bg_active, posizione_immagine_piatto,
        nascondi_euro, prezzo_coperto || 0,
        req.params.id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ [${getNowItaly()}] Errore salvataggio style:`, err);
    res.status(500).json({ error: "Errore salvataggio: " + err.message });
  }
});

// Update Servizio
router.put("/api/ristorante/servizio/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.ordini_abilitati !== undefined) await pool.query("UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2", [req.body.ordini_abilitati, id]);
    if (req.body.servizio_attivo !== undefined) await pool.query("UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2", [req.body.servizio_attivo, id]);
    if (req.body.cucina_super_active !== undefined) await pool.query("UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2", [req.body.cucina_super_active, id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Err" }); }
});

// Update Password Reparti
router.put("/api/ristorante/security/:id", async (req, res) => {
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
router.put("/api/ristorante/dati-fiscali/:id", async (req, res) => {
  try {
    const { dati_fiscali } = req.body;
    await pool.query("UPDATE ristoranti SET dati_fiscali = $1 WHERE id = $2", [dati_fiscali, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Err" }); }
});

// ==========================================
// 2. SUPER ADMIN (LOG CON ORARIO ITALIANO & SYNC UTENTI)
// ==========================================

router.post("/api/super/login", async (req, res) => {
  try {
    const { email, password, code2fa } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;
    const adminSecret = process.env.ADMIN_2FA_SECRET;

    if (!adminEmail || !adminPass || !adminSecret) return res.status(500).json({ success: false, error: "Configurazione Server Incompleta" });
    if (email !== adminEmail || password !== adminPass) return res.json({ success: false, error: "Credenziali non valide" });

    // Try/Catch import per evitare crash su versioni Node diverse
    try {
        const { authenticator } = await import("otplib");
        const isValidToken = authenticator.check(code2fa, adminSecret);
        if (!isValidToken) return res.json({ success: false, error: "Codice 2FA Errato" });
    } catch(e) {
        console.warn("⚠️ 2FA Bypass (Libreria mancante o errore):", e.message);
    }

    console.log(`👑 [${getNowItaly()}] SuperAdmin Login.`);
    res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get("/api/super/ristoranti", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ristoranti ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.post("/api/super/ristoranti", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const b = req.body;
    console.log(`🆕 [${getNowItaly()}] Creazione nuovo locale: ${b.nome}`);

    const newRest = await client.query(
      `INSERT INTO ristoranti
        (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active,
         modulo_menu_digitale, modulo_ordini_clienti, modulo_magazzino, modulo_haccp, modulo_utenti, modulo_cassa, cassa_full_suite, data_scadenza)
        VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
      [
        b.nome, b.slug, b.email, b.telefono, b.password || "tonystark",
        b.modulo_menu_digitale ?? true, b.modulo_ordini_clienti ?? true, b.modulo_magazzino ?? false,
        b.modulo_haccp ?? false, b.modulo_utenti ?? false, b.modulo_cassa ?? true, b.cassa_full_suite ?? true,
        b.data_scadenza || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      ]
    );

    const newRestId = newRest.rows[0].id;
    await client.query(
      `INSERT INTO utenti (nome, email, password, telefono, ruolo, ristorante_id, data_registrazione)
        VALUES ($1, $2, $3, $4, 'admin', $5, NOW())`,
      [b.nome, b.email, b.password || "tonystark", b.telefono, newRestId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Err: " + e.message });
  } finally { client.release(); }
});

router.put("/api/super/ristoranti/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const b = req.body;

    const sql = `
      UPDATE ristoranti SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        password = CASE WHEN $3::text IS NOT NULL AND $3::text <> '' THEN $3 ELSE password END,
        slug = COALESCE($4, slug),
        telefono = COALESCE($5, telefono),
        piva = COALESCE($6, piva), codice_fiscale = COALESCE($7, codice_fiscale), pec = COALESCE($8, pec), codice_sdi = COALESCE($9, codice_sdi),
        sede_legale = COALESCE($10, sede_legale), sede_operativa = COALESCE($11, sede_operativa), referente = COALESCE($12, referente), note_interne = COALESCE($13, note_interne),
        modulo_menu_digitale = COALESCE($14, modulo_menu_digitale), scadenza_menu_digitale = COALESCE($15, scadenza_menu_digitale),
        modulo_ordini_clienti = COALESCE($16, modulo_ordini_clienti), scadenza_ordini_clienti = COALESCE($17, scadenza_ordini_clienti),
        modulo_magazzino = COALESCE($18, modulo_magazzino), scadenza_magazzino = COALESCE($19, scadenza_magazzino),
        modulo_haccp = COALESCE($20, modulo_haccp), scadenza_haccp = COALESCE($21, scadenza_haccp),
        modulo_cassa = COALESCE($22, modulo_cassa), scadenza_cassa = COALESCE($23, scadenza_cassa),
        modulo_utenti = COALESCE($24, modulo_utenti), scadenza_utenti = COALESCE($25, scadenza_utenti),
        cassa_full_suite = COALESCE($26, cassa_full_suite), account_attivo = COALESCE($27, account_attivo)
      WHERE id = $28
    `;
    const params = [
      b.nome, b.email, b.password, b.slug, b.telefono, b.piva, b.codice_fiscale, b.pec, b.codice_sdi,
      b.sede_legale, b.sede_operativa, b.referente, b.note_interne,
      b.modulo_menu_digitale, b.scadenza_menu_digitale, b.modulo_ordini_clienti, b.scadenza_ordini_clienti,
      b.modulo_magazzino, b.scadenza_magazzino, b.modulo_haccp, b.scadenza_haccp,
      b.modulo_cassa, b.scadenza_cassa, b.modulo_utenti, b.scadenza_utenti,
      b.cassa_full_suite, b.account_attivo, id,
    ];
    await client.query(sql, params);

    // Sync Utente Admin
    if ((b.password && b.password !== "") || b.email) {
      let updateQuery = "UPDATE utenti SET ";
      let updateParams = [];
      let idx = 1;
      if (b.email) { updateQuery += `email = $${idx}, `; updateParams.push(b.email); idx++; }
      if (b.password && b.password !== "") { updateQuery += `password = $${idx}, `; updateParams.push(b.password); idx++; }
      updateQuery = updateQuery.slice(0, -2) + ` WHERE ristorante_id = $${idx} AND (ruolo = 'admin' OR ruolo = 'titolare')`;
      updateParams.push(id);
      await client.query(updateQuery, updateParams);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ==========================================
// 3. LOGIN & AUTH GENERICA (FIX GOD MODE 🚀)
// ==========================================

router.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const GOD_MODE_TOKEN = "SUPER_GOD_TOKEN_2026";

  try {
    const query = `
      SELECT u.*, r.nome as nome_ristorante, r.slug as slug_ristorante, r.id as real_ristorante_id
      FROM utenti u
      LEFT JOIN ristoranti r ON u.ristorante_id = r.id
      WHERE u.email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // LOGICA ACCESSO
      if (user.password === password || password === GOD_MODE_TOKEN) {
        
        // 🚀 BYPASS TOTALE RUOLI SE USI IL RAZZO (GOD MODE)
        const isGod = (password === GOD_MODE_TOKEN);
        
        // Se è God Mode, entra SEMPRE. Altrimenti controlla il ruolo.
        if (isGod || ["admin", "titolare", "manager", "cameriere"].includes(user.ruolo)) {
          
          await pool.query("UPDATE utenti SET ultimo_accesso = NOW() WHERE id = $1", [user.id]);

          return res.json({
            success: true,
            user: {
              id: user.real_ristorante_id,
              user_id: user.id,
              nome: user.nome_ristorante || user.nome,
              slug: user.slug_ristorante,
              ruolo: user.ruolo,
              email: user.email,
              is_god_mode: isGod
            },
          });
        } else {
          return res.status(403).json({ success: false, error: "Accesso non autorizzato." });
        }
      }
    }
    res.status(401).json({ success: false, error: "Credenziali errate o utente non trovato" });
  } catch (e) {
    console.error("Errore Login:", e);
    res.status(500).json({ success: false, error: "Errore interno server" });
  }
});

router.post("/api/auth/station", async (req, res) => {
  try {
    const { ristorante_id, role, password } = req.body;
    const roleMap = { cassa: "pw_cassa", cucina: "pw_cucina", pizzeria: "pw_pizzeria", bar: "pw_bar", haccp: "pw_haccp", magazzino: "pw_magazzino" };
    const colonnaPwd = roleMap[role];
    if (!colonnaPwd) return res.json({ success: false, error: "Ruolo non valido" });

    const r = await pool.query(`SELECT * FROM ristoranti WHERE id = $1`, [ristorante_id]);
    if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" });

    if (String(r.rows[0][colonnaPwd]) === String(password)) res.json({ success: true, nome_ristorante: r.rows[0].nome });
    else res.json({ success: false, error: "Password Errata" });
  } catch (e) { res.status(500).json({ error: "Err: " + e.message }); }
});

// ==========================================
// 4. UTILITY & DB FIXES
// ==========================================
router.post("/api/upload", upload.single("photo"), (req, res) => res.json({ url: req.file.path }));
router.get("/api/proxy-download", async (req, res) => {
  const fileUrl = req.query.url;
  const fileName = req.query.name || "documento.pdf";
  if (!fileUrl) return res.status(400).send("URL mancante");
  try {
    const parts = fileUrl.split("/upload/");
    if (parts.length < 2) return res.status(400).send("URL non valido");
    let path = parts[1].replace(/^v\d+\//, "");
    const publicId = path.replace(/\.[^/.]+$/, "");
    let resource;
    try { resource = await cloudinary.api.resource(publicId, { resource_type: "image" }); } catch (e) { try { resource = await cloudinary.api.resource(publicId + ".pdf", { resource_type: "raw" }); } catch (e2) {} }
    if (!resource) return res.status(404).send("File non trovato.");
    const downloadUrl = cloudinary.url(resource.public_id, { resource_type: resource.resource_type, type: resource.type, sign_url: true, format: resource.format, version: resource.version, secure: true });
    const client = downloadUrl.startsWith("https") ? https : http;
    client.get(downloadUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) { client.get(response.headers.location, { headers: { "User-Agent": "Mozilla/5.0" } }, (res2) => { res.setHeader("Content-Disposition", `inline; filename="${fileName}"`); res.setHeader("Content-Type", "application/pdf"); res2.pipe(res); }); return; }
        if (response.statusCode !== 200) return res.status(response.statusCode).send("Errore download file.");
        res.setHeader("Content-Disposition", `inline; filename="${fileName}"`); res.setHeader("Content-Type", "application/pdf"); response.pipe(res);
      }).on("error", () => res.status(500).send("Errore rete."));
  } catch (e) { res.status(500).send("Errore interno."); }
});

router.get("/api/db-fix-module-cassa", async (req, res) => { try { await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_cassa BOOLEAN DEFAULT TRUE"); res.send("✅ DB AGGIORNATO"); } catch (e) { res.status(500).send(e.message); } });
router.get("/api/db-fix-modules-v2", async (req, res) => { try { await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_menu_digitale BOOLEAN DEFAULT TRUE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_ordini_clienti BOOLEAN DEFAULT TRUE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_magazzino BOOLEAN DEFAULT FALSE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_haccp BOOLEAN DEFAULT FALSE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS modulo_utenti BOOLEAN DEFAULT FALSE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS cassa_full_suite BOOLEAN DEFAULT TRUE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS data_scadenza DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year')"); res.send("✅ DB AGGIORNATO"); } catch (e) { res.status(500).send(e.message); } });
router.get("/api/db-fix-magazzino-full", async (req, res) => { try { await pool.query(`ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS data_bolla DATE DEFAULT CURRENT_DATE, ADD COLUMN IF NOT EXISTS numero_bolla TEXT DEFAULT '', ADD COLUMN IF NOT EXISTS lotto TEXT DEFAULT '', ADD COLUMN IF NOT EXISTS tipo_unita TEXT DEFAULT 'Pz', ADD COLUMN IF NOT EXISTS peso_per_unita NUMERIC(10,3) DEFAULT 1, ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC(10,3) DEFAULT 0, ADD COLUMN IF NOT EXISTS aliquota_iva NUMERIC(5,2) DEFAULT 22, ADD COLUMN IF NOT EXISTS valore_totale_netto NUMERIC(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS valore_totale_iva NUMERIC(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS valore_totale_lordo NUMERIC(12,2) DEFAULT 0;`); res.send("✅ DB AGGIORNATO"); } catch (e) { res.status(500).send(e.message); } });
router.get("/api/db-fix-menu", async (req, res) => { try { await pool.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo NUMERIC(10,2) DEFAULT 0"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS nascondi_euro BOOLEAN DEFAULT FALSE"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS prezzo_coperto NUMERIC(10,2) DEFAULT 0"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_giorno TEXT DEFAULT ''"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_menu_pdf TEXT DEFAULT ''"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS info_footer TEXT DEFAULT ''"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS url_allergeni TEXT DEFAULT ''"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS colore_footer_text TEXT DEFAULT '#888888'"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS dimensione_footer TEXT DEFAULT '12'"); await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS allineamento_footer TEXT DEFAULT 'center'"); await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS unita_misura TEXT DEFAULT ''"); await pool.query("ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS qta_minima NUMERIC(10,2) DEFAULT 1"); await pool.query("ALTER TABLE ordini ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0"); res.send("✅ DB AGGIORNATO"); } catch (e) { res.status(500).send(e.message); } });
router.get("/api/db-fix-emergency-columns", async (req, res) => { try { const client = await pool.connect(); try { await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''"); await client.query("ALTER TABLE magazzino_prodotti ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0"); await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''"); await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0"); await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE DEFAULT CURRENT_DATE"); await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT DEFAULT ''"); res.send("✅ DATABASE FIX COMPLETATO"); } finally { client.release(); } } catch (e) { res.status(500).send("Errore: " + e.message); } });

// ✅ DELETE RISTORANTE (FIX TRANSAZIONI ABORTED) 🗑️
router.delete('/api/super/ristoranti/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, error: "ID non valido" });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // HELPER: usa SAVEPOINT per evitare "Current transaction is aborted"
    const safeDel = async (sql, params) => {
      try {
        await client.query("SAVEPOINT my_savepoint");
        await client.query(sql, params);
        await client.query("RELEASE SAVEPOINT my_savepoint");
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT my_savepoint");
        // Ignoriamo solo se tabella non esiste, altrimenti logghiamo
        if (e.code !== '42P01') console.warn(`⚠️ Warning delete (${sql}): ${e.message}`);
      }
    };

    console.log(`🗑️ DELETE Ristorante ID: ${id}`);

    // Pulizia Cascata
    await safeDel('DELETE FROM haccp_merci WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM haccp_temperature WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM haccp_pulizie WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM haccp_logs WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM magazzino_prodotti WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM ordini WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM prodotti WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM categorie WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM tavoli WHERE ristorante_id = $1', [id]);
    await safeDel('DELETE FROM staff_docs WHERE utente_id IN (SELECT id FROM utenti WHERE ristorante_id = $1)', [id]);
    await safeDel('DELETE FROM utenti WHERE ristorante_id = $1', [id]);

    const del = await client.query('DELETE FROM ristoranti WHERE id = $1 RETURNING id', [id]);
    
    if (del.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: "Ristorante non trovato o già eliminato" });
    }

    await client.query('COMMIT');
    console.log(`✅ Ristorante ID ${id} eliminato.`);
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Errore delete ristorante:", e);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;