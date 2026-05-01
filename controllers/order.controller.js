const Order = require("../models/orderModel");
const ProduitsModel = require("../models/produitsModel");
const User = require("../models/user.model");
const CategoryModel = require("../models/categoryModel");
const {sendConfirmationEmail} = require("../utils/orderMailer");


// Fonction pour la récupération de toutes les commandes
module.exports.viewAllOrder = async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des commandes", error });
  }
};


// Fonction pour la récupération d'une commande par ID
module.exports.viewOneOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération de la commande",
      error,
    });
  }
};


// Fonction pour la suppression d'une commande
module.exports.deleteOneOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }
    res.status(200).json({ message: "Commande supprimée", order: deletedOrder });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de la commande", error });
  }
};


// Fonction pour la mise à jour d'une commande
module.exports.updateOneOrder = async (req, res) => {
  try {
    const { product, quantity, customerEmail } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { product, quantity, customerEmail },
      { new: true, runValidators: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }
    res.status(200).json({ message: "Commande mise à jour", order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de la commande", error });
  }
};


// Fonction pour la récupération de toutes les commandes
module.exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.produitId', 'nom prix image')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des commandes' });
  }
};


// Fonction pour la récupération des commandes d'un utilisateur spécifique
module.exports.getUserOrders = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email utilisateur requis' });
    }

    // Un client ne peut voir que ses propres commandes
    if (req.user.role !== 'admin' && req.user.email !== email) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const orders = await Order.find({ customerEmail: email })
      .populate('items.produitId', 'nom prix image description')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders: orders
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des commandes' });
  }
};


// Fonction pour la création d'une nouvelle commande complète
module.exports.createOrder = async (req, res) => {
  try {
    const { produitId, quantity, customerEmail, customerInfo } = req.body;

    // Validation des champs requis
    if (!produitId || !quantity || !customerEmail || !customerInfo) {
      return res.status(400).json({ 
        error: 'Produit ID, quantité, email client et informations client requis' 
      });
    }

    // Vérifier si le produit existe
    const produit = await ProduitsModel.findById(produitId);
    if (!produit) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Vérifier le stock disponible
    if (produit.nombreDisponible < quantity) {
      return res.status(400).json({ error: 'Stock insuffisant' });
    }

    // Calculer le total de la commande
    const totalAmount = produit.prix * quantity;

    // ✨ CHANGEMENT: Créer une commande avec items array
    const order = new Order({
      items: [
        {
          produitId: produit._id,
          quantity,
          price: produit.prix,
          subtotal: totalAmount
        }
      ],
      customerEmail,
      customerInfo,
      totalAmount,
      status: 'pending'
    });

    // Mettre à jour le stock du produit
    produit.nombreDisponible -= quantity;
    await produit.save();

    // Sauvegarde de la commande
    const savedOrder = await order.save();

    // 1. On prépare les données au format attendu par le mailer (un tableau d'objets)
    const orderItemsForEmail = [
      {
        produitId: { nom: produit.nom }, // On simule la structure de l'objet peuplé
        quantity: quantity,
        totalAmount: totalAmount // Le prix total pour cet article
      }
    ];

    // 2. On appelle la fonction avec les 4 arguments requis
    // On utilise savedOrder._id comme transactionId si tu n'en as pas encore de réel
    await sendConfirmationEmail(
      customerEmail, 
      orderItemsForEmail, 
      totalAmount, 
      savedOrder._id.toString() 
    );

    res.status(201).json({
      success: true,
      order: savedOrder,
      message: 'Commande créée avec succès et email envoyé'
    });

  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la commande' });
  }
};


// Fonction pour la récupération d'une commande spécifique
module.exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('items.produitId', 'nom prix image description');
    
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Un client ne peut voir que ses propres commandes
    if (req.user.role !== 'admin' && order.customerEmail !== req.user.email) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    res.status(200).json({
      success: true,
      order: order
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de la commande' });
  }
};


// Fonction pour récupérer toutes les commandes d'une session Wave (multi-produits)
module.exports.getOrdersByWaveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID requis' });
    }

    const orders = await Order.find({ waveSessionId: sessionId })
      .populate('produitId', 'nom prix imageUrl description');
    
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Aucune commande trouvée pour cette session' });
    }

    // SÉCURITÉ : Vérifier que l'utilisateur a le droit de voir ces commandes
    // Un utilisateur ne peut voir que ses propres commandes (sauf admin)
    if (req.user.role !== 'admin') {
      // Vérifier par userId (plus robuste qu'email qui peut changer)
      const userId = req.user._id.toString();
      const allBelongToUser = orders.every(
        order => order.customerInfo?.userId?.toString() === userId
      );
      
      // Fallback sur email si userId n'existe pas (anciennes commandes)
      if (!allBelongToUser) {
        const userEmail = req.user.email;
        const allBelongToUserByEmail = orders.every(
          order => order.customerEmail === userEmail
        );
        
        if (!allBelongToUserByEmail) {
          return res.status(403).json({ error: 'Accès refusé - Ces commandes ne vous appartiennent pas' });
        }
      }
    }

    // Calculer le total
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    res.status(200).json({
      success: true,
      orders: orders,
      totalAmount: totalAmount,
      orderCount: orders.length,
      customerEmail: orders[0].customerEmail,
      paymentStatus: orders[0].paymentStatus,
      status: orders[0].status
    });
  } catch (error) {
    console.error('Erreur getOrdersByWaveSession:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des commandes' });
  }
};


// Fonction pour la mise à jour du statut d'une commande
module.exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Statut requis' });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    if (status === 'shipped') {
      updateData.shippingDate = new Date();
    } else if (status === 'delivered') {
      updateData.deliveryDate = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).populate('items.produitId', 'nom prix image');
    
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    
    res.status(200).json({
      success: true,
      order: order,
      message: 'Statut de la commande mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du statut' });
  }
};


// Fonction pour l'annulation d'une commande
module.exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Vérifier si la commande peut être annulée
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cette commande ne peut pas être annulée' 
      });
    }

    // Un client ne peut annuler que ses propres commandes
    if (req.user.role !== 'admin' && order.customerEmail !== req.user.email) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Sauvegarder le statut original AVANT de l'écraser
    const previousStatus = order.status;

    // Mettre à jour le statut
    order.status = 'cancelled';
    await order.save();

    // Restaurer le stock si la commande était déjà en cours de traitement
    if (['confirmed', 'processing', 'shipped'].includes(previousStatus)) {
      for (const item of order.items) {
        const produit = await ProduitsModel.findById(item.produitId);
        if (produit) {
          produit.nombreDisponible += item.quantity;
          await produit.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      order: order,
      message: 'Commande annulée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'annulation de la commande' });
  }
};


// Fonction pour l'obtention des statistiques des commandes
module.exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const recentOrders = await Order.find()
      .populate('items.produitId', 'nom prix')
      .sort({ createdAt: -1 })
      .limit(10);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentOrders,
        ordersByStatus
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};


// Fonction pour la création d'une commande avec panier complet
module.exports.createCartOrder = async (req, res) => {
  try {
    const { clientId, cartItems, customerInfo, totalAmount } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Articles du panier requis' 
      });
    }

    if (!customerInfo || !customerInfo.email) {
      return res.status(400).json({ 
        error: 'Informations client et email requis' 
      });
    }

    // Vérifier et mettre à jour le stock pour chaque produit
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of cartItems) {
      const produit = await ProduitsModel.findById(item.productId || item.product._id);
      
      if (!produit) {
        return res.status(404).json({ 
          error: `Produit non trouvé: ${item.productId || item.product._id}` 
        });
      }

      if (produit.nombreDisponible < item.quantity) {
        return res.status(400).json({ 
          error: `Stock insuffisant pour ${produit.nom}: ${produit.nombreDisponible} disponible(s)` 
        });
      }

      const itemTotal = produit.prix * item.quantity;
      calculatedTotal += itemTotal;

      // Ajouter l'item à la liste
      orderItems.push({
        produitId: produit._id,
        quantity: item.quantity,
        price: produit.prix,
        subtotal: itemTotal
      });

      // Mettre à jour le stock du produit
      await ProduitsModel.findByIdAndUpdate(
        produit._id,
        { $inc: { nombreDisponible: -item.quantity } }
      );
    }

    // ✨ CHANGEMENT: Créer UNE SEULE Order avec les items
    const order = new Order({
      items: orderItems,
      customerEmail: customerInfo.email,
      customerInfo: {
        firstName: customerInfo.prenom,
        lastName: customerInfo.nom,
        email: customerInfo.email,
        phone: customerInfo.number,
        address: customerInfo.address
      },
      totalAmount: calculatedTotal,
      status: 'confirmed',
      paymentStatus: 'completed',
      orderDate: new Date()
    });

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      order: savedOrder,
      message: `Commande créée avec succès (${cartItems.length} article(s))`
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la commande:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la création de la commande',
      details: error.message 
    });
  }
};


// Revenu mensuel de l'année courante
module.exports.getMonthlyRevenue = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Récupérer toutes les commandes de l'année courante (statut delivered ou shipped)
    const orders = await Order.find({
      createdAt: { $gte: new Date(`${currentYear}-01-01`) },
      status: { $in: ['shipped', 'delivered'] }
    });

    // Grouper par mois et calculer les revenus
    const monthlyData = new Array(12).fill(0);
    orders.forEach(order => {
      const month = new Date(order.createdAt).getMonth();
      monthlyData[month] += order.totalAmount;
    });

    // Calculer les objectifs (moyenne + 15%)
    const totalRevenue = monthlyData.reduce((a, b) => a + b, 0);
    const averageRevenue = totalRevenue / monthlyData.filter(m => m > 0).length || 0;
    const targets = monthlyData.map(revenue => 
      Math.floor((revenue > 0 ? revenue : averageRevenue) * 1.15)
    );

    // Formatter la réponse
    const data = months.map((month, idx) => ({
      month,
      revenue: Math.floor(monthlyData[idx]),
      target: targets[idx]
    }));

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du revenu mensuel:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du revenu mensuel' });
  }
};


// Tendances des nouveaux clients (année courante vs année précédente)
module.exports.getCustomerTrends = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Utilisateurs créés cette année
    const currentYearUsers = await User.find({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    // Utilisateurs créés l'année précédente
    const lastYearUsers = await User.find({
      createdAt: {
        $gte: new Date(`${lastYear}-01-01`),
        $lte: new Date(`${lastYear}-12-31`)
      }
    });

    // Compter par mois
    const currentYearCounts = new Array(12).fill(0);
    const lastYearCounts = new Array(12).fill(0);

    currentYearUsers.forEach(user => {
      const month = new Date(user.createdAt).getMonth();
      currentYearCounts[month]++;
    });

    lastYearUsers.forEach(user => {
      const month = new Date(user.createdAt).getMonth();
      lastYearCounts[month]++;
    });

    // Formatter la réponse
    const data = months.map((month, idx) => ({
      month,
      newCustomers: currentYearCounts[idx],
      lastYear: lastYearCounts[idx]
    }));

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tendances client:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des tendances client' });
  }
};


// Statistiques des ventes par catégorie
module.exports.getCategoryStats = async (req, res) => {
  try {
    const categories = await CategoryModel.find();
    const categoryStats = [];
    let totalSales = 0;
    let totalRevenue = 0;

    // Pour chaque catégorie, compter les ventes
    for (const category of categories) {
      // Trouver les produits de cette catégorie
      const products = await ProduitsModel.find({ categorie: category._id });
      const productIds = products.map(p => p._id);

      if (productIds.length === 0) continue;

      // Aggreger les items des commandes contenant ces produits
      const result = await Order.aggregate([
        {
          $match: {
            status: { $in: ['shipped', 'delivered'] }
          }
        },
        {
          $unwind: '$items' // ← Démultiplier les items
        },
        {
          $match: {
            'items.produitId': { $in: productIds }
          }
        },
        {
          $group: {
            _id: null,
            sales: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' }
          }
        }
      ]);

      const sales = result[0]?.sales || 0;
      const revenue = result[0]?.revenue || 0;

      if (sales > 0) {
        categoryStats.push({
          name: category.name,
          value: sales,
          totalRevenue: Math.floor(revenue)
        });

        totalSales += sales;
        totalRevenue += revenue;
      }
    }

    // Convertir en pourcentages et trier
    const data = categoryStats
      .map(cat => ({
        ...cat,
        value: totalSales > 0 ? Math.round((cat.value / totalSales) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);

    res.status(200).json({
      success: true,
      data: data,
      totalSales: totalSales,
      totalRevenue: Math.floor(totalRevenue)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats par catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des stats par catégorie' });
  }
};


// Top 5 produits (par nombre de ventes)
module.exports.getTopProducts = async (req, res) => {
  try {
    // Aggreger les items des commandes par produit
    const productSales = await Order.aggregate([
      {
        $match: {
          status: { $in: ['shipped', 'delivered'] }
        }
      },
      {
        $unwind: '$items' // ← Démultiplier les items
      },
      {
        $group: {
          _id: '$items.produitId',
          sales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 }
    ]);

    // Enrichir avec les infos produit
    const data = [];
    for (const item of productSales) {
      const product = await ProduitsModel.findById(item._id);
      if (product) {
        data.push({
          id: product._id,
          name: product.nom,
          sales: item.sales,
          price: product.prix
        });
      }
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des top produits:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des top produits' });
  }
};


// Répartition des statuts de commande
module.exports.getStatusBreakdown = async (req, res) => {
  try {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const breakdown = {};
    let total = 0;

    // Compter les commandes par statut
    for (const status of statuses) {
      const count = await Order.countDocuments({ status });
      breakdown[status] = count;
      total += count;
    }

    breakdown.total = total;

    res.status(200).json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la répartition des statuts:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de la répartition des statuts' });
  }
};


