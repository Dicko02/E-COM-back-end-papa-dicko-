const requireAdmin = async (req, res, next) => {
  try {
    // Le middleware requireAuth doit être appelé AVANT
    if (!req.user) {
      return res.status(401).json({ message: 'Token manquant, veuillez vous connecter.' });
    }

    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Accès refusé. Droits admin requis.',
        requiredRole: 'admin',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la vérification admin', error });
  }
};

module.exports = requireAdmin;
