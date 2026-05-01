const axios = require('axios');
const crypto = require('crypto');

class WaveService {
  constructor() {
    this.apiKey = process.env.WAVE_API_KEY;
    this.apiSecret = process.env.WAVE_API_SECRET; // ⚠️ Défini mais non utilisé - À vérifier dans la doc Wave
    this.webhookSecret = process.env.WAVE_WEBHOOK_SECRET;
    this.baseUrl = process.env.WAVE_API_URL || 'https://api.wave.com/v1'; // ⚠️ URL peut varier selon région
  }

  /**
   * Créer une session de paiement Wave
   * @param {Object} paymentData - Données du paiement
   * @returns {Promise<Object>} - Réponse de Wave avec checkout_url
   */
  async createPayment(paymentData) {
    try {
      const { amount, currency = 'XOF', customerEmail, customerPhone, orderId, items } = paymentData;

      // Préparer les données pour Wave
      const wavePayload = {
        amount: Math.round(amount), // Wave accepte uniquement des entiers
        currency,
        error_url: `${process.env.FRONTEND_URL}/panier?error=payment_failed`,
        // Utiliser un placeholder - Wave remplacera par le vrai sessionId
        // Ou on utilisera l'orderId et on récupérera le waveSessionId côté front
        success_url: `${process.env.FRONTEND_URL}/paiement/confirmation/${orderId}`,
        metadata: {
          order_id: orderId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          items: JSON.stringify(items)
        }
      };

      // Appel à l'API Wave
      // ⚠️ Utilise seulement apiKey - À vérifier si apiSecret nécessaire
      const response = await axios.post(
        `${this.baseUrl}/checkout/sessions`,
        wavePayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        sessionId: response.data.id,
        checkoutUrl: response.data.wave_launch_url,
        expiresAt: response.data.when_expires
      };

    } catch (error) {
      console.error('Erreur Wave createPayment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erreur lors de la création du paiement Wave');
    }
  }

  /**
   * Vérifier le statut d'un paiement Wave
   * @param {String} sessionId - ID de la session Wave
   * @returns {Promise<Object>} - Statut du paiement
   */
  async checkPaymentStatus(sessionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/checkout/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const status = response.data.payment_status;

      return {
        success: true,
        status: this.mapWaveStatus(status),
        waveStatus: status,
        sessionData: response.data
      };

    } catch (error) {
      console.error('Erreur Wave checkPaymentStatus:', error.response?.data || error.message);
      throw new Error('Erreur lors de la vérification du statut Wave');
    }
  }

  /**
   * Mapper les statuts Wave vers nos statuts internes
   * @param {String} waveStatus - Statut Wave
   * @returns {String} - Statut interne
   */
  mapWaveStatus(waveStatus) {
    const statusMap = {
      'pending': 'pending',
      'succeeded': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'cancelled'
    };
    return statusMap[waveStatus] || 'pending';
  }

  /**
   * Vérifier la signature du webhook Wave
   * @param {String} payload - Corps de la requête webhook
   * @param {String} signature - Signature Wave dans les headers
   * @returns {Boolean} - True si la signature est valide
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Erreur vérification signature webhook:', error);
      return false;
    }
  }
}

module.exports = new WaveService();
