require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

const DB_URI = process.env.MONGO_URI_SERVER;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONNESSIONE DATABASE ---
mongoose.connect(DB_URI)
    .then(() => console.log('✅ Server connesso a MongoDB Atlas (Test Mode)!'))
    .catch(err => console.error('❌ Errore connessione Atlas:', err));

// --- MODELLI (Identici al seed) ---
const Museum = mongoose.model('Museum', new mongoose.Schema({
    name: String, address: String, image: String, tags: [String]
}));

const Item = mongoose.model('Item', new mongoose.Schema({
    museumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum' },
    name: String, description: String, image: String, price: Number, quantity: Number, duration: String, tone: String
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
app.put('/api/items/:id', async (req, res) => {
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

// --- AVVIO SERVER ---
app.listen(port, () => {
    console.log(`Server ArtAround in ascolto su http://localhost:${port}`);
});
