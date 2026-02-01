// server/modules/haccp/haccp.routes.js
const express = require('express');
const router = express.Router();
const haccpController = require('./haccp.controller');
const { upload } = require('../../config/storage'); // Usa la config centralizzata

// --- ASSETS (Frighi) ---
router.get('/api/haccp/assets/:ristorante_id', haccpController.getAssets);
router.post('/api/haccp/assets', upload.single('photo'), haccpController.saveAsset); // Gestisce create e update
router.delete('/api/haccp/assets/:id', haccpController.deleteAsset);

// --- LOGS (Temperature) ---
router.get('/api/haccp/logs/:ristorante_id', haccpController.getLogs);
router.post('/api/haccp/logs', upload.single('photo'), haccpController.createLog);

// --- PULIZIE ---
router.get('/api/haccp/pulizie/:ristorante_id', haccpController.getPulizie);
router.post('/api/haccp/pulizie', haccpController.createPulizia);
router.delete('/api/haccp/pulizie/:id', haccpController.deletePulizia);

// --- RICETTE ---
router.get('/api/haccp/ricette/:ristorante_id', haccpController.getRicette);
router.post('/api/haccp/ricette', haccpController.saveRicetta);

// --- ETICHETTE ---
router.post('/api/haccp/labels', haccpController.createLabel);
router.get('/api/haccp/labels/storico/:ristorante_id', haccpController.getLabelsHistory);

module.exports = router;