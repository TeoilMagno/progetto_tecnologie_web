//schema che definisce le varie sezioni/stanze del museo
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. Schema per la forma svg (riutilizzabile sia per Sezioni che per Stanze)
const shapeSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['polygon', 'polyline', 'path'] //per ora si accettano questi 3 valori
  },

  points: {
    type: String, //usato da polygon e polyline
  },

  d: {
    type: String  // Utilizzato da path
  }
}, { _id: false }); // Disabilitiamo l'_id qui perché è solo un sotto-oggetto geometrico

const roomSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  color: {
    type: String,
    required: true
  },

  shape: {
    type: shapeSchema, //usa shapeSchema definito sopra
    required: true
  }
});

const sectionSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  color: {
    type: String,
  },

  shape: {
    type: shapeSchema,  //usa shapeSchema definito sopra
  },

  rooms: [roomSchema], //array di stanze, usato per la rappresentazione specifica della sezione con svg

  image: {
    type: String,
    required: true
  },

  works: [
    {
      work: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Work'
      },

      x: {
        type: Number
      },

      y: {
        type: Number
      }
    }
  ],

  museumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  }
});

const Section = mongoose.model('Section', sectionSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Section;
