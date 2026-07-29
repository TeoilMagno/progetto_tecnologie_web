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

//salva la sezione sul db
router.post('/add-section', saveSection);

//aggiunge la sezione al museo
router.post('/add-section-to-museum', addSectionToMuseum)

module.exports = router;
