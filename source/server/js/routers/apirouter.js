/*
    Js contente gil end-point per le chiamate API

    Gestore dei dati
*/

const express = require("express");
const fs = require('fs').promises;
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
// const axios = require("axios");
const crypto = require("crypto");

// Models
const { User } = require("../models/users");
const Work = require("../models/works");
const { Section } = require("../models/sections");
const Museum = require("../models/museums");
const Adoption = require("../models/adoptions");
const Item = require("../models/items");
const Visit = require("../models/visits");
const QuizReport = require("../models/quizReport")
const Order = require("../models/orders");

// Controllers
const museumController = require("../controllers/museums");
const itemController = require("../controllers/items");
const workController = require("../controllers/works");
const sectionController = require("../controllers/sections");
const visitController = require("../controllers/visits");
const orderController = require("../controllers/orders");
const adoptionController = require("../controllers/adoptions");
const authorController = require("../controllers/authors");
const styleController = require("../controllers/styles");
const aiController = require("../controllers/ai");

// Middleware
const auth = require("../middleware/roles");

// Gestione immagini
// 1. Configurazione Multer per i caricamenti locali
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', '..', 'public', 'uploads');
    // Crea la cartella se non esiste
    await fs.mkdir(dir, { recursive: true }).catch(console.error);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
const { deleteLocalFile } = require('../utils/file-helper');

const apiRouter = express.Router();

//--------------- museums -----------------------

// ritorna tutti i musei del db
apiRouter.get("/museums", async (req, res) => {
  try {
    const {
      search, tags, freeEntry, maxPrice, services, day,
      lat, lon, maxDistance, page = 1, limit = 20
    } = req.query;

    const response = await museumController.getMuseums(search, tags, freeEntry, maxPrice, services, day,
      lat, lon, maxDistance, page, limit);

    if (!response || !response.museums) return res.status(404).json({ error: "Nessun museo trovato" });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Errore recupero musei" });
  }
});

// Ritorna SOLO id e nome di tutti i musei (Ottimizzato per i menu a tendina)
apiRouter.get("/museums-list", async (req, res) => {
  try {
    // Il secondo parametro di find() seleziona i campi da restituire. 
    // sort({ name: 1 }) li mette in ordine alfabetico
    const museumsList = await Museum.find({}, '_id name').sort({ name: 1 });
    res.status(200).json(museumsList);
  } catch (error) {
    console.error("Errore recupero lista musei:", error);
    res.status(500).json({ error: "Errore recupero lista musei" });
  }
});

// Aggiorna i dati generali di un museo
apiRouter.put("/museums/:id", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const museumId = req.params.id;
    const updateData = req.body;

    const updatedMuseum = await museumController.updateMuseum(
      museumId,
      updateData,
    );

    if (!updatedMuseum) {
      return res
        .status(404)
        .json({ error: "Museo non trovato o non autorizzato" });
    }

    res.json({
      message: "Museo aggiornato con successo",
      museum: updatedMuseum,
    });
  } catch (error) {
    console.error("Errore aggiornamento museo:", error);
    res.status(500).json({ error: error.message });
  }
});

// Recupera un museo
apiRouter.get("/museums/:id", async (req, res) => {
  try {
    const museumId = req.params.id;
    const museum = await Museum.findById(museumId);

    if (!museum) {
      return res.status(404).json({ error: "Museo non trovato" });
    }

    res.json(museum);
  } catch (error) {
    console.error("Errore recupero museo:", error);
    res.status(500).json({ error: error.message });
  }
});

// Elimina un museo
apiRouter.delete("/museums/:id", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const museumId = req.params.id;
    await museumController.deleteMuseumById(museumId);
    res.json({ message: "Museo eliminato con successo" });
  } catch (error) {
    console.error("Errore eliminazione museo:", error);
    res.status(500).json({ error: error.message });
  }
});

//--------------- items -----------------------

// ritorna prodotti (items) di un museo specifico
apiRouter.get("/museums/:id/items", async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const museumId = req.params.id;

    // Assicurati che itemController sia importato in cima al file!
    const response = await itemController.getMuseumItems(museumId, page, limit, search);

    res.json(response);
  } catch (error) {
    console.error("Errore nel recupero degli articoli:", error);
    res.status(500).json({ error: "Errore nel recupero degli articoli" });
  }
});

// modifica un'oggetto in vendita
apiRouter.put("/items/:id", auth.isCurator, async (req, res) => {
  try {
    const itemId = req.params.id;
    const updateData = req.body;

    const updatedItem = await itemController.modifyItemById(
      itemId,
      updateData,
    );

    if (!updatedItem)
      return res.status(404).json({ error: "Opera non trovata" });

    res.json({ message: "Salvato con successo", item: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore salvataggio" });
  }
});

// 1. Aggiungi quantità allo stock di un item esistente
apiRouter.put("/items/:id/add-stock", auth.isCurator, async (req, res) => {
  try {
    const { quantityToAdd } = req.body;
    
    if (!quantityToAdd || isNaN(quantityToAdd) || quantityToAdd <= 0) {
      return res.status(400).json({ error: "Quantità non valida" });
    }

    // Usiamo $inc per sommare la quantità in modo sicuro (evita problemi di concorrenza)
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { $inc: { quantity: parseInt(quantityToAdd) } },
      { new: true }
    );

    if (!updatedItem) return res.status(404).json({ error: "Articolo non trovato" });

    res.json({ message: "Stock aggiornato con successo", item: updatedItem });
  } catch (error) {
    console.error("Errore aggiornamento stock:", error);
    res.status(500).json({ error: "Errore durante l'aggiornamento del magazzino" });
  }
});

// 2. Crea un nuovo articolo nel bookshop del museo
apiRouter.post("/museums/:museumId/items", auth.isCurator, async (req, res) => {
  try {
    const { museumId } = req.params;
    const itemData = req.body;

    const newItem = new Item({
      ...itemData,
      museumId: museumId, // Lo agganciamo forzatamente al museo corrente
      quantity: itemData.quantity || 1
    });

    await newItem.save();
    res.status(201).json({ message: "Articolo creato con successo!", item: newItem });
  } catch (error) {
    console.error("Errore creazione articolo:", error);
    res.status(500).json({ error: "Errore durante la creazione dell'articolo" });
  }
});

//--------------- sections -----------------------

// ritorna tutte le opere di una sezione specifica
apiRouter.get("/sections/:id/works", async (req, res) => {
  try {
    const works = await sectionController.getWorksBySection(
      req.params.id,
    );

    if(!works) return res.status(404).json({ error: "Opere non trovate" });

    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ritorna tutte le sezioni di un museo specifico
apiRouter.get("/museums/:id/sections", async (req, res) => {
  try {
    const sections = await sectionController.getSectionsByMuseum(req.params.id);

    if(!sections) return res.status(404).json({ error: "Opere non trovate" });

    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// modifica una sezione
apiRouter.put("/sections/:id", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { museumId, ...updateData } = req.body;
    const updatedSection = await sectionController.updateSectionById(req.params.id, updateData, museumId);
    res.json({ message: "Sezione aggiornata", section: updatedSection });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// elimina una sezione intera
// * il frontend deve inviare l'ID del museo da cui toglierla
apiRouter.delete("/sections/:id", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const sectionId = req.params.id;
    const { museumId } = req.body;

    // Elimina la sezione e tutte le sue opere a cascata
    await sectionController.deleteSectionById(sectionId, museumId);

    // Rimuove il riferimento dall'array del Museo
    if (museumId) {
      await museumController.removeSectionFromMuseum(museumId, sectionId);
    }

    res.json({ message: "Sezione eliminata con successo" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//--------------- works -----------------------

// ? ha senso dato che c'e' gia' la rotta per ottenere le opere di ogni sezione e ogni sezione di un museo
// ottiene le opere di un museo
apiRouter.get("/museums/:id/works", async (req, res) => {
  try {
    const { search, author, technique, workstyle, page = 1, limit = 12, fetchMetadata } = req.query;
    const museumId = req.params.id;

    const response = await workController.getMuseumWorks(
      museumId, search, author, technique, workstyle, page, limit, fetchMetadata
    );

    if (!response || !response.works) {
       return res.status(404).json({ error: "Nessuna opera trovata" });
    }

    res.json(response);
  } catch (error) {
    console.error("Errore nel recupero delle opere:", error);
    res.status(500).json({ error: "Errore nel recupero delle opere" });
  }
});

// Ritorna SOLO info base delle opere (Ottimizzato per le tendine delle adozioni)
apiRouter.get("/museums/:id/works-list", async (req, res) => {
  try {
    // Selezioniamo solo _id, name, autore e immagine
    const worksList = await Work.find({ museumId: req.params.id }, '_id name authorName image').sort({ name: 1 });
    res.status(200).json(worksList);
  } catch (error) {
    console.error("Errore recupero lista opere:", error);
    res.status(500).json({ error: "Errore recupero lista opere" });
  }
});

// per la modifica di un'opera
// * nel body deve esserci il museumId, potrei anche fare il controllo nel controller ma dovrei prendere l'oggetto dal db per poi dire che non
apiRouter.put("/works/:id", [auth.isCurator,auth.isMuseumOwner], async (req, res) => {
  try {
    const { museumId, ...updateData } = req.body;
    const updatedWork = await workController.updateWorkById(req.params.id, updateData, museumId);
    res.json({ message: "Opera aggiornata", work: updatedWork });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// elimina un'opera 
// * il frontend deve inveare l'ID della sezione da cui toglierla
apiRouter.delete("/works/:id", [auth.isCurator,auth.isMuseumOwner], async (req, res) => {
  try {
    const workId = req.params.id;
    const { sectionId, museumId } = req.body; 

    // Elimina dalla collezione Works
    await workController.deleteWorkById(workId, museumId);
    
    // Rimuove il riferimento dall'array della Sezione
    if (sectionId) {
      await sectionController.removeWorkFromSection(sectionId, workId);
    }

    res.json({ message: "Opera eliminata con successo" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotta esclusiva per il Drag & Drop delle opere
apiRouter.put("/works/:id/move", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const workId = req.params.id;
    const { museumId, oldSectionId, newSectionId } = req.body;

    // 1. Aggiorna la stanza nell'opera tramite il controller (grazie al fix di prima, l'immagine è salva!)
    await workController.updateWorkById(workId, { sectionId: newSectionId }, museumId);

    // 2. Se l'opera è stata trascinata in un'altra SEZIONE, spostiamo il suo ID nei rispettivi array
    if (oldSectionId !== newSectionId) {
      await sectionController.removeWorkFromSection(oldSectionId, workId);
      await sectionController.addWorkToSection(newSectionId, workId);
    }

    res.json({ message: "Opera spostata con successo" });
  } catch (error) {
    console.error("Errore spostamento opera:", error);
    res.status(500).json({ error: "Impossibile spostare l'opera" });
  }
});

//------------------ form ------------------------

// Rotta per creare e aggiungere un'opera sul db
// * il frontend deve inviare museumId e sectionId
apiRouter.post("/add-work", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { work, sectionId, museumId } = req.body;

    // Salviamo la nuova opera inserendo esplicitamente il sectionId e il museumId verificato
    const newWork = new Work({
      ...work,
      museumId: museumId, // Evitiamo che l'utente si inventi cose
      sectionId: sectionId,
    });
    const savedWork = await newWork.save();

    await Visit.findOneAndUpdate(
      { 
        museumId: savedWork.museumId, 
        visitType: 'standard' // Troviamo la visita libera di QUESTO museo
      },
      { 
        $push: { works: savedWork._id } // Inseriamo l'ID della nuova opera
      }
    );

    // Collega l'ID dell'opera alla sezione tramite il controller
    await sectionController.addWorkToSection(sectionId, savedWork._id);

    res
      .status(201)
      .json({ message: "Opera salvata e aggiunta!", work: savedWork });
  } catch (error) {
    console.error("Errore salvataggio opera:", error);
    res.status(500).json({ error: "Errore nel salvataggio dell'opera" });
  }
});

// salva una sezione sul db
apiRouter.post("/save-section", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { rsection, museumId } = req.body;
    const sectionId = await sectionController.saveSection(rsection, museumId);
    await Museum.findByIdAndUpdate(museumId, {
      $push: { sections: sectionId },
    });

    res.status(201).json(sectionId);
  } catch (error) {
    console.error("Errore nel salvataggio sezione:", error);
    res
      .status(500)
      .json({ error: "Errore durante il salvataggio della sezione" });
  }
});

// salva un museo sul db
apiRouter.post("/save-museum", auth.isCurator, async (req, res) => {
  try {
    const museumData = req.body;
    const userId = req.user ? req.user._id : null;
    const museumId = await museumController.saveMuseum(museumData, userId);

    res.status(201).json({
      success: true,
      message: "Museo salvato correttamente",
      id: museumId,
    });
  } catch (error) {
    console.error("Errore validazione o salvataggio:", error);
    res.status(400).json({
      error: "Dati incompleti o errati",
      details: error.message,
    });
  }
});

apiRouter.put("/museums/:museumId/upload-map", async (req,res) => {
  try {
    const mapData = req.body;
    const map = await sectionController.uploadMap(mapData);

    res.status(201).json({
      success: true,
      message: "Mappa salvata correttamente",
      map: map,
    });
  } catch (error) {
    console.error("Errore validazione o salvataggio:", error);
    res.status(400).json({
      error: "Dati incompleti o errati",
      details: error.message,
    });
  }
});

apiRouter.get("/museums/:id/map-svg", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const { id } = req.params;
    // Supponiamo che tu abbia salvato mappa-completa.svg nella cartella 'public' o 'assets' del backend
    console.log(id);
    const svgPath = path.join(__dirname, '..', '..', '..', 'public', 'shared', 'maps', `${id}.svg`)
    console.log(svgPath);
    // Leggiamo il file come semplice testo (utf-8)
    const svgString = await fs.readFile(svgPath, 'utf8');
    
    // Lo spediamo al frontend!
    res.status(200).send(svgString);
  } catch (error) {
    console.error("Errore lettura mappa SVG:", error);
    res.status(500).json({ error: "Impossibile caricare la mappa" });
  }
});

// ------------- immagini ------------------------

// 1. Upload File Locale
apiRouter.post("/upload-image", auth.isLoggedIn, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    // Restituisce il percorso relativo per il frontend
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Errore durante l'upload" });
  }
});

// 2. Cerca Immagini su Wikimedia Commons
apiRouter.get("/search-wikimedia", auth.isLoggedIn, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Testo di ricerca mancante" });

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&format=json`;
    
    const response = await fetch(url, {
      method: 'GET', // Opzionale, è il default
      headers: {
        'User-Agent': 'ArtAround (progetto universitario)'
      }
    });
    
    // CORREZIONE: Con fetch dobbiamo parsare il JSON esplicitamente
    const data = await response.json(); 
    
    const pages = data.query?.pages || {};
    
    const imageUrls = Object.values(pages)
      .map(page => page.imageinfo?.[0]?.url)
      .filter(url => url != null);

    res.json(imageUrls);
  } catch (error) {
    console.error("Errore Wikimedia:", error.message);
    res.status(500).json({ error: "Errore ricerca su Wikimedia" });
  }
});

// 4. Elimina fisicamente un'immagine dal disco (chiamato dal widget)
apiRouter.delete("/delete-image", auth.isLoggedIn, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (imageUrl) {
      await deleteLocalFile(imageUrl);
    }
    res.json({ message: "File eliminato con successo" });
  } catch (error) {
    console.error("Errore eliminazione file orfano:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione" });
  }
});

//------------------ user ------------------------

// restituisce l'utente loggato, o null se non autenticato
apiRouter.get("/current-user", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.status(200).json({
        _id: req.user._id,
        username: req.user.username || req.user.name,
        role: req.user.role,
        type: req.user.type || 'none',
        curator_status: req.user.curator_status,
        expertiseLevel: req.user.preferences?.expertiseLevel || 'medium',
        // Passiamo il nome reale se presente (OAuth)
        name: req.user.name,
        hasPassword: !!req.user.password
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.log(error);
  }
});

// aggiorna il tipo dell'utente corrente (student / teacher)
apiRouter.put("/current-user/type", auth.isLoggedIn, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['student', 'teacher', 'none'].includes(type)) {
      return res.status(400).json({ error: "Tipo utente non valido" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    user.type = type;
    await user.save();

    res.status(200).json({
      message: "Tipo utente aggiornato con successo",
      type: user.type
    });
  } catch (error) {
    console.error("Errore aggiornamento tipo utente:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// Aggiorna nome utente o password
apiRouter.put("/current-user/profile", auth.isLoggedIn, async (req, res) => {
  try {
    const { username, newPassword, oldPassword, expertiseLevel } = req.body;
    const user = await User.findById(req.user._id);

    if (username) {
      const existing = await User.findOne({ username });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: "Username già in uso." });
      }
      user.username = username;
    }

    if (expertiseLevel) {
      // Modifica basata sul tuo schema
      user.preferences.expertiseLevel = expertiseLevel;
    }

    if (newPassword) {
      const crypto = require('crypto');

      // Se ha GIÀ una password, esigi quella vecchia
      if (user.password && user.salt) {
        if (!oldPassword) {
          return res.status(400).json({ error: "Devi inserire la password attuale." });
        }
        const oldHash = crypto.pbkdf2Sync(oldPassword, user.salt, 310000, 32, 'sha256');
        if (!crypto.timingSafeEqual(user.password, oldHash)) {
          return res.status(401).json({ error: "La password attuale non è corretta." });
        }
      }

      // Genera nuova password (valido sia per cambio che per prima aggiunta OAuth)
      const newSalt = crypto.randomBytes(16);
      const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 310000, 32, 'sha256');
      
      user.salt = newSalt;
      user.password = newHash;
    }

    if (req.body.type) {
      user.type = req.body.type;
    }

    if (req.body.requestCurator) {
      if (user.curator_status === 'none' || user.curator_status === 'rejected') {
        user.curator_status = 'pending';
      }
    }

    await user.save();
    res.json({ message: "Profilo aggiornato.", user });
  } catch (error) {
    res.status(500).json({ error: "Errore durante l'aggiornamento." });
  }
});

// Elimina account e pulisci il database alla radice
apiRouter.delete("/current-user/profile", auth.isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // 1. Elimina i musei del curatore a cascata
    if (user.managed_museums && user.managed_museums.length > 0) {
      for (const museumId of user.managed_museums) {
        await museumController.deleteMuseumById(museumId);
      }
    }

    // 2. Elimina le visite create dall'utente (innescando la pulizia immagini su disco)
    const userVisits = await Visit.find({ creator: user._id });
    for (const visit of userVisits) {
      await visitController.deleteVisitById(visit._id, user);
    }

    // 3. Elimina fisicamente Ordini e Adozioni per mantenere pulito il DB
    await Order.deleteMany({ userId: user._id });
    await Adoption.deleteMany({ requestedBy: user._id });

    // 4. Elimina l'utente e chiudi la sessione
    await User.findByIdAndDelete(user._id);
    
    req.logout((err) => {
      if (err) throw err;
      res.json({ message: "Account eliminato definitivamente." });
    });
  } catch (error) {
    console.error("Errore eliminazione account:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione dell'account." });
  }
});


// Ottiene i musei gestiti dal curatore loggato
apiRouter.get("/my-museums", auth.isCurator, async (req, res) => {
  try {
    // Se è Admin, restituiamo TUTTI i musei del DB
    if (req.user.role === "admin") {
      const allMuseums = await museumController.getMuseums(null, null, null, null, null, null, null, null, null);
      return res.json(allMuseums);
    }

    const user = await User.findById(req.user._id).populate("managed_museums");

    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    // Restituiamo solo l'array dei musei gestiti
    res.status(200).json(user.managed_museums || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nel recupero dei tuoi musei" });
  }
});

// ----------------------- visits ----------------------------

// recupera le visite create/comprate dallo user
apiRouter.get("/my-visits", auth.isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const createdVisits = await visitController.getVisits(userId);

    const user = await User.findById(userId).populate({
      path: 'purchased_visits',
      populate: { path: 'works' }
    });
    const purchasedVisits = user.purchased_visits || [];

    const allVisits = [...createdVisits, ...purchasedVisits];
    const uniqueVisits = Array.from(new Map(allVisits.map(v => [v._id.toString(), v])).values());

    res.status(200).json(uniqueVisits);
  } catch (error) {
    console.error("Errore nel recupero delle visite: ", error);
    res
      .status(500)
      .json({ error: "Impossibile recuperare visite dal database" });
  }
});

// permette il salvataggio di una nuova visita (accessibile sia a curatori che a visitatori)
apiRouter.post("/visits", auth.isLoggedIn, async (req, res) => {
  try {
    const savedVisit = await visitController.createVisit(req.body, req.user);
    res.status(201).json({
      message: "Visita creata con successo!",
      visit: savedVisit,
    });
  } catch (error) {
    console.error("Errore nel salvataggio della visita:", error);
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ error: error.message || "Impossibile salvare la visita" });
  }
});

// Recupera tutte le visite **pubbliche** per il marketplace
apiRouter.get("/visits", async (req, res) => {
  try {
    const visits = await visitController.getPublicVisits();
    res.status(200).json(visits);
  } catch (error) {
    console.error("Errore nel recupero visite pubbliche:", error);
    res
      .status(500)
      .json({ error: "Impossibile recuperare le visite pubbliche" });
  }
});

// per l'apertura dei dettagli di una visita (compatibilità con Matteo)
apiRouter.get("/visits/:visitId/museum", async (req, res) => {
  try {
    const visit = await visitController.getVisitById(req.params.visitId, req.user);
    if (!visit) return res.status(404).json({ error: "visita non trovata" });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// per l'apertura dei dettagli di una visita
apiRouter.get("/visits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { roomCode } = req.query;
    
    // Controlliamo se esiste una stanza attiva per questa visita
    const sessions = req.app.locals.activeSessions;
    const isSharedValid = roomCode && sessions[roomCode] && sessions[roomCode].visitId === id;
    
    // Passiamo isSharedValid (true o false) al controller
    const visit = await visitController.getVisitById(id, req.user, isSharedValid);

    if(!visit) return res.status(404).json({ error: "visita non trovata" });

    const dictPath = path.join(__dirname, '..', '..', '..', 'navigator', 'src', 'data', 'dictionary.json');
    const dictRaw = await fs.readFile(dictPath, 'utf8');
    const dictionary = JSON.parse(dictRaw);
    //conversione in oggetto standard
    //Se "visit" è un documento Mongoose, bisogna convertirlo prima di poterci aggiungere roba, 
    //altrimenti la fusione con lo spread operator (...) fallirà
    const visitObj = visit.toObject ? visit.toObject() : visit;

    const isLogged = req.isAuthenticated();
    const userData = isLogged ? req.user : null;

    // Recuperiamo l'opera corrente se la sessione condivisa è attiva
    const currentArtworkId = (isSharedValid && sessions[roomCode]?.currentArtworkId) 
      ? sessions[roomCode].currentArtworkId 
      : null;

    res.status(200).json({
      visit: visitObj,
      commands_map: dictionary,
      user: userData,
      currentArtworkId: currentArtworkId // <-- Invia l'opera corrente attiva
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

// rotta per aggiornare una visita esistente
apiRouter.put("/visits/:id", auth.isLoggedIn, async (req, res) => {
  try {
    const updatedVisit = await visitController.editVisitById(
      req.params.id,
      req.body,
      req.user,
    );

    res.status(200).json(updatedVisit);
  } catch (error) {
    console.error("Errore durante l'aggiornamento della visita:", error);
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ error: error.message || "Errore interno del server" });
  }
});

// rotta per eliminare una visita o bozza
apiRouter.delete("/visits/:id", auth.isLoggedIn, async (req, res) => {
  try {
    await visitController.deleteVisitById(req.params.id, req.user);
    res.json({ message: "Visita eliminata con successo" });
  } catch (error) {
    console.error("Errore eliminazione visita:", error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || "Errore interno del server" });
  }
});

// Calcola la durata stimata della visita 
apiRouter.post("/visits/estimate-duration", async (req, res) => {
  try {
    const { workIds, preferredLength } = req.body;
    const duration = await visitController.estimateDuration(workIds, preferredLength);
    res.json({ duration });
  } catch (error) {
    console.error("CRASH DURANTE IL CALCOLO STIMA:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Calcola la lunghezza/tono ideale in base al tempo a disposizione
apiRouter.post("/visits/recommend-length", async (req, res) => {
  try {
    const { workIds, availableMinutes } = req.body;
    const recommendedLength = await visitController.recommendLength(workIds, parseInt(availableMinutes));
    res.json({ recommendedLength });
  } catch (error) {
    console.error("Errore nel calcolo del ritmo raccomandato:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------- ordini & checkout ----------------------------

// Riceve il carrello dal frontend e processa l'acquisto
apiRouter.post("/checkout", auth.isLoggedIn, async (req, res) => {
  try {
    const order = await orderController.processCheckout(req.user._id, req.body);
    
    res.status(201).json({ 
      message: "Checkout completato con successo!", 
      order: order 
    });
  } catch (error) {
    console.error("Errore durante il checkout:", error);
    res.status(500).json({ error: "Errore interno durante il processamento dell'ordine" });
  }
});

// Restituisce lo storico ordini dell'utente loggato
apiRouter.get("/my-orders", auth.isLoggedIn, async (req, res) => {
  try {
    const orders = await orderController.getUserOrders(req.user._id);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Errore nel recupero degli ordini:", error);
    res.status(500).json({ error: "Impossibile recuperare lo storico ordini" });
  }
});

// ----------------------- adoptions ----------------------------

// Crea richiesta di adozione (status: pending)
apiRouter.post("/adoptions", auth.isCurator, async (req, res) => {
  try {
    const adoption = await adoptionController.createAdoptionRequest(req.body, req.user);
    res.status(201).json({ message: "Richiesta di adozione inviata!", adoption });
  } catch (error) {
    console.error("Errore creazione adozione:", error);
    res.status(500).json({ error: error.message });
  }
});

// Recupera le adozioni del curatore loggato (sia inviate che ricevute)
apiRouter.get("/my-adoptions", auth.isCurator, async (req, res) => {
  try {
    const adoptions = await adoptionController.getUserAdoptions(req.user._id);
    res.json(adoptions);
  } catch (error) {
    console.error("Errore recupero adozioni:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rispondi alla richiesta (accetta 'accepted' o rifiuta 'refused')
apiRouter.put("/adoptions/:id/respond", auth.isCurator, async (req, res) => {
  try {
    const { status, toSectionId } = req.body;
    const adoption = await adoptionController.respondToAdoption(req.params.id, status, toSectionId, req.user);
    res.json({ message: `Adozione aggiornata in stato: ${status}`, adoption });
  } catch (error) {
    console.error("Errore risposta adozione:", error);
    const code = error.statusCode || 500;
    res.status(code).json({ error: error.message });
  }
});

// Conferma arrivo opera al museo di destinazione (status: active)
apiRouter.put("/adoptions/:id/arrive", auth.isCurator, async (req, res) => {
  try {
    const adoption = await adoptionController.confirmArrival(req.params.id, req.user);
    res.json({ message: "Arrivo confermato! L'opera è ora esposta nel tuo museo.", adoption });
  } catch (error) {
    console.error("Errore conferma arrivo:", error);
    const code = error.statusCode || 500;
    res.status(code).json({ error: error.message });
  }
});

// Termina l'adozione e restituisce l'opera al museo originario (status: completed)
apiRouter.put("/adoptions/:id/complete", auth.isCurator, async (req, res) => {
  try {
    const adoption = await adoptionController.completeAdoption(req.params.id, req.user);
    res.json({ message: "Adozione completata, opera restituita al museo originario!", adoption });
  } catch (error) {
    console.error("Errore completamento adozione:", error);
    const code = error.statusCode || 500;
    res.status(code).json({ error: error.message });
  }
});

// ----------------------- admin dashboard ----------------------------

// Recupera tutti gli utenti che hanno chiesto di diventare curatori
apiRouter.get("/admin/pending-curators", auth.isAdmin, async (req, res) => {
  try {
    // Troviamo chi ha il curator_status su 'pending'
    const pendingUsers = await User.find({ curator_status: 'pending' }, 'username email name role curator_status');
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: "Errore nel recupero delle richieste" });
  }
});

// Approva o rifiuta un curatore
apiRouter.put("/admin/curators/:id/respond", auth.isAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' o 'reject'
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    if (action === 'approve') {
      user.role = 'curator'; // Diventa curatore a tutti gli effetti
      user.curator_status = 'approved';
    } else if (action === 'reject') {
      user.curator_status = 'rejected'; // Rimane visitor
    } else {
      return res.status(400).json({ error: "Azione non valida" });
    }

    await user.save();
    res.json({ message: `Utente ${user.username} ${action === 'approve' ? 'approvato come curatore' : 'rifiutato'}.` });
  } catch (error) {
    res.status(500).json({ error: "Errore durante l'aggiornamento del ruolo" });
  }
});

// ----------------------- authors ----------------------------

// Cerca autori (GET /api/authors/search?q=leonardo)
apiRouter.get("/authors/search", auth.isCurator, async (req, res) => {
  try {
    const authors = await authorController.searchAuthors(req.query.q);
    res.json(authors);
  } catch (error) {
    console.error("Errore ricerca autori:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Ottieni i dettagli completi di un autore e delle sue descrizioni
apiRouter.get("/authors/:id", auth.isCurator, async (req, res) => {
  try {
    const author = await authorController.getAuthorById(req.params.id);
    res.json(author);
  } catch (error) {
    console.error("Errore recupero autore:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Crea un nuovo autore
apiRouter.post("/authors", auth.isCurator, async (req, res) => {
  try {
    const savedAuthor = await authorController.createAuthor(req.body);
    res.status(201).json(savedAuthor);
  } catch (error) {
    console.error("Errore creazione autore:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Aggiungi una nuova scheda descrittiva a un autore esistente
apiRouter.put("/authors/:id/data", auth.isCurator, async (req, res) => {
  try {
    const updatedAuthor = await authorController.addAuthorData(req.params.id, req.body);
    res.json(updatedAuthor);
  } catch (error) {
    console.error("Errore aggiornamento autore:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Usa una descrizione dell'autore esistente
apiRouter.put("/authors/:id/data/:dataId/adopt", auth.isCurator, async (req, res) => {
  try {
    const updatedAuthor = await authorController.adoptAuthorData(req.params.id, req.params.dataId, req.body.museumId);
    res.json(updatedAuthor);
  } catch (error) {
    console.error("Errore adozione card autore:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// ----------------------- styles ----------------------------

apiRouter.get("/styles/search", auth.isCurator, async (req, res) => {
  try {
    const styles = await styleController.searchStyles(req.query.q);
    res.json(styles);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

apiRouter.get("/styles/:id", auth.isCurator, async (req, res) => {
  try {
    const style = await styleController.getStyleById(req.params.id);
    res.json(style);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

apiRouter.post("/styles", auth.isCurator, async (req, res) => {
  try {
    const savedStyle = await styleController.createStyle(req.body);
    res.status(201).json(savedStyle);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

apiRouter.put("/styles/:id/data", auth.isCurator, async (req, res) => {
  try {
    const updatedStyle = await styleController.addStyleData(req.params.id, req.body);
    res.json(updatedStyle);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Usa una definizione di stile esistente
apiRouter.put("/styles/:id/data/:dataId/adopt", auth.isCurator, async (req, res) => {
  try {
    const updatedStyle = await styleController.adoptStyleData(req.params.id, req.params.dataId, req.body.museumId);
    res.json(updatedStyle);
  } catch (error) {
    console.error("Errore adozione stile:", error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// ----------------------- AI ----------------------------

// Rotta per generare testi con l'IA (protetta per i soli curatori/admin)
apiRouter.post("/ai/generate", auth.isCurator, async (req, res) => {
  try {
    // Il frontend ci manderà il prompt da eseguire
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Il prompt è obbligatorio." });
    }

    const generatedText = await aiController.generateContent(prompt);
    
    res.json({ text: generatedText });
  } catch (error) {
    res.status(500).json({ error: "Errore durante la generazione del testo con l'IA." });
  }
});

// Rotta ufficiale per generare le descrizioni di un'opera e salvarle nel DB
apiRouter.post("/ai/generate-work-desc", async (req, res) => {
  const { workId, workName, userDescription } = req.body;

  if (!workId || !workName) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  // Rispondiamo SUBITO al frontend per non bloccare l'interfaccia
  res.status(202).json({ message: "Generazione avviata in background..." });

  // MA lanciamo la funzione senza l'await, così il server ci lavora in parallelo!
  aiController.generateAndSaveWorkDescriptions(workId, workName, userDescription);
});

// Generazione descrizione autori
apiRouter.post("/ai/generate-author-desc", async (req, res) => {
  const { authorId, museumId, authorName, userDescription } = req.body;
  if (!authorId || !authorName || !museumId) return res.status(400).json({ error: "Dati mancanti" });

  res.status(202).json({ message: "Generazione biografia avviata in background..." });
  aiController.generateAndSaveAuthorDescription(authorId, museumId, authorName, userDescription);
});

// Generazione descrizione stili
apiRouter.post("/ai/generate-style-desc", async (req, res) => {
  const { styleId, museumId, styleName, userDescription } = req.body;
  if (!styleId || !styleName || !museumId) return res.status(400).json({ error: "Dati mancanti" });

  res.status(202).json({ message: "Generazione stile avviata in background..." });
  aiController.generateAndSaveStyleDescription(styleId, museumId, styleName, userDescription);
});

// Associazione targetAge per gli itetms
apiRouter.post("/ai/generate-item-targetage", async (req,res) => {
  const { itemId, itemName, itemDescription } = req.body;
  if(!itemId || !itemName || !itemDescription) return res.status(400).json({ error: "Dati mancanti" });

  res.status(202).json({ message: "Associazione targetAge avviata in background..." });
  aiController.generateAndSaveItemTargetAge(itemId, itemName, itemDescription);
});

apiRouter.post("/ai/map-request", async (req,res) => {
  try {
      const { prompt } = req.body;

    if(!prompt) return res.status(400).json({ error: "la richiesta è vuota"});

    const mapped_request = await aiController.mapRequest(prompt);
    res.status(200).json(mapped_request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/ai/suggested-works", async (req,res) => {
  try {
      const { payloadForAI } = req.body;

    if(!payloadForAI) return res.status(400).json({ error: "la richiesta è vuota"});

    const suggested_works = await aiController.suggestWorks(payloadForAI);
    res.status(200).json(suggested_works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------ Quiz --------------------------

// Salva i risultati di un quiz di gruppo
apiRouter.post('/quiz-results', auth.isLoggedIn, async (req, res) => {
  try {
    const { visitId, roomCode, results } = req.body;

    // Trasformiamo il dizionario React (oggetto) in un Array piatto per Mongoose
    const resultsArray = Object.keys(results).map(studentId => ({
      studentName: results[studentId].name,
      score: results[studentId].score,
      answers: results[studentId].history
    }));

    const newReport = new QuizReport({
      visitId,
      guideId: req.user._id,
      roomCode,
      results: resultsArray
    });

    await newReport.save();
    res.status(201).json({ success: true, reportId: newReport._id });
  } catch (error) {
    console.error("Errore salvataggio report del quiz:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Recupera i risultati dei quiz
apiRouter.get('/quiz-results/:id', auth.isLoggedIn, async (req, res) => {
  try {
    const report = await QuizReport.findById(req.params.id).populate('visitId', 'title quiz');
    if (!report) return res.status(404).json({ error: 'Report non trovato' });
    
    // Sicurezza: solo l'insegnante che l'ha generato (o un admin) può scaricarlo
    if (report.guideId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       return res.status(403).json({ error: 'Accesso negato' });
    }
    
    res.json(report);
  } catch (error) {
    console.error("Errore recupero report:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Aggiungi questa rotta in apirouter.js per ottenere la lista dei report
apiRouter.get('/my-quiz-results', auth.isLoggedIn, async (req, res) => {
  try {
    // Recuperiamo tutti i report dell'insegnante, ordinati dal più recente
    const reports = await QuizReport.find({ guideId: req.user._id })
                                    .populate('visitId', 'title')
                                    .sort({ date: -1 });
    
    res.json(reports);
  } catch (error) {
    console.error("Errore recupero lista report:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ---------------- Gestione DB ---------------------
apiRouter.get("/downloadDB", async (req, res) => {
  try {
    console.log("Inizio esportazione di tutto il DB...");
    
    // Costruiamo il percorso assoluto alla cartella 'data' in modo sicuro
    // (Aggiusta i '..' in base a dove si trova questo file router)
    const dataFolder = path.join(__dirname, '..', '..', 'data');

    // 1. Recupero di tutti i dati dai controller
    const collections = {
      'museum.json': await museumController.getAllMuseums(),
      'item.json': await itemController.getAllItems(),
      'work.json': await workController.getAllWorks(),
      'section.json': await sectionController.getAllSections(),
      'visit.json': await visitController.getAllVisits(),
      'order.json': await orderController.getAllOrders(),
      'adoption.json': await adoptionController.getAllAdoptions(),
      'author.json': await authorController.getAllAuthors(),
      'style.json': await styleController.getAllStyles()
    };

    // 2. Scrittura dinamica di tutti i file
    for (const [filename, data] of Object.entries(collections)) {
      const filePath = path.join(dataFolder, filename);
      
      // Trasformiamo i dati in formato JSON ben formattato (null, 2 serve per l'indentazione)
      const jsonData = JSON.stringify(data, null, 2);
      
      await fs.writeFile(filePath, jsonData, 'utf8');
      console.log(`${filename} scritto con successo!`);
    }

    // 3. Comunichiamo al client che abbiamo finito
    res.status(200).json({ message: "Backup completo del database eseguito con successo!" });

  } catch (e) {
    console.error("Errore durante l'esportazione:", e);
    // Rispondiamo anche in caso di errore per non far bloccare il client
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/uploadDB', async (req,res) => {
  try {
    console.log("Inizio importazione dei dati nel DB...");

    // Costruiamo il percorso assoluto alla cartella 'data'
    const dataFolder = path.join(__dirname, '..', '..', 'data');

    // Creiamo un array di "task" che accoppia il nome del file alla funzione giusta
    const uploadTasks = [
      { file: 'museum.json', uploadFunction: museumController.uploadAllMuseums },
      { file: 'item.json', uploadFunction: itemController.uploadAllItems },
      { file: 'work.json', uploadFunction: workController.uploadAllWorks },
      { file: 'section.json', uploadFunction: sectionController.uploadAllSections },
      { file: 'visit.json', uploadFunction: visitController.uploadAllVisits },
      { file: 'order.json', uploadFunction: orderController.uploadAllOrders },
      { file: 'adoption.json', uploadFunction: adoptionController.uploadAllAdoptions },
      { file: 'author.json', uploadFunction: authorController.uploadAllAuthors },
      { file: 'style.json', uploadFunction: styleController.uploadAllStyles }
    ];

    // Eseguiamo il ciclo in modo sequenziale per non sovraccaricare il database
    for (const task of uploadTasks) {
      const filePath = path.join(dataFolder, task.file);

      try {
        // 1. Legge il file dalla cartella come stringa di testo
        const rawData = await fs.readFile(filePath, 'utf8');

        // 2. Trasforma la stringa in un vero array/oggetto JavaScript
        const parsedData = JSON.parse(rawData);

        // 3. Passa i dati convertiti alla funzione del tuo controller
        await task.uploadFunction(parsedData);

        console.log(`${task.file} caricato con successo!`);
      } catch (fileError) {
        // Gestiamo l'errore del singolo file senza bloccare necessariamente gli altri
        console.error(`Errore durante il caricamento di ${task.file}:`, fileError.message);
        // Se preferisci che l'intera rotta si blocchi al primo errore, de-commenta la riga sotto:
        // throw fileError; 
      }
    }

    // Rispondiamo al client che l'operazione è finita
    res.status(200).json({ message: "Importazione del database completata con successo!" });

  } catch (e) {
    console.error("Errore critico durante l'importazione:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- CONFIGURAZIONE MUSEI DINAMICA ---
apiRouter.get("/config/default", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const configCollection = db.collection('config');
    const defaultDoc = await configCollection.findOne({ filename: "defaultconfig.json" });
    if (!defaultDoc) {
      return res.status(404).json({ error: "Configurazione di default non trovata nel database" });
    }
    res.json(defaultDoc.config);
  } catch (err) {
    res.status(500).json({ error: "Errore del server: " + err.message });
  }
});

apiRouter.get("/config/by-museum/:museumName", async (req, res) => {
  try {
    const museumName = req.params.museumName;
    const db = mongoose.connection.db;
    const configCollection = db.collection('config');
    
    // Cerchiamo un config che abbia lo stesso nome del museo nel campo "config.name"
    const configDoc = await configCollection.findOne({ "config.name": museumName });
    
    if (!configDoc) {
      return res.status(404).json({ error: "Configurazione specifica non trovata per questo museo" });
    }
    
    res.json(configDoc.config);
  } catch (err) {
    res.status(500).json({ error: "Errore del server: " + err.message });
  }
});

module.exports = apiRouter;
