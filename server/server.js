require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware Base
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Aggiungi questo per sicurezza
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- IMPORT DEI MODULI (ROTTE) ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- UTILIZZO DELLE ROTTE ---
// Montiamo tutto alla radice ('/') perché le rotte nei file hanno già il prefisso /api/...
// Questo garantisce compatibilità 100% con il frontend attuale.
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// Route di verifica
app.get('/', (req, res) => res.send('🚀 SERVER V13 (MODULAR) ATTIVO!'));

app.listen(port, () => console.log(`🚀 SERVER V13 avviato su porta ${port}`));