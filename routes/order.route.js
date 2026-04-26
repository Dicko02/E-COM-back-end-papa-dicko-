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

// ── Routes fixes (doivent être AVANT les routes dynamiques /:id) ──────────────

// Affichage de toutes les commandes (admin uniquement)
router.get("/viewAllOrder", requireAuth, requireAdmin, viewAllOrder);

// Toutes les commandes (admin uniquement)
router.get('/all', requireAuth, requireAdmin, getAllOrders);

// Commandes d'un utilisateur
router.get('/user/:email', requireAuth, getUserOrders);

// 📊 STATISTIQUES — toutes AVANT /:orderId pour éviter les conflits de routing
router.get('/stats/overview',        requireAuth, requireAdmin, getOrderStats);
router.get('/stats/monthly-revenue', requireAuth, requireAdmin, getMonthlyRevenue);
router.get('/stats/customer-trends', requireAuth, requireAdmin, getCustomerTrends);
router.get('/stats/category-stats',  requireAuth, requireAdmin, getCategoryStats);
router.get('/stats/top-products',    requireAuth, requireAdmin, getTopProducts);
router.get('/stats/status-breakdown',requireAuth, requireAdmin, getStatusBreakdown);

// ── Routes dynamiques (après les routes fixes) ────────────────────────────────

// Créer une commande
router.post('/create', createOrder);

// Créer une commande depuis le panier
router.post('/cart/create', createCartOrder);

// Commande spécifique par ID — DOIT être après toutes les routes /stats/*
router.get('/:orderId', requireAuth, getOrderById);

// Mettre à jour le statut
router.put('/:orderId/status', requireAuth, requireAdmin, updateOrderStatus);

// Annuler une commande
router.put('/:orderId/cancel', requireAuth, cancelOrder);

// Suppression (admin)
router.delete("/deleteOneOrder/:id", requireAuth, requireAdmin, deleteOneOrder);

// Mise à jour (admin)
router.put("/updateOneOrder/:id", requireAuth, requireAdmin, updateOneOrder);

module.exports = router;
