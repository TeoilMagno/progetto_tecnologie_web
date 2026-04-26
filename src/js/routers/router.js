/*
  Js contenente il router.
  Middleware tra client e server

  Gestore della navigazione
*/

const path = require('path');
const express = require('express')
const {saveMuseum, addSectionToMuseum, getAllMuseums} = require ('../controllers/museums')
const {saveSection} = require ('../controllers/sections')
const sectionController = require('../controllers/sections');

const router = express.Router();

// ottiene l'index.html per il caricamento della home
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'..','..','html','index.html'));
});

//Marketplace
// router.get('/Marketplace', (req, res) => {
//   res.send(`
//     <!DOCTYPE HTML>
//     <head>
//       <title>Art Around Marketplace</title>
//     </head>
//     <body>
//       <h1>Marketplace of Art Around</h1>
//       <a href="./">Home</a>
//     </body>
//     `);
// });

// //Navigator
// router.get('/Navigator', (req, res) => {
//   res.send(`
//     <!DOCTYPE HTML>
//     <head>
//       <title>Art Around Navigator</title>
//     </head>
//     <body>
//       <h1>Navigator of Art Around</h1>
//       <a href="./">Home</a>
//     </body>
//     `);
// });

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

// Per aggiungere una sezione
router.get('/add-section', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-section.html');
  
  console.log("Percorso generato per add-section:", filePath);
  res.sendFile(filePath);
});

// Per aggiungere un'opera
router.get('/add-work', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-work.html');
  
  console.log("Percorso generato per add-work:", filePath);
  res.sendFile(filePath);
});

// ottiene il form html per l'inserimento delle sezioni
router.get('/museums/:museumId/add-sections', (req, res) => {
  const filePath = path.join(__dirname,'..','..','html','add-section.html')

  console.log("Percorso generato per add-section: ", filePath)
  res.sendFile(filePath);
});

// ottiene il form html per l'inserimento degli item
router.get('/museums/:museumId/sections/:sectionId/add-work', (req, res) => {
  const filePath = path.join(__dirname,'..','..','html','add-work.html')

  console.log("Percorso generato per add-item: ", filePath)
  res.sendFile(filePath);
});

//salva la sezione sul db
router.post('/add-section', saveSection);

//aggiunge la sezione al museo
router.post('/add-section-to-museum', addSectionToMuseum)

// Ottiene l'html per i musei creati dal currentUser
router.get('/my-museums', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-museums.html'));
});

module.exports = router;
