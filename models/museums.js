//schema che definisce i musei per la lista iniziale del marketplace
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const museumSchema = new Schema({
  Name: {
    type: String,
    required: true
  },

  Address: {
    type: String,
    required: true
  },

  Image: {
    type: String,
    required: true
  },

  Tags: {
    type: [String],
    trim: true
  }
});

const Museum = mongoose.model('Museum', museumSchema, 'Museums');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Museum;
