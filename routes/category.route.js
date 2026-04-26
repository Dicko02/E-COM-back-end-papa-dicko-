const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");

const {
  createNewCategory,
  viewAllCategory,
  viewOneCategory,
  updateOneCategory,
  deleteOneCategory,
} = require("../controllers/category.controller");

// ── Routes publiques ──────────────────────────────────────────────────────────
router.get("/viewAllCategory", viewAllCategory);                                          // Affichage de toutes les catégories
router.get("/viewOneCategory/:id", viewOneCategory);                                      // Affichage d'une catégorie

// ── Routes admin uniquement ───────────────────────────────────────────────────
router.post("/createNewCategory", requireAuth, requireAdmin, createNewCategory);          // Création d'une catégorie
router.put("/updateOneCategory/:id", requireAuth, requireAdmin, updateOneCategory);       // Mise à jour d'une catégorie
router.delete("/deleteOneCategory/:id", requireAuth, requireAdmin, deleteOneCategory);    // Suppression d'une catégorie

module.exports = router;
