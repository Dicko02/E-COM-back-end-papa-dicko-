const ProduitsModel = require("../models/produitsModel");
const ObjectID = require("mongoose").Types.ObjectId;
const { deleteFile } = require("../middleware/upload");


// --- HELPERS CENTRALISÉS ---
const getImageUrl = (image, req) => {
  if (!image) return null;

  // CAS 1 : Déjà une URL complète (Cloudinary via req.file.path)
  if (image.startsWith('http')) {
    return image;
  }

  // CAS 2 : Chemin Cloudinary partiel (Wayne Enterprize)
  if (image.includes('wayne-enterprize')) {
    // REMPLACE 'ton_cloud_name' par ton vrai nom Cloudinary
    return `https://res.cloudinary.com/ton_cloud_name/image/upload/${image}`;
  }

  // CAS 3 : Fichier local (Dossier /uploads/)
  return `${req.protocol}://${req.get('host')}/uploads/${image}`;
};

const addImageUrls = (produit, req) => {
  const produitObj = produit.toObject ? produit.toObject() : produit;
  
  if (produitObj.image) {
    produitObj.imageUrl = getImageUrl(produitObj.image, req);
  }
  
  if (produitObj.images && produitObj.images.length > 0) {
    produitObj.imageUrls = produitObj.images.map(img => getImageUrl(img, req));
  }
  
  return produitObj;
};



// --- FONCTIONS DU CONTRÔLEUR ---
module.exports.getAllProduct = async (req, res) => {
  try {
    const produits = await ProduitsModel.find().populate('categorie');
    const produitsWithImages = produits.map(produit => addImageUrls(produit, req));
    res.status(200).json(produitsWithImages);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};


module.exports.searchProducts = async (req, res) => {
  try {
    const { search = '', category = '', minPrice = 0, maxPrice = Number.MAX_VALUE, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 12 } = req.query;
    const query = {};

    if (search) {
      query.$or = [{ nom: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }
    if (category) query.categorie = category;
    query.prix = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
    if (req.query.inStock === 'true') query.nombreDisponible = { $gt: 0 };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const produits = await ProduitsModel.find(query).populate('categorie').sort(sortOptions).skip(skip).limit(parseInt(limit));
    const totalProducts = await ProduitsModel.countDocuments(query);

    // ✅ Utilisation du helper centralisé ici aussi
    const productsWithImages = produits.map(produit => addImageUrls(produit, req));

    res.status(200).json({
      products: productsWithImages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts: totalProducts
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur recherche" });
  }
};


module.exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!ObjectID.isValid(categoryId)) return res.status(400).json({ error: "ID invalide" });

    const produits = await ProduitsModel.find({ categorie: categoryId }).populate('categorie');
    const produitsWithImages = produits.map(produit => addImageUrls(produit, req));

    res.status(200).json({ products: produitsWithImages });
  } catch (err) {
    res.status(500).json({ error: "Erreur catégorie" });
  }
};


module.exports.getProductById = async (req, res) => {
  const { id } = req.params;
  if (!ObjectID.isValid(id)) return res.status(400).json({ error: "ID invalide" });

  try {
    const produit = await ProduitsModel.findById(id).populate('categorie');
    if (!produit) return res.status(404).json({ error: "Produit non trouvé" });

    res.status(200).json(addImageUrls(produit, req));
  } catch (err) {
    res.status(500).json({ error: "Erreur produit" });
  }
};


module.exports.addProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    if (req.file) productData.image = req.file.path || req.file.filename;

    const newProduit = new ProduitsModel(productData);
    const savedProduit = await newProduit.save();
    await savedProduit.populate('categorie');
    
    res.status(201).json(addImageUrls(savedProduit, req));
  } catch (err) {
    res.status(500).json({ error: "Erreur ajout" });
  }
};


module.exports.updatedProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const existingProduct = await ProduitsModel.findById(id);
    const updateData = { ...req.body };

    if (req.file) {
      if (existingProduct.image) await deleteFile(existingProduct.image);
      updateData.image = req.file.path || req.file.filename;
    }

    const updatedProduit = await ProduitsModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate('categorie');
    res.status(200).json(addImageUrls(updatedProduit, req));
  } catch (err) {
    res.status(500).json({ error: "Erreur update" });
  }
};


module.exports.getPopularProducts = async (req, res) => {
  try {
    const popularProducts = await ProduitsModel.find().populate('categorie').sort({ nombreDisponible: -1 }).limit(10);
    res.status(200).json(popularProducts.map(p => addImageUrls(p, req)));
  } catch (err) {
    res.status(500).json({ error: "Erreur populaires" });
  }
};


module.exports.getNewProducts = async (req, res) => {
  try {
    const newProducts = await ProduitsModel.find().populate('categorie').sort({ date: -1 }).limit(10);
    res.status(200).json(newProducts.map(p => addImageUrls(p, req)));
  } catch (err) {
    res.status(500).json({ error: "Erreur nouveaux" });
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
      await deleteFile(deleteProduit.image);
    }

    // Supprimer les images multiples s'il y en a
    if (deleteProduit.images && deleteProduit.images.length > 0) {
      for (const image of deleteProduit.images) {
        await deleteFile(image);
      }
    }

    await ProduitsModel.findByIdAndDelete(id);

    res.status(200).json({ message: "Produit supprimé avec succès" });
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    res.status(500).json({ error: "Erreur serveur, suppression impossible" });
  }
};


module.exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    // Avec Cloudinary, req.file.path contient l'URL complète
    const imageUrl = req.file.path || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.status(200).json({
      message: "Image uploadée avec succès",
      filename: req.file.filename || req.file.path,
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


// Fonction pour récupérer le nombre total de produits
module.exports.totalProducts = async (req, res) => {
  try {
    const productCount = await ProduitsModel.countDocuments();
    res.status(200).json({ count: productCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
