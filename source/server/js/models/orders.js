const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 }
});

const orderVisitSchema = new mongoose.Schema({
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  title: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [orderItemSchema],     // Fotografia degli oggetti fisici/servizi del bookshop
  visits: [orderVisitSchema],   // Fotografia delle visite guidate acquistate
  totalAmount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['completed', 'pending', 'cancelled'], 
    default: 'completed' 
  }
}, { timestamps: true }); // Aggiunge automaticamente createdAt e updatedAt

// Indice per velocizzare la ricerca degli ordini per utente
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
