const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");

const User  = require("../models/user.model.js");
const Chart = require("../models/chart.model.js");

const { signUpErrors, signInErrors } = require("../utils/errors.utils.js");
const mail = require("../utils/mailer.js");

const maxAge = 1 * 24 * 60 * 60 * 1000; // 1 jour

const createToken = (id, role) => {
  return jwt.sign(
    { id: id.toString(), role },
    process.env.TOKEN_SECRET,
    { expiresIn: '1d' }
  );
};


// ── Inscription ──────────────────────────────────────────────────────────────
module.exports.signUp = async (req, res) => {
  try {
    const { code: _code, codeExpires: _exp, ...safeBody } = req.body;

    // ✅ Vérifier si un compte existe déjà avec cet email
    const existing = await User.findOne({ email: safeBody.email?.toLowerCase() });

    if (existing) {
      const isUnverified = existing.code !== null && existing.code !== undefined;

      if (isUnverified) {
        // Compte non vérifié → on le supprime pour permettre une nouvelle tentative
        await User.findByIdAndDelete(existing._id);
        await Chart.findOneAndDelete({ client: existing._id });
        // On continue normalement (création d'un nouveau compte)
      } else {
        // Compte vérifié → email vraiment déjà pris
        return res.status(400).json({ errors: "Cet email est déjà enregistré" });
      }
    }

    const user = await User.create(safeBody);

    // Génération du code
    const generateNumericCode = (length) => {
      let code = "";
      for (let i = 0; i < length; i++) code += Math.floor(Math.random() * 10);
      return code;
    };

    const code        = generateNumericCode(6);
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(user._id, { code, codeExpires });

    // Envoi email — non-bloquant
    try {
      await mail(
        user.email,
        "Confirmation Wayne Enterprize",
        `Votre code de vérification est : ${code}`,
        `<p>Bonjour ${user.prenom || ''},</p>
         <p>Votre code de vérification est : <strong style="font-size:24px">${code}</strong></p>
         <p>Ce code expire dans <strong>10 minutes</strong>.</p>
         <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
      );
    } catch (mailErr) {
      console.error("Erreur envoi email:", mailErr.message);
    }

    res.status(200).json({ message: "Utilisateur créé. Code envoyé par email." });

  } catch (err) {
    console.error("Erreur inscription:", err.message, "| code:", err.code, "| keyValue:", JSON.stringify(err.keyValue));

    if (err.code === 11000 && err.keyValue?.email) {
      return res.status(400).json({ errors: "Cet email est déjà enregistré" });
    }
    if (err.message?.includes('password')) {
      return res.status(400).json({ errors: "Le mot de passe doit faire 6 caractères minimum" });
    }
    if (err.message?.includes('email')) {
      return res.status(400).json({ errors: "Adresse email invalide" });
    }

    const errors = signUpErrors(err);
    res.status(400).json({ errors, debug: err.message });
  }
};


// ── Vérification du code ─────────────────────────────────────────────────────
module.exports.verifyCode = async (req, res) => {
  try {
    const { email }  = req.params;
    const { code }   = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable ou code expiré. Veuillez vous réinscrire." });
    }

    // ✅ Double vérification de l'expiration (sécurité en plus du TTL MongoDB)
    if (!user.codeExpires || new Date() > user.codeExpires) {
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({ message: "Code expiré. Veuillez vous réinscrire." });
    }

    if (user.code !== code) {
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({ message: "Code invalide. Veuillez vous réinscrire." });
    }

    // ✅ Code correct — on efface le code pour marquer le compte comme vérifié
    user.code        = null;
    user.codeExpires = null; // null = le TTL MongoDB ne touchera plus ce document
    await user.save();

    // Création du panier uniquement pour les clients
    if (user.role === "client") {
      const existingChart = await Chart.findOne({ client: user._id });
      if (!existingChart) {
        await Chart.create({ client: user._id, products: [] });
      }
    }

    const token = createToken(user._id, user.role);

    res.cookie("jwt", token, {
      httpOnly: true,
      secure:   false,
      sameSite: "lax",
      maxAge,
    });

    res.status(200).json({
      user:  { _id: user._id, email: user.email, role: user.role },
      token,
    });

  } catch (err) {
    console.error("Erreur vérification code:", err.message);
    res.status(400).json({ message: "Erreur vérification code" });
  }
};


// ── Connexion ────────────────────────────────────────────────────────────────
module.exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    const token = createToken(user._id, user.role);

    res.status(200).json({
      user:  { _id: user._id, email: user.email, role: user.role },
      token,
    });

  } catch (err) {
    // ✅ Message spécifique si le compte existe mais n'est pas vérifié
    if (err.message === 'Email not verified') {
      return res.status(401).json({ errors: "Votre email n'a pas encore été vérifié. Vérifiez votre boîte mail." });
    }
    const errors = signInErrors(err);
    res.status(400).json({ errors });
  }
};


// ── Déconnexion ──────────────────────────────────────────────────────────────
module.exports.logout = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.status(200).json({ message: "Déconnexion réussie" });
};


// ── Utilisateurs (admin) ─────────────────────────────────────────────────────
module.exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -code");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const user = await User.findById(userId).select("-password -code");
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    if (req.user.role !== 'admin' && req.body.role)     delete req.body.role;
    if (req.body.password)                               delete req.body.password;
    if (req.body.code)                                   delete req.body.code;

    const user = await User.findByIdAndUpdate(id, req.body, {
      new: true, runValidators: true,
    }).select("-password -code");

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    if (user.role === "client") {
      await Chart.findOneAndDelete({ client: user._id });
    }

    res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.totalUsers = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Pas de token fourni" });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const userId  = decoded.id.trim();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Format d'ID invalide", debug: userId });
    }

    const user = await User.findById(userId).select("-password -code");
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé en base" });

    res.status(200).json(user);
  } catch (err) {
    console.error("Erreur JWT:", err.message);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};