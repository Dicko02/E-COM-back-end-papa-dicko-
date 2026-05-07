const crypto = require('crypto');

const BASE_URL = process.env.SENEPAY_BASE_URL || 'https://api.sene-pay.com';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Api-Key':    process.env.SENEPAY_API_KEY,
  'X-Api-Secret': process.env.SENEPAY_API_SECRET,
});

// ── Créer une session de paiement ────────────────────────────────────────────
// POST /api/v1/checkout/sessions
const createPayment = async ({ amount, currency = 'XOF', orderId, customerEmail, customerPhone, items }) => {
  try {
    const payload = {
      amount:           Math.round(amount),
      currency,
      country:          'SN',
      orderReference:   orderId,
      description:      'Commande Wayne Enterprize',
      successUrl:       `${process.env.FRONTEND_URL}/paiement/confirmation/${orderId}`,
      cancelUrl:        `${process.env.FRONTEND_URL}/panier?error=payment_cancelled`,
      webhookUrl:       `${process.env.BACKEND_URL}/api/payment/senepay/webhook`,
      expiresInMinutes: 60,
      metadata: {
        order_id:       orderId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        items:          JSON.stringify(items),
      },
    };

    const response = await fetch(`${BASE_URL}/api/v1/checkout/sessions`, {
      method:  'POST',
      headers: getHeaders(),
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `SenePay error ${response.status}`);
    }

    const data = await response.json();

    return {
      success:      true,
      sessionToken: data.sessionToken,  // remplace waveSessionId
      checkoutUrl:  data.checkoutUrl,
      expiresAt:    data.expiresAt,
    };

  } catch (error) {
    console.error('Erreur SenePay createPayment:', error.message);
    throw new Error(error.message || 'Erreur création paiement SenePay');
  }
};

// ── Vérifier le statut d'une session ────────────────────────────────────────
// GET /api/v1/checkout/sessions/{sessionToken}
const checkPaymentStatus = async (sessionToken) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/checkout/sessions/${sessionToken}`, {
      method:  'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `SenePay error ${response.status}`);
    }

    const data = await response.json();

    return {
      success:       true,
      status:        mapStatus(data.status),
      senePayStatus: data.status,
      sessionData:   data,
    };

  } catch (error) {
    console.error('Erreur SenePay checkPaymentStatus:', error.message);
    throw new Error('Erreur vérification statut SenePay');
  }
};

// ── Mapper les statuts SenePay → statuts internes ───────────────────────────
// SenePay : Open | Pending | Complete | Failed | Cancelled | Expired
const mapStatus = (s) => ({
  Open:      'pending',
  Pending:   'pending',
  Complete:  'completed',
  Failed:    'failed',
  Cancelled: 'cancelled',
  Expired:   'cancelled',
}[s] || 'pending');

// ── Vérifier la signature du webhook ────────────────────────────────────────
// Header : X-Webhook-Signature | HMAC-SHA256 avec SENEPAY_API_SECRET
const verifyWebhookSignature = (rawBody, receivedSignature) => {
  try {
    if (!receivedSignature) return false;
    const expected = crypto
      .createHmac('sha256', process.env.SENEPAY_API_SECRET)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expected));
  } catch {
    return false;
  }
};

module.exports = { createPayment, checkPaymentStatus, verifyWebhookSignature };