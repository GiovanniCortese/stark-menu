//server/modules/super/super.routes.js

const express = require('express');
const router = express.Router();
const superController = require('./super.controller');

router.post('/api/super/login', superController.superLogin);
router.get('/api/super/ristoranti', superController.getAllRistoranti);
router.post('/api/super/ristoranti', superController.createRistorante);
router.put('/api/super/ristoranti/:id', superController.updateRistorante);
router.delete('/api/super/ristoranti/:id', superController.deleteRistorante);

module.exports = router;