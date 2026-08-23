/*
  Js contenente il router.
  Middleware tra client e server

  Gestore della navigazione
*/

const path = require('path');
const express = require('express')

// Middleware
const auth = require("../middleware/roles");

const router = express.Router();

// ottiene l'index.html per il caricamento della home
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'..','..','html','index.html'));
});

// Favicon route
router.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', '..', 'marketplace', 'favicon.svg'));
});

// Per aggiungere un museo
router.get('/add-museum', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'add-museum.html');
  console.log("Percorso generato per add-museum:", filePath);
  res.sendFile(filePath);
});

// ottiene il form per caricare i dati vettoriali per la visualizzazione della mappa
router.get('/museums/:museumId/upload-map', (req, res) => {
  const filePath = path.join(__dirname,'..','..','html','upload-map.html');

  console.log("Percorso generato per upload-map: ", filePath);
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

// Pagina di gestione/modifica del museo
router.get('/edit-museum', auth.isCuratorPage, (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'html', 'edit-museum.html');
  res.sendFile(filePath);
});

// Ottiene l'html per i musei creati dal currentUser
router.get('/my-museums', auth.isCuratorPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-museums.html'));
});

router.get('/navigator/visits/:visitId', auth.isLoggedInPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', '..', 'navigator', 'react', 'museum-map', 'dist', 'index.html'));
}); 

// pagina dello storico deli ordini
router.get('/my-orders', auth.isLoggedInPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-orders.html'));
});

// pagina delle adozioni in corso e completate di un curatore
router.get('/my-adoptions', auth.isCuratorPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'my-adoptions.html'));
});

// pagina delle adozioni in corso e completate di un curatore
router.get('/admin-dashboard', auth.isAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'admin-dashboard.html'));
});

// pagina 403 personalizzata
router.get('/403', auth.isAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', '403.html'));
});

// pagina 404 personalizzata
router.get('/404', auth.isAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', '404.html'));
});

// pagina dei report dei quiz lanciati da una guida
router.get('/quiz-reports', auth.isLoggedInPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'quiz-reports.html'));
});

// pagina di un report in particolare di un quiz
router.get('/quiz-report-details', auth.isLoggedInPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'html', 'quiz-report-details.html'));
});

module.exports = router;
