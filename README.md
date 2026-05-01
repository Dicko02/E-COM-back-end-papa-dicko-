# 🔧 Wayne Enterprize — Back-End API

> API REST Node.js + Express + MongoDB pour plateforme e-commerce

**Version :** 2.0 — Cloudinary Integration  
**Port :** 5000 (dev) | 10000 (prod)  
**Base de données :** MongoDB Atlas  
**Stockage images :** Cloudinary

---

## 📊 ÉTAT ACTUEL

### ✅ Fonctionnel (Production-Ready)
- ✅ Authentification JWT (cookie + Bearer header)
- ✅ Middleware `requireAuth` + `requireAdmin`
- ✅ Upload images Cloudinary (350×350px, JPEG automatique)
- ✅ Email confirmation commande (Nodemailer + Gmail SMTP)
- ✅ Dashboard stats (5 endpoints)
- ✅ Gestion complète : produits, catégories, commandes, panier, users
- ✅ MongoDB Atlas connecté
- ✅ Sécurité : Helmet.js + rate limiting + compression
- ✅ 0 vulnérabilité npm audit

### 🚧 En Cours
- ✅ **Wave Payment Integration** — Paiements réels via API Wave (implémenté, en attente credentials)

---

## 🚀 DÉMARRAGE RAPIDE

### Prérequis
- Node.js 18+
- MongoDB Atlas (compte gratuit)
- Cloudinary (compte gratuit)

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos credentials

# 3. Démarrer le serveur
npm run dev  # Port 5000
```

### Configuration .env

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.0k1yfbh.mongodb.net/wayne-enterprize
TOKEN_SECRET=votre_secret_jwt_minimum_32_caracteres
ORIGIN=http://localhost:5173

# Email (Gmail SMTP)
SENDER_MAIL=votre-email@gmail.com
SENDER_MAIL_PASSWORD=votre-mot-de-passe-application
RECEPTION_MAIL=votre-email@gmail.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret

# Wave Payment (Production)
WAVE_API_KEY=votre-wave-api-key
WAVE_API_SECRET=votre-wave-api-secret
WAVE_WEBHOOK_SECRET=votre-wave-webhook-secret
WAVE_API_URL=https://api.wave.com/v1
FRONTEND_URL=http://localhost:5173
```

### Vérification

```bash
# Health check
curl http://localhost:5000/api/health
# Réponse attendue: {"status":"success","database":"connected"}
```

---

## 📦 STRUCTURE

```
E-COM back-end(papa dicko)/
├── config/
│   └── db_config.js            # Configuration MongoDB
├── controllers/
│   ├── category.controller.js  # Gestion catégories
│   ├── chart.controller.js     # Gestion panier
│   ├── contact.controller.js   # Formulaire contact
│   ├── order.controller.js     # Gestion commandes
│   ├── payment.controller.js   # Paiements (Wave à venir)
│   ├── produits.controller.js  # Gestion produits
│   └── user.controller.js      # Gestion utilisateurs
├── middleware/
│   ├── requireAdmin.js         # Protection routes admin
│   ├── requireAuth.js          # Protection routes authentifiées
│   └── upload.js               # Upload Cloudinary
├── models/
│   ├── categoryModel.js        # Schéma catégories
│   ├── chart.model.js          # Schéma panier
│   ├── orderModel.js           # Schéma commandes
│   ├── produitsModel.js        # Schéma produits
│   └── user.model.js           # Schéma utilisateurs
├── routes/
│   ├── category.route.js       # Routes catégories
│   ├── chart.route.js          # Routes panier
│   ├── contact.routes.js       # Routes contact
│   ├── order.route.js          # Routes commandes
│   ├── payment.route.js        # Routes paiement
│   ├── products.route.js       # Routes produits
│   └── user.route.js           # Routes utilisateurs
├── utils/
│   ├── errors.utils.js         # Gestion erreurs
│   ├── mailer.js               # Configuration email
│   └── orderMailer.js          # Emails commandes
├── .env                        # Variables d'environnement (local)
├── .env.example                # Template variables
├── index.js                    # Point d'entrée
├── package.json                # Dépendances
└── README.md                   # Ce fichier
```

---

## 🔌 API ENDPOINTS

### 🔐 Authentification

#### Inscription
```http
POST /api/user/register
Content-Type: application/json

{
  "nom": "Doe",
  "prenom": "John",
  "email": "john@example.com",
  "password": "motdepasse123",
  "number": "0600000000"
}
```

#### Connexion
```http
POST /api/user/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

#### Vérification Email
```http
POST /api/user/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "123456"
}
```

---

### 📦 Produits

#### Lister tous les produits
```http
GET /api/produits/getAllProduits
```

#### Rechercher des produits
```http
GET /api/produits/search?search=formation&category=id&minPrice=0&maxPrice=500&page=1&limit=12
```

#### Détail d'un produit
```http
GET /api/produits/getProduit/:id
```

#### Créer un produit (Admin)
```http
POST /api/produits/addProduit
Authorization: Bearer <token>
Content-Type: multipart/form-data

nom: Module BRONZE
description: Formation de base
categorie: <category_id>
prix: 150
nombreDisponible: 999
image: <file>
```

#### Modifier un produit (Admin)
```http
PUT /api/produits/updateProduit/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

nom: Module BRONZE Updated
prix: 180
image: <file> (optionnel)
```

#### Supprimer un produit (Admin)
```http
DELETE /api/produits/deleteProduit/:id
Authorization: Bearer <token>
```

---

### 🏷️ Catégories

#### Lister toutes les catégories
```http
GET /api/category/getAllCategories
```

#### Créer une catégorie (Admin)
```http
POST /api/category/addCategory
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Formation"
}
```

#### Modifier une catégorie (Admin)
```http
PUT /api/category/updateCategory/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Formations Trading"
}
```

#### Supprimer une catégorie (Admin)
```http
DELETE /api/category/deleteCategory/:id
Authorization: Bearer <token>
```

---

### 🛒 Panier

#### Récupérer le panier
```http
GET /api/chart/:clientId
Authorization: Bearer <token>
```

#### Ajouter au panier
```http
POST /api/chart/:clientId
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "<product_id>",
  "quantity": 2
}
```

#### Modifier quantité
```http
PUT /api/chart/:clientId/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### Retirer du panier
```http
DELETE /api/chart/:clientId/:productId
Authorization: Bearer <token>
```

#### Vider le panier
```http
DELETE /api/chart/:clientId
Authorization: Bearer <token>
```

---

### 📋 Commandes

#### Créer une commande depuis le panier
```http
POST /api/orders/cart/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerInfo": {
    "userId": "<user_id>",
    "email": "john@example.com",
    "phone": "0600000000",
    "address": "123 Rue Example"
  },
  "paymentIntentId": "<payment_id>"
}
```

#### Lister mes commandes
```http
GET /api/orders/user/:userId
Authorization: Bearer <token>
```

#### Détail d'une commande
```http
GET /api/orders/:orderId
Authorization: Bearer <token>
```

#### Lister toutes les commandes (Admin)
```http
GET /api/orders/all
Authorization: Bearer <token>
```

#### Changer le statut (Admin)
```http
PUT /api/orders/:orderId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "expédiée",
  "trackingNumber": "TRACK123" (optionnel)
}
```

---

### 💳 Paiement Wave

#### Initier un paiement Wave
```http
POST /api/payment/wave/initiate
Content-Type: application/json

{
  "cartItems": [
    {
      "productId": "<product_id>",
      "quantity": 1,
      "price": 150
    }
  ],
  "customerInfo": {
    "userId": "<user_id>",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "221771234567"
  },
  "totalAmount": 150
}

Response:
{
  "success": true,
  "orderId": "<order_id>",
  "checkoutUrl": "https://checkout.wave.com/...",
  "sessionId": "<wave_session_id>",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

#### Webhook Wave (appelé automatiquement par Wave)
```http
POST /api/payment/wave/webhook
X-Wave-Signature: <signature>
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": {
    "id": "<session_id>",
    "payment_status": "succeeded"
  }
}
```

#### Vérifier le statut d'un paiement
```http
GET /api/payment/wave/status/:sessionId

Response:
{
  "success": true,
  "paymentStatus": "completed",
  "waveStatus": "succeeded",
  "orders": [...]
}
```

#### Statistiques paiements (Admin)
```http
GET /api/payment/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "stats": {
    "totalTransactions": 150,
    "completedPayments": 120,
    "failedPayments": 20,
    "pendingPayments": 10,
    "totalAmount": 45000,
    "paymentMethods": {
      "wave": 120,
      "orangeMoney": 0
    }
  },
  "recentTransactions": [...]
}
```

---

### 📊 Dashboard Admin

#### Stats revenus
```http
GET /api/orders/stats/revenue?period=month
Authorization: Bearer <token>
```

#### Tendances ventes
```http
GET /api/orders/stats/trends?days=30
Authorization: Bearer <token>
```

#### Top produits
```http
GET /api/orders/stats/top-products?limit=10
Authorization: Bearer <token>
```

#### Stats par catégorie
```http
GET /api/orders/stats/categories
Authorization: Bearer <token>
```

#### Stats statuts commandes
```http
GET /api/orders/stats/status
Authorization: Bearer <token>
```

---

## 🔐 SÉCURITÉ

### Authentification JWT
- Token stocké dans cookie HTTP-only
- Expiration : 7 jours
- Secret : 32+ caractères aléatoires

### Middleware Protection
```javascript
// Route protégée (utilisateur connecté)
router.get('/profile', requireAuth, getProfile);

// Route admin uniquement
router.post('/produits', requireAuth, requireAdmin, addProduct);
```

### Rate Limiting
- **Général** : 200 requêtes / 15 minutes
- **Auth** : 10 requêtes / 15 minutes (login, register)

### Headers Sécurité (Helmet.js)
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security

### Validation Upload
- Types autorisés : JPEG, PNG, GIF, WebP
- Taille max : 5MB
- Resize automatique : 350×350px (Cloudinary)

---

## 📧 CONFIGURATION EMAIL

### Gmail SMTP (Recommandé)

1. **Activer validation 2 étapes**
   - Gmail → Compte → Sécurité → Validation en 2 étapes

2. **Générer mot de passe d'application**
   - Gmail → Compte → Sécurité → Mots de passe des applications
   - Sélectionner "Autre" → Nommer "Wayne Enterprize"
   - Copier le mot de passe généré (16 caractères)

3. **Configurer .env**
   ```env
   SENDER_MAIL=votre-email@gmail.com
   SENDER_MAIL_PASSWORD=xxxx xxxx xxxx xxxx
   RECEPTION_MAIL=votre-email@gmail.com
   ```

4. **Redémarrer le serveur**
   ```bash
   npm run dev
   ```

### SendGrid (Alternative)

1. Créer compte sur https://sendgrid.com
2. Générer API Key
3. Configurer .env :
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=<votre_api_key>
   ```

---

## 🖼️ CONFIGURATION CLOUDINARY

### 1. Créer un compte
- Aller sur https://cloudinary.com
- S'inscrire (gratuit, 25GB)

### 2. Récupérer les credentials
- Dashboard → Account Details → Product Environment Credentials
- Copier : Cloud name, API Key, API Secret

### 3. Configurer .env
```env
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
```

### 4. Vérifier l'intégration
```bash
# Démarrer le serveur
npm run dev

# Tester upload via admin
# Les images doivent apparaître dans Cloudinary Media Library
# Dossier: wayne-enterprize/products/
```

### Avantages Cloudinary
- ✅ Images persistantes (pas supprimées au redémarrage Render)
- ✅ Resize automatique 350×350px
- ✅ CDN mondial (chargement rapide)
- ✅ Compression automatique
- ✅ 25GB gratuit

---

## 🛠️ COMMANDES

```bash
# Développement (nodemon, auto-reload)
npm run dev

# Production
npm start

# Vérifier vulnérabilités
npm audit

# Corriger vulnérabilités
npm audit fix

# Lister dépendances
npm list

# Nettoyer node_modules
rm -rf node_modules && npm install
```

---

## 🐛 DÉPANNAGE

### Erreur "Cannot connect to MongoDB"
**Solution :**
1. Vérifier `MONGO_URI` dans `.env`
2. MongoDB Atlas → Network Access → Ajouter `0.0.0.0/0`
3. Vérifier que le mot de passe ne contient pas de caractères spéciaux

### Erreur "Cloudinary configuration not found"
**Solution :**
1. Vérifier les 3 variables `CLOUDINARY_*` dans `.env`
2. Redémarrer le serveur
3. Vérifier les logs pour erreurs Cloudinary

### Emails ne partent pas
**Solution :**
1. Vérifier `SENDER_MAIL_PASSWORD` = mot de passe d'application (pas le mot de passe Gmail normal)
2. Vérifier que la validation en 2 étapes est activée sur Gmail
3. Tester avec un email simple :
   ```javascript
   const nodemailer = require('nodemailer');
   // Test dans un controller
   ```

### Port 5000 déjà utilisé
**Solution :**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

---

## 📚 DÉPENDANCES PRINCIPALES

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "multer": "^1.4.5-lts.1",
  "cloudinary": "^2.0.0",
  "multer-storage-cloudinary": "^4.0.0",
  "nodemailer": "^6.9.7",
  "helmet": "^8.0.0",
  "express-rate-limit": "^7.5.0",
  "compression": "^1.7.5",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

---

## 🚀 DÉPLOIEMENT RENDER

### 1. Configuration
- Dashboard Render → New Web Service
- Connecter le repo GitHub
- Build Command : `npm install`
- Start Command : `npm start`

### 2. Variables d'environnement
Ajouter dans Render Dashboard → Environment :
```
PORT=10000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
TOKEN_SECRET=...
ORIGIN=https://votre-site-vercel.app
SENDER_MAIL=...
SENDER_MAIL_PASSWORD=...
RECEPTION_MAIL=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 3. Vérification
```bash
curl https://e-com-back-end-papa-dicko.onrender.com/api/health
# Réponse: {"status":"success","database":"connected"}
```

---

## 📞 SUPPORT

- **Documentation principale** : [README.md](../README.md)
- **Changelog** : [CHANGELOG.md](../CHANGELOG.md)
- **Audit UX** : [AUDIT_ERGONOMIE_BASTIEN_SCAPIN.md](../AUDIT_ERGONOMIE_BASTIEN_SCAPIN.md)

---

*Dernière mise à jour : 29 Avril 2026*
