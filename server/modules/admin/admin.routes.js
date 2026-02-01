// server/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { upload } = require('../../config/storage');

// --- CONFIGURAZIONE ---
router.get('/api/ristorante/config/:id', adminController.getConfig);
router.put('/api/ristorante/config/:id', adminController.updateConfig);
router.put('/api/ristorante/security/:id', adminController.updateSecurity);

// --- SALA & TAVOLI ---
router.get('/api/tavoli/:ristorante_id', adminController.getTables);
router.post('/api/tavoli', adminController.saveTables);

// --- PRENOTAZIONI ---
router.get('/api/prenotazioni/:ristorante_id', adminController.getPrenotazioni);
router.post('/api/prenotazioni', adminController.createPrenotazione);

// --- DASHBOARD ---
router.get('/api/stats/dashboard/:id', adminController.getStats);

// --- SUPERADMIN ---
router.delete('/api/admin/ristorante/:id', adminController.deleteRistorante);

// --- UPLOAD GENERICO (Per loghi, menu pdf, ecc) ---
router.post('/api/upload', upload.single('photo'), adminController.uploadFile);

module.exports = router;