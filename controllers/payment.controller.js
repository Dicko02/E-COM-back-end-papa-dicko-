const Order = require("../models/orderModel");
const ProduitsModel = require("../models/produitsModel");
const Chart = require("../models/chart.model");
const sendConfirmationEmail = require("../utils/orderMailer");
const waveService = require("../services/wave.service");

// Statuts de paiement
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Méthodes de paiement
const PAYMENT_METHODS = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money'
};

/**
 * Initier un paiement Wave
 * Crée d'abord les commandes, puis génère la session Wave
 */
module.exports.initiateWavePayment = async (req, res) => {
  try {
    const { cartItems, customerInfo, totalAmount } = req.body;

    if (!cartItems || !customerInfo || !totalAmount) {
      return res.status(400).json({
        error: 'Articles du panier, informations client et montant total requis'
      });
    }

    // 1. Créer les commandes en statut "pending" (une commande par produit)
    const orderPromises = cartItems.map(async (item) => {
      const produit = await ProduitsModel.findById(item.productId);

      if (!produit) throw new Error(`Produit ${item.productId} non trouvé`);
      if (produit.nombreDisponible < item.quantity) {
        throw new Error(`Stock insuffisant pour ${produit.nom}`);
      }

      const order = new Order({
        produitId: item.productId,
        quantity: item.quantity,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          userId: customerInfo.userId
        },
        totalAmount: produit.prix * item.quantity,
        status: "pending",
        paymentStatus: "pending"
      });

      return order.save();
    });

    const orders = await Promise.all(orderPromises);
    const mainOrderId = orders[0]._id.toString();

    // 2. Créer la session de paiement Wave
    const wavePayment = await waveService.createPayment({
      amount: totalAmount,
      currency: 'XOF',
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      orderId: mainOrderId,
      items: cartItems
    });

    // 3. Mettre à jour les commandes avec le sessionId Wave
    await Promise.all(
      orders.map(order => {
        order.waveSessionId = wavePayment.sessionId;
        return order.save();
      })
    );

    res.status(200).json({
      success: true,
      orderId: mainOrderId,
      checkoutUrl: wavePayment.checkoutUrl,
      sessionId: wavePayment.sessionId,
      expiresAt: wavePayment.expiresAt
    });

  } catch (error) {
    console.error("Erreur lors de l'initiation du paiement Wave:", error);
    res.status(500).json({
      error: error.message || "Erreur serveur lors de l'initiation du paiement"
    });
  }
};

/**
 * Webhook Wave - Appelé automatiquement par Wave lors d'un changement de statut
 */
module.exports.waveWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-wave-signature'];
    
    // Pour express.raw(), le body est un Buffer
    const payload = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);

    // Vérifier la signature du webhook
    if (!waveService.verifyWebhookSignature(payload, signature)) {
      console.error('Signature webhook Wave invalide');
      return res.status(401).json({ error: 'Signature invalide' });
    }

    // Parser le body si c'est un Buffer
    const webhookData = req.body instanceof Buffer ? JSON.parse(payload) : req.body;
    const { type, data } = webhookData;

    // Traiter uniquement les événements de paiement
    if (type === 'checkout.session.completed' || type === 'checkout.session.failed') {
      const sessionId = data.id;
      const paymentStatus = data.payment_status;

      // Trouver les commandes associées
      const orders = await Order.find({ waveSessionId: sessionId });

      if (orders.length === 0) {
        console.warn(`Aucune commande trouvée pour sessionId: ${sessionId}`);
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (paymentStatus === 'succeeded') {
        // Paiement réussi
        for (const order of orders) {
          order.status = 'confirmed';
          order.paymentStatus = 'completed';
          order.paymentDate = new Date();
          await order.save();

          // Déduire le stock
          const produit = await ProduitsModel.findById(order.produitId);
          if (produit) {
            produit.nombreDisponible -= order.quantity;
            await produit.save();
          }
        }

        // Vider le panier si userId existe
        if (orders[0].customerInfo?.userId) {
          await Chart.findOneAndUpdate(
            { client: orders[0].customerInfo.userId },
            { products: [] }
          );
        }

        // Envoyer l'email de confirmation
        await sendConfirmationEmail(
          orders[0].customerEmail,
          orders,
          orders.reduce((sum, o) => sum + o.totalAmount, 0),
          sessionId
        );

      } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        // Paiement échoué ou annulé
        for (const order of orders) {
          order.status = 'cancelled';
          order.paymentStatus = 'failed';
          await order.save();
        }
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Erreur webhook Wave:', error);
    res.status(500).json({ error: 'Erreur serveur webhook' });
  }
};

/**
 * Vérifier le statut d'un paiement Wave
 */
module.exports.checkWavePaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID requis' });
    }

    // Vérifier le statut auprès de Wave
    const waveStatus = await waveService.checkPaymentStatus(sessionId);

    // Récupérer les commandes associées
    const orders = await Order.find({ waveSessionId: sessionId }).populate('produitId');

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.status(200).json({
      success: true,
      paymentStatus: waveStatus.status,
      waveStatus: waveStatus.waveStatus,
      orders: orders.map(o => ({
        id: o._id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
        quantity: o.quantity,
        product: o.produitId ? {
          id: o.produitId._id,
          nom: o.produitId.nom,
          imageUrl: o.produitId.imageUrl
        } : null
      }))
    });

  } catch (error) {
    console.error("Erreur lors de la vérification du statut Wave:", error);
    res.status(500).json({
      error: "Erreur serveur lors de la vérification du statut"
    });
  }
};

// Statistiques admin (basées sur les vraies commandes)
module.exports.getPaymentStats = async (req, res) => {
  try {
    const allOrders = await Order.find({});

    const stats = {
      totalTransactions: allOrders.length,
      completedPayments: allOrders.filter(o => o.paymentStatus === 'completed').length,
      failedPayments: allOrders.filter(o => o.paymentStatus === 'failed').length,
      cancelledPayments: allOrders.filter(o => o.status === 'cancelled').length,
      pendingPayments: allOrders.filter(o => o.paymentStatus === 'pending').length,
      totalAmount: allOrders
        .filter(o => o.paymentStatus === 'completed')
        .reduce((sum, o) => sum + o.totalAmount, 0),
      paymentMethods: {
        wave: allOrders.filter(o => o.waveSessionId).length,
        orangeMoney: 0 // À implémenter plus tard
      }
    };

    res.status(200).json({
      success: true,
      stats,
      recentTransactions: allOrders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(o => ({
          id: o._id,
          amount: o.totalAmount,
          status: o.paymentStatus,
          orderStatus: o.status,
          customerEmail: o.customerEmail,
          createdAt: o.createdAt
        }))
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des statistiques" });
  }
};
