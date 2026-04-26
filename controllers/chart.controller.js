const Chart = require('../models/chart.model.js');
const ProduitsModel = require('../models/produitsModel.js');

// Fonction pour la récupération d'un panier par ID client
exports.getChart = async (req, res) => {
    try {
        const chart = await Chart.findOne({ client: req.params.clientId }).populate('products.product');
        if (!chart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }
        
        // Calculer le total
        let totalPrice = 0;
        for (const item of chart.products) {
            totalPrice += item.product.prix * item.quantity;
        }
        
        res.status(200).json({
            ...chart.toObject(),
            totalPrice: totalPrice,
            totalItems: chart.products.reduce((acc, item) => acc + item.quantity, 0)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Fonction pour ajouter un produit au panier
exports.addProductToChart = async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        // Vérifier si le produit existe
        const product = await ProduitsModel.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: "Quantité invalide" });
        }

        // Vérifier la disponibilité du stock
        if (product.nombreDisponible < quantity) {
            return res.status(400).json({ message: 'Stock insuffisant' });
        }

        let chart = await Chart.findOne({ client: req.params.clientId });

        if (chart) {
            // Panier existe, vérifier si le produit est déjà dans le panier

            const productIndex = chart.products.findIndex(
                p => p.product.toString() === productId
            );

            if (productIndex > -1) {
                // Produit existe dans le panier, mettre à jour la quantité
                const newQuantity = chart.products[productIndex].quantity + quantity;
                
                // Vérifier le stock pour la nouvelle quantité
                if (product.nombreDisponible < newQuantity) {
                    return res.status(400).json({ message: 'Stock insuffisant pour cette quantité' });
                }
                
                chart.products[productIndex].quantity = newQuantity;
            } else {
                // Produit n'existe pas dans le panier, ajouter nouveau produit
                chart.products.push({ product: productId, quantity });
            }
            
            chart = await chart.save();
            await chart.populate('products.product');
            return res.status(200).json(chart);
        } else {
            // Pas de panier pour l'utilisateur, créer nouveau panier
            const newChart = await Chart.create({
                client: req.params.clientId,
                products: [{ product: productId, quantity }]
            });
            await newChart.populate('products.product');
            return res.status(201).json(newChart);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Fonction pour la mise à jour de la quantité d'un produit dans le panier
exports.updateProductQuantity = async (req, res) => {
    const { quantity } = req.body;
    
    try {
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: "Quantité invalide" });
        }

        // Vérifier si le produit existe
        const product = await ProduitsModel.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        // Vérifier la disponibilité du stock
        if (product.nombreDisponible < quantity) {
            return res.status(400).json({ message: 'Stock insuffisant' });
        }

        const chart = await Chart.findOne({ client: req.params.clientId });

        if (!chart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        // Trouver le produit dans le panier
        const productId = req.params.productId;
        const productIndex = chart.products.findIndex(
            p => p.product.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produit non trouvé dans le panier' });
        }

        chart.products[productIndex].quantity = quantity;
        await chart.save();
        await chart.populate('products.product');
        
        res.status(200).json(chart);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Fonction pour la suppression d'un produit du panier
exports.removeProductFromChart = async (req, res) => {
    try {
        const chart = await Chart.findOne({ client: req.params.clientId });

        if (!chart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        chart.products = chart.products.filter(p => p.product != req.params.productId);

        await chart.save();
        res.status(200).json({ message: 'Produit supprimé du panier' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Fonction pour vider le panier
exports.clearChart = async (req, res) => {
    try {
        const chart = await Chart.findOne({ client: req.params.clientId });

        if (!chart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        chart.products = [];
        await chart.save();
        
        res.status(200).json({ message: 'Panier vidé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Fonction pour la récupération du total du panier
exports.getChartTotal = async (req, res) => {
    try {
        const chart = await Chart.findOne({ client: req.params.clientId }).populate('products.product');
        
        if (!chart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        let totalPrice = 0;
        let totalItems = 0;

        for (const item of chart.products) {
            totalPrice += item.product.prix * item.quantity;
            totalItems += item.quantity;
        }

        res.status(200).json({
            totalPrice: totalPrice,
            totalItems: totalItems,
            products: chart.products.length
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
