//schema che definisce i musei per la lista iniziale del marketplace
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const museumSchema = new Schema({
<<<<<<< HEAD:models/museums.js
  name: {
=======
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
>>>>>>> matteo:js/models/museums.js
    type: String,
    required: true
  },

<<<<<<< HEAD:models/museums.js
  address: {
=======
  image: {
>>>>>>> matteo:js/models/museums.js
    type: String,
    required: true
  },

<<<<<<< HEAD:models/museums.js
  image: {
    type: String,
    required: true
  },

=======
>>>>>>> matteo:js/models/museums.js
  tags: {
    type: [String],
    trim: true
  }
});

const Museum = mongoose.model('Museum', museumSchema, 'Museums');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Museum;
