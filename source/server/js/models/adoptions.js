// schema che definisce le adozioni delle opere da un museo all'altro
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adoptionSchema = new Schema({
});

const Adoption = mongoose.model('Adoption, adoptionSchema);

//esportiamo per rendere il file richiamabile da altri file .js
module.exports = Adoption;
