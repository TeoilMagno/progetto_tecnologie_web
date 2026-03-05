/*
    Js contente gil end-point per le chiamate API

    Gestore dei dati
*/

const express = require('express');
const path = require('path');

// Controllers
const museumController = require ('../controllers/museums')
const itemController = require ('../controllers/items')
const apiRouter = express.Router();
const sectionController = require('../controllers/sections');

//--------------- museums -----------------------

// ritorna tutti i musei del db
apiRouter.get('/museums', async (req, res) => {
    try {
        const museums = await museumController.getAllMuseums();

        if (!museums) return res.status(404).json({ error: "Musei non trovati" });

        res.json(museums);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero musei" });
    }
});

// salva il museo sul db
apiRouter.post('/add-museum', async (req,res) =>{
  try {
    const {name, address, contact_email, contact_phone, sections=[], image, tags=[]} = req.body;

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const museum = {name, address, contact_email, contact_phone, sections, image, tags: tagsArray};
    const result = await museumController.saveMuseum(museum);

    res.redirect(`/museums/${result.id}/add-sections`);
  } catch (error) {
    console.log("Errore nella post per add-museum: ", error);
    res.status(500).json({error: "errore durante il salvataggio"});
  } 
});

//--------------- items -----------------------

// ritorna oggetto di un museo specifico
apiRouter.get('/museums/:id/items', async (req, res) => {
    try {
        // Rimosso parseInt(): Mongo gestisce automaticamente la conversione da stringa a ObjectId
        const museumId = req.params.id; 

        const items = await itemController.getItemByMuseum(museumId);

        if (!items) return res.status(404).json({ error: "Opere non trovate" });

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore recupero opere" });
    }
});

//? Perche' non e' una post?
// 3. Modifica un'oggetto in vendita
apiRouter.put('/items/:id', async (req, res) => {
    try {
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

// ritorna un item data la sezione specifica
apiRouter.get('/sections/:sectionId/works', async (req, res) => {
    try {
        const works = await sectionController.getWorksBySection(req.params.sectionId);
        res.json(works);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ritorna le sezioni di un museo dato
apiRouter.get('/museums/:museumId/sections', async (req, res) => {
    try {
        const sections = await sectionController.getSectionsByMuseum(req.params.museumId);
        res.json(sections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//------------------ form ------------------------

// in router
// ottiene il form html per l'inserimento delle sezioni
// apiRouter.get('/museums/:museumId/add-sections', (req, res) => {
//   res.sendFile(path.join(__dirname,'..','..','html','add-section.html'));
// });

// TODO: da rivedere
//? salvataggio della sezione
apiRouter.post('/save-full-section', sectionController.saveFullSection);

//? File config
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
