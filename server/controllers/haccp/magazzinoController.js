const pool = require('../../config/db');

exports.getMagazzino = async (req, res) => {
    try {
        const query = `
            SELECT *,
            to_char(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI') as ultima_modifica_it,
            to_char(data_bolla, 'YYYY-MM-DD') as data_bolla_iso
            FROM magazzino_prodotti WHERE ristorante_id = $1 ORDER BY nome ASC
        `;
        const r = await pool.query(query, [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Errore loading" }); }
};

exports.updateMagazzinoFull = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const qta = parseFloat(body.giacenza) || 0;
        const unitNetto = parseFloat(body.prezzo_unitario_netto) || 0;
        const iva = parseFloat(body.aliquota_iva) || 0;
        const totNetto = qta * unitNetto;
        const totIva = totNetto * (iva / 100);
        const totLordo = totNetto + totIva;

        await pool.query(
            `UPDATE magazzino_prodotti SET 
                giacenza = $1, prezzo_unitario_netto = $2, aliquota_iva = $3,
                valore_totale_netto = $4, valore_totale_iva = $5, valore_totale_lordo = $6,
                nome = COALESCE($7, nome), marca = COALESCE($8, marca), lotto = COALESCE($9, lotto),
                data_bolla = COALESCE($10, data_bolla), tipo_unita = COALESCE($11, tipo_unita), updated_at = NOW()
            WHERE id = $12`,
            [qta, unitNetto, iva, totNetto, totIva, totLordo, body.nome, body.marca, body.lotto, body.data_bolla, body.tipo_unita, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore update" }); }
};

exports.deleteProdottoMagazzino = async (req, res) => { 
    try { 
        await pool.query("DELETE FROM magazzino_prodotti WHERE id = $1", [req.params.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Errore cancellazione" }); } 
};

exports.getStatsMagazzino = async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const speseFornitori = await pool.query(`SELECT fornitore, SUM(prezzo) as totale, COUNT(*) as numero_bolle FROM haccp_merci WHERE ristorante_id = $1 GROUP BY fornitore ORDER BY totale DESC`, [ristorante_id]);
        const storico = await pool.query(`SELECT * FROM haccp_merci WHERE ristorante_id = $1 ORDER BY data_ricezione DESC LIMIT 500`, [ristorante_id]);
        const topProdotti = await pool.query(`SELECT prodotto, SUM(prezzo) as totale_speso, COUNT(*) as acquisti FROM haccp_merci WHERE ristorante_id = $1 GROUP BY prodotto ORDER BY totale_speso DESC LIMIT 10`, [ristorante_id]);
        res.json({ fornitori: speseFornitori.rows, storico: storico.rows, top_prodotti: topProdotti.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- DB FIXES (Manteniamo qui le utilità di sistema) ---
exports.dbFixMagazzinoFull = async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS data_documento DATE");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS riferimento_documento TEXT");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS fornitore_full TEXT");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS prezzo_unitario_netto NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_netto NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_iva NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS totale_lordo NUMERIC DEFAULT 0");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS codice_articolo TEXT DEFAULT ''");
            await client.query("ALTER TABLE haccp_merci ADD COLUMN IF NOT EXISTS sconto NUMERIC(5,2) DEFAULT 0");
            await client.query("ALTER TABLE haccp_assets ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'Cucina'"); // <--- AGGIUNGI QUESTA RIGA
            res.send("✅ DB AGGIORNATO: Colonne Fattura e Totali create!");
        } finally { client.release(); }
    } catch (e) { res.status(500).send("Errore DB Fix: " + e.message); }
};