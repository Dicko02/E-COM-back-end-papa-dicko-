const express = require('express');
const router = express.Router();

const {
  initiateWavePayment,
  waveWebhook,
  checkWavePaymentStatus,
  getPaymentStats
} = require('../controllers/payment.controller');

// Route pour initier un paiement Wave
router.post('/wave/initiate', initiateWavePayment);

// Route webhook Wave (appelée par Wave automatiquement)
// IMPORTANT: express.raw() pour pouvoir vérifier la signature avant parsing JSON
router.post('/wave/webhook', express.raw({ type: 'application/json' }), waveWebhook);

// Route pour vérifier le statut d'un paiement Wave
router.get('/wave/status/:sessionId', checkWavePaymentStatus);

// Route pour les statistiques de paiement (admin)
router.get('/stats', getPaymentStats);

module.exports = router;
