const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Salveremo l'hash, non il testo in chiaro
  role: { 
    type: String, 
    enum: ['curator', 'client'], 
    default: 'client' 
  },
  preferences: {
    favorite_styles: [String], // stili preferiti in base alle opere visitate
    visit_history: [mongoose.Schema.Types.ObjectId] // array delle opere gia' visitate in precedenza dall'utente
  }
});

module.exports = mongoose.model('User', userSchema);