const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = mongoose.Schema(

    {
        nom: String,
        prenom: String,
        number: String,
        code: String,

        codeExpires: {
            type: Date,
            default: null
        },

        email: {
            type: String,
            unique: true,
            lowercase: true,
            required: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        role: {
            type: String,
            enum: ['admin', 'client'],
            default: 'client',
            required: true
        }
    },

    {
        timestamps: true
    }

);

// Hashage du mot de passe avant de sauvegarder l'utilisateur
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode statique pour la connexion de l'utilisateur
userSchema.statics.login = async function(email, password) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) throw Error('Incorrect email');

  const auth = await bcrypt.compare(password, user.password);
  if (!auth) throw Error('Incorrect password');

  return user;
};


const user = mongoose.model("user", userSchema);

module.exports = user;