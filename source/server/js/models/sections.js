//schema che definisce le varie sezioni/stanze del museo
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name: { type: String, required: true },
  svgId: { type: String } // Es. "room-162" (utile in futuro se vuoi farle cliccare)
});

const sectionSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String }, 
  
  svgGroupId: { type: String, required: true }, // Es. "section-greca"
  viewBox: { 
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },

  rooms: [roomSchema],
  image: { type: String, required: true },
  museumId: { type: Schema.Types.ObjectId, ref: 'Museum', required: true },
  
  works: [{
    workId: { type: Schema.Types.ObjectId, ref: 'Work' },
    x: { type: Number },
    y: { type: Number }
  }]
});

const Section = mongoose.model('Section', sectionSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Section;
