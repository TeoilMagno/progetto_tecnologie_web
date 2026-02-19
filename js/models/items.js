//schema che definisce gli item in vendita al museo
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  museumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  duration: String,
  
  tone: String
});


const Item = mongoose.model('Item', itemSchema, 'Items');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Item;
