// schema che definisce le adozioni delle opere da un museo all'altro
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adoptionSchema = new Schema({
  fromMuseumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  },

  toMuseumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  },

  fromCuratorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  toCuratorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  beginDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  workId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    required: true
  },

  status: { 
    type: String, 
    enum: ['pending', 'completed', 'accepted', 'refused' ]
    //pending: è stata fatta richiesta al curatore che possiede l'opera
    //accepted: la richiesta di adozione è stata accetta, status rimane accepted fino a fine adozione, quindi fino a endDate
    //refused: la richiesta di adozione è stata rifiutata
    //completed: dopo endDate, il curatore segna manualmente l'adozione come completata quando l'opera torna al museo che l'ha prestata
  }
});

const Adoption = mongoose.model('Adoption', adoptionSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Adoption;
