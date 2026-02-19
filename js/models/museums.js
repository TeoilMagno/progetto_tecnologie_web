//schema che definisce i musei per la lista iniziale del marketplace
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const museumSchema = new Schema({
  museum_data: {
    name: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    contact_email: {
      type: String,
      required: true
    },

    contact_phone: {
      type: String,
      required: true
    }
  },

  sections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  }],

  address: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  tags: {
    type: [String],
    trim: true
  }
});

const Museum = mongoose.model('Museum', museumSchema, 'Museums');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Museum;
