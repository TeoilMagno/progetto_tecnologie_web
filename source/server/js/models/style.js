const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const styleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true // es. "Barocco", "Cubismo"
  },
  data: [{
    museumId: [{
      type: Schema.Types.ObjectId,
      ref: 'Museum',
      required: true
    }],
    description: { type: String } // La definizione dello stile secondo il curatore
  }]
});

module.exports = mongoose.model('Style', styleSchema);