//schema che definisce i musei per la lista iniziale del marketplace
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const servicesSchema = new Schema({
  services: {
    type: String,
    enum: ['bathrooms','cafe','restaurant','bookshop','cloakroom','info_desk','elevator','ramp','seating_area','first_aid','parking']
  }
});

const museumSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  address: {
    type: String,
    required: true
  },

  // per i filtri
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },

  contact_email: {
    type: String,
    required: true
  },

  contact_phone: {
    type: String,
    required: true
  },

  sections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  }],

  image: {
    type: String,
    required: true
  },

  tags: {
    type: [String],
    trim: true
  },

  ticketPrice: { type: Number, default: 0 },

  // I servizi offerti a livello generale (piu' facile da filtrare di facilities)
  services: [{
    type: servicesSchema,
  }],

  // Mappatura geometrica dei servizi sulla mappa SVG (Simile alle opere nelle sezioni)
  // Se un servizio non e' fisico, i relativi campi saranno impostati a null
  facilities: [{
    roomId: { type: Schema.Types.ObjectId },
    serviceType: {
      type: servicesSchema,
    },
    x: { type: Number },
    y: { type: Number },
    inSection: {
      sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
      x: { type: Number },
      y: { type: Number }
    }
  }],

  accessibility: [{
    type: String,
    enum: [
      'wheelchair_accessible', 
      'blind_friendly', 
      'deaf_friendly', 
      'dsa_friendly', 
      'sensory_friendly', 
      'none'
    ],
    default: ['none']
  }],

  // Orari di apertura strutturati giorno per giorno
  schedule: [{
    day: { 
      type: String, 
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] 
    },
    hours: { type: String, trim: true, default: "" } // Es. "09:00 - 18:00"
  }],
});

const Museum = mongoose.model('Museum', museumSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Museum;
