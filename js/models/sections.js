//schema che definisce le varie sezioni/stanze del museo
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
  title: {
    type: String,
    required: true
  },

  image: {
    type: Number,
    required: true
  },

  works: [{
    type: mongoose.Schema.Types.ObjectId,
    ref; 'Works'
  }],

  museumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Museum',
    required: true
  }
});

const Section = mongoose.model('Section', itemSchema, 'Sections');

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Section;
