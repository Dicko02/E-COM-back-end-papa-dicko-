const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Produit'
        },
        quantity: {
            type: Number,
            default: 1
        }
    }]
});

module.exports = mongoose.model('Chart', chartSchema);
