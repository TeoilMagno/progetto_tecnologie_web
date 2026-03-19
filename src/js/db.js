const mongoose = require('mongoose');
const crypto = require('crypto');

const connectDB = async () => {
  const dbURI = process.env.DB_URI;

  await mongoose.connect(dbURI, { serverSelectionTimeoutMS: 5000 }) // tenta la connessione per 5 secondi
   .then((result) => {
      console.log("connected to db");
 })
 .catch((err) => console.log("Db non raggiungibile. Errore: ", err));
};

module.exports = connectDB;
