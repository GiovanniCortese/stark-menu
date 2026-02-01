// server/modules/warehouse/warehouse.routes.js
const express = require('express');
const router = express.Router();
const warehouseController = require('./warehouse.controller');
const { upload } = require('../../config/storage'); 

// --- MAGAZZINO (STOCK) ---
router.get('/api/magazzino/:ristorante_id', warehouseController.getStock);
router.put('/api/magazzino/:id', warehouseController.updateStockManual);

// --- MERCI IN ARRIVO (HACCP LOGS) ---
router.get('/api/haccp/merci/:ristorante_id', warehouseController.getIncomingGoods);
router.delete('/api/haccp/merci/:id', warehouseController.deleteIncomingLog);

// --- AI & IMPORTAZIONE ---
// 1. Scansiona (Restituisce JSON al frontend)
router.post('/api/haccp/scan-bolla', upload.single('photo'), warehouseController.scanInvoice);

// 2. Conferma Importazione (Frontend manda JSON -> Backend salva su DB)
router.post('/api/haccp/merci/import', warehouseController.confirmRestock);

module.exports = router;