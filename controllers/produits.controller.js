const express = require("express");
//const router = express.Router();
const ProduitsModel = require("../models/produitsModel"); // ✅ Correction de l'import
const ObjectID = require("mongoose").Types.ObjectId;
const { deleteFile } = require("../middleware/upload");


// Fonction pour la récupération de tous les produits
module.exports.getAllProduct = async (req, res) => {
  try {
    const produits = await ProduitsModel.find().populate('categorie');
    
    // Ajouter l'URL complète pour les images
    const produitsWithImages = produits.map(produit => {
      const produitObj = produit.toObject();
      if (produitObj.image) {
        produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
      }
      if (produitObj.images && produitObj.images.length > 0) {
        produitObj.imageUrls = produitObj.images.map(img => 
          `${req.protocol}://${req.get('host')}/uploads/${img}`
        );
      }
      return produitObj;
    });
    
    res.status(200).json(produitsWithImages);
  } catch (err) {
    console.error("Erreur lors de la récupération des produits :", err);
    res.status(500).json({ error: "Erreur serveur, impossible de récupérer les produits" });
  }
};


// Fonction pour la recherche de produits
module.exports.searchProducts = async (req, res) => {
  try {
    const { 
      search = '', 
      category = '', 
      minPrice = 0, 
      maxPrice = Number.MAX_VALUE,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    // Construire la requête de recherche
    const query = {};

    // Recherche textuelle
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtre par catégorie
    if (category) {
      query.categorie = category;
    }

    // Filtre par prix
    query.prix = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };

    // Filtre pour les produits en stock seulement
    if (req.query.inStock === 'true') {
      query.nombreDisponible = { $gt: 0 };
    }

    // Configuration du tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête avec pagination
    const produits = await ProduitsModel.find(query)
      .populate('categorie')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total pour la pagination
    const totalProducts = await ProduitsModel.countDocuments(query);

    // Ajouter l'URL complète pour les images
    const produitsWithImages = produits.map(produit => {
      const produitObj = produit.toObject();
      if (produitObj.image) {
        produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
      }
      if (produitObj.images && produitObj.images.length > 0) {
        produitObj.imageUrls = produitObj.images.map(img => 
          `${req.protocol}://${req.get('host')}/uploads/${img}`
        );
      }
      return produitObj;
    });

    res.status(200).json({
      products: produitsWithImages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts: totalProducts,
        hasNextPage: skip + parseInt(limit) < totalProducts,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error("Erreur lors de la recherche des produits :", err);
    res.status(500).json({ error: "Erreur serveur, impossible de rechercher les produits" });
  }
};


// Fonction pour la récupération des produits par catégorie
module.exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { 
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    if (!ObjectID.isValid(categoryId)) {
      return res.status(400).json({ error: "ID de catégorie invalide" });
    }

    // Configuration du tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les produits par catégorie
    const produits = await ProduitsModel.find({ categorie: categoryId })
      .populate('categorie')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total
    const totalProducts = await ProduitsModel.countDocuments({ categorie: categoryId });

    // Ajouter l'URL complète pour les images
    const produitsWithImages = produits.map(produit => {
      const produitObj = produit.toObject();
      if (produitObj.image) {
        produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
      }
      if (produitObj.images && produitObj.images.length > 0) {
        produitObj.imageUrls = produitObj.images.map(img => 
          `${req.protocol}://${req.get('host')}/uploads/${img}`
        );
      }
      return produitObj;
    });

    res.status(200).json({
      products: produitsWithImages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts: totalProducts,
        hasNextPage: skip + parseInt(limit) < totalProducts,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des produits par catégorie :", err);
    res.status(500).json({ error: "Erreur serveur, impossible de récupérer les produits" });
  }
};


// Fonction pour la récupération d'un produit par ID
module.exports.getProductById = async (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(400).json({ error: "ID invalide : " + id });
  }

  try {
    const produit = await ProduitsModel.findById(id).populate('categorie');
    
    if (!produit) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const produitObj = produit.toObject();
    if (produitObj.image) {
      produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
    }
    if (produitObj.images && produitObj.images.length > 0) {
      produitObj.imageUrls = produitObj.images.map(img => 
        `${req.protocol}://${req.get('host')}/uploads/${img}`
      );
    }

    res.status(200).json(produitObj);
  } catch (err) {
    console.error("Erreur lors de la récupération du produit :", err);
    res.status(500).json({ error: "Erreur serveur, impossible de récupérer le produit" });
  }
};


// Fonction pour l'ajout d'un produit
module.exports.addProduct = async (req, res) => {
  try {
    if (
      !req.body.nom ||
      !req.body.description ||
      !req.body.categorie ||
      !req.body.prix ||
      !req.body.nombreDisponible
    ) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const productData = {
      nom: req.body.nom,
      description: req.body.description,
      categorie: req.body.categorie,
      prix: req.body.prix,
      ancienPrix: req.body.ancienPrix || null,
      nombreDisponible: req.body.nombreDisponible,
      images: req.body.images || []
    };


    // Ajouter l'image si elle existe
    if (req.file) {
      productData.image = req.file.filename;
    }

    const newProduit = new ProduitsModel(productData);
    const savedProduit = await newProduit.save();
    
    // Peupler la catégorie pour la réponse
    await savedProduit.populate('categorie');
    
    // Ajouter l'URL complète pour l'image (comme dans getAllProduct)
    const produitObj = savedProduit.toObject();
    if (produitObj.image) {
      produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
    }
    if (produitObj.images && produitObj.images.length > 0) {
      produitObj.imageUrls = produitObj.images.map(img => 
        `${req.protocol}://${req.get('host')}/uploads/${img}`
      );
    }
    
    res.status(201).json(produitObj);
  } catch (err) {
    console.error("Erreur lors de l'ajout du produit :", err);
    res.status(500).json({ error: "Erreur serveur, impossible d'ajouter le produit" });
  }
};


// Fonction pour la mise à jour d'un produit
module.exports.updatedProduct = async (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(400).json({ error: "ID invalide : " + id });
  }

  try {
    const existingProduct = await ProduitsModel.findById(id);
    
    if (!existingProduct) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const updateData = { ...req.body };


    // Gestion de l'image
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (existingProduct.image) {
        deleteFile(existingProduct.image);
      }
      updateData.image = req.file.filename;
    }

    const updatedProduit = await ProduitsModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('categorie');

    // Ajouter l'URL complète pour l'image (comme dans getAllProduct)
    const produitObj = updatedProduit.toObject();
    if (produitObj.image) {
      produitObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${produitObj.image}`;
    }
    if (produitObj.images && produitObj.images.length > 0) {
      produitObj.imageUrls = produitObj.images.map(img => 
        `${req.protocol}://${req.get('host')}/uploads/${img}`
      );
    }

    res.status(200).json(produitObj);
  } catch (err) {
    console.error("Erreur lors de la mise à jour :", err);
    res.status(500).json({ error: "Erreur serveur, mise à jour impossible" });
  }
};


// Fonction pour la suppression d'un produit
module.exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(400).json({ error: "ID invalide : " + id });
  }

  try {
    const deleteProduit = await ProduitsModel.findById(id);

    if (!deleteProduit) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    // Supprimer l'image associée
    if (deleteProduit.image) {
      deleteFile(deleteProduit.image);
    }

    // Supprimer les images multiples s'il y en a
    if (deleteProduit.images && deleteProduit.images.length > 0) {
      deleteProduit.images.forEach(image => {
        deleteFile(image);
      });
    }

    await ProduitsModel.findByIdAndDelete(id);

    res.status(200).json({ message: "Produit supprimé avec succès" });
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    res.status(500).json({ error: "Erreur serveur, suppression impossible" });
  }
};


// Fonction pour upload d'image seule (sans créer de produit)
module.exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: "Image uploadée avec succès",
      filename: req.file.filename,
      imageUrl: imageUrl
    });
  } catch (err) {
    console.error("Erreur lors de l'upload :", err);
    res.status(500).json({ error: "Erreur serveur, upload impossible" });
  }
};


// Fonction pour ajouter plusieurs produits en une fois (bulk insert)
module.exports.addBulkProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Un tableau de produits est requis" });
    }

    // Valider chaque produit
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const nom = product.name || product.nom;
      const description = product.description || product.name;
      const prix = product.price || product.new_price || product.prix;
      
      if (!nom || !description || !prix) {
        return res.status(400).json({ 
          error: `Produit ${i + 1}: nom (${nom}), description (${description}) et prix (${prix}) sont requis`,
          received: product
        });
      }
    }

    // Importer le modèle Category
    const CategoryModel = require('../models/categoryModel');

    // Récupérer toutes les catégories uniques des produits
    const uniqueCategories = [...new Set(products.map(p => p.category || p.categorie))];
    
    // Créer ou récupérer les catégories
    const categoryMap = {};
    for (const categoryName of uniqueCategories) {
      if (categoryName) {
        let category = await CategoryModel.findOne({ name: categoryName });
        if (!category) {
          category = await CategoryModel.create({ name: categoryName });
        }
        categoryMap[categoryName] = category._id;
      }
    }

    // Transformer les données pour correspondre au modèle
    const productsToInsert = products.map(product => ({
      nom: product.name || product.nom,
      description: product.description || product.name,
      prix: product.price || product.new_price || product.prix,
      ancienPrix: product.old_price || product.ancienPrix,
      nombreDisponible: product.stock || product.nombreDisponible || 10,
      image: product.image_url || product.image,
      categorie: categoryMap[product.category || product.categorie] || null
    }));

    // Insérer tous les produits
    const insertedProducts = await ProduitsModel.insertMany(productsToInsert);

    res.status(201).json({
      message: `${insertedProducts.length} produits ajoutés avec succès`,
      products: insertedProducts,
      categories: Object.keys(categoryMap)
    });
  } catch (err) {
    console.error("Erreur lors de l'ajout en bulk :", err);
    res.status(500).json({ 
      error: "Erreur serveur, impossible d'ajouter les produits",
      details: err.message 
    });
  }
};


// Fonction pour récupérer les produits populaires
module.exports.getPopularProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Récupérer les produits triés par stock décroissant (plus populaires)
    const popularProducts = await ProduitsModel.find()
      .populate('categorie')
      .sort({ nombreDisponible: -1 }) // Trier par stock décroissant
      .limit(limit);

    // Ajouter les URLs des images
    const productsWithImages = popularProducts.map(product => {
      const productObj = product.toObject();
      if (productObj.image) {
        productObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${productObj.image}`;
      }
      return productObj;
    });

    res.status(200).json(productsWithImages);
  } catch (err) {
    console.error("Erreur lors de la récupération des produits populaires :", err);
    res.status(500).json({ 
      error: "Erreur serveur, impossible de récupérer les produits populaires" 
    });
  }
};


// Fonction pour récupérer les nouveaux produits
module.exports.getNewProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Récupérer les produits triés par date de création décroissante
    const newProducts = await ProduitsModel.find()
      .populate('categorie')
      .sort({ date: -1 }) // Trier par date décroissante
      .limit(limit);

    // Ajouter les URLs des images
    const productsWithImages = newProducts.map(product => {
      const productObj = product.toObject();
      if (productObj.image) {
        productObj.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${productObj.image}`;
      }
      return productObj;
    });

    res.status(200).json(productsWithImages);
  } catch (err) {
    console.error("Erreur lors de la récupération des nouveaux produits :", err);
    res.status(500).json({ 
      error: "Erreur serveur, impossible de récupérer les nouveaux produits" 
    });
  }
};


// Fonction pour récupérer le nombre total de produits
module.exports.totalProducts = async (req, res) => {
  try {
    const productCount = await ProduitsModel.countDocuments();
    res.status(200).json({ count: productCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
