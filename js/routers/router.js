const express = require('express');
const path = require('path');

const {saveMuseum, addSectionToMuseum, getAllMuseums} = require ('../controllers/museums')
const {saveSection} = require ('../controllers/sections')
const router = express.Router();
const sectionController = require('../controllers/sections');


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

//Get-museums
router.get('/get-museums', async (req, res) => {
  const museums = await getAllMuseums();
  console.log(museums);
  res.send('<h1>Musei trovati</h1>')
});

//Add-museum
router.get('/add-museum', (req, res) => {
  res.sendFile(path.join(__dirname,'..','..','html','add-museum.html'));
});

//salva la sezione sul db
router.post('/add-section', saveSection);

//salva il museo sul db
router.post('/add-museum', saveMuseum);

//aggiunge la sezione al museo
router.post('/add-section-to-museum', addSectionToMuseum)

module.exports = router;
