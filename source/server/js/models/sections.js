//schema che definisce le varie sezioni/stanze del museo
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
 * il seguente codice e' utile nel caso si volesse passare alla creazione e al salvataggio
 * di stanze all'interno delle sezioni per fare un posizionamento piu' preciso
 * delle opere

const roomSchema = new Schema({
  name: { type: String, required: true },
  svgId: { type: String } // Es. "room-162" (utile in futuro se vuoi farle cliccare)
});

*/

const sectionSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String },
  
  svgGroupId: { type: String }, // Es. "section-greca"
  viewBox: {
    x: { type: Number },
    y: { type: Number },
    width: { type: Number },
    height: { type: Number }
  },

  // rooms: [roomSchema],
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
