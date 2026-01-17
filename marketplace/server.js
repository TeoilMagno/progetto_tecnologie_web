require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRouter = require('./js/apirouter.js');

const app = express();
const port = process.env.PORT || 3000;

const DB_URI = process.env.MONGO_URI_SERVER;

// // --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONNESSIONE DATABASE ---
mongoose.connect(DB_URI)
    .then(() => console.log('✅ Server connesso a MongoDB Atlas (Test Mode)!'))
    .catch(err => console.error('❌ Errore connessione Atlas:', err));

--- MODELLI (Identici al seed) ---
const Museum = mongoose.model('Museum', new mongoose.Schema({
     name: String, address: String, image: String, tags: [String]
}));

const Item = mongoose.model('Item', new mongoose.Schema({
    museumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Museum' },
    name: String, description: String, image: String, price: Number, quantity: Number, duration: String, tone: String
}));

//--- ROTTE API ---
app.use('/api',apiRouter);

// --- AVVIO SERVER ---
app.listen(port, () => {
    console.log(`Server ArtAround in ascolto su http://localhost:${port}`);
});
