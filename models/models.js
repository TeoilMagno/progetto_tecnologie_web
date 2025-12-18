//definiamo lo schema che dovrà seguire una certa collezione
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  ID: Number,
  Name: String,
  Surname: String,
  Login: {
    Email: String,
    Password: String
  }
});

//Users corrisponde al nome della collezione creata nel mio databate "Esempio"
//nel cluster progettoTecWeb
//qui infine diciamo a mongodb che la collezione Users avrà come Schema dei dati contenuti
//quello sopra definito
const Users = mongoose.model('Users',userSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Users;
