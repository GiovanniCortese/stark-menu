// server/routes/haccpRoutes.js - REFACTORED (Controller Based)
const express = require('express');
const router = express.Router();
const { uploadFile } = require('../config/storage'); 

// Import Controllers
const merciController = require('../controllers/haccp/merciController');
const magazzinoController = require('../controllers/haccp/magazzinoController');
const registriController = require('../controllers/haccp/registriController');
const exportController = require('../controllers/haccp/exportController');
const ricetteController = require('../controllers/haccp/ricetteController');

// --- 1. GESTIONE MERCI (RICEVIMENTO, SCAN, IMPORT) ---
router.get('/api/haccp/merci/:ristorante_id', merciController.getMerci);
router.post('/api/haccp/merci', merciController.createMerce);
router.put('/api/haccp/merci/:id', merciController.updateMerce);
router.delete('/api/haccp/merci/:id', merciController.deleteMerce);
router.post('/api/magazzino/delete-bulk', merciController.deleteMerceBulk); // Cancellazione multipla storico
router.post('/api/haccp/merci/update-bulk', merciController.updateMerceBulk); // Modifica massiva

// Scan AI & Import
router.post('/api/haccp/scan-bolla', uploadFile.single('photo'), merciController.scanBolla);
router.post('/api/haccp/merci/import', merciController.importMerci);

// --- 2. GESTIONE MAGAZZINO (GIACENZE ATTUALI) ---
router.get('/api/magazzino/lista/:ristorante_id', magazzinoController.getMagazzino);
router.put('/api/magazzino/update-full/:id', magazzinoController.updateMagazzinoFull);
router.delete('/api/magazzino/prodotto/:id', magazzinoController.deleteProdottoMagazzino);
router.get('/api/haccp/stats/magazzino/:ristorante_id', magazzinoController.getStatsMagazzino);
// Fix DB (Utilità)
router.get('/api/db-fix-magazzino-full', magazzinoController.dbFixMagazzinoFull);
router.get('/api/db-fix-haccp-merci', magazzinoController.dbFixMagazzinoFull); // Alias
router.get('/api/db-fix-emergency-columns', magazzinoController.dbFixMagazzinoFull); // Alias
router.get('/api/db-fix-haccp-columns-final', magazzinoController.dbFixMagazzinoFull); // Alias

// --- 3. REGISTRI HACCP (ASSET, TEMPERATURE, PULIZIE, ETICHETTE) ---
// Assets
router.get('/api/haccp/assets/:ristorante_id', registriController.getAssets);
router.post('/api/haccp/assets', registriController.createAsset);
router.put('/api/haccp/assets/:id', registriController.updateAsset);
router.delete('/api/haccp/assets/:id', registriController.deleteAsset);

// Logs (Temperature)
router.get('/api/haccp/logs/:ristorante_id', registriController.getLogs);
router.post('/api/haccp/logs', registriController.createLog);
router.put('/api/haccp/logs/:id', registriController.updateLog);
router.delete('/api/haccp/logs/:id', registriController.deleteLog);

// Etichette Produzione
router.post('/api/haccp/labels', registriController.createLabel);
router.get('/api/haccp/labels/storico/:ristorante_id', registriController.getLabelsHistory);

// Pulizie
router.get('/api/haccp/pulizie/:ristorante_id', registriController.getPulizie);
router.post('/api/haccp/pulizie', registriController.createPulizia);
router.delete('/api/haccp/pulizie/:id', registriController.deletePulizia);

// --- 4. RICETTE ---
router.get('/api/haccp/ricette/:ristorante_id', ricetteController.getRicette);
router.post('/api/haccp/ricette', ricetteController.createRicetta);
router.put('/api/haccp/ricette/:id', ricetteController.updateRicetta);
router.delete('/api/haccp/ricette/:id', ricetteController.deleteRicetta);
router.get('/api/haccp/ricette/match/:id', ricetteController.matchRicetta);

// --- 5. EXPORT (PDF/EXCEL) ---
router.get('/api/haccp/export/labels/:ristorante_id', exportController.exportLabels);
router.get('/api/haccp/export/:tipo/:ristorante_id', exportController.exportGeneric);

module.exports = router;