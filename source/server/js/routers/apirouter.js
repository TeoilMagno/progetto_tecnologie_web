/*
    Js contente gil end-point per le chiamate API

    Gestore dei dati
*/

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

// Models
const { User } = require("../models/users");
const Work = require("../models/works");

// Controllers
const museumController = require("../controllers/museums");
const itemController = require("../controllers/items");
const sectionController = require("../controllers/sections");
const visitController = require("../controllers/visits");

// Middleware
const auth = require("../middleware/roles");

const apiRouter = express.Router();

//--------------- museums -----------------------

// ritorna tutti i musei del db
apiRouter.get("/museums", async (req, res) => {
  try {
    const museums = await museumController.getAllMuseums();

    if (!museums) return res.status(404).json({ error: "Musei non trovati" });

    res.json(museums);
  } catch (error) {
    res.status(500).json({ error: "Errore recupero musei" });
  }
});

// salva il museo sul db
// ! era salvataggio sincrono
// apiRouter.post('/add-museum', async (req,res) =>{
//   try {
//     const {name, address, contact_email, contact_phone, sections=[], image, tags=[]} = req.body;

//     const tagsArray = tags
//       .split(',')
//       .map(tag => tag.trim())
//       .filter(tag => tag.length > 0);

//     const museum = {name, address, contact_email, contact_phone, sections, image, tags: tagsArray};
//     const result = await museumController.saveMuseum(museum);

//     res.redirect(`/museums/${result.id}/add-sections`);
//   } catch (error) {
//     console.log("Errore nella post per add-museum: ", error);
//     res.status(500).json({error: "errore durante il salvataggio"});
//   }
// });

apiRouter.post("/add-section", async (req, res) => {
  // qualcosa
});

apiRouter.post("/add-work", async (req, res) => {
  // qualcosa
});

//--------------- items -----------------------

// ritorna oggetto di un museo specifico
apiRouter.get("/museums/:id/items", async (req, res) => {
  try {
    // Rimosso parseInt(): Mongo gestisce automaticamente la conversione da stringa a ObjectId
    // Mongo gestisce automaticamente la conversione da stringa a ObjectId
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
apiRouter.put("/items/:id", auth.isCurator, async (req, res) => {
  try {
    const itemId = req.params.id;
    const updateData = req.body;

    const updatedItem = await itemController.modifyItemById(
      itemId, // Mongoose accetta direttamente l'ID stringa qui
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

apiRouter.get("/museums/:id/works", async (req, res) => {
  try {
    const museumIdStr = req.params.id;
    
    let museumObjectId;
    museumObjectId = new mongoose.Types.ObjectId(museumIdStr);
    
    const directWorks = await Work.find({ museumId: museumObjectId });

    const allWorks = Array.from(directWorks.values());

    console.log(`[GET /museums/${museumIdStr}/works] Trovate ${allWorks.length} opere.`);

    res.json(allWorks);
  } catch (error) {
    console.error("Errore nel recupero delle opere:", error);
    res.status(500).json({ error: "Errore nel recupero delle opere" });
  }
});

//--------------- sections -----------------------

// ritorna un item data la sezione specifica
apiRouter.get("/sections/:sectionId/works", async (req, res) => {
  try {
    const works = await sectionController.getWorksBySection(
      req.params.sectionId,
    );
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ritorna le sezioni di un museo dato
apiRouter.get("/museums/:museumId/sections", async (req, res) => {
  try {
    const sections = await sectionController.getSectionsByMuseum(
      req.params.museumId,
    );
    res.json(sections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//------------------ form ------------------------

apiRouter.post("/save-section", auth.isCurator, async (req, res) => {
    try {
        const { rsection, museumId } = req.body;
        const sectionId = await sectionController.saveSection(rsection, museumId);
        res.status(201).json(sectionId);
    } catch(error) {
        console.error("Errore nel salvataggio sezione:", error);
        res.status(500).json({ error: "Errore durante il salvataggio della sezione" });
    }
});

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

//? File config
apiRouter.get("/config", async (req, res) => {
  try {
    console.log("/api/config");
    res.sendFile(path.join(__dirname, "..", "..", "config", "config.json"));
  } catch (err) {
    console.log("Errore config");
  }
});

//------------------ user ------------------------
// restituisce l'utente loggato, o null se non autenticato
apiRouter.get("/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      username: req.user.username || req.user.name,
      role: req.user.role,
    });
  } else {
    res.json(null);
  }
});

// Ottiene i musei gestiti dal curatore loggato
apiRouter.get("/my-museums", auth.isCurator, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("managed_museums");

    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    // Restituiamo solo l'array dei musei gestiti
    res.json(user.managed_museums || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nel recupero dei tuoi musei" });
  }
});

// ----------------------- visits ----------------------------
// TODO: per ora solo create -> ampliare con comprate
// recupera le visite create/comprate dallo user
apiRouter.get("/my-visits", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Sessione scaduta. Effettua di nuovo il login." });
      }

      const userId = req.user._id;
      const visits = await visitController.getVisits(userId);
      res.status(200).json(visits);
    } catch(error) {
      console.error("Errore nel recupero delle visite: ", error);
      res.status(500).json({ error: "Impossibile recuperare visite dal database" });
    }
});

// permette il salvataggio di una nuova visita (accessibile sia a curatori che a visitatori)
apiRouter.post("/visits", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Sessione scaduta. Effettua di nuovo il login." });
      }
      // Passiamo dati e utente al controller
      const savedVisit = await visitController.createVisit(req.body, req.user);
      res.status(201).json({
          message: "Visita creata con successo!",
          visit: savedVisit,
      });
    } catch(error) {
      console.error("Errore nel salvataggio della visita:", error);
      // Leggiamo il codice di stato dal throw (se presente), altrimenti diamo 500
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message || "Impossibile salvare la visita" });
    }
});

// per l'apertura dei dettagli di una visita
apiRouter.get("/visits/:id", async (req, res) => {
    try {
        const visit = await visitController.getVisitById(req.params.id);
        res.status(200).json(visit);
    } catch(error) {
        console.error("Errore nel recupero della visita:", error);
        const status = error.statusCode || 500;
        res.status(status).json({ error: error.message || "Impossibile recuperare la visita" });
    }
});

// ROTTA PER AGGIORNARE UNA VISITA ESISTENTE (PUT)
apiRouter.put("/visits/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Accesso negato. Fai il login." });
      }
      
      const updatedVisit = await visitController.editVisitById(req.params.id, req.body, req.user._id);
      res.status(200).json(updatedVisit);
    } catch(error) {
      console.error("Errore durante l'aggiornamento della visita:", error);
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message || "Errore interno del server" });
    }
});

module.exports = apiRouter;
