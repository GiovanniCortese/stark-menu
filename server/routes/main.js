const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { upload, cloudinary } = require('../config/storage');
const https = require('https'); const http = require('http');

// RISTORANTI & CONFIG
router.get('/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.put('/ristorante/style/:id', async (req, res) => { try { await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_btn=$6 WHERE id=$7`, [req.body.logo_url, req.body.cover_url, req.body.colore_sfondo, req.body.colore_titolo, req.body.colore_testo, req.body.colore_btn, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
router.put('/ristorante/security/:id', async (req, res) => { try { await pool.query(`UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3 WHERE id=$4`, [req.body.pw_cassa, req.body.pw_cucina, req.body.pw_pizzeria, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// UTENTI
router.get('/utenti', async (req, res) => { try { const r = await pool.query('SELECT * FROM utenti WHERE ristorante_id = $1 ORDER BY nome', [req.query.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/utenti/:id', async (req, res) => { try { await pool.query(`UPDATE utenti SET nome=$1, email=$2, ruolo=$3 WHERE id=$4`, [req.body.nome, req.body.email, req.body.ruolo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.delete('/utenti/:id', async (req, res) => { try { await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// STATS
router.get('/stats/dashboard/:ristorante_id', async (req, res) => { 
    try { 
        const incassi = await pool.query(`SELECT SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'`, [req.params.ristorante_id]); 
        res.json({ incassi: incassi.rows[0] }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

// UPLOAD & PROXY
router.post('/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));
router.get('/proxy-download', async (req, res) => {
    const { url, name } = req.query;
    if (!url) return res.status(400).send("URL mancante");
    try {
        const publicId = url.split('/upload/')[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, "");
        const resource = await cloudinary.api.resource(publicId, { resource_type: 'image' }).catch(() => cloudinary.api.resource(publicId+".pdf", {resource_type:'raw'}));
        const downloadUrl = cloudinary.url(resource.public_id, { resource_type: resource.resource_type, sign_url: true, secure: true });
        (downloadUrl.startsWith('https') ? https : http).get(downloadUrl, r => {
            res.setHeader('Content-Disposition', `inline; filename="${name||'doc.pdf'}"`);
            r.pipe(res);
        });
    } catch (e) { res.status(500).send("Errore download"); }
});

module.exports = router;