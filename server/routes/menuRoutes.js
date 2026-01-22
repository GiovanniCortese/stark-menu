const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { uploadFile } = require('../config/storage');
const xlsx = require('xlsx');
const { analyzeImageWithGemini } = require('../utils/ai');


// Get Menu (Public)
router.get('/api/menu/:slug', async (req, res) => { 
    try { 
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [req.params.slug]); 
        if (rist.rows.length === 0) return res.status(404).json({ error: "Non trovato" }); 
        const data = rist.rows[0]; 
        
        const menu = await pool.query(`SELECT p.*, p.traduzioni as traduzioni, c.is_bar as categoria_is_bar, c.is_pizzeria as categoria_is_pizzeria, c.posizione as categoria_posizione, c.nome as categoria_nome, c.descrizione as categoria_descrizione, c.varianti_default as categoria_varianti, c.traduzioni as categoria_traduzioni FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY c.posizione ASC, p.posizione ASC`, [data.id]); 
        
        res.json({ 
            id: data.id, 
            ristorante: data.nome, 
            style: { 
                logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, title: data.colore_titolo, 
                text: data.colore_testo, price: data.colore_prezzo, font: data.font_style, card_bg: data.colore_card, 
                card_border: data.colore_border, btn_bg: data.colore_btn, btn_text: data.colore_btn_text, 
                tavolo_bg: data.colore_tavolo_bg, tavolo_text: data.colore_tavolo_text, carrello_bg: data.colore_carrello_bg, 
                carrello_text: data.colore_carrello_text, checkout_bg: data.colore_checkout_bg, checkout_text: data.colore_checkout_text, 
                colore_modal_bg: data.colore_modal_bg, colore_modal_text: data.colore_modal_text, info_footer: data.info_footer, 
                url_allergeni: data.url_allergeni, colore_footer_text: data.colore_footer_text, dimensione_footer: data.dimensione_footer, 
                allineamento_footer: data.allineamento_footer, url_menu_giorno: data.url_menu_giorno, url_menu_pdf: data.url_menu_pdf,
                nascondi_euro: data.nascondi_euro,
                prezzo_coperto: data.prezzo_coperto
            }, 
            subscription_active: data.account_attivo !== false, 
            kitchen_active: data.cucina_super_active !== false, 
            ordini_abilitati: data.ordini_abilitati, 
            pw_cassa: data.pw_cassa, pw_cucina: data.pw_cucina, pw_pizzeria: data.pw_pizzeria, pw_bar: data.pw_bar, 
            menu: menu.rows 
        }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

// Gestione Categorie
router.post('/api/categorie', async (req, res) => { try { const { nome, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni } = req.body; const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [nome, (max.rows[0].max || 0) + 1, ristorante_id, is_bar || false, is_pizzeria || false, descrizione || "", varianti_default || '[]', JSON.stringify(traduzioni || {})]); res.json({success:true}); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/api/categorie/riordina', async (req, res) => { const { categorie } = req.body; try { for (const cat of categorie) await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.put('/api/categorie/:id', async (req, res) => { try { const { nome, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni } = req.body; await pool.query('UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3, descrizione=$4, varianti_default=$5, traduzioni=$6 WHERE id=$7', [nome, is_bar, is_pizzeria, descrizione, varianti_default, JSON.stringify(traduzioni || {}), req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.delete('/api/categorie/:id', async (req, res) => { const client = await pool.connect(); try { await client.query('BEGIN'); const { id } = req.params; const catRes = await client.query('SELECT nome, ristorante_id FROM categorie WHERE id = $1', [id]); if (catRes.rows.length > 0) { const { nome, ristorante_id } = catRes.rows[0]; await client.query('DELETE FROM prodotti WHERE categoria = $1 AND ristorante_id = $2', [nome, ristorante_id]); } await client.query('DELETE FROM categorie WHERE id = $1', [id]); await client.query('COMMIT'); res.json({ success: true }); } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: "Errore durante l'eliminazione" }); } finally { client.release(); } });

// Gestione Prodotti (AGGIORNATO CON qta_minima)
router.post('/api/prodotti', async (req, res) => { 
    try { 
        const { nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, varianti, allergeni, traduzioni, unita_misura, qta_minima } = req.body; 
        
        // Controllo e parsing sicuro dei JSON per evitare crash lato client
        let safeVarianti = '{}';
        if (typeof varianti === 'string') safeVarianti = varianti;
        else if (typeof varianti === 'object') safeVarianti = JSON.stringify(varianti);

        let safeAllergeni = '[]';
        if (typeof allergeni === 'string') safeAllergeni = allergeni;
        else if (Array.isArray(allergeni)) safeAllergeni = JSON.stringify(allergeni);

        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]); 
        const nuovaPosizione = (max.rows[0].max || 0) + 1; 
        
        const queryText = `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione, varianti, allergeni, traduzioni, unita_misura, qta_minima) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`; 
        const values = [nome, prezzo, categoria, sottocategoria || "", descrizione || "", ristorante_id, immagine_url || "", nuovaPosizione, safeVarianti, safeAllergeni, JSON.stringify(traduzioni || {}), unita_misura || "", qta_minima || 1]; 
        
        await pool.query(queryText, values); 
        
        // Check se la categoria esiste, altrimenti creala
        const checkCat = await pool.query("SELECT id FROM categorie WHERE nome = $1 AND ristorante_id = $2", [categoria, ristorante_id]);
        if (checkCat.rows.length === 0) {
             const maxCat = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
             await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, varianti_default) VALUES ($1, $2, $3, $4)', [categoria, (maxCat.rows[0].max || 0) + 1, ristorante_id, '[]']);
        }

        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});

router.put('/api/prodotti/riordina', async (req, res) => { const { prodotti } = req.body; try { for (const prod of prodotti) { if (prod.categoria) await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]); else await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

router.put('/api/prodotti/:id', async (req, res) => { 
    try { 
        const { nome, prezzo, categoria, sottocategoria, descrizione, immagine_url, varianti, allergeni, traduzioni, unita_misura, qta_minima } = req.body; 
        await pool.query('UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6, varianti=$8, allergeni=$9, traduzioni=$10, unita_misura=$11, qta_minima=$12 WHERE id=$7', [nome, prezzo, categoria, sottocategoria, descrizione, immagine_url, req.params.id, varianti, JSON.stringify(allergeni || []), JSON.stringify(traduzioni || {}), unita_misura || "", qta_minima || 1]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Errore salvataggio prodotto" }); } 
});

router.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// --- SCANSIONE MENU INTELLIGENTE (IMG + PDF + AUTO-FIX) ---
router.post('/api/menu/scan-photo', uploadFile.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });

        // Prompt specifico per i Menu
        const prompt = `
        Sei un esperto ristoratore. Analizza questo file (immagine o PDF del menù).
        Estrai i piatti raggruppandoli.
        
        REGOLE:
        1. Se ci sono ingredienti o descrizioni sotto il piatto, mettili nell'array "ingredienti".
        2. "descrizione" usala solo per note extra o lasciala vuota.
        3. Deduci la categoria (Antipasti, Primi, Pizze, ecc) dal contesto visivo.
        
        Restituisci SOLO un JSON valido (array di oggetti):
        [
            { 
                "nome": "Carbonara", 
                "categoria": "Primi Piatti", 
                "ingredienti": ["Uova", "Guanciale", "Pecorino"],
                "descrizione": "", 
                "prezzo": 12.00 
            }
        ]`;

        // Chiamata al cervello centrale (gestisce PDF, Immagini e errori di versione)
        const data = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);
        
        res.json({ success: true, data });

    } catch (e) {
        console.error("Errore Scan Menu:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    }
});

// Import Excel Menu (Upsert + Unità + Minimo)
router.post('/api/import-excel', uploadFile.single('file'), async (req, res) => { 
    // ... (rest of excel import code same as before, no changes needed) ...
    const { ristorante_id } = req.body; 
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." }); 
    const client = await pool.connect(); 
    try { 
        await client.query('BEGIN'); 
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); 
        const sheetName = workbook.SheetNames[0]; 
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); 
        
        let maxCat = await client.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); 
        let nextCatPos = (maxCat.rows[0].max || 0) + 1; 
        let maxProd = await client.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]); 
        let nextProdPos = (maxProd.rows[0].max || 0) + 1; 

        for (const row of data) { 
            const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome"; 
            const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0; 
            const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale"; 
            const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : ""; 
            const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : ""; 
            const unita = row['Unita'] ? String(row['Unita']).trim() : ""; 
            const minimo = row['Minimo'] ? parseFloat(String(row['Minimo']).replace(',', '.')) : 1; 

            const allergeniStr = row['Allergeni'] || ""; 
            const allergeniArr = allergeniStr.split(',').map(s => s.trim()).filter(Boolean); 

            const variantiCatStr = row['Varianti Categoria (Default)'] || ""; 
            let variantiCatJson = []; 
            if (variantiCatStr && variantiCatStr.includes(':')) { 
                variantiCatJson = variantiCatStr.split(',').map(v => { 
                    const parts = v.split(':'); 
                    if (parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) }; 
                    return null; 
                }).filter(Boolean); 
            } 

            let catCheck = await client.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]); 
            if (catCheck.rows.length === 0) { 
                await client.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5)', [categoria, nextCatPos++, ristorante_id, "", JSON.stringify(variantiCatJson)]); 
            } 

            const baseStr = row['Ingredienti Base (Rimovibili)'] || ""; 
            const aggiunteStr = row['Aggiunte Prodotto (Formato Nome:Prezzo)'] || ""; 
            const baseArr = baseStr.split(',').map(s => s.trim()).filter(Boolean); 
            let aggiunteArr = []; 
            if (aggiunteStr) { 
                aggiunteArr = aggiunteStr.split(',').map(v => { 
                    const parts = v.split(':'); 
                    if (parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) }; 
                    return null; 
                }).filter(Boolean); 
            } 
            const variantiProdotto = { base: baseArr, aggiunte: aggiunteArr }; 
            
            const prodCheck = await client.query('SELECT id FROM prodotti WHERE nome = $1 AND ristorante_id = $2', [nome, ristorante_id]);
            
            if (prodCheck.rows.length > 0) {
                await client.query(
                    `UPDATE prodotti SET prezzo=$1, categoria=$2, sottocategoria=$3, descrizione=$4, varianti=$5, allergeni=$6, unita_misura=$7, qta_minima=$8 WHERE id=$9`,
                    [prezzo, categoria, sottocategoria, descrizione, JSON.stringify(variantiProdotto), JSON.stringify(allergeniArr), unita, minimo, prodCheck.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione, varianti, allergeni, unita_misura, qta_minima) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, nextProdPos++, JSON.stringify(variantiProdotto), JSON.stringify(allergeniArr), unita, minimo]
                );
            }
        } 
        await client.query('COMMIT'); 
        res.json({ success: true, message: `Importazione completata!` }); 
    } catch (err) { 
        await client.query('ROLLBACK'); 
        res.status(500).json({ error: err.message }); 
    } finally { client.release(); } 
});

// Export Excel Menu
router.get('/api/export-excel/:ristorante_id', async (req, res) => { try { const result = await pool.query(`SELECT p.*, c.varianti_default as cat_varianti FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY c.posizione, p.posizione`, [req.params.ristorante_id]); const dataForExcel = result.rows.map(row => { let baseStr = "", aggiunteStr = "", catVarStr = "", allergeniStr = ""; try { const v = typeof row.varianti === 'string' ? JSON.parse(row.varianti) : (row.varianti || {}); if(v.base && Array.isArray(v.base)) baseStr = v.base.join(', '); if(v.aggiunte && Array.isArray(v.aggiunte)) { aggiunteStr = v.aggiunte.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', '); } } catch(e) {} try { const cv = typeof row.cat_varianti === 'string' ? JSON.parse(row.cat_varianti) : (row.cat_varianti || []); if(Array.isArray(cv)) { catVarStr = cv.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', '); } } catch(e) {} try { const all = typeof row.allergeni === 'string' ? JSON.parse(row.allergeni) : (row.allergeni || []); if(Array.isArray(all)) { allergeniStr = all.join(', '); } } catch(e) {} return { "Categoria": row.categoria, "Varianti Categoria (Default)": catVarStr, "Sottocategoria": row.sottocategoria || "", "Nome": row.nome, "Prezzo": row.prezzo, "Unita": row.unita_misura || "", "Minimo": row.qta_minima || 1, "Descrizione": row.descrizione || "", "Ingredienti Base (Rimovibili)": baseStr, "Aggiunte Prodotto (Formato Nome:Prezzo)": aggiunteStr, "Allergeni": allergeniStr }; }); const workbook = xlsx.utils.book_new(); const worksheet = xlsx.utils.json_to_sheet(dataForExcel); const wscols = [{wch:15}, {wch:30}, {wch:15}, {wch:25}, {wch:10}, {wch:10}, {wch:10}, {wch:30}, {wch:30}, {wch:30}, {wch:30}]; worksheet['!cols'] = wscols; xlsx.utils.book_append_sheet(workbook, worksheet, "Menu"); const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Disposition', 'attachment; filename="menu_export_completo.xlsx"'); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buffer); } catch (err) { res.status(500).json({ error: "Errore durante l'esportazione Excel" }); } });

// --- NUOVA ROTTA: IMPORTAZIONE MASSIVA CON UPSERT (AI INTELLIGENTE) ---
router.post('/api/prodotti/import-massivo', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { prodotti, ristorante_id } = req.body;

        if (!prodotti || !Array.isArray(prodotti)) throw new Error("Formato dati non valido");

        let nextCatPos = (await client.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id])).rows[0].max || 0;
        let nextProdPos = (await client.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id])).rows[0].max || 0;
        nextCatPos++; nextProdPos++;

        // --- CONTATORI ---
        let addedCount = 0;
        let updatedCount = 0;

        for (const p of prodotti) {
            const nome = p.nome ? String(p.nome).trim() : "Senza Nome";
            const prezzo = p.prezzo ? parseFloat(p.prezzo) : 0;
            const categoria = p.categoria ? String(p.categoria).trim() : "Generale";
            const descrizione = p.descrizione || "";
            const ingredientiArr = Array.isArray(p.ingredienti) ? p.ingredienti : [];
            const variantiProdotto = { base: ingredientiArr, aggiunte: [] };

            // Gestione Categoria
            const catCheck = await client.query('SELECT id FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                await client.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5)', [categoria, nextCatPos++, ristorante_id, "", '[]']);
            }

            // Check Esistenza Piatto
            const prodCheck = await client.query('SELECT id FROM prodotti WHERE nome = $1 AND ristorante_id = $2', [nome, ristorante_id]);

            if (prodCheck.rows.length > 0) {
                // >>> UPDATE
                await client.query(
                    `UPDATE prodotti SET prezzo=$1, categoria=$2, descrizione=$3, varianti=$4 WHERE id=$5`,
                    [prezzo, categoria, descrizione, JSON.stringify(variantiProdotto), prodCheck.rows[0].id]
                );
                updatedCount++; // Incrementa aggiornati
            } else {
                // >>> INSERT
                await client.query(
                    `INSERT INTO prodotti (nome, prezzo, categoria, descrizione, ristorante_id, posizione, varianti, allergeni, qta_minima) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [nome, prezzo, categoria, descrizione, ristorante_id, nextProdPos++, JSON.stringify(variantiProdotto), '[]', 1]
                );
                addedCount++; // Incrementa aggiunti
            }
        }

        await client.query('COMMIT');
        
        // Restituiamo i contatori al frontend
        res.json({ 
            success: true, 
            added: addedCount, 
            updated: updatedCount,
            message: `Operazione completata.` 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Errore Import Massivo:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;