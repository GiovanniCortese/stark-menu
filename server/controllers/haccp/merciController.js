const pool = require('../../config/db');
const { analyzeImageWithGemini } = require('../../utils/ai');
const { gestisciMagazzino } = require('../../utils/magazzinoUtils');

// Helper data
function normalizzaData(dataStr) {
    if (!dataStr) return new Date().toISOString().split('T')[0];
    try {
        const clean = dataStr.replace(/[^0-9\/\-\.]/g, ''); 
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
        let parts = clean.split(/[\/\-\.]/);
        if (parts.length === 3) {
            if (parts[2].length === 2) parts[2] = "20" + parts[2]; 
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
    } catch(e) { return new Date().toISOString().split('T')[0]; }
    return new Date().toISOString().split('T')[0];
}

exports.getMerci = async (req, res) => {
    try {
        const { start, end } = req.query; 
        let sql = `
            SELECT *, 
            to_char(data_documento, 'YYYY-MM-DD') as data_documento_iso, 
            to_char(data_ricezione, 'YYYY-MM-DD') as data_ricezione_iso,
            to_char(data_documento, 'DD/MM/YYYY') as data_doc_fmt,
            to_char(data_inserimento, 'DD/MM/YYYY HH24:MI') as data_ins_fmt
            FROM haccp_merci 
            WHERE ristorante_id = $1
        `;
        const params = [req.params.ristorante_id];
        
        if (start && end) {
            sql += ` AND data_ricezione >= $2 AND data_ricezione <= $3`;
            params.push(start, end);
        } else {
            sql += ` AND data_ricezione >= CURRENT_DATE - INTERVAL '7 days'`;
        }
        sql += " ORDER BY data_ricezione DESC, id DESC"; 
        
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch(e) { res.status(500).json({error:"Err"}); }
};

exports.createMerce = async (req, res) => { 
    const client = await pool.connect();
    try { 
        await client.query('BEGIN');
        const { 
            ristorante_id, data_ricezione, ora, fornitore, prodotto, 
            lotto, scadenza, temperatura, conforme, integro, note, 
            operatore, quantita, unita_misura, allegato_url, destinazione, 
            prezzo_unitario, iva, is_haccp, 
            data_documento, riferimento_documento, codice_articolo, sconto
        } = req.body; 

        const resultMagazzino = await gestisciMagazzino(client, {
            ristorante_id, prodotto, 
            quantita: parseFloat(quantita)||0, 
            prezzo_unitario: parseFloat(prezzo_unitario)||0, 
            iva: parseFloat(iva)||0, 
            fornitore, unita_misura, lotto, 
            data_bolla: data_documento || data_ricezione, 
            numero_bolla: riferimento_documento || '',
            codice_articolo: codice_articolo || '',
            sconto: parseFloat(sconto)||0
        });

        const { totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario } = resultMagazzino;

        if (is_haccp === true || is_haccp === 'true') {
            await client.query(
                `INSERT INTO haccp_merci (
                    ristorante_id, magazzino_id, data_ricezione, ora, fornitore, prodotto, 
                    lotto, scadenza, temperatura, conforme, integro, note, operatore, 
                    quantita, unita_misura, allegato_url, destinazione, 
                    prezzo_unitario, prezzo_unitario_netto, iva, 
                    totale_netto, totale_iva, totale_lordo, is_haccp,
                    data_documento, riferimento_documento, codice_articolo, sconto
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, true, $24, $25, $26, $27)`, 
                [
                    ristorante_id, resultMagazzino.id, data_ricezione, ora || '', fornitore, prodotto, 
                    lotto, scadenza || null, temperatura, conforme, integro, note, operatore, 
                    quantita, unita_misura || '', allegato_url, destinazione, 
                    parseFloat(prezzo_unitario)||0, prezzoNettoUnitario, parseFloat(iva)||0,
                    totaleNetto, totaleIva, totaleLordo,
                    data_documento || data_ricezione, riferimento_documento || '', 
                    codice_articolo || '', parseFloat(sconto) || 0
                ]
            );
        }
        await client.query('COMMIT');
        res.json({success:true, message: "Salvato correttamente!"}); 
    } catch(e) { 
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({error:"Err: " + e.message}); 
    } finally {
        client.release();
    }
};

exports.updateMerceBulk = async (req, res) => {
    const client = await pool.connect();
    try {
        const { merci } = req.body;
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Dati non validi" });
        await client.query('BEGIN');
        for (const m of merci) {
            if (m.id) {
                 const qta = parseFloat(m.quantita) || 0;
                 const przUnit = parseFloat(m.prezzo_unitario) || 0;
                 const sc = parseFloat(m.sconto) || 0;
                 const aliIva = parseFloat(m.iva) || 0;
                 const prezzoNettoUnitario = przUnit * (1 - (sc / 100));
                 const totaleNetto = qta * prezzoNettoUnitario;
                 const totaleIva = totaleNetto * (aliIva / 100);
                 const totaleLordo = totaleNetto + totaleIva;

                 await client.query(
                    `UPDATE haccp_merci SET 
                        data_documento=$1, riferimento_documento=$2, fornitore=$3, 
                        codice_articolo=$4, prodotto=$5, quantita=$6, unita_misura=$7, 
                        prezzo_unitario=$8, sconto=$9, iva=$10, 
                        prezzo_unitario_netto=$11, totale_netto=$12, totale_iva=$13, totale_lordo=$14,
                        lotto=$15, scadenza=$16
                     WHERE id=$17`,
                    [
                        m.data_documento, m.riferimento_documento, m.fornitore,
                        m.codice_articolo, m.prodotto, qta, m.unita_misura,
                        przUnit, sc, aliIva,
                        prezzoNettoUnitario, totaleNetto, totaleIva, totaleLordo,
                        m.lotto, m.scadenza || null,
                        m.id
                    ]
                 );
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

exports.importMerci = async (req, res) => {
    try {
        const { merci } = req.body; 
        if (!Array.isArray(merci)) return res.status(400).json({ error: "Formato non valido" });

        let inserted = 0;
        let errors = [];
        
        for (const m of merci) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const sconto = parseFloat(m.sconto) || 0;
                const qta = parseFloat(m.quantita) || 0;
                const przUnit = parseFloat(m.prezzo_unitario) || 0;
                const iva = parseFloat(m.iva) || 0;
                const dataDoc = m.data_documento || m.data_ricezione; 
                const numDoc = m.riferimento_documento || ''; 

                const resultMagazzino = await gestisciMagazzino(client, {
                    ristorante_id: m.ristorante_id,
                    prodotto: m.prodotto,
                    quantita: qta,
                    prezzo_unitario: przUnit,
                    iva: iva,
                    fornitore: m.fornitore,
                    unita_misura: m.unita_misura,
                    lotto: m.lotto,
                    data_bolla: dataDoc,        
                    numero_bolla: numDoc,       
                    codice_articolo: m.codice_articolo, 
                    sconto: sconto
                });

                const magazzinoId = resultMagazzino.id;
                const { totaleNetto, totaleIva, totaleLordo, prezzoNettoUnitario } = resultMagazzino;

                if (m.is_haccp === true || m.is_haccp === 'true') {
                    const checkHaccp = await client.query(`
                        SELECT id FROM haccp_merci 
                        WHERE ristorante_id = $1 AND magazzino_id = $2 AND riferimento_documento = $3 AND lotto = $4
                    `, [m.ristorante_id, magazzinoId, numDoc, m.lotto || '']);

                    if (checkHaccp.rows.length === 0) {
                        await client.query(
                            `INSERT INTO haccp_merci (
                                ristorante_id, magazzino_id, 
                                data_ricezione, data_documento, riferimento_documento,
                                fornitore, prodotto, codice_articolo,
                                quantita, unita_misura, 
                                prezzo_unitario, prezzo_unitario_netto, sconto, iva, 
                                totale_netto, totale_iva, totale_lordo,
                                lotto, scadenza, operatore, note, 
                                conforme, integro, destinazione, ora, is_haccp, allegato_url
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, true, true, $22, $23, true, $24)`,
                            [
                                m.ristorante_id, magazzinoId, 
                                m.data_ricezione, dataDoc, numDoc, 
                                m.fornitore, m.prodotto, m.codice_articolo || '',
                                qta, m.unita_misura, 
                                przUnit, prezzoNettoUnitario, sconto, iva, 
                                totaleNetto, totaleIva, totaleLordo,       
                                m.lotto || '', m.scadenza || null, m.operatore || 'SCAN', m.note || '', 
                                m.destinazione || '', m.ora, m.allegato_url || ''
                            ]
                        );
                    }
                }
                await client.query('COMMIT');
                inserted++;
            } catch (innerError) {
                await client.query('ROLLBACK');
                errors.push({ prodotto: m.prodotto, errore: innerError.message });
            } finally {
                client.release();
            }
        }
        res.json({ success: true, message: `Importato: ${inserted}`, dettagli_errori: errors });
    } catch (e) {
        res.status(500).json({ error: "Errore critico server: " + e.message });
    }
};

exports.updateMerce = async (req, res) => { 
    try { 
        const { 
            data_ricezione, data_documento, riferimento_documento, fornitore, prodotto, codice_articolo,
            lotto, scadenza, temperatura, conforme, integro, note, operatore, quantita, unita_misura,
            allegato_url, destinazione, prezzo_unitario, sconto, iva 
        } = req.body; 

        const qta = parseFloat(quantita) || 0;
        const przListino = parseFloat(prezzo_unitario) || 0;
        const sc = parseFloat(sconto) || 0;
        const aliIva = parseFloat(iva) || 0;
        const prezzoNettoUnitario = przListino * (1 - (sc / 100));
        const totaleNetto = qta * prezzoNettoUnitario;
        const totaleIva = totaleNetto * (aliIva / 100);
        const totaleLordo = totaleNetto + totaleIva;

        await pool.query(
            `UPDATE haccp_merci SET 
                data_ricezione=$1, data_documento=$2, riferimento_documento=$3, fornitore=$4, 
                prodotto=$5, codice_articolo=$6, lotto=$7, scadenza=$8, 
                temperatura=$9, conforme=$10, integro=$11, note=$12, operatore=$13, 
                quantita=$14, unita_misura=$15, allegato_url=$16, destinazione=$17, 
                prezzo_unitario=$18, sconto=$19, iva=$20, prezzo_unitario_netto=$21,
                totale_netto=$22, totale_iva=$23, totale_lordo=$24
            WHERE id=$25`, 
            [
                data_ricezione, data_documento || data_ricezione, riferimento_documento || '', 
                fornitore, prodotto, codice_articolo || '', lotto, scadenza || null, 
                temperatura, conforme, integro, note, operatore, 
                qta, unita_misura || '', allegato_url, destinazione, 
                przListino, sc, aliIva, prezzoNettoUnitario, 
                totaleNetto, totaleIva, totaleLordo, 
                req.params.id
            ]
        ); 
        res.json({ success: true, message: "Riga aggiornata e ricalcolata" }); 
    } catch(e) { 
        res.status(500).json({ error: "Errore salvataggio: " + e.message }); 
    } 
};

exports.deleteMerce = async (req, res) => { 
    try { 
        await pool.query("DELETE FROM haccp_merci WHERE id=$1", [req.params.id]); 
        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
};

exports.deleteMerceBulk = async (req, res) => {
    const client = await pool.connect();
    try {
        const { ids } = req.body; 
        if (!ids || ids.length === 0) return res.json({ success: true });
        await client.query('BEGIN');
        await client.query("DELETE FROM haccp_merci WHERE id = ANY($1::int[])", [ids]);
        await client.query('COMMIT');
        res.json({ success: true, deleted: ids.length });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

exports.scanBolla = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });
        const prompt = `
        Sei un contabile esperto italiano. Analizza questa immagine di fattura o DDT.
        Devi estrarre i dati con estrema precisione.
        [... prompt originale ...]
        OUTPUT JSON PURO.`;

        const data = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);
        data.data_documento_iso = normalizzaData(data.data_documento);
        const now = new Date();
        data.ora_inserimento = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        res.json({ success: true, data });
    } catch (e) {
        console.error("Errore Scan Bolla:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    }
};