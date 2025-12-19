const http = require('http');
const express = require('express');
const Users = require('./models/models');

const app = express();

const server = http.createServer((req, res) => {
  //console.log(req.url, req.method);

  res.setHeader('Content-Type', 'text/plain');
  res.write('Hello world');
  res.end();
})

const mongoose = require('mongoose');
const dbURI = process.env.DB_URI;

 mongoose.connect(dbURI)
   .then((result) => {
     server.listen(3000, 'localhost', () => {
       console.log('listening on port 3000');
     })
   console.log("connected to db");
 })
 .catch((err) => console.log(err));

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
//   .then((result) => {
//     res.send(result);
//   })
//   .catch((err) => {
//       console.log(err);
//     })
// })
