const Order        = require("../models/orderModel");
const ProduitsModel = require("../models/produitsModel");
const Chart        = require("../models/chart.model");
const { sendConfirmationEmail } = require("../utils/orderMailer");

// Services de paiement
const senePayService = require("../services/senepay.service");

// ── Initier un paiement SenePay ──────────────────────────────────────────────
module.exports.initiatePayment = async (req, res) => {
  try {
    const { cartItems, customerInfo, totalAmount } = req.body;

    if (!cartItems || !customerInfo || !totalAmount) {
      return res.status(400).json({ error: 'Articles du panier, infos client et montant requis' });
    }

    // 1. Créer les commandes en statut "pending"
    const orderPromises = cartItems.map(async (item) => {
      const produit = await ProduitsModel.findById(item.productId);
      if (!produit)                             throw new Error(`Produit ${item.productId} non trouvé`);
      if (produit.nombreDisponible < item.quantity) throw new Error(`Stock insuffisant pour ${produit.nom}`);

      const order = new Order({
        produitId:     item.productId,
        quantity:      item.quantity,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerInfo,
        totalAmount:   produit.prix * item.quantity,
        status:        'pending',
        paymentStatus: 'pending',
      });
      return order.save();
    });

    const orders     = await Promise.all(orderPromises);
    const mainOrderId = orders[0]._id.toString();

    // 2. Créer la session SenePay
    const session = await senePayService.createPayment({
      amount:        totalAmount,
      currency:      'XOF',
      orderId:       mainOrderId,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      items:         cartItems,
    });

    // 3. Sauvegarder le sessionToken dans toutes les commandes
    //    (champ renommé senePaySessionToken — voir note ci-dessous)
    await Promise.all(orders.map(order => {
      order.waveSessionId = session.sessionToken; // ← réutilise le champ existant, 0 migration
      return order.save();
    }));

    res.status(200).json({
      success:      true,
      orderId:      mainOrderId,
      checkoutUrl:  session.checkoutUrl,
      sessionToken: session.sessionToken,
      expiresAt:    session.expiresAt,
    });

  } catch (error) {
    console.error('Erreur initiation paiement SenePay:', error.message);
    res.status(500).json({ error: error.message || 'Erreur serveur paiement' });
  }
};

// ── Webhook SenePay ──────────────────────────────────────────────────────────
// Route protégée par express.raw() dans payment.route.js
module.exports.senePayWebhook = async (req, res) => {
  try {
    const signature  = req.headers['x-webhook-signature'];
    const rawBody    = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const payload    = req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body;

    // Vérifier la signature
    if (!senePayService.verifyWebhookSignature(rawBody, signature)) {
      console.error('Signature webhook SenePay invalide');
      return res.status(401).json({ error: 'Signature invalide' });
    }

    const { event, sessionToken, orderReference } = payload;
    console.log('Webhook SenePay reçu:', event, sessionToken);

    // ── Paiement réussi ────────────────────────────────────────────────────
    if (event === 'checkout.session.completed') {

      const orders = await Order.find({ waveSessionId: sessionToken });
      if (!orders.length) {
        console.warn('Aucune commande pour sessionToken:', sessionToken);
        return res.status(200).json({ received: true }); // toujours 200 pour SenePay
      }

      for (const order of orders) {
        order.status        = 'confirmed';
        order.paymentStatus = 'completed';
        order.paymentDate   = new Date();
        await order.save();

        // Déduire le stock
        const produit = await ProduitsModel.findById(order.produitId);
        if (produit) {
          produit.nombreDisponible = Math.max(0, produit.nombreDisponible - order.quantity);
          await produit.save();
        }
      }

      // Vider le panier
      if (orders[0].customerInfo?.userId) {
        await Chart.findOneAndUpdate(
          { client: orders[0].customerInfo.userId },
          { products: [] }
        );
      }

      // Email de confirmation
      await sendConfirmationEmail(
        orders[0].customerEmail,
        orders,
        orders.reduce((sum, o) => sum + o.totalAmount, 0),
        sessionToken
      );
    }

    // ── Paiement échoué ou expiré ──────────────────────────────────────────
    if (event === 'checkout.session.failed' || event === 'checkout.session.expired') {
      const orders = await Order.find({ waveSessionId: sessionToken });
      for (const order of orders) {
        order.status        = 'cancelled';
        order.paymentStatus = 'failed';
        await order.save();
      }
    }

    // SenePay exige un 200 OK rapide
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Erreur webhook SenePay:', error.message);
    // On répond quand même 200 pour éviter les retry infinis
    res.status(200).json({ received: true, error: error.message });
  }
};

// ── Vérifier le statut d'une session ────────────────────────────────────────
module.exports.checkPaymentStatus = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken requis' });

    const senePayStatus = await senePayService.checkPaymentStatus(sessionToken);
    const orders        = await Order.find({ waveSessionId: sessionToken });

    if (!orders.length) return res.status(404).json({ error: 'Commande non trouvée' });

    res.status(200).json({
      success:       true,
      paymentStatus: senePayStatus.status,
      senePayStatus: senePayStatus.senePayStatus,
      orders: orders.map(o => ({
        id:            o._id,
        status:        o.status,
        paymentStatus: o.paymentStatus,
        totalAmount:   o.totalAmount,
      })),
    });

  } catch (error) {
    console.error('Erreur vérification statut:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── Statistiques admin ───────────────────────────────────────────────────────
module.exports.getPaymentStats = async (req, res) => {
  try {
    const allOrders = await Order.find({});
    res.status(200).json({
      success: true,
      stats: {
        totalTransactions:  allOrders.length,
        completedPayments:  allOrders.filter(o => o.paymentStatus === 'completed').length,
        failedPayments:     allOrders.filter(o => o.paymentStatus === 'failed').length,
        pendingPayments:    allOrders.filter(o => o.paymentStatus === 'pending').length,
        totalAmount:        allOrders.filter(o => o.paymentStatus === 'completed').reduce((s, o) => s + o.totalAmount, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur statistiques' });
  }
};