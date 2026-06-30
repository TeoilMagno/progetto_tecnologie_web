const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    // Il museo in cui si svolge la visita
    museum: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum', required: true },
    // L'autore della visita (Curatore o Visitatore)
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Array ordinato di opere (Item). L'ordine nell'array definisce l'ordine del tour.
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    price: { type: Number, default: 0 },
    // Per i curatori: true = bozza, false = pubblica sul marketplace. 
    // Per i visitatori: sarà sempre true (o ignorato, in quanto private di default)
    isDraft: { type: Boolean, default: true }, // Per gestire le bozze dei curatori
    duration: { type: Number }, // Durata stimata in minuti
    language: { type: String, default: 'it' },
    coverImage: { type: String } // Immagine di anteprima per la card nel marketplace
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);