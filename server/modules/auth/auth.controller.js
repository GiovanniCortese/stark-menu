// server/modules/auth/auth.controller.js
const pool = require('../../config/db');

// --- LOGIN GENERALE (CON GOD MODE) ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (password === "SUPER_GOD_TOKEN_2026") {
      console.log(`⚡ GOD MODE ATTIVATO per: ${email}`);
      const userCheck = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        await pool.query("UPDATE utenti SET ultimo_accesso = NOW() WHERE id = $1", [userCheck.rows[0].id]);
        return res.json({ success: true, user: userCheck.rows[0] });
      } else {
        return res.json({ success: false, error: "Email non trovata (God Mode)" });
      }
    }

    const r = await pool.query(
      'SELECT * FROM utenti WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (r.rows.length > 0) {
      await pool.query("UPDATE utenti SET ultimo_accesso = NOW() WHERE id = $1", [r.rows[0].id]);
      res.json({ success: true, user: r.rows[0] });
    } else {
      res.json({ success: false, error: "Credenziali errate" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Errore login interno" });
  }
};

// --- LOGIN CASSA (Postazione Fissa) ---
exports.loginCassa = async (req, res) => {
  try {
    const { slug, password } = req.body;
    const result = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
    
    const rist = result.rows[0];
    if (password === rist.pw_cassa) {
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

    // ✅ SUPER ADMIN: utenti globali (tutti)
    if (mode === 'super') {
      const q = `
        SELECT u.*,
               r.nome AS nome_ristorante_collegato
        FROM utenti u
        LEFT JOIN ristoranti r ON r.id = u.ristorante_id
        ORDER BY u.id DESC
      `;
      const r = await pool.query(q);
      return res.json(r.rows);
    }

    // per gli altri mode, serve ristorante_id
    if (!ristorante_id) {
      return res.json([]); // evita crash e risponde vuoto
    }

    // ✅ STAFF: escludi clienti
    if (mode === 'staff') {
      const r = await pool.query(
        "SELECT * FROM utenti WHERE ristorante_id = $1 AND (ruolo IS NULL OR ruolo <> 'cliente') ORDER BY id DESC",
        [ristorante_id]
      );
      return res.json(r.rows);
    }

    // ✅ CLIENTI: fallback semplice
    if (mode === 'clienti_ordini') {
      const r = await pool.query(
        "SELECT * FROM utenti WHERE ristorante_id = $1 AND ruolo = 'cliente' ORDER BY id DESC",
        [ristorante_id]
      );
      return res.json(r.rows);
    }

    // DEFAULT: tutti utenti del ristorante
    const r = await pool.query(
      "SELECT * FROM utenti WHERE ristorante_id = $1 ORDER BY id DESC",
      [ristorante_id]
    );
    return res.json(r.rows);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { nome, email, password, ruolo, ristorante_id, telefono } = req.body;

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
  } catch (e) {
    res.status(500).json({ error: "Err" });
  }
};

exports.deleteUser = async (req, res) => { 
  try { 
    await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); 
    res.json({ success: true }); 
  } catch (e) {
    res.status(500).json({ error: "Err" });
  }
};
