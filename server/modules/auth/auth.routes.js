// server/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// Login
router.post('/api/auth/login', authController.login);
router.post('/api/cassa/login', authController.loginCassa);

// Gestione Utenti
router.get('/api/utenti', authController.getUsers);
router.post('/api/utenti', authController.createUser);
router.put('/api/utenti/:id', authController.updateUser);
router.delete('/api/utenti/:id', authController.deleteUser);

module.exports = router;