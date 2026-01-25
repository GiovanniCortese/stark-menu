const pool = require('../../config/db');

exports.getRicette = async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const query = `
            SELECT r.id, r.nome, r.descrizione, 
            COALESCE(JSON_AGG(ri.ingrediente_nome) FILTER (WHERE ri.ingrediente_nome IS NOT NULL), '[]') as ingredienti
            FROM haccp_ricette r
            LEFT JOIN haccp_ricette_ingredienti ri ON r.id = ri.ricetta_id
            WHERE r.ristorante_id = $1
            GROUP BY r.id ORDER BY r.nome ASC
        `;
        const result = await pool.query(query, [ristorante_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createRicetta = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { ristorante_id, nome, ingredienti } = req.body; 
        const resRicetta = await client.query("INSERT INTO haccp_ricette (ristorante_id, nome) VALUES ($1, $2) RETURNING id", [ristorante_id, nome]);
        const ricettaId = resRicetta.rows[0].id;
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query("INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)", [ricettaId, ing]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
};

exports.matchRicetta = async (req, res) => {
    try {
        const { id } = req.params; 
        const { ristorante_id } = req.query;
        const ingRes = await pool.query("SELECT ingrediente_nome FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [id]);
        const ingredientiRichiesti = ingRes.rows.map(r => r.ingrediente_nome);
        const risultati = [];

        for (const ingName of ingredientiRichiesti) {
            const matchQuery = `
                SELECT nome as prodotto, marca as fornitore, lotto, updated_at as data_ricezione
                FROM magazzino_prodotti 
                WHERE ristorante_id = $1 AND nome ILIKE $2 AND giacenza > 0
                LIMIT 1
            `;
            const matchRes = await pool.query(matchQuery, [ristorante_id, `%${ingName}%`]);
            if (matchRes.rows.length > 0) {
                const item = matchRes.rows[0];
                risultati.push({ ingrediente_base: ingName, found: true, text: `${item.prodotto} (L:${item.lotto || 'N/D'})`, dati_match: item });
            } else {
                risultati.push({ ingrediente_base: ingName, found: false, text: `${ingName} (MANCANTE)`, dati_match: null });
            }
        }
        res.json({ success: true, risultati });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateRicetta = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { nome, ingredienti } = req.body;
        await client.query("UPDATE haccp_ricette SET nome = $1 WHERE id = $2", [nome, req.params.id]);
        await client.query("DELETE FROM haccp_ricette_ingredienti WHERE ricetta_id = $1", [req.params.id]);
        if (Array.isArray(ingredienti)) {
            for (const ing of ingredienti) {
                await client.query("INSERT INTO haccp_ricette_ingredienti (ricetta_id, ingrediente_nome) VALUES ($1, $2)", [req.params.id, ing]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
};

exports.deleteRicetta = async (req, res) => { try { await pool.query("DELETE FROM haccp_ricette WHERE id = $1", [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } };