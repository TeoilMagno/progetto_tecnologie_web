const express = require('express');
const app = express();
const Router = require('./router');
const connectDB = require('./db.js');

connectDB();

app.use(express.urlencoded({ extended: true })); // form HTML
app.use(express.json());
app.use('/', Router)

app.listen(3000, () => {
  console.log('listening on port: 3000');
})
