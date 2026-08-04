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

// ---------------------- Routes di get -----------------------------

// Per aggiungere un museo
router.get('/add-museum', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-museum.html');
  
  console.log("Percorso generato per add-museum:", filePath);
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

// TODO: verificare che qualcuno non possa entrare forzatamente in una vistia privata
// pagina di dettaglio delle visite
router.get('/visit-details', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'visit-details.html'));
});

// pagina esplora visite (Pubbliche)
router.get('/public-visits', (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'public-visit.html');
  res.sendFile(filePath);
});

// Pagina di gestione/modifica del museo
router.get('/edit-museum', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'edit-museum.html');
  res.sendFile(filePath);
});

// ------------------------- Routes di post -------------------------------

// Ottiene l'html per i musei creati dal currentUser
router.get('/my-museums', auth.isCuratorPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-museums.html'));
});

module.exports = router;
