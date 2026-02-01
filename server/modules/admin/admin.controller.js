// server/modules/admin/admin.controller.js
const pool = require('../../config/db');
const { sendWA } = require('../../utils/whatsappClient');

// --- 1. CONFIGURAZIONE RISTORANTE ---
exports.getConfig = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM ristoranti WHERE id = $1", [req.params.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: "Non trovato" });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateConfig = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        
        // Costruiamo la query dinamicamente in base ai campi inviati
        const fields = Object.keys(data).filter(k => k !== 'id');
        const values = fields.map(k => data[k]);
        
        if (fields.length === 0) return res.json({ success: true }); // Nulla da aggiornare

        const setClause = fields.map((f, i) => `${f} = $${i+1}`).join(', ');
        
        await pool.query(`UPDATE ristoranti SET ${setClause} WHERE id = $${fields.length+1}`, [...values, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 2. SICUREZZA (PASSWORD REPARTI) ---
exports.updateSecurity = async (req, res) => {
    try {
        const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino } = req.body;
        await pool.query(
            `UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4, pw_haccp=$5, pw_magazzino=$6 WHERE id=$7`,
            [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, pw_haccp, pw_magazzino, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 3. LAYOUT SALA (TAVOLI) ---
exports.getTables = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM tavoli WHERE ristorante_id = $1 ORDER BY numero ASC", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveTables = async (req, res) => {
    const client = await pool.connect();
    try {
        const { ristorante_id, tavoli } = req.body; // Array di tavoli
        await client.query('BEGIN');
        
        // 1. Rimuovi tavoli vecchi (Strategia semplice: wipe & rewrite per il layout grafico)
        // Nota: Se vuoi mantenere lo storico ordini, meglio fare UPSERT, ma per il layout grafico spesso si resetta.
        // Per sicurezza, facciamo UPSERT o cancelliamo solo quelli non presenti.
        // Qui per semplicità aggiorniamo le coordinate se esiste, creiamo se nuovo.
        
        for (const t of tavoli) {
            if (t.id && String(t.id).length < 10) { // ID Database esistente
                await client.query(
                    "UPDATE tavoli SET x=$1, y=$2, shape=$3, numero=$4, coperti=$5 WHERE id=$6",
                    [t.x, t.y, t.shape, t.numero, t.coperti, t.id]
                );
            } else {
                await client.query(
                    "INSERT INTO tavoli (ristorante_id, numero, x, y, shape, coperti, stato) VALUES ($1, $2, $3, $4, $5, $6, 'libero')",
                    [ristorante_id, t.numero, t.x, t.y, t.shape, t.coperti]
                );
            }
        }
        
        // Opzionale: gestire cancellazioni tavoli rimossi dal frontend
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

// --- 4. PRENOTAZIONI (Con WhatsApp) ---
exports.getPrenotazioni = async (req, res) => {
    try {
        const { date } = req.query; // Filtro opzionale per data
        let query = "SELECT * FROM prenotazioni WHERE ristorante_id = $1";
        const params = [req.params.ristorante_id];
        
        if (date) {
            query += " AND data_prenotazione::date = $2";
            params.push(date);
        }
        
        query += " ORDER BY data_prenotazione ASC";
        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createPrenotazione = async (req, res) => {
    try {
        const { ristorante_id, cliente_nome, cliente_telefono, data_ora, persone, note } = req.body;
        
        const result = await pool.query(
            "INSERT INTO prenotazioni (ristorante_id, nome_cliente, telefono, data_prenotazione, persone, note, stato) VALUES ($1, $2, $3, $4, $5, $6, 'confermata') RETURNING id",
            [ristorante_id, cliente_nome, cliente_telefono, data_ora, persone, note]
        );

        // INVIO WHATSAPP
        if (cliente_telefono) {
            const dataStr = new Date(data_ora).toLocaleDateString('it-IT');
            const oraStr = new Date(data_ora).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
            
            await sendWA(cliente_telefono, {
                name: "conferma_prenotazione", 
                params: [cliente_nome, dataStr, oraStr]
            }, true);
        }

        res.json({ success: true, id: result.rows[0].id });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 5. DASHBOARD STATS ---
exports.getStats = async (req, res) => {
    try {
        const id = req.params.id;
        
        // Incasso Totale
        const incassoRes = await pool.query("SELECT SUM(prezzo_totale) as totale FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'", [id]);
        
        // Piatti più venduti (Top 5)
        // Nota: Richiede parsing JSON se i dettagli sono jsonb, qui semplifico
        // In una struttura SQL pura sarebbe una query complessa. 
        // Per ora mandiamo i dati grezzi o un placeholder se non hai una tabella dettagli_ordini normalizzata.
        
        res.json({
            incasso_totale: incassoRes.rows[0].totale || 0,
            ordini_oggi: 0, // Da implementare con query su data odierna
            topDishes: []   // Da implementare
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 6. SUPERADMIN (Delete) ---
exports.deleteRistorante = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        
        // Cancellazione a cascata manuale (se non hai ON DELETE CASCADE ovunque)
        const tables = ['haccp_merci', 'haccp_logs', 'haccp_assets', 'haccp_pulizie', 'magazzino_prodotti', 'ordini', 'prodotti', 'categorie', 'tavoli', 'utenti'];
        for (const t of tables) {
            await client.query(`DELETE FROM ${t} WHERE ristorante_id = $1`, [id]);
        }
        await client.query("DELETE FROM ristorante WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

// --- 7. GENERIC UPLOAD ---
exports.uploadFile = (req, res) => {
    if (req.file) {
        res.json({ success: true, url: req.file.path });
    } else {
        res.status(400).json({ error: "Nessun file caricato" });
    }
};