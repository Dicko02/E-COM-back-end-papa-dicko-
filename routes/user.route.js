const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth.js");
const requireAdmin = require("../middleware/requireAdmin.js");

const {
  signUp,
  verifyCode,
  signIn,
  logout,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  totalUsers,
  getMe
} = require("../controllers/user.controller.js");

// Tous les utilisateurs (admin uniquement)
router.get("/", requireAuth, requireAdmin, getUsers);

// Inscription (admin ou client via role)
router.post("/register", signUp);

// Connexion
router.post("/login", signIn);

// Récupération de son profil
router.get("/getMe", requireAuth, getMe);

// Déconnexion
router.get("/logout", requireAuth, logout);

// Statistiques
router.get("/statistiques/total-users", requireAuth, totalUsers);

// Vérification email
router.post("/verify/:email", verifyCode);

// Un utilisateur
router.get("/:userId", requireAuth, getUser);

// Mise à jour d'un utilisateur (admin ou propriétaire du compte)
router.put("/:id", requireAuth, updateUser);

// Suppression d'un utilisateur (admin ou propriétaire du compte)
router.delete("/:id", requireAuth, deleteUser);

module.exports = router;
