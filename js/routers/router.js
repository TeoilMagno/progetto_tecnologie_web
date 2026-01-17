const express = require('express');
const path = require('path');

const {saveMuseum, getAllMuseums} = require ('../controllers/museums.js')
const router = express.Router();

//index
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE HTML>
    <head>
      <title>Art Around</title>
    </head>
    <body>
      <h1>Main page of Art Around</h1>
      <a href="./Marketplace">Marketplace</a>
      <a href="./Navigator">Navigator</a>
    </body>
    `);
});

//Marketplace
router.get('/Marketplace', (req, res) => {
  res.send(`
    <!DOCTYPE HTML>
    <head>
      <title>Art Around Marketplace</title>
    </head>
    <body>
      <h1>Marketplace of Art Around</h1>
      <a href="./">Home</a>
    </body>
    `);
});

//Navigator
router.get('/Navigator', (req, res) => {
  res.send(`
    <!DOCTYPE HTML>
    <head>
      <title>Art Around Navigator</title>
    </head>
    <body>
      <h1>Navigator of Art Around</h1>
      <a href="./">Home</a>
    </body>
    `);
});

//Add-museum
router.get('/add-museum', (req, res) => {
  res.sendFile(path.join(__dirname,'..','html','add-museum.html'));
});

router.post('/add-museum', saveMuseum);

module.exports = router;
