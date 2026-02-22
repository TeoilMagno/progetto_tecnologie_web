require('dotenv').config();
const mongoose = require('mongoose');
const dbURI = process.env.DB_URI;

const connectDB = async () => {
  mongoose.connect(dbURI)
   .then((result) => {
      console.log("connected to db");
 })
 .catch((err) => console.log(err));
};

module.exports = connectDB;
