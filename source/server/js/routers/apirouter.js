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
const Adoption = require("../models/adoptions");
const Visit = require("../models/visits");

// Controllers
const museumController = require("../controllers/museums");
const itemController = require("../controllers/items");
const workController = require("../controllers/works");
const sectionController = require("../controllers/sections");
const visitController = require("../controllers/visits");
const orderController = require("../controllers/orders");
const adoptionController = require("../controllers/adoptions");
const authorController = require("../controllers/authors");

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

// -------------- rooms -----------------------

// Aggiungi una stanza a una sezione
// * nel body deve esserci il museumId
apiRouter.post("/sections/:sectionId/rooms", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { roomData, museumId } = req.body;
    const newRoom = await sectionController.addRoomToSection(req.params.sectionId, roomData, museumId);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error("Errore aggiunta stanza:", error);
    res.status(500).json({ error: error.message });
  }
});

// Modifica (rinomina) una Stanza
// * nel body deve esserci il museumId
apiRouter.put("/sections/:sectionId/rooms/:roomId", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { roomData, museumId } = req.body;
    const updatedRoom = await sectionController.updateRoomInSection(req.params.sectionId, req.params.roomId, roomData, museumId);
    res.json(updatedRoom);
  } catch (error) {
    console.error("Errore modifica stanza:", error);
    res.status(500).json({ error: error.message });
  }
});

// Elimina una Stanza
// * nel body deve esserci il museumId
apiRouter.delete("/sections/:sectionId/rooms/:roomId", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { museumId } = req.body;
    await sectionController.deleteRoomFromSection(req.params.sectionId, req.params.roomId, museumId);
    res.json({ message: "Stanza eliminata con successo" });
  } catch (error) {
    console.error("Errore eliminazione stanza:", error);
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

//------------------ form ------------------------

// Rotta per creare e aggiungere un'opera sul db
// * il frontend deve inviare museumId e roomId (se l'opera è in una stanza)
apiRouter.post("/add-work", [auth.isCurator, auth.isMuseumOwner], async (req, res) => {
  try {
    const { work, sectionId, museumId } = req.body;

    // Salviamo la nuova opera inserendo esplicitamente il roomId e il museumId verificato
    const newWork = new Work({
      ...work,
      museumId: museumId, // Evitiamo che l'utente si inventi cose
      roomId: work.roomId || null, // Valorizza il campo roomId sul DB!
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

//------------------ user ------------------------

// restituisce l'utente loggato, o null se non autenticato
apiRouter.get("/current-user", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
      _id: req.user._id,
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

// TODO: controllare sicurezza -> auth.isMuseumOwner
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
    const { status, targetRoomId } = req.body;
    const adoption = await adoptionController.respondToAdoption(req.params.id, status, targetRoomId, req.user);
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

module.exports = apiRouter;
