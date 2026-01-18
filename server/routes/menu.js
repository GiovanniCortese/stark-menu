const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const xlsx = require('xlsx');
const { uploadFile } = require('../config/storage');

router.get('/menu/:slug', async (req, res) => {
    try {
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [req.params.slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Not found" });
        const d = rist.rows[0];
        const m = await pool.query(`SELECT p.*, c.nome as categoria_nome, c.posizione as cat_pos, c.varianti_default FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY c.posizione ASC, p.posizione ASC`, [d.id]);
        res.json({ id: d.id, ristorante: d.nome, style: d, menu: m.rows, ordini_abilitati: d.ordini_abilitati });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.post('/prodotti', async (req, res) => {
    try {
        const { nome, prezzo, categoria, ristorante_id } = req.body;
        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        await pool.query(`INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id, posizione, varianti, allergeni, traduzioni) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [nome, prezzo, categoria, ristorante_id, (max.rows[0].max||0)+1, req.body.varianti||'{}', JSON.stringify(req.body.allergeni||[]), JSON.stringify(req.body.traduzioni||{})]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/prodotti/:id', async (req, res) => {
    try {
        await pool.query('UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6, varianti=$8, allergeni=$9, traduzioni=$10 WHERE id=$7',
            [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria, req.body.descrizione, req.body.immagine_url, req.params.id, req.body.varianti, JSON.stringify(req.body.allergeni||[]), JSON.stringify(req.body.traduzioni||{})]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.delete('/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

router.put('/prodotti/riordina', async (req, res) => {
    try { for (const p of req.body.prodotti) await pool.query('UPDATE prodotti SET posizione=$1 WHERE id=$2', [p.posizione, p.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.get('/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.post('/categorie', async (req, res) => { try { const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id=$1', [req.body.ristorante_id]); await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, varianti_default) VALUES ($1, $2, $3, $4)', [req.body.nome, (max.rows[0].max||0)+1, req.body.ristorante_id, req.body.varianti_default||'[]']); res.json({success:true}); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/categorie/:id', async (req, res) => { try { await pool.query('UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3, descrizione=$4, varianti_default=$5 WHERE id=$6', [req.body.nome, req.body.is_bar, req.body.is_pizzeria, req.body.descrizione, req.body.varianti_default, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
router.delete('/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id=$1', [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

router.post('/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file) return res.status(400).json({ error: "File mancante" });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const data = xlsx.utils.sheet_to_json(xlsx.read(req.file.buffer, {type:'buffer'}).Sheets[xlsx.read(req.file.buffer, {type:'buffer'}).SheetNames[0]]);
        let catP = (await client.query('SELECT MAX(posizione) as m FROM categorie WHERE ristorante_id=$1', [ristorante_id])).rows[0].m || 0;
        let prodP = (await client.query('SELECT MAX(posizione) as m FROM prodotti WHERE ristorante_id=$1', [ristorante_id])).rows[0].m || 0;
        for (const row of data) {
            const cat = row['Categoria'] || "Generale";
            let cId = (await client.query('SELECT id FROM categorie WHERE nome=$1 AND ristorante_id=$2', [cat, ristorante_id])).rows[0]?.id;
            if(!cId) { await client.query('INSERT INTO categorie (nome,posizione,ristorante_id) VALUES ($1,$2,$3)', [cat, ++catP, ristorante_id]); }
            await client.query('INSERT INTO prodotti (nome,prezzo,categoria,ristorante_id,posizione,allergeni) VALUES ($1,$2,$3,$4,$5,$6)', [row['Nome'], row['Prezzo'], cat, ristorante_id, ++prodP, JSON.stringify((row['Allergeni']||"").split(','))]);
        }
        await client.query('COMMIT'); res.json({success:true});
    } catch(e){ await client.query('ROLLBACK'); res.status(500).json({error:e.message}); } finally { client.release(); }
});

router.get('/export-excel/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM prodotti WHERE ristorante_id=$1 ORDER BY categoria", [req.params.ristorante_id]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(r.rows), "Menu");
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

module.exports = router;