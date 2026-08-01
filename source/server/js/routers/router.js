/*
  Js contenente il router.
  Middleware tra client e server

  Gestore della navigazione
*/

const path = require('path');
const express = require('express')

// Controllers
const {saveMuseum, addSectionToMuseum, getAllMuseums} = require ('../controllers/museums')
const {saveSection} = require ('../controllers/sections')
const sectionController = require('../controllers/sections');

// Middleware
const auth = require("../middleware/roles");

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

// ---------------------- Routes di get -----------------------------

// Per aggiungere un museo
router.get('/add-museum', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-museum.html');
  
  console.log("Percorso generato per add-museum:", filePath);
  res.sendFile(filePath);
});

// Per aggiungere una sezione
router.get('/add-section', auth.isCuratorPage,  (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-section.html');
  
  console.log("Percorso generato per add-section:", filePath);
  res.sendFile(filePath);
});

// Per aggiungere un'opera
router.get('/add-work', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-work.html');
  
  console.log("Percorso generato per add-work:", filePath);
  res.sendFile(filePath);
});

// ottiene il form html per l'inserimento delle sezioni
router.get('/museums/:museumId/add-sections', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname,'..','..','html','add-section.html')

  console.log("Percorso generato per add-section: ", filePath)
  res.sendFile(filePath);
});

// ottiene il form html per l'inserimento degli item
router.get('/museums/:museumId/sections/:sectionId/add-work', auth.isCuratorPage,  (req, res) => {
  const filePath = path.join(__dirname,'..','..','html','add-work.html')

  console.log("Percorso generato per add-item: ", filePath)
  res.sendFile(filePath);
});

// per la pagina di creazione visita
router.get('/create-visit', auth.isLoggedInPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'create-visit.html');
  console.log("Percorso generato per create-visit:", filePath);
  res.sendFile(filePath);
});

// pagina my-visits
router.get('/my-visits', auth.isLoggedInPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'my-visits.html');
  console.log("Percorso generato: ", filePath);
  res.sendFile(filePath);
});

// pagina di dettaglio delle visite
router.get('/visit-details', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'visit-details.html'));
});

// ------------------------- Routes di post -------------------------------

//salva la sezione sul db
router.post('/add-section', auth.isCuratorPage, saveSection);

//aggiunge la sezione al museo
router.post('/add-section-to-museum', auth.isCuratorPage, addSectionToMuseum)

// Ottiene l'html per i musei creati dal currentUser
router.get('/my-museums', auth.isCuratorPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-museums.html'));
});

module.exports = router;
