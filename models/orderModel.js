const mongoose = require('mongoose');

// Schéma pour les items dans une commande
const orderItemSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    // Tableau d'items au lieu de produitId simple
    items: [orderItemSchema],

    customerEmail: {
      type: String,
    },

    customerInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        postalCode: String,
        country: String
      }
    },

    paymentIntentId: {
      type: String,
      required: false
    },

    totalAmount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },

    orderDate: {
      type: Date,
      default: Date.now
    },

    shippingDate: {
      type: Date
    },

    deliveryDate: {
      type: Date
    },

    trackingNumber: {
      type: String
    },

    notes: {
      type: String
    }

  },

  {
    timestamps: true
  }
);

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel;

