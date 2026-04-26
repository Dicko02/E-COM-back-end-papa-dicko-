// Importation des modules nécessaires
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const app = express();

dotenv.config();
require('./config/db_config');
const PORT = process.env.PORT || 3000;

// ── Sécurité : Headers HTTP (Helmet) ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Nécessaire pour servir les images /uploads
  contentSecurityPolicy: false, // Désactivé pour ne pas bloquer le front en dev
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Limite générale : 200 requêtes / 15 min par IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de requêtes, réessayez dans 15 minutes.' }
});

// Limite stricte sur auth : 10 tentatives / 15 min par IP (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' }
});

app.use(generalLimiter);

// ── Compression gzip ──────────────────────────────────────────────────────────
// Réduit la taille des réponses JSON de ~60-70%
app.use(compression());

// Importation des routes
const userRoutes = require("./routes/user.route");
const produitsRoutes = require('./routes/products.route');
const categoryRoutes = require('./routes/category.route');
const orderRoutes = require('./routes/order.route');
const chartRoutes = require('./routes/chart.route');
const paymentRoutes = require('./routes/payment.route');
const mailRoutes = require('./routes/contact.routes');

// Middleware pour parser les requêtes JSON
app.use(express.json());

/* CORS */
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', // Ajoutez d'autres origines autorisées si nécessaire
    process.env.ORIGIN
  ], // Remplace par l'URL de mon frontend en temp voulu
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, 
}));

// Middleware pour parser les cookies et le corps des requêtes
app.use(cookieParser());
app.use(bodyParser.json());

// Middleware pour servir les fichiers statiques (images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API E-COM-MED !');
});


// Endpoint de vérification de santé de l'API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API E-COM fonctionne correctement',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});


// Endpoint pour tester la base de données (développement uniquement)
app.get('/api/test-db', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ status: 'error', message: 'Route non trouvée' });
  }

  try {
    const ProduitsModel = require('./models/produitsModel');
    const CategoryModel = require('./models/categoryModel');
    
    const productsCount = await ProduitsModel.countDocuments();
    const categoriesCount = await CategoryModel.countDocuments();
    
    res.status(200).json({
      status: 'success',
      message: 'Base de données accessible',
      data: {
        products: productsCount,
        categories: categoriesCount,
        connection: mongoose.connection.readyState === 1 ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur de connexion à la base de données'
    });
  }
});


// Routes
app.use('/api/users/login', authLimiter);    // Anti brute-force login
app.use('/api/users/register', authLimiter); // Anti spam inscription
app.use('/api/users', userRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chart', chartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mail', mailRoutes);


// Middleware de gestion d'erreur globale
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});


// Middleware pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} non trouvée`
  });
});


// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT} !`);
});