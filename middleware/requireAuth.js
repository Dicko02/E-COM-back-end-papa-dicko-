const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const requireAuth = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.jwt;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const tokenFromHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ message: 'Token manquant, veuillez vous connecter.' });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const user = await User.findById(decoded.id).select('-password -code');

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    // infos complètes pour les routes suivantes
    req.userId = user._id;
    req.user = user;

    next();

  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
};

module.exports = requireAuth;
