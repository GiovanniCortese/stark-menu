// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Accetta richieste da chiunque
app.use(express.json());

// Configurazione Database AGGIORNATA PER IL CLOUD
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false, // Necessario per le connessioni sicure al cloud
  },
});

// --- ROTTE REALI ---

// 1. OTTENERE IL MENU
app.get('/api/menu/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const ristResult = await pool.query(
            'SELECT id, nome FROM ristoranti WHERE slug = $1', 
            [slug]
        );

        if (ristResult.rows.length === 0) {
            return res.status(404).json({ error: "Ristorante non trovato" });
        }

        const ristorante = ristResult.rows[0];

        const prodResult = await pool.query(
            'SELECT * FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome', 
            [ristorante.id]
        );

        res.json({
            ristorante: ristorante.nome,
            menu: prodResult.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore nel recupero del menu" });
    }
});

// 2. INVIARE UN ORDINE
app.post('/api/ordine', async (req, res) => {
    const { tavolo, prodotti, totale } = req.body;
    
    try {
        // CERCHIAMO L'ID GIUSTO (Miglioria di sicurezza)
        const ristCheck = await pool.query("SELECT id FROM ristoranti WHERE slug = 'pizzeria-stark'");
        if (ristCheck.rows.length === 0) throw new Error("Ristorante non trovato");
        const ristoranteId = ristCheck.rows[0].id;

        const dettagliOrdine = prodotti.join(", "); 

        await pool.query(
            `INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale)
             VALUES ($1, $2, $3, $4)`,
            [ristoranteId, tavolo, dettagliOrdine, totale]
        );

        console.log(`✅ Ordine salvato su DB Cloud: Tavolo ${tavolo} - ${dettagliOrdine}`);
        res.json({ success: true, message: "Ordine inviato in cucina!" });

    } catch (err) {
        console.error("❌ Errore salvataggio ordine:", err);
        res.status(500).json({ success: false, error: "Errore database" });
    }
});

// 3. POLLING (Cucina)
app.get('/api/polling/:ristorante_id', async (req, res) => {
    const { ristorante_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM ordini 
             WHERE ristorante_id = $1 AND stato = 'in_attesa' 
             ORDER BY data_creazione ASC`, 
            [ristorante_id]
        );
        
        res.json({ nuovi_ordini: result.rows });
    } catch (err) {
        console.error("❌ Errore polling:", err);
        res.status(500).send("Errore server");
    }
});

// 4. COMPLETAMENTO ORDINE
app.post('/api/ordine/completato', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query(
            "UPDATE ordini SET stato = 'completato' WHERE id = $1",
            [id]
        );
        console.log(`✅ Ordine ${id} completato!`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore aggiornamento ordine" });
    }
});

// 5. LOGIN PROPRIETARIO
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM ristoranti WHERE email_titolare = $1 AND password = $2',
            [email, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ 
                success: true, 
                user: { id: user.id, nome: user.nome, slug: user.slug } 
            });
        } else {
            res.status(401).json({ success: false, error: "Credenziali errate" });
        }
    } catch (err) {
        console.error("Errore login:", err);
        res.status(500).json({ error: "Errore server" });
    }
});

// 6. AGGIUNGI PIATTO (CORRETTO E SICURO)
app.post('/api/prodotti', async (req, res) => {
    const { nome, prezzo, categoria, ristorante_id, immagine_url } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id, immagine_url) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [nome, prezzo, categoria, ristorante_id, immagine_url || ""] // <--- PROTEZIONE ANTI-BLOCCO
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ Errore Backend:", err);
        res.status(500).json({ error: "Errore inserimento nel database" });
    }
});

// 7. CANCELLA PIATTO
app.delete('/api/prodotti/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM prodotti WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore cancellazione" });
    }
});

app.listen(port, () => {
  console.log(`Server attivo sulla porta ${port}`);
});