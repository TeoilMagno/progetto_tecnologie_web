//const dotenv = 
require('dotenv').config();
//express router
const express = require('express');
const app = express();
const Router = require('./router');
//mongoose e models per i db
const mongoose = require('mongoose');
const User = require('../models/models');
const dbURI = process.env.DB_URI;

app.use(express.json());
app.use('/', Router)


// app.get('/add-user', (req, res) => {
//   console.log("request arrived");
//
//   const user = new User({
//     ID: '0',
//     Name: 'User0',
//     Surname: 'Prova',
//     Email: 'user0@prova.es',
//     Password: 'dajeRoma123'
//   });
//
//   user.save()
//     .then((result) => {
//       res.send(result);
//     })
//     .catch((err) => {
//         console.log(err);
//       })
// });

 mongoose.connect(dbURI)
   .then((result) => {
     app.listen(3000, 'localhost', () => {
       console.log('listening on port 3000');
     })
   console.log("connected to db");
 })
 .catch((err) => console.log(err));
