const express = require('express');
const router = express.Router();
const requireAuth = require("../middleware/requireAuth.js");
const chartController = require('../controllers/chart.controller.js');

// Affichage du panier
router.get('/:clientId', requireAuth, chartController.getChart);

// Vider le panier
router.delete('/:clientId', requireAuth, chartController.clearChart);

// Ajout d'un produit au panier
router.post('/:clientId', requireAuth, chartController.addProductToChart);

// Mise à jour de la quantité d'un produit dans le panier
router.put('/:clientId/:productId', requireAuth, chartController.updateProductQuantity);

// Affichage du total du panier
router.get('/:clientId/total', requireAuth, chartController.getChartTotal);

// Mise à jour de la quantité d'un produit dans le panier
router.put('/:clientId/:productId', requireAuth, chartController.updateProductQuantity);

// Suppression d'un produit du panier
router.delete('/:clientId/:productId', requireAuth, chartController.removeProductFromChart);


module.exports = router;
