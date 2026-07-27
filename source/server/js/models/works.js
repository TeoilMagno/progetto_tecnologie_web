//schema che definisce le opere in esposizione
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workSchema = new Schema({
  name: {
    type: String,
    required: true
  },

  author: {
    type: String,
    required: true
  },

  style: {
    type: String,
    required: true
  },

  year: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  description: {
    type: [{
      lenght: Number,
      tone: String,
      description: String,
    }],
    required: true
  }
});

const Work = mongoose.model('Work', workSchema, 'Works');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Work;
