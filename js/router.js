const express = require('express');
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

module.exports = router;

