const mongoose = require('mongoose');

// --- 🔴 CONFIGURAZIONE DATABASE ---
// INCOLLA QUI SOTTO LA TUA STRINGA DI CONNESSIONE COPIATA DA ATLAS
// Esempio: 'mongodb+srv://admin:password123@cluster0.abcde.mongodb.net/artaround?retryWrites=true&w=majority'
const DB_URI = ''; 

// --- DEFINIZIONE SCHEMI ---
const museumSchema = new mongoose.Schema({
    id: Number, 
    name: String, 
    address: String, 
    image: String, 
    tags: [String]
});

const itemSchema = new mongoose.Schema({
    id: Number, 
    museumId: Number, 
    name: String, 
    description: String, 
    image: String, 
    price: Number, 
    quantity: Number, 
    duration: String, 
    tone: String
});

const Museum = mongoose.model('Museum', museumSchema);
const Item = mongoose.model('Item', itemSchema);

// --- DATI DA CARICARE ---
const museumsData = [
    { id: 1, name: "Pinacoteca Nazionale", address: "Via delle Belle Arti 56, Bologna", image: "img1.jpg", tags: ["Rinascimento", "Pittura", "Barocco"] },
    { id: 2, name: "MAMbo - Museo Arte Moderna", address: "Via Don Giovanni Minzoni 14, Bologna", image: "img2.jpg", tags: ["Contemporanea", "Installazioni", "Avanguardia"] },
    { id: 3, name: "Museo di Palazzo Poggi", address: "Via Zamboni 33, Bologna", image: "img3.jpg", tags: ["Scienza", "Storia", "Anatomia"] }
];

const itemsData = [
    { id: 101, museumId: 1, name: "Estasi di Santa Cecilia", description: "Capolavoro di Raffaello Sanzio, un'opera che incarna la perfezione del Rinascimento maturo.", image: "suv1.jpg", price: 15.00, quantity: 1, duration: '1min', tone: 'medio' },
    { id: 102, museumId: 1, name: "Polittico di Bologna", description: "Opera di Giotto. Rappresenta una delle testimonianze più importanti del suo periodo maturo.", image: "suv2.jpg", price: 12.50, quantity: 4, duration: '1min', tone: 'medio' },
    { id: 201, museumId: 2, name: "Composizione Astratta", description: "Opera moderna che esplora le forme geometriche e l'uso non convenzionale del colore.", image: "suv3.jpg", price: 20.00, quantity: 2, duration: '3s', tone: 'infantile' }
];

// --- FUNZIONE DI SEEDING ---
const seedDB = async () => {
    try {
        console.log('⏳ Connessione a MongoDB Atlas in corso...');
        
        await mongoose.connect(DB_URI);
        console.log('✅ Connesso! Inizio la pulizia del database...');

        // Cancella i dati vecchi per evitare duplicati
        await Museum.deleteMany({});
        await Item.deleteMany({});
        console.log('🧹 Database pulito.');

        // Inserisce i nuovi dati
        await Museum.insertMany(museumsData);
        await Item.insertMany(itemsData);
        
        console.log('🎉 Dati caricati su Atlas con successo!');
        process.exit(0); // Chiude lo script
    } catch (e) {
        console.error('❌ Errore durante il caricamento:', e.message);
        process.exit(1);
    }
};

seedDB();

// 1. Connessione
mongoose.connect('mongodb://127.0.0.1:27017/artaround')
    .then(() => {
        console.log('✅ Connesso! Inizio il seeding...');
        // 2. Lancia la funzione SOLO dopo che la connessione è riuscita
        return seedDB();
    })
    .catch(err => {
        console.error('❌ Errore di connessione:', err);
    });
