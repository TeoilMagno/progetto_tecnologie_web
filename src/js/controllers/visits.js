const Visit = require("../models/visits.js");

exports.createVisit = async (req, res) => {
  try {
    const {
      title,
      description,
      museumId,
      items,
      price,
      isDraft,
      isPublic,
      duration,
      language,
    } = req.body;

    // Sicurezza: Verifichiamo che l'utente sia loggato (grazie al nostro mock/passport)
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Devi essere autenticato per creare una visita" });
    }

    // Prepariamo i dati di base della visita
    const visitData = {
      title,
      description,
      museum: museumId,
      creator: req.user._id, // Preso automaticamente dalla sessione
      items, // Array ordinato di ObjectId delle opere
      duration,
      language: language || "it",
    };

    // GESTIONE LOGICA DIFFERENZIATA IN BASE AL RUOLO
    if (req.user.role === "curator") {
      // Il curatore può decidere liberamente prezzo e visibilità
      visitData.price = price || 0;
      visitData.isDraft = isDraft !== undefined ? isDraft : true;
      visitData.isPublic = isPublic !== undefined ? isPublic : false;
    } else {
      // Il visitatore normale crea SEMPRE visite private non in vendita
      visitData.price = 0;
      visitData.isDraft = false; // Per il visitatore è subito attiva/pronta
      visitData.isPublic = false; // Sempre privata, non va sul marketplace
    }

    // Creiamo e salviamo il documento nel DB
    const newVisit = new Visit(visitData);
    const savedVisit = await newVisit.save();

    res.status(201).json({
      message: "Visita creata con successo!",
      visit: savedVisit,
    });
  } catch (error) {
    console.error("Errore nel salvataggio della visita:", error);
    res
      .status(500)
      .json({ error: "Impossibile salvare la visita nel database" });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const userId = req.user._id; // user_id certificato da passport
    const visits = await Visit.find({ creator: userId }).populate('museum')

    res.status(200).json(visits);
  } catch(error) {
    console.error("Errore nel recupero delle visite: ", error);
    res
      .status(500)
      .json({ error: "Impossibile recuperare visite dal database" });
  }
}

exports.getVisitById = async (req, res) => {
  try {
    const visitId = req.params.id;
    const visit = await Visit.findById(visitId).populate('museum').populate('items'); // ci servono le informazioni delle opere

    if (!visit) {
      return res.status(404).json({ error: "Visita non trovata" });
    }

    res.status(200).json(visit);
  } catch (error) {
    console.error("Errore nel recupero della visita specifica:", error);
    res.status(500).json({ error: "Impossibile recuperare i dettagli della visita" });
  }
};

exports.editVisitById = async (req, res) => {
  try {
    const visitId = req.params.id;
    const payload = req.body;

    // Supponendo che tu stia usando Mongoose/MongoDB, aggiorniamo il documento.
    // Adatta i nomi dei campi in base a come hai definito lo Schema nel tuo database!
    const updatedVisit = await Visit.findByIdAndUpdate(
      visitId,
      {
        title: payload.title,
        description: payload.description,
        museum: payload.museumId, // Se nel tuo schema DB si chiama 'museum'
        items: payload.items,      // Array di ID delle opere
        price: payload.price,
        isPublic: payload.isPublic,
        isDraft: payload.isDraft
      },
      { new: true } // Questo flag serve a restituire la visita già aggiornata
    );

    // Se la visita non esiste nel database, restituiamo un JSON di errore (non HTML!)
    if (!updatedVisit) {
      return res.status(404).json({ error: "Visita non trovata nel database." });
    }

    // Rispondiamo al frontend con il JSON della visita aggiornata
    res.json(updatedVisit);

  } catch (error) {
    console.error("Errore durante l'aggiornamento della visita:", error);
    res.status(500).json({ error: "Errore interno del server durante il salvataggio." });
  }
}