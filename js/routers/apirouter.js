const express = require('express');
const path = require('path');

const {saveMuseum, getAllMuseums} = require ('../controllers/museums')
const {saveItem, getItemByMuseum, modifyItemById} = require ('../controllers/items')
const apiRouter = express.Router();
const sectionController = require('../controllers/sections');

// 1. Ottieni tutti i musei
apiRouter.get('/musei', async (req, res) => {
    try {
        const museums = await getAllMuseums();
        res.json(museums);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero musei" });
    }
});

// 2. Ottieni opere di un museo specifico
apiRouter.get('/musei/:id/items', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        // Mongo gestisce automaticamente la conversione da stringa a ObjectId
        const museumId = req.params.id; 

        const items = await getItemByMuseum(museumId);
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore recupero opere" });
    }
});

// 3. Modifica un'opera
apiRouter.put('/items/:id', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        const itemId = req.params.id;
        const updateData = req.body;

        const updatedItem = await modifyItemById(
            itemId, // Mongoose accetta direttamente l'ID stringa qui
            updateData
        );

        if (!updatedItem) return res.status(404).json({ error: "Opera non trovata" });
        
        res.json({ message: "Salvato con successo", item: updatedItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore salvataggio" });
    }
});

//File config
apiRouter.get('/config', async (req,res) => {
  try
  {
    console.log('/api/config');
    res.sendFile(path.join(__dirname,'..','..','config','config.json'));
  } catch (err) {
    console.log('Errore config');
  }
});

// Rotte per il recupero dati
apiRouter.get('/museums/:museumId/sections', async (req, res) => {
    try {
        const sections = await sectionController.getSectionsByMuseum(req.params.museumId);
        res.json(sections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/sections/:sectionId/works', async (req, res) => {
    try {
        const works = await sectionController.getWorksBySection(req.params.sectionId);
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Se decidi di usare la versione che salva tutto insieme (Sezione + Opere):
apiRouter.post('/save-full-section', sectionController.saveFullSection);

module.exports = apiRouter;
