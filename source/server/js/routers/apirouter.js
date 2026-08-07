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
const { Section } = require("../models/sections");
const Museum = require("../models/museums");

// Controllers
const museumController = require("../controllers/museums");
const itemController = require("../controllers/items");
const workController = require("../controllers/works");
const sectionController = require("../controllers/sections");
const visitController = require("../controllers/visits");
const orderController = require("../controllers/orders");

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

apiRouter.get("/visits/:visitId/museum", async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const visit = await visitController.getVisitById(req.params.visitId, userId);

    if(!visit) return res.status(404).json({ error: "visita non trovata" });

    res.json(visit);
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
    const museumIdStr = req.params.id;

    let museumObjectId;
    museumObjectId = new mongoose.Types.ObjectId(museumIdStr);

    const directWorks = await Work.find({ museumId: museumObjectId });

    const allWorks = Array.from(directWorks.values());

    res.json(allWorks);
  } catch (error) {
    console.error("Errore nel recupero delle opere:", error);
    res.status(500).json({ error: "Errore nel recupero delle opere" });
  }
});

// TODO: manca il lato frontend di queste rott e edi quelle per le sezioni
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
apiRouter.delete("/works/:id", auth.isCurator, async (req, res) => {
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

//------------------ form ------------------------

// Rotta per creare e aggiungere un'opera sul db
// * il frontend deve inviare museumId
apiRouter.post("/add-work", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { work, sectionId, museumId } = req.body;

    // salva la nuova opera su MongoDB
    const newWork = new Work({
      ...work,
      museumId: museumId // evitiamo che l'utente si inventi cose
    });
    const savedWork = await newWork.save();

    // collega l'ID dell'opera alla sezione tramite il controller
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

//------------------ user ------------------------

// restituisce l'utente loggato, o null se non autenticato
apiRouter.get("/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
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
    // Se è Admin, restituiamo TUTTI i musei del DB
    if (req.user.role === "admin") {
      const allMuseums = await museumController.getAllMuseums();
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

// TODO: per ora solo create -> ampliare con comprate
// recupera le visite create/comprate dallo user
apiRouter.get("/my-visits", auth.isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const visits = await visitController.getVisits(userId);
    res.status(200).json(visits);
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

// per l'apertura dei dettagli di una visita
apiRouter.get("/visits/:id", async (req, res) => {
  try {
    const visit = await visitController.getVisitById(req.params.id, req.user);
    res.status(200).json(visit);
  } catch (error) {
    console.error("Errore nel recupero della visita:", error);
    const status = error.statusCode || 500;
    res
      .status(status)
      .json({ error: error.message || "Impossibile recuperare la visita" });
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

module.exports = apiRouter;
