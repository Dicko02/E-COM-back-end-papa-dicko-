const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth.js");
const requireAdmin = require("../middleware/requireAdmin.js");

const {
  createNewOrder,
  deleteOneOrder,
  updateOneOrder,
  viewAllOrder,
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  createOrder,
  cancelOrder,
  getOrderStats,
  createCartOrder,
  getMonthlyRevenue,
  getCustomerTrends,
  getCategoryStats,
  getTopProducts,
  getStatusBreakdown
} = require("../controllers/order.controller");

// Routes pour les commandes

// Affichage de toutes les commandes (admin uniquement)
router.get("/viewAllOrder", requireAuth, requireAdmin, viewAllOrder);

// Route pour récupérer toutes les commandes (admin uniquement)
router.get('/all', requireAuth, requireAdmin, getAllOrders);

// Route pour créer une nouvelle commande
router.post('/create', createOrder);

// Route pour créer une commande avec panier complet
router.post('/cart/create', createCartOrder);

// Route pour les statistiques des commandes (admin uniquement)
router.get('/stats/overview', requireAuth, requireAdmin, getOrderStats);

// Route pour récupérer les commandes d'un utilisateur (vérification propriétaire dans le controller)
router.get('/user/:email', requireAuth, getUserOrders);

// Route pour récupérer une commande spécifique (vérification propriétaire dans le controller)
router.get('/:orderId', requireAuth, getOrderById);

// Route pour mettre à jour le statut d'une commande (admin uniquement)
router.put('/:orderId/status', requireAuth, requireAdmin, updateOrderStatus);

// Route pour annuler une commande (vérification propriétaire dans le controller)
router.put('/:orderId/cancel', requireAuth, cancelOrder);

// Suppression d'une commande (admin uniquement)
router.delete("/deleteOneOrder/:id", requireAuth, requireAdmin, deleteOneOrder);

// Mise à jour d'une commande (admin uniquement)
router.put("/updateOneOrder/:id", requireAuth, requireAdmin, updateOneOrder);

// 📊 ROUTES POUR LES STATISTIQUES (Admin seulement)
router.get('/stats/monthly-revenue', requireAuth, requireAdmin, getMonthlyRevenue);
router.get('/stats/customer-trends', requireAuth, requireAdmin, getCustomerTrends);
router.get('/stats/category-stats', requireAuth, requireAdmin, getCategoryStats);
router.get('/stats/top-products', requireAuth, requireAdmin, getTopProducts);
router.get('/stats/status-breakdown', requireAuth, requireAdmin, getStatusBreakdown);

module.exports = router;
