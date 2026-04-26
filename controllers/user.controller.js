const mongoose = require("mongoose");
//const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model.js");
const Chart = require("../models/chart.model.js");

const { signUpErrors, signInErrors } = require("../utils/errors.utils.js");
const mail = require("../utils/mailer.js");


// Token JWT
const maxAge = 1 * 24 * 60 * 60 * 1000; // 3 jours

const createToken = (id, role) => {
  return jwt.sign(
    {
      id: id.toString(),
      role: role,
    },
    process.env.TOKEN_SECRET, {
      expiresIn: '1d',
    }
  );
};


// Enregistrement utilisateur
module.exports.signUp = async (req, res) => {
  try {
    // Nettoyer les champs qui ne doivent pas venir du client
    const { code: _code, codeExpires: _exp, ...safeBody } = req.body;

    const user = await User.create(safeBody);

    // Génération du code de vérification
    const generateNumericCode = (length) => {
      let code = "";
      for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10);
      }
      return code;
    };

    const code = generateNumericCode(6);

    // Le code expire dans 10 minutes
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, { code, codeExpires });

    // Envoi email (non-bloquant — l'inscription réussit même si l'email échoue)
    try {
      await mail(
        user.email,
        "Confirmation Wayne Enterprize",
        `Votre code de vérification est : ${code}`,
        `<p>Bonjour ${user.prenom || ''},</p><p>Votre code de vérification est : <strong style="font-size:24px">${code}</strong></p><p>Ce code expire dans 10 minutes.</p>`
      );
    } catch (mailErr) {
      console.error("Erreur envoi email:", mailErr.message);
      // Non-bloquant — l'inscription continue même sans email
    }

    res.status(200).json({ message: "Utilisateur créé. Code envoyé par email." });

  } catch (err) {
    console.error("Erreur inscription:", err.message, "| code:", err.code, "| keyValue:", JSON.stringify(err.keyValue));

    // Email déjà utilisé
    if (err.code === 11000 && err.keyValue?.email) {
      return res.status(400).json({ errors: "Cet email est déjà enregistré" });
    }

    // Mot de passe trop court
    if (err.message?.includes('password')) {
      return res.status(400).json({ errors: "Le mot de passe doit faire 6 caractères minimum" });
    }

    // Email invalide
    if (err.message?.includes('email')) {
      return res.status(400).json({ errors: "Adresse email invalide" });
    }

    const errors = signUpErrors(err);
    res.status(400).json({ errors, debug: err.message });
  }
};


// Vérification du code de confirmation
module.exports.verifyCode = async (req, res) => {
  try {
    const { email } = req.params;
    const { code } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier l'expiration du code (10 minutes)
    if (!user.codeExpires || new Date() > user.codeExpires) {
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({ message: "Code expiré. Veuillez vous réinscrire." });
    }

    if (user.code !== code) {
      // sécurité : on supprime le compte si tentative invalide
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({ message: "Code invalide" });
    }

    // Validation OK — effacer le code et sa date d'expiration
    user.code = null;
    user.codeExpires = null;
    await user.save();

    // Création du panier UNIQUEMENT pour les clients
    if (user.role === "client") {
      const existingChart = await Chart.findOne({ client: user._id });
      if (!existingChart) {
        await Chart.create({ client: user._id, products: [] });
      }
    }

    const token = createToken(user._id, user.role);

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge,
    });

    res.status(200).json({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
      token,
    });

  } catch (err) {
    res.status(400).json({ message: "Erreur vérification code" });
  }
};


// Connexion utilisateur
module.exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    const token = createToken(user._id, user.role);

    res.status(200).json({
      user: { _id: user._id, email: user.email, role: user.role },
      token
    });


  } catch (err) {
    const errors = signInErrors(err);
    res.status(400).json({ errors });
  }
};


// Déconnexion utilisateur
module.exports.logout = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.status(200).json({ message: "Déconnexion réussie" });
};


// Récupération des utilisateurs (ADMIN — vérifié par requireAdmin dans la route)
module.exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -code");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Récupération d'un utilisateur spécifique
module.exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const user = await User.findById(userId).select("-password -code");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Mise à jour d'un utilisateur (admin ou propriétaire du compte)
module.exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Un client ne peut modifier que son propre compte
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Un client ne peut pas s'attribuer le rôle admin
    if (req.user.role !== 'admin' && req.body.role) {
      delete req.body.role;
    }

    // Bloquer la mise à jour du mot de passe via cette route
    // (findByIdAndUpdate ne déclenche pas le hook pre('save') donc le hash ne se ferait pas)
    if (req.body.password) {
      delete req.body.password;
    }

    // Bloquer aussi la mise à jour du code de vérification
    if (req.body.code) {
      delete req.body.code;
    }

    const user = await User.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password -code");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Suppression d'un utilisateur (admin ou propriétaire du compte)
module.exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Un client ne peut supprimer que son propre compte
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Suppression du panier si client
    if (user.role === "client") {
      await Chart.findOneAndDelete({ client: user._id });
    }

    res.status(200).json({ message: "Utilisateur supprimé" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Statistiques - total utilisateurs
module.exports.totalUsers = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Récupération des infos de l'utilisateur connecté
module.exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Pas de token fourni" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // S'assurer que l'ID est bien trimé (pas d'espaces)
    const userId = decoded.id.trim();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Format d'ID invalide", debug: userId });
    }

    const user = await User.findById(userId).select("-password -code");
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé en base" });
    }

    res.status(200).json(user);

  } catch (err) {
    console.error("Erreur JWT:", err.message);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

