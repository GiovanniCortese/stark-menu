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
  connectionString: process.env.DATABASE_URL, // <--- CORRETTO: Legge solo dal .env
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
    
    // Per ora ID fisso, dopo lo renderemo dinamico cercando lo slug
    // Nota: Assicurati che l'ID 3 esista nel nuovo DB Cloud! (Lo vedremo con seed.js)
    // Se seed.js ha ricreato tutto da zero, l'ID potrebbe essere 1.
    // Per sicurezza, cerchiamo l'ID del ristorante "pizzeria-stark" prima di inserire.
    
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
    // Nota: anche qui il frontend manda l'ID. Se l'ID è cambiato nel cloud, 
    // il frontend dovrà essere aggiornato o dovremo usare lo slug anche qui.
    // Per ora lasciamo così, ma tieni a mente che l'ID potrebbe essere 1 invece di 3.
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

app.listen(port, () => {
  console.log(`Server attivo sulla porta ${port}`);
});