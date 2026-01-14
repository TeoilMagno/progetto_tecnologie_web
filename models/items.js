
//schema che definisce i musei per la lista iniziale del marketplace
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemSchema = new Schema({
  Name: {
    type: String,
    required: true
  },

  Price: {
    type: Number,
    required: true
  },

  Description: {
    type: String,
    required: true
  },

  Image: {
    type: String,
    required: true
  },

  Museum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  }
});

const Museum = mongoose.model('Item', ItemSchema, 'Items');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Items;
