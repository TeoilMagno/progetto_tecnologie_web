const express = require('express');
const path = require('path');

const museumController = require ('../controllers/museums')
const itemController = require ('../controllers/items')
const apiRouter = express.Router();
const sectionController = require('../controllers/sections');

//--------------- museums -----------------------
// 1. Ottieni tutti i musei
apiRouter.get('/musei', async (req, res) => {
    try {
        const museums = await museumController.getAllMuseums();
        res.json(museums);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero musei" });
    }
});

//salva il museo sul db
apiRouter.post('/add-museum', async (req,res) =>{
  try {
    const {name, address, contact_email, contact_phone, sections=[], image, tags=[]} = req.body;

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const museum = {name, address, contact_email, contact_phone, sections, image, tags: tagsArray};
    const result = await museumController.saveMuseum(museum);
    res.redirect(`/api/museums/${result.id}/add-sections`);
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "errore durante il salvataggio"});
  } 
});

//--------------- items -----------------------
// 2. Ottieni oggetto di un museo specifico
apiRouter.get('/musei/:id/items', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        // Mongo gestisce automaticamente la conversione da stringa a ObjectId
        const museumId = req.params.id; 

        const items = await itemController.getItemByMuseum(museumId);
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore recupero opere" });
    }
});

// 3. Modifica un'oggetto in vendita
apiRouter.put('/items/:id', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        const itemId = req.params.id;
        const updateData = req.body;

        const updatedItem = await itemController.modifyItemById(
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

//--------------- sections -----------------------
apiRouter.get('/sections/:sectionId/works', async (req, res) => {
    try {
        const works = await sectionController.getWorksBySection(req.params.sectionId);
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//add-sections
apiRouter.get('/museums/:museumId/add-sections', (req, res) => {
  res.sendFile(path.join(__dirname,'..','..','html','add-section.html'));
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

// Se decidi di usare la versione che salva tutto insieme (Sezione + Opere):
apiRouter.post('/save-full-section', sectionController.saveFullSection);

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

module.exports = apiRouter;
