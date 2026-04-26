const express = require("express");
const router = express.Router();
const { uploadWithErrorHandling } = require("../middleware/upload");
const { resizeProductImage } = require("../middleware/imageResize");
const requireAuth = require("../middleware/requireAuth.js");
const requireAdmin = require("../middleware/requireAdmin.js");

const {
  getAllProduct,
  getProductById,
  addProduct,
  updatedProduct,
  deleteProduct,
  uploadImage,
  searchProducts,
  getProductsByCategory,
  addBulkProducts,
  getPopularProducts,
  getNewProducts,
  totalProducts
} = require("../controllers/produits.controller");

// ── Routes publiques ──────────────────────────────────────────────────────────
router.get("/getAllProduits", getAllProduct);                    // Affichage de tous les produits
router.get("/search", searchProducts);                          // Recherche de produits
router.get("/popular", getPopularProducts);                     // Affichage des produits populaires
router.get("/new", getNewProducts);                             // Affichage des nouveaux produits
router.get("/category/:categoryId", getProductsByCategory);     // Affichage des produits par catégorie
router.get("/getProduit/:id", getProductById);                  // Affichage d'un produit

// ── Routes admin uniquement ───────────────────────────────────────────────────
router.get("/statistiques/total-products", requireAuth, requireAdmin, totalProducts);                                       // Nombre total de produits
router.post("/bulk", requireAuth, requireAdmin, addBulkProducts);                                                           // Ajout en masse
router.post("/uploadImage", requireAuth, requireAdmin, uploadWithErrorHandling, resizeProductImage, uploadImage);           // Upload d'une image
router.post("/addProduit", requireAuth, requireAdmin, uploadWithErrorHandling, resizeProductImage, addProduct);             // Ajout d'un produit
router.put("/updateProduit/:id", requireAuth, requireAdmin, uploadWithErrorHandling, resizeProductImage, updatedProduct);   // Mise à jour d'un produit
router.delete("/deleteProduit/:id", requireAuth, requireAdmin, deleteProduct);                                              // Suppression d'un produit

module.exports = router;
