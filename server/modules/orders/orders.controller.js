// server/modules/orders/orders.controller.js
const pool = require('../../config/db');
const { getIO } = require('../../services/socket.service'); // ✅ Socket Centralizzato
const { sendWA } = require('../../utils/whatsappClient');   // ✅ WhatsApp Ufficiale

// --- 1. CREAZIONE NUOVO ORDINE (Dal Menu Cliente) ---
exports.createOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        const { ristorante_id, tavolo, prodotti, totale, note, cliente } = req.body;
        
        // Setup dati cliente
        const nomeCliente = cliente?.nome || "Cliente";
        const telefonoCliente = cliente?.telefono || "";
        
        await client.query('BEGIN');

        // Salvataggio Ordine
        const query = `
            INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale, stato, data_creazione, note_cliente, nome_cliente, telefono_cliente)
            VALUES ($1, $2, $3, $4, 'in_attesa', NOW(), $5, $6, $7)
            RETURNING id
        `;
        const values = [
            ristorante_id, 
            tavolo, 
            JSON.stringify(prodotti), // Assicura che sia JSON string
            totale, 
            note, 
            nomeCliente, 
            telefonoCliente
        ];
        
        const result = await client.query(query, values);
        const orderId = result.rows[0].id;

        await client.query('COMMIT');

        // 🚀 NOTIFICHE REAL-TIME (SOCKET)
        const io = getIO();
        io.to(String(ristorante_id)).emit('nuovo_ordine', { 
            id: orderId, 
            tavolo, 
            totale,
            prodotti 
        });
        
        // 💬 NOTIFICA WHATSAPP (Opzionale: Conferma al cliente)
        if (telefonoCliente) {
            // Esempio Template: "conferma_ordine"
            // Se non hai il template, usa il testo libero (solo entro 24h)
            // sendWA(telefonoCliente, `Grazie ${nomeCliente}! Ordine #${orderId} ricevuto.`, false).catch(console.error);
        }

        res.json({ success: true, id: orderId });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Errore Ordine:", e);
        res.status(500).json({ error: "Errore salvataggio ordine" });
    } finally {
        client.release();
    }
};

// --- 2. RECUPERO ORDINI ATTIVI (Per KDS Cucina/Bar/Pizzeria) ---
exports.getActiveOrders = async (req, res) => {
    try {
        // Recupera solo ordini NON pagati/archiviati
        const result = await pool.query(
            `SELECT * FROM ordini 
             WHERE ristorante_id = $1 
             AND stato NOT IN ('pagato', 'archiviato') 
             ORDER BY data_creazione ASC`,
            [req.params.ristorante_id]
        );

        // Parsing sicuro del JSON prodotti
        const orders = result.rows.map(o => ({
            ...o,
            prodotti: typeof o.dettagli === 'string' ? JSON.parse(o.dettagli) : o.dettagli
        }));

        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- 3. AGGIORNAMENTO STATO INTERO ORDINE (Es. "Servito") ---
exports.updateOrderStatus = async (req, res) => {
    try {
        const { stato } = req.body;
        const { id } = req.params;

        // Recupera ristorante_id prima di aggiornare (per il socket)
        const check = await pool.query("SELECT ristorante_id FROM ordini WHERE id = $1", [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Ordine non trovato" });
        const ristId = check.rows[0].ristorante_id;

        await pool.query("UPDATE ordini SET stato = $1 WHERE id = $2", [stato, id]);

        // 🚀 Notifica aggiornamento a tutti i monitor
        const io = getIO();
        io.to(String(ristId)).emit('refresh_ordini'); // Forza ricarica frontend
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- 4. AGGIORNAMENTO GRANULARE PRODOTTO (KDS Check Item) ---
// Quando lo chef clicca su UNA pietanza specifica
exports.updateProductStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { order_id, product_index, new_status } = req.body;

        await client.query('BEGIN');

        // 1. Leggi l'ordine corrente
        const resOrd = await client.query("SELECT dettagli, ristorante_id FROM ordini WHERE id = $1 FOR UPDATE", [order_id]);
        if (resOrd.rows.length === 0) throw new Error("Ordine non trovato");
        
        let prodotti = resOrd.rows[0].dettagli;
        if (typeof prodotti === 'string') prodotti = JSON.parse(prodotti);

        // 2. Modifica lo stato del singolo prodotto nell'array
        if (prodotti[product_index]) {
            prodotti[product_index].stato = new_status; // Es: 'pronto', 'servito'
            if (new_status === 'servito') prodotti[product_index].ora_servizio = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
        }

        // 3. Salva il JSON aggiornato
        await client.query("UPDATE ordini SET dettagli = $1 WHERE id = $2", [JSON.stringify(prodotti), order_id]);
        
        await client.query('COMMIT');

        // 🚀 Notifica Socket
        const io = getIO();
        io.to(String(resOrd.rows[0].ristorante_id)).emit('refresh_ordini');

        res.json({ success: true });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "Errore update prodotto" });
    } finally {
        client.release();
    }
};

// --- 5. STORICO CASSA ---
exports.getOrderHistory = async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_creazione DESC LIMIT 50", 
            [req.params.ristorante_id]
        );
        res.json(r.rows.map(o => ({ 
            ...o, 
            prodotti: typeof o.dettagli === 'string' ? JSON.parse(o.dettagli) : o.dettagli 
        })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};