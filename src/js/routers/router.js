const express = require('express');
const path = require('path');

const {saveMuseum, addSectionToMuseum, getAllMuseums} = require ('../controllers/museums')
const {saveSection} = require ('../controllers/sections')
const router = express.Router();
const sectionController = require('../controllers/sections');


//index
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'..','..','html','index.html'));
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

// Routes di get

// Per aggiungere un museo
router.get('/add-museum', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-museum.html');
  
  console.log("Percorso generato per add-museum:", filePath);
  res.sendFile(filePath);
});

// Per aggiungere sezioni (usando l'ID del museo nell'URL)
router.get('/museums/:museumId/add-sections', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-section.html');
  
  console.log("Percorso generato per add-section:", filePath);
  res.sendFile(filePath);
});

// Per aggiungere opere (usando l'ID della sezione nell'URL)
router.get('/sections/:sectionId/add-works', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-work.html');
  
  console.log("Percorso generato per add-work:", filePath);
  res.sendFile(filePath);
});

//salva la sezione sul db
router.post('/add-section', saveSection);

//aggiunge la sezione al museo
router.post('/add-section-to-museum', addSectionToMuseum)

module.exports = router;
