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
      ref: 'Museum',
      required: true
    }],
    bio: { type: String }, // Biografia scritta dal curatore
    bd: { type: String },  // Birth and Death 
    studies: { type: String }, // Formazione/Studi
    mainWorks: { type: String }
  }]
});

module.exports = mongoose.model('Author', authorSchema);