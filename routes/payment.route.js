const express = require('express');
const router  = express.Router();

const {
  initiatePayment,
  senePayWebhook,
  checkPaymentStatus,
  getPaymentStats,
} = require('../controllers/payment.controller');

// Initier un paiement SenePay
router.post('/senepay/initiate', initiatePayment);

// Webhook SenePay — express.raw() pour vérification de signature sur body brut
router.post(
  '/senepay/webhook',
  express.raw({ type: 'application/json' }),
  senePayWebhook
);

// Vérifier le statut d'une session
router.get('/senepay/status/:sessionToken', checkPaymentStatus);

// Statistiques admin
router.get('/stats', getPaymentStats);

module.exports = router;