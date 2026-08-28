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
    maxDuration: { type: Number, default: 0 }, // Tempo a disposizione per la visita (serve per i suggerimenti a fine visita); default 0 significa che non ha limiti di tempo
    coverImage: { type: String }, // Immagine di anteprima per la card nel marketplace
    
    // lunghezza della visita -> calcolato dinamicamente alla creazione e durante l'esecuzione della visita
    preferredLength: {
        type: String,
        enum: ['short', 'medium', 'long', 'exhaustive'],
        default: 'medium'
    },

    // registro della visita -> recuperato dai dati dello user ma puo' essere modificato a piacimento
    expertiseLevel: {
        type: String,
        enum: ['simple', 'medium', 'professional', 'expert'],
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
            'none'
        ]
    }],

    // per insegnanti
    quiz: [{
        question: { type: String, required: true },
        options: [{ type: String, required: true }], // Es. ["Roma", "Milano", "Firenze", "Napoli"]
        correctAnswerIndex: { type: Number, required: true } // L'indice (0, 1, 2, 3) della risposta esatta
    }]
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
