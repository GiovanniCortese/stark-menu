// server/modules/orders/orders.routes.js
const express = require('express');
const router = express.Router();
const ordersController = require('./orders.controller');

// Creazione e Lettura
router.post('/api/ordini', ordersController.createOrder);
router.get('/api/ordini/attivi/:ristorante_id', ordersController.getActiveOrders);

// Aggiornamenti Stati
router.put('/api/ordini/:id', ordersController.updateOrderStatus);
router.post('/api/ordini/update-product', ordersController.updateProductStatus); // Per il KDS (spunta singola)

// Storico Cassa
router.get('/api/cassa/storico/:ristorante_id', ordersController.getOrderHistory);

module.exports = router;