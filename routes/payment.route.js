const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  refundPayment,
  getPaymentStats
} = require('../controllers/payment.controller');

// Route pour créer une intention de paiement
router.post('/create-payment-intent', createPaymentIntent);

// Route pour confirmer un paiement
router.post('/confirm-payment', confirmPayment);

// Route pour récupérer le statut d'un paiement
router.get('/status/:paymentIntentId', getPaymentStatus);

// Route pour effectuer un remboursement
router.post('/refund', refundPayment);

// Route pour les statistiques de paiement (admin)
router.get('/stats', getPaymentStats);

module.exports = router; 