const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const authorSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  data: [{
    museumId: [{ // cosi' piu' musei possono utilizzare la stessa descrizione
      type: Schema.Types.ObjectId,
      ref: 'Museum'
    }],
    bio: {
      type: String,
      required: true
    }, // Biografia scritta dal curatore
    bd: {
      type: String,
      required: true
    },  // Birth and Death 
    studies: {
      type: String,
      required: true
    }, // Formazione/Studi
    mainWorks: {
      type: String,
      required: true
    }
  }]
});

module.exports = mongoose.model('Author', authorSchema);
