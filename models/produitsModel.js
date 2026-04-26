const mongoose = require('mongoose');

// Création du schéma
const produitSchema = new mongoose.Schema(
    {

        nom: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        categorie: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        },

        prix: {
            type: Number,
            required: true
        },

        ancienPrix: {
            type: Number,
            default: null
        },

        nombreDisponible: {
            type: Number,
            required: true
        },

        image: {
            type: String,
            default: null
        },

        images: [{
            type: String
        }],

        date: {
            type: Date,
            default: Date.now
        }
        
    }
);

// Création du modèle avec vérification d'existence pour éviter les conflits
const ProduitsModel = mongoose.models.Produit || mongoose.model('Produit', produitSchema);

module.exports = ProduitsModel;
