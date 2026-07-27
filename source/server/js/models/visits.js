const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    museum: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum', required: true },
    // l'autore della visita (curatore o visitatore)
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // l'ordine nell'array definisce l'ordine del tour.
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    price: { type: Number, default: 0 },
    isDraft: { type: Boolean, default: true }, // Per gestire le bozze
    isPublic: { type: Boolean, default: false }, // true = pubblica sul marketplace, false = privata
    duration: { type: Number }, // Durata stimata in minuti
    language: { type: String, default: 'it' },
    coverImage: { type: String } // Immagine di anteprima per la card nel marketplace
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);