// server/routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { uploadFile } = require('../config/storage');
const xlsx = require('xlsx');
// IMPORTIAMO LA FUNZIONE DI GENERAZIONE TESTO DA AI.JS
const { analyzeImageWithGemini, generateTextWithGemini } = require('../utils/ai'); 


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

// Gestione Prodotti
router.post('/api/prodotti', async (req, res) => { 
    try { 
        const { nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, varianti, allergeni, traduzioni, unita_misura, qta_minima } = req.body; 
        
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

// Scansione Menu
router.post('/api/menu/scan-photo', uploadFile.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nessun file inviato" });

        const prompt = `
        Sei un data entry meticoloso. Analizza questo menu (PDF o Immagine).
        Estrai TUTTI i piatti presenti.
        
        REGOLE FONDAMENTALI:
        1. "nome": Copia il nome del piatto esattamente come scritto.
        2. "descrizione": In questo campo devi inserire TUTTO il testo che trovi sotto o accanto al nome del piatto. 
           Includi ingredienti, descrizioni marketing (es. "freschissimo"), e anche le diciture degli allergeni (es. "Allergeni: 1, 7" oppure "Contiene glutine").
           Non filtrare nulla: meglio un testo lungo che un dato mancante.
        3. "ingredienti": Se riesci a distinguere la lista pulita degli ingredienti, mettila qui. Altrimenti lascia array vuoto [].
        4. "categoria": Deduci la categoria (Antipasti, Primi, ecc).
        5. "prezzo": Metti il numero (es. 12.00). Se manca metti 0.

        Restituisci SOLO un array JSON valido:
        [
            { 
                "nome": "Carbonara", 
                "categoria": "Primi Piatti", 
                "descrizione": "Spaghetti alla chitarra, uova bio, guanciale croccante, pecorino. Allergeni: 1,3,7", 
                "ingredienti": ["Uova", "Guanciale", "Pecorino"],
                "prezzo": 12.00 
            }
        ]`;

        const data = await analyzeImageWithGemini(req.file.buffer, req.file.mimetype, prompt);
        res.json({ success: true, data });

    } catch (e) {
        console.error("Errore Scan Menu:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    }
});

// Import Excel
router.post('/api/import-excel', uploadFile.single('file'), async (req, res) => { 
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

// Export Excel
router.get('/api/export-excel/:ristorante_id', async (req, res) => { try { const result = await pool.query(`SELECT p.*, c.varianti_default as cat_varianti FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY c.posizione, p.posizione`, [req.params.ristorante_id]); const dataForExcel = result.rows.map(row => { let baseStr = "", aggiunteStr = "", catVarStr = "", allergeniStr = ""; try { const v = typeof row.varianti === 'string' ? JSON.parse(row.varianti) : (row.varianti || {}); if(v.base && Array.isArray(v.base)) baseStr = v.base.join(', '); if(v.aggiunte && Array.isArray(v.aggiunte)) { aggiunteStr = v.aggiunte.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', '); } } catch(e) {} try { const cv = typeof row.cat_varianti === 'string' ? JSON.parse(row.cat_varianti) : (row.cat_varianti || []); if(Array.isArray(cv)) { catVarStr = cv.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', '); } } catch(e) {} try { const all = typeof row.allergeni === 'string' ? JSON.parse(row.allergeni) : (row.allergeni || []); if(Array.isArray(all)) { allergeniStr = all.join(', '); } } catch(e) {} return { "Categoria": row.categoria, "Varianti Categoria (Default)": catVarStr, "Sottocategoria": row.sottocategoria || "", "Nome": row.nome, "Prezzo": row.prezzo, "Unita": row.unita_misura || "", "Minimo": row.qta_minima || 1, "Descrizione": row.descrizione || "", "Ingredienti Base (Rimovibili)": baseStr, "Aggiunte Prodotto (Formato Nome:Prezzo)": aggiunteStr, "Allergeni": allergeniStr }; }); const workbook = xlsx.utils.book_new(); const worksheet = xlsx.utils.json_to_sheet(dataForExcel); const wscols = [{wch:15}, {wch:30}, {wch:15}, {wch:25}, {wch:10}, {wch:10}, {wch:10}, {wch:30}, {wch:30}, {wch:30}, {wch:30}]; worksheet['!cols'] = wscols; xlsx.utils.book_append_sheet(workbook, worksheet, "Menu"); const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Disposition', 'attachment; filename="menu_export_completo.xlsx"'); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buffer); } catch (err) { res.status(500).json({ error: "Errore durante l'esportazione Excel" }); } });

// Import Massivo
router.post('/api/prodotti/import-massivo', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { prodotti, ristorante_id } = req.body;

        if (!prodotti || !Array.isArray(prodotti)) throw new Error("Formato dati non valido");

        let nextCatPos = (await client.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id])).rows[0].max || 0;
        let nextProdPos = (await client.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id])).rows[0].max || 0;
        nextCatPos++; nextProdPos++;

        let addedCount = 0;
        let updatedCount = 0;

        for (const p of prodotti) {
            const nome = p.nome ? String(p.nome).trim() : "Senza Nome";
            const prezzo = p.prezzo ? parseFloat(p.prezzo) : 0;
            const categoria = p.categoria ? String(p.categoria).trim() : "Generale";
            const descrizione = p.descrizione || "";
            const ingredientiArr = Array.isArray(p.ingredienti) ? p.ingredienti : [];
            const variantiProdotto = { base: ingredientiArr, aggiunte: [] };

            const catCheck = await client.query('SELECT id FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                await client.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5)', [categoria, nextCatPos++, ristorante_id, "", '[]']);
            }

            const prodCheck = await client.query('SELECT id FROM prodotti WHERE nome = $1 AND ristorante_id = $2', [nome, ristorante_id]);

            if (prodCheck.rows.length > 0) {
                await client.query(
                    `UPDATE prodotti SET prezzo=$1, categoria=$2, descrizione=$3, varianti=$4 WHERE id=$5`,
                    [prezzo, categoria, descrizione, JSON.stringify(variantiProdotto), prodCheck.rows[0].id]
                );
                updatedCount++;
            } else {
                await client.query(
                    `INSERT INTO prodotti (nome, prezzo, categoria, descrizione, ristorante_id, posizione, varianti, allergeni, qta_minima) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [nome, prezzo, categoria, descrizione, ristorante_id, nextProdPos++, JSON.stringify(variantiProdotto), '[]', 1]
                );
                addedCount++;
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, added: addedCount, updated: updatedCount, message: `Operazione completata.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Errore Import Massivo:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- NUOVA ROTTA: TRADUZIONE MULTILINGUA COMPLETA (CATEGORIE, SOTTOCATEGORIE, INGREDIENTI) ---
router.post('/api/menu/translate-all', async (req, res) => {
    const { ristorante_id, languages } = req.body;
    const targetLangs = (languages && Array.isArray(languages) && languages.length > 0) ? languages : ['en'];
    
    const client = await pool.connect();
    
    try {
        // 1. Recupera TUTTO il menu
        const prodotti = await client.query("SELECT * FROM prodotti WHERE ristorante_id = $1", [ristorante_id]);
        const categorie = await client.query("SELECT * FROM categorie WHERE ristorante_id = $1", [ristorante_id]);

        if (prodotti.rows.length === 0) return res.status(400).json({ error: "Menu vuoto." });

        // 2. Prepara il payload con TUTTI i campi necessari (Categorie, Descrizioni, Prodotti, Sottocategorie, Ingredienti, Varianti)
        const dataToTranslate = {
            categories: categorie.rows.map(c => ({ 
                id: c.id, 
                nome: c.nome, 
                descrizione: c.descrizione 
            })),
            products: prodotti.rows.map(p => {
                let ingredientiBase = [];
                let variantiNomi = [];
                try {
                    const vars = typeof p.varianti === 'string' ? JSON.parse(p.varianti) : p.varianti;
                    if (vars && Array.isArray(vars.base)) ingredientiBase = vars.base;
                    if (vars && Array.isArray(vars.aggiunte)) variantiNomi = vars.aggiunte.map(v => v.nome);
                } catch(e) {}

                return { 
                    id: p.id, 
                    nome: p.nome, 
                    descrizione: p.descrizione,
                    sottocategoria: p.sottocategoria, // INCLUDE SOTTOCATEGORIA
                    ingredienti: ingredientiBase, // INCLUDE INGREDIENTI
                    varianti: variantiNomi        // INCLUDE VARIANTI
                };
            })
        };

        const completedLanguages = [];

        // 3. CICLO SULLE LINGUE (Sequenziale)
        for (const lang of targetLangs) {
            
            const prompt = `
                Sei un traduttore gastronomico esperto.
                Traduci il seguente menu dall'Italiano alla lingua: "${lang}".
                
                REGOLE FONDAMENTALI:
                1. Restituisci SOLO un oggetto JSON valido. Nessun markdown o testo extra.
                2. Mantieni gli ID originali come chiavi dell'oggetto.
                3. CATEGORIE: Traduci "nome" e "descrizione".
                4. PRODOTTI: Traduci "nome", "descrizione", "sottocategoria".
                5. Traduci anche gli array "ingredienti" (ingredienti base) e "varianti" (aggiunte possibili).
                6. Non tradurre nomi propri intraducibili (es. "Pizza Margherita", "Coca Cola", "Prosecco").
                
                INPUT:
                ${JSON.stringify(dataToTranslate)}

                OUTPUT FORMAT (JSON):
                {
                    "categories": { 
                        "ID_CAT": { "nome": "...", "descrizione": "..." } 
                    },
                    "products": { 
                        "ID_PROD": { "nome": "...", "descrizione": "...", "sottocategoria": "...", "ingredienti": ["..."], "varianti": ["..."] } 
                    }
                }
            `;

            // Chiamata AI
            const translationResult = await generateTextWithGemini(prompt);

            await client.query('BEGIN');

            // --- Aggiornamento Categorie ---
            if (translationResult.categories) {
                for (const [id, t] of Object.entries(translationResult.categories)) {
                    const currentRes = await client.query("SELECT traduzioni FROM categorie WHERE id = $1", [id]);
                    let currentTrads = currentRes.rows[0]?.traduzioni || {};
                    if (typeof currentTrads === 'string') currentTrads = JSON.parse(currentTrads);
                    
                    currentTrads[lang] = t;
                    await client.query("UPDATE categorie SET traduzioni = $1 WHERE id = $2", [JSON.stringify(currentTrads), id]);
                }
            }

            // --- Aggiornamento Prodotti ---
            if (translationResult.products) {
                for (const [id, t] of Object.entries(translationResult.products)) {
                    const currentRes = await client.query("SELECT traduzioni FROM prodotti WHERE id = $1", [id]);
                    let currentTrads = currentRes.rows[0]?.traduzioni || {};
                    if (typeof currentTrads === 'string') currentTrads = JSON.parse(currentTrads);
                    
                    currentTrads[lang] = t;
                    await client.query("UPDATE prodotti SET traduzioni = $1 WHERE id = $2", [JSON.stringify(currentTrads), id]);
                }
            }

            await client.query('COMMIT');
            completedLanguages.push(lang.toUpperCase());
        }

        res.json({ success: true, message: `Traduzione completata: ${completedLanguages.join(', ')}` });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Errore Traduzione:", e);
        res.status(500).json({ error: "Errore AI: " + e.message });
    } finally {
        client.release();
    }
});

module.exports = router;