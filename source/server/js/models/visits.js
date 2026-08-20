const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    museumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum', required: true },
    // l'autore della visita (curatore o visitatore)
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // l'ordine nell'array definisce l'ordine del tour.
    works: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Work'
    }],
    price: { type: Number, default: 0 },
    isDraft: { type: Boolean, default: true }, // Per gestire le bozze
    isPublic: { type: Boolean, default: false }, // true = pubblica sul marketplace, false = privata
    duration: { type: Number, default: 0 }, // Durata stimata in minuti
    language: { type: String, default: 'it' },
    coverImage: { type: String }, // Immagine di anteprima per la card nel marketplace
    
    // registro della visita -> calcolato dinamicamente alla creazione e durante l'esecuzione della visita
    preferredLength: {
        type: String,
        enum: ['short', 'medium', 'long', 'exhaustive'],
        default: 'medium'
    },

    // standard -> visita libera
    visitType: { 
        type: String, 
        enum: ['standard', 'custom'], 
        default: 'custom' // Tutte le visite create dagli utenti saranno 'custom'
    },

    targetAudience: { 
      type: [String], 
      enum: ['kids', 'families', 'adults', 'schools', 'all']
    },

    accessibility: [{ 
        type: String, 
        enum: [
            'wheelchair_accessible', 
            'blind_friendly', 
            'deaf_friendly', 
            'dsa_friendly', 
            'sensory_friendly', 
            'none'
        ]
    }],
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);