// schema che definisce le opere in esposizione
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  author: {
    type: Schema.Types.ObjectId,
    ref: 'Author',
    required: true
  },

  technique: { // tecnica es. dipinto a olio, scultura, ecc
    type: String,
    required: true
  },

  style: { // riferimento al movimento/stile es. Barocco, Cubismo
    type: Schema.Types.ObjectId,
    ref: 'Style'
  },

  year: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  description: {
    type: [{
      length: Number,
      tone: String,
      description: String,
    }],
    default: []
  },

  funFact: { type: String}, // Curiosità 
  paraphrase: { type: String }, // Parafrasi o spiegazione semplificata dell'opera
  
  museumId: {
    type: Schema.Types.ObjectId,
    ref: 'Museum'
  },

  roomId: {
    type: Schema.Types.ObjectId
  },

  adoptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Adoption'
  },
});

const Work = mongoose.model('Work', workSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Work;
