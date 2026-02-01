// server/modules/menu/menu.routes.js
const express = require('express');
const router = express.Router();
const menuController = require('./menu.controller');
const { upload } = require('../../config/storage'); // Assicurati che config/storage esista (Cloudinary/Multer)

// --- PUBLIC MENU ---
router.get('/api/menu/:slug', menuController.getMenuBySlug);

// --- CATEGORIE ---
router.get('/api/categorie/:ristorante_id', menuController.getCategorie);
router.post('/api/categorie', menuController.saveCategoria);
router.delete('/api/categorie/:id', menuController.deleteCategoria);
router.post('/api/categorie/reorder', menuController.reorderCategorie);

// --- PRODOTTI ---
// Nota: 'photo' è il nome del campo nel form-data del frontend
router.post('/api/prodotti', upload.single('photo'), menuController.saveProdotto);
router.delete('/api/prodotti/:id', menuController.deleteProdotto);

// --- AI TOOLS ---
router.post('/api/menu/translate', menuController.translateMenu);

module.exports = router;