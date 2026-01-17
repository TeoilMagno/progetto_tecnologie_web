const express = require('express');
const path = require('path');

const {saveMuseum, getAllMuseums} = require ('./controllers/museums.js')
const router = express.Router();

// 1. Ottieni tutti i musei
app.get('/musei', async (req, res) => {
    try {
        const museums = await Museum.find({});
        res.json(museums);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero musei" });
    }
});

// 2. Ottieni opere di un museo specifico
app.get('/musei/:id/items', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        // Mongo gestisce automaticamente la conversione da stringa a ObjectId
        const museumId = req.params.id; 

        const items = await Item.find({ museumId: museumId });
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore recupero opere" });
    }
});

// 3. Modifica un'opera
app.put('/items/:id', async (req, res) => {
    try {
        // 🔴 CORREZIONE IMPORTANTE: Rimosso parseInt()
        const itemId = req.params.id;
        const updateData = req.body;

        const updatedItem = await Item.findByIdAndUpdate(
            itemId, // Mongoose accetta direttamente l'ID stringa qui
            updateData, 
            { new: true } 
        );

        if (!updatedItem) return res.status(404).json({ error: "Opera non trovata" });
        
        res.json({ message: "Salvato con successo", item: updatedItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore salvataggio" });
    }
});

module.exports = apiRouter;
