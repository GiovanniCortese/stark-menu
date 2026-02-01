// server/modules/menu/menu.routes.js
const express = require('express');
const router = express.Router();
const menuController = require('./menu.controller');
const { upload } = require('../../config/storage'); // Gestione caricamento immagini (Cloudinary/Multer)

// --- 1. ROTTE MENU (PUBBLICO & GESTIONALE) ---

/**
 * ⚠️ IMPORTANTE: ORDINE DELLE ROTTE
 * La rotta '/admin' deve essere definita PRIMA di '/:slug'.
 * Se invertite, Express interpreterebbe la parola 'admin' come uno slug variabile,
 * cercando un ristorante con quel nome e restituendo un errore 404.
 */

// Recupera il menu completo per la Dashboard (include prodotti nascosti)
// URL: /api/menu/admin?ristorante_id=XXX
router.get('/api/menu/admin', menuController.getAdminMenu); 

// Recupera il menu pubblico per i clienti tramite slug
// URL: /api/menu/nome-ristorante
router.get('/api/menu/:slug', menuController.getMenuBySlug);


// --- 2. GESTIONE CATEGORIE ---

// Recupera tutte le categorie di un ristorante specifico
router.get('/api/categorie/:ristorante_id', menuController.getCategorie);

// Crea o aggiorna una categoria
router.post('/api/categorie', menuController.saveCategoria);

// Elimina una categoria tramite ID
router.delete('/api/categorie/:id', menuController.deleteCategoria);

// Salva il nuovo ordine di visualizzazione (drag & drop)
router.post('/api/categorie/reorder', menuController.reorderCategorie);


// --- 3. GESTIONE PRODOTTI ---

/**
 * Creazione/Modifica prodotto con supporto upload immagine.
 * Il middleware 'upload.single' intercetta il file inviato con la chiave 'photo'.
 */
router.post('/api/prodotti', upload.single('photo'), menuController.saveProdotto);

// Elimina un prodotto tramite ID
router.delete('/api/prodotti/:id', menuController.deleteProdotto);


// --- 4. STRUMENTI AI (INTELLIGENZA ARTIFICIALE) ---

// Traduzione automatica del menu tramite Google Gemini
router.post('/api/menu/translate', menuController.translateMenu);


module.exports = router;