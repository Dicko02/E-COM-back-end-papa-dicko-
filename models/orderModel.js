const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Produit unique (ancien schéma - compatible avec tout le projet)
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },

    customerEmail: {
      type: String,
    },

    customerPhone: {
      type: String,
    },

    customerInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      userId: String,
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

    waveSessionId: {
      type: String,
      required: false
    },

    paymentDate: {
      type: Date
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
