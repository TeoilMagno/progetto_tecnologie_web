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

  // dobbiamo sapere da dove proviene l'opera
  fromSectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  toSectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },

  status: {
    type: String, 
    enum: ['pending', 'completed', 'accepted', 'refused', 'active' ],
    //pending: è stata fatta richiesta al curatore che possiede l'opera
    //accepted: la richiesta di adozione è stata accetta
    //refused: la richiesta di adozione è stata rifiutata
    //active: all'arrivo dell'opera al museo il curatore segna che e' iniziata l'adozione, status rimane active fino a fine adozione, quindi fino a endDate
    //completed: dopo endDate, il curatore segna manualmente l'adozione come completata quando l'opera torna al museo che l'ha prestata
    default: 'pending'
  }
}, { timestamps: true });

const Adoption = mongoose.model('Adoption', adoptionSchema);
module.exports = Adoption;
