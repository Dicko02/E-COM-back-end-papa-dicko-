const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema(
  {
    nom:    String,
    prenom: String,
    number: String,
    code:   String,

    // expires: 0 = MongoDB supprime le document dès que cette date est dépassée.
    // Quand le compte est vérifié, on met codeExpires à null →
    // MongoDB ne supprime JAMAIS un compte vérifié (null est ignoré par le TTL).
    codeExpires: {
      type:    Date,
      default: null,
      expires: 0,
    },

    email: {
      type:      String,
      unique:    true,
      lowercase: true,
      required:  true,
    },

    password: {
      type:      String,
      required:  true,
      minlength: 6,
    },

    role: {
      type:     String,
      enum:     ['admin', 'client'],
      default:  'client',
      required: true,
    },
  },
  { timestamps: true }
);

// Hashage du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode statique de connexion
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) throw Error('Incorrect email');

  const auth = await bcrypt.compare(password, user.password);
  if (!auth) throw Error('Incorrect password');

  // Bloquer la connexion d'un compte non encore vérifié
  if (user.code !== null && user.code !== undefined) {
    throw Error('Email not verified');
  }

  return user;
};

const User = mongoose.model('user', userSchema);
module.exports = User;