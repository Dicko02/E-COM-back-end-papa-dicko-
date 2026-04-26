const Category = require("../models/categoryModel");

// Fonction pour la création d'une nouvelle catégorie
module.exports.createNewCategory = async (req, res) => {
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    res.status(201).json({ message: "Catégorie créée", category });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la création", error: err.message });
  }
};


// Fonction pour la récupération de toutes les catégories
module.exports.viewAllCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err.message });
  }
};


// Fonction pour la récupération d'une catégorie spécifique
module.exports.viewOneCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const categories = await Category.findById(id);
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err.message });
  }
};


// Fonction pour la mise à jour d'une catégorie spécifique
module.exports.updateOneCategory = async (req, res) => {
  try {
    const id =  req.params.id;
    const categories = await Category.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } 
    );    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err.message });
  }
};


// Fonction pour la suppression d'une catégorie spécifique
module.exports.deleteOneCategory = async (req, res) => {
  try {
    const id =  req.params.id;
    const categories = await Category.findByIdAndDelete(id);
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err.message });
  }
};
