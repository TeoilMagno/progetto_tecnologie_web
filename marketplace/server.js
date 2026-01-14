const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// --- 🔴 CONFIGURAZIONE DATABASE ---
// INCOLLA QUI SOTTO LA STESSA STRINGA DI ATLAS USATA NEL SEED
const DB_URI = ''; 

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Fondamentale per leggere i JSON in arrivo (es. nelle modifiche)

// --- CONNESSIONE AL DATABASE ---
mongoose.connect(DB_URI)
    .then(() => console.log('✅ Server connesso a MongoDB Atlas!'))
    .catch(err => console.error('❌ Errore connessione Atlas:', err));

// --- MODELLI (devono essere uguali a seed.js) ---
const Museum = mongoose.model('Museum', new mongoose.Schema({
    id: Number, name: String, address: String, image: String, tags: [String]
}));

const Item = mongoose.model('Item', new mongoose.Schema({
    id: Number, museumId: Number, name: String, description: String, image: String, price: Number, quantity: Number, duration: String, tone: String
}));

// --- ROTTE API ---

// 1. Ottieni tutti i musei
app.get('/api/musei', async (req, res) => {
    try {
        const museums = await Museum.find({});
        res.json(museums);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero musei" });
    }
});

// 2. Ottieni opere di un museo specifico
app.get('/api/musei/:id/items', async (req, res) => {
    try {
        const museumId = parseInt(req.params.id);
        const items = await Item.find({ museumId: museumId });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Errore recupero opere" });
    }
});

// 3. Modifica un'opera
app.put('/api/items/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const updateData = req.body;

        const updatedItem = await Item.findOneAndUpdate(
            { id: itemId }, 
            updateData, 
            { new: true } // Restituisce l'oggetto aggiornato
        );

        if (!updatedItem) return res.status(404).json({ error: "Opera non trovata" });
        
        res.json({ message: "Salvato con successo", item: updatedItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Errore salvataggio" });
    }
});

// --- AVVIO SERVER ---
app.listen(port, () => {
    console.log(`Server ArtAround in ascolto su http://localhost:${port}`);
});
