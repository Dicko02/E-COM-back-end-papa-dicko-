const Order = require("../models/orderModel");
const ProduitsModel = require("../models/produitsModel");
const Chart = require("../models/chart.model");
const sendConfirmationEmail = require("../utils/orderMailer");

// Statuts de paiement
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Méthodes de paiement (uniquement Wave et Orange Money)
const PAYMENT_METHODS = {
  WAVE: 'wave',
  ORANGE_MONEY: 'orange_money'
};

// Transactions simulées (mémoire)
let simulatedTransactions = new Map();

// Générer un ID unique
const generateTransactionId = () => {
  return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Création d'une intention de paiement
module.exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'XOF', paymentMethod, customerPhone, customerEmail } = req.body;

    if (!amount || !paymentMethod || !customerPhone || !customerEmail) {
      return res.status(400).json({
        error: 'Montant, méthode de paiement, téléphone et email client requis'
      });
    }

    if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      return res.status(400).json({ error: 'Méthode de paiement non supportée' });
    }

    const transactionId = generateTransactionId();

    const paymentIntent = {
      id: transactionId,
      amount,
      currency,
      status: PAYMENT_STATUS.PENDING,
      paymentMethod,
      customerPhone,
      customerEmail,
      createdAt: new Date(),
      clientSecret: `pi_${transactionId}_secret_${Math.random().toString(36).substr(2, 8)}`
    };

    simulatedTransactions.set(transactionId, paymentIntent);

    res.status(200).json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    console.error("Erreur lors de la création de l'intention de paiement:", error);
    res.status(500).json({ error: "Erreur serveur lors de la création du paiement" });
  }
};

// Confirmation d'un paiement
module.exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, cartItems, customerInfo } = req.body;

    if (!paymentIntentId || !cartItems || !customerInfo) {
      return res.status(400).json({
        error: "ID de paiement, articles du panier et informations client requis"
      });
    }

    const transaction = simulatedTransactions.get(paymentIntentId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    // Simulation simple : 85% succès, 15% échec
    const random = Math.random();
    let paymentStatus = random < 0.85 ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED;

    transaction.status = paymentStatus;
    transaction.updatedAt = new Date();

    if (paymentStatus === PAYMENT_STATUS.COMPLETED) {
      try {
        const orderPromises = cartItems.map(async (item) => {
          const produit = await ProduitsModel.findById(item.productId);

          if (!produit) throw new Error(`Produit ${item.productId} non trouvé`);
          if (produit.nombreDisponible < item.quantity) throw new Error(`Stock insuffisant pour ${produit.nom}`);

          const order = new Order({
            produitId: item.productId,
            quantity: item.quantity,
            customerEmail: customerInfo.email,
            customerPhone: customerInfo.phone,
            customerInfo,
            paymentIntentId,
            totalAmount: produit.prix * item.quantity,
            status: "confirmed"
          });

          produit.nombreDisponible -= item.quantity;
          await produit.save();

          return order.save();
        });

        const orders = await Promise.all(orderPromises);

        if (customerInfo.userId) {
          await Chart.findOneAndUpdate(
            { client: customerInfo.userId },
            { products: [] }
          );
        }

        const totalAmount = cartItems.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);

        await sendConfirmationEmail(
          customerInfo.email,
          orders,
          totalAmount,
          paymentIntentId
        );

        res.status(200).json({
          success: true,
          paymentStatus,
          transactionId: paymentIntentId,
          orders,
          message: "Paiement confirmé et commandes créées avec succès"
        });

      } catch (orderError) {
        console.error("Erreur lors du traitement de la commande:", orderError);
        transaction.status = "completed_with_errors";

        res.status(500).json({
          success: false,
          error: "Paiement réussi mais erreur lors du traitement de la commande",
          transactionId: paymentIntentId
        });
      }
    } else {
      res.status(400).json({
        success: false,
        paymentStatus,
        transactionId: paymentIntentId,
        message: "Le paiement a échoué. Veuillez réessayer."
      });
    }
  } catch (error) {
    console.error("Erreur lors de la confirmation du paiement:", error);
    res.status(500).json({ error: "Erreur serveur lors de la confirmation du paiement" });
  }
};

// Vérification du statut d’un paiement
module.exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const transaction = simulatedTransactions.get(paymentIntentId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    res.status(200).json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération du statut" });
  }
};

// Remboursement d'un paiement
module.exports.refundPayment = async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;
    const transaction = simulatedTransactions.get(paymentIntentId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    if (transaction.status !== PAYMENT_STATUS.COMPLETED) {
      return res.status(400).json({ error: "Seuls les paiements confirmés peuvent être remboursés" });
    }

    const refundId = 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const refund = {
      id: refundId,
      paymentIntentId,
      amount: amount || transaction.amount,
      reason: reason || "requested_by_customer",
      status: "succeeded",
      createdAt: new Date()
    };

    if (!transaction.refunds) transaction.refunds = [];
    transaction.refunds.push(refund);

    res.status(200).json({
      success: true,
      refund,
      message: "Remboursement traité avec succès"
    });

  } catch (error) {
    console.error("Erreur lors du remboursement:", error);
    res.status(500).json({ error: "Erreur serveur lors du remboursement" });
  }
};

// Statistiques admin
module.exports.getPaymentStats = async (req, res) => {
  try {
    const transactions = Array.from(simulatedTransactions.values());

    const stats = {
      totalTransactions: transactions.length,
      completedPayments: transactions.filter(t => t.status === PAYMENT_STATUS.COMPLETED).length,
      failedPayments: transactions.filter(t => t.status === PAYMENT_STATUS.FAILED).length,
      cancelledPayments: transactions.filter(t => t.status === PAYMENT_STATUS.CANCELLED).length,
      totalAmount: transactions
        .filter(t => t.status === PAYMENT_STATUS.COMPLETED)
        .reduce((sum, t) => sum + t.amount, 0),
      paymentMethods: {
        wave: transactions.filter(t => t.paymentMethod === PAYMENT_METHODS.WAVE).length,
        orangeMoney: transactions.filter(t => t.paymentMethod === PAYMENT_METHODS.ORANGE_MONEY).length
      }
    };

    res.status(200).json({
      success: true,
      stats,
      recentTransactions: transactions.slice(-10).reverse()
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des statistiques" });
  }
};
