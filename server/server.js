require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/ordini'));
app.use('/api', require('./routes/menu'));
app.use('/api/haccp', require('./routes/haccp'));
app.use('/api', require('./routes/main'));

app.listen(port, () => console.log(`🚀 SERVER V13.0 (MODULAR) - Porta ${port}`));