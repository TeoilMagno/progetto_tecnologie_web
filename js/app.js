//const dotenv = 
require('dotenv').config();
const express = require('express');
const User = require('../models/models');

const app = express();
app.use(express.json());

const mongoose = require('mongoose');
const dbURI = process.env.DB_URI;

app.get('/add-user', (req, res) => {
  console.log("request arrived");

  const user = new User({
    ID: '0',
    Name: 'User0',
    Surname: 'Prova',
    Email: 'user0@prova.es',
    Password: 'dajeRoma123'
  });

  user.save()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
        console.log(err);
      })
});

 mongoose.connect(dbURI)
   .then((result) => {
     app.listen(3000, 'localhost', () => {
       console.log('listening on port 3000');
     })
   console.log("connected to db");
 })
 .catch((err) => console.log(err));
