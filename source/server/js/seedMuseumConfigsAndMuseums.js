const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Carichiamo il file .env dalla root del progetto
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const Museum = require('./models/museums');

const dbURI = process.env.DB_URI;

if (!dbURI) {
  console.error("ERRORE: DB_URI non trovato nelle variabili d'ambiente. Verifica il file .env");
  process.exit(1);
}

async function seed() {
  console.log("Connessione al database ArtAround...");
  try {
    await mongoose.connect(dbURI, { dbName: 'ArtAround' });
    console.log("Connesso con successo al database!");

    const db = mongoose.connection.db;
    const configCollection = db.collection('config');

    // 1. CARICAMENTO DEI FILE DI CONFIGURAZIONE NELLA COLLEZIONE 'config'
    const configsToSeed = [
      { filename: "config1.json", localFile: "castello-config.json" },
      { filename: "config2.json", localFile: "fumettistico-config.json" },
      { filename: "config3.json", localFile: "tecnologico-config.json" },
      { filename: "defaultconfig.json", localFile: "default-config.json" }
    ];

    for (const c of configsToSeed) {
      const filePath = path.join(__dirname, '..', '..', 'navigator', 'src', 'assets', c.localFile);
      if (!fs.existsSync(filePath)) {
        console.error(`Errore: Il file locale ${filePath} non esiste.`);
        continue;
      }

      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Eliminiamo la vecchia configurazione con lo stesso nome di file se esiste
      await configCollection.deleteMany({ filename: c.filename });

      // Inseriamo il documento di configurazione
      const doc = {
        filename: c.filename,
        config: fileContent,
        updatedAt: new Date()
      };

      await configCollection.insertOne(doc);
      console.log(`Configurazione caricata con successo in ArtAround/config: ${c.filename}`);
    }

    // 2. CREAZIONE DEI MUSEI NELLA COLLEZIONE 'museums'
    const museumsData = [
      {
        name: "Castello di Gradara & Museo Medievale",
        address: "Piazza de i Caduti, 1, 61012 Gradara PU, Italia",
        latitude: 43.941,
        longitude: 12.771,
        contact_email: "info@castellodigradara.it",
        contact_phone: "+39 0541 964181",
        image: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Gradara_Castle.jpg",
        tags: ["Castello", "Medioevo", "Armature", "Paolo e Francesca"],
        ticketPrice: 10,
        services: ["bathrooms", "cafe", "cloakroom"],
        openingHours: "Mar-Dom: 09:00 - 19:00, Lun: Chiuso",
        openingDays: ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      {
        name: "Museo Internazionale del Fumetto e dell'Animazione",
        address: "Corso Garibaldi, 53, 55100 Lucca LU, Italia",
        latitude: 43.842,
        longitude: 10.506,
        contact_email: "info@museofumetto.lucca.it",
        contact_phone: "+39 0583 401711",
        image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Lucca_comics_and_games.jpg",
        tags: ["Fumetti", "Supereroi", "Manga", "Animazione"],
        ticketPrice: 8,
        services: ["bathrooms", "cloakroom", "wifi"],
        openingHours: "Tutti i giorni: 10:00 - 20:00",
        openingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      {
        name: "Museo della Scienza e del Futuro Tecnologico",
        address: "Corso del Lavoro e della Scienza, 3, 38122 Trento TN, Italia",
        latitude: 46.063,
        longitude: 11.114,
        contact_email: "info@museofutura.trento.it",
        contact_phone: "+39 0461 270311",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Trento_MUSE_01.jpg",
        tags: ["Scienza", "Tecnologia", "Robotica", "Spazio", "Futuro"],
        ticketPrice: 12,
        services: ["bathrooms", "cafe", "cloakroom", "accessibility_ramp", "wifi"],
        openingHours: "Tutti i giorni: 09:30 - 18:30",
        openingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      }
    ];

    for (const m of museumsData) {
      // Eliminiamo il vecchio museo se esiste con lo stesso nome
      await Museum.deleteMany({ name: m.name });

      const museumDoc = new Museum(m);
      await museumDoc.save();
      console.log(`Museo creato con successo in ArtAround/museums: ${m.name} (ID: ${museumDoc._id})`);
    }

    console.log("Seeding completato con successo!");
  } catch (error) {
    console.error("Errore durante il seeding del database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnesso dal database.");
  }
}

seed();
