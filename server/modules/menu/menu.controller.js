// server/modules/menu/menu.controller.js
const pool = require('../../config/db');
const { analyzeImageWithGemini, generateTextWithGemini } = require('../../utils/ai');

// --- 1. MENU PUBBLICO (Vista Cliente) ---
exports.getMenuBySlug = async (req, res) => {
    try {
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [req.params.slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });

        let data = rist.rows[0];

        // ✅ compatibilità: alcuni DB usano subscription_active, altri account_attivo
        if (data.account_attivo === undefined || data.account_attivo === null) {
            data.account_attivo = data.subscription_active !== undefined ? data.subscription_active : true;
        }

        // LOGICA SCADENZA
        if (data.data_scadenza) {
            const oggi = new Date();
            const scadenza = new Date(data.data_scadenza);
            oggi.setHours(0,0,0,0);
            scadenza.setHours(0,0,0,0);

            if (scadenza < oggi && data.account_attivo) {
                const nomeLog = data.nome || data.ristorante || data.slug || 'ristorante';
                console.log(`⏳ LICENZA SCADUTA PER: ${nomeLog}. Disattivazione.`);
                // se la colonna account_attivo non esiste, questo update darebbe errore SOLO in caso di scadenza
                await pool.query("UPDATE ristoranti SET account_attivo = FALSE WHERE id = $1", [data.id]);
                data.account_attivo = false;
            }
        }

        if (!data.account_attivo) return res.status(403).json({ error: "Menu disattivato o scaduto" });

        /**
         * ✅ FIX 500:
         * alcune installazioni non hanno colonne categorie.is_bar / categorie.is_pizzeria
         * (o le hanno con nome diverso). Se le selezioni e non esistono -> Postgres lancia errore -> 500.
         * Qui usiamo una query compatibile.
         */
        const menuQuery = `
            SELECT p.*, c.nome as categoria_nome, c.ordine_visualizzazione
            FROM prodotti p
            JOIN categorie c ON p.categoria_id = c.id
            WHERE p.ristorante_id = $1 AND p.visibile = TRUE
            ORDER BY c.ordine_visualizzazione ASC, p.id ASC
        `;
        const menu = await pool.query(menuQuery, [data.id]);

        res.json({ ...data, menu: menu.rows });
    } catch (e) {
        console.error("getMenuBySlug error:", e);
        res.status(500).json({ error: "Errore server" });
    }
};

// --- 1.5 MENU ADMIN (Dashboard Gestione) ---
exports.getAdminMenu = async (req, res) => {
    try {
        const { ristorante_id } = req.query;
        if (!ristorante_id) return res.status(400).json({ error: "ID Ristorante mancante" });

        const menuQuery = `
            SELECT p.*, c.nome as categoria_nome, c.ordine_visualizzazione
            FROM prodotti p
            LEFT JOIN categorie c ON p.categoria_id = c.id
            WHERE p.ristorante_id = $1
            ORDER BY c.ordine_visualizzazione ASC, p.id ASC
        `;
        const menu = await pool.query(menuQuery, [ristorante_id]);

        res.json(menu.rows);
    } catch (e) {
        console.error("Errore Admin Menu:", e);
        res.status(500).json({ error: e.message });
    }
};

// --- 2. GESTIONE CATEGORIE (Admin) ---
exports.getCategorie = async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY ordine_visualizzazione ASC", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveCategoria = async (req, res) => {
    try {
        const { id, ristorante_id, nome, descrizione, is_bar, is_pizzeria, varianti_default } = req.body;
        const variantiStr = typeof varianti_default === 'object' ? JSON.stringify(varianti_default) : varianti_default;

        if (id) {
            await pool.query(
                "UPDATE categorie SET nome=$1, descrizione=$2, is_bar=$3, is_pizzeria=$4, varianti_default=$5 WHERE id=$6",
                [nome, descrizione, is_bar, is_pizzeria, variantiStr, id]
            );
        } else {
            await pool.query(
                "INSERT INTO categorie (ristorante_id, nome, descrizione, is_bar, is_pizzeria, varianti_default) VALUES ($1, $2, $3, $4, $5, $6)",
                [ristorante_id, nome, descrizione, is_bar, is_pizzeria, variantiStr]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteCategoria = async (req, res) => {
    try {
        await pool.query("DELETE FROM categorie WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.reorderCategorie = async (req, res) => {
    try {
        const { orderedIds } = req.body;
        for (let i = 0; i < orderedIds.length; i++) {
            await pool.query("UPDATE categorie SET ordine_visualizzazione = $1 WHERE id = $2", [i, orderedIds[i]]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 3. GESTIONE PRODOTTI (Admin) ---
exports.saveProdotto = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id, ristorante_id, categoria_id, nome, descrizione, prezzo, varianti, allergeni } = req.body;
        const foto_url = req.file ? req.file.path : req.body.foto_url;

        const varJson = typeof varianti === 'object' ? JSON.stringify(varianti) : varianti;
        const allJson = typeof allergeni === 'object' ? JSON.stringify(allergeni) : allergeni;

        if (id) {
            await client.query(
                `UPDATE prodotti SET nome=$1, descrizione=$2, prezzo=$3, categoria_id=$4, foto_url=$5, varianti=$6, allergeni=$7 WHERE id=$8`,
                [nome, descrizione, prezzo, categoria_id, foto_url, varJson, allJson, id]
            );
        } else {
            await client.query(
                `INSERT INTO prodotti (ristorante_id, categoria_id, nome, descrizione, prezzo, foto_url, varianti, allergeni) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [ristorante_id, categoria_id, nome, descrizione, prezzo, foto_url, varJson, allJson]
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Errore salvataggio prodotto" });
    } finally {
        client.release();
    }
};

exports.deleteProdotto = async (req, res) => {
    try {
        await pool.query("DELETE FROM prodotti WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- 4. TRADUZIONI AI ---
exports.translateMenu = async (req, res) => {
    const { ristorante_id, lang } = req.body;
    if (!ristorante_id || !lang) return res.status(400).json({ error: "Dati mancanti" });

    const client = await pool.connect();
    try {
        const menu = await client.query("SELECT id, nome, descrizione, ingredienti_base FROM prodotti WHERE ristorante_id = $1", [ristorante_id]);

        const itemsToTranslate = menu.rows.map(p => ({
            id: p.id,
            nome: p.nome,
            desc: p.descrizione,
            ing: typeof p.ingredienti_base === 'string' ? JSON.parse(p.ingredienti_base || '[]') : []
        }));

        const prompt = `Traduci questo menu gastronomico in codice lingua "${lang}". 
        Rispondi ESCLUSIVAMENTE con un JSON valido array: [{id: 123, nome: "...", desc: "...", ingredienti_base: ["..."]}]. 
        Mantieni i nomi propri italiani se intraducibili.
        Ecco i dati: ${JSON.stringify(itemsToTranslate)}`;

        const translatedText = await generateTextWithGemini(prompt);

        const cleanJson = translatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const translations = JSON.parse(cleanJson);

        await client.query('BEGIN');
        for (const t of translations) {
            await client.query(
                `UPDATE prodotti SET traduzioni = jsonb_set(COALESCE(traduzioni, '{}'), '{${lang}}', $1) WHERE id = $2`,
                [JSON.stringify(t), t.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, count: translations.length });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("AI Error:", e);
        res.status(500).json({ error: "Errore traduzione AI: " + e.message });
    } finally {
        client.release();
    }
};
