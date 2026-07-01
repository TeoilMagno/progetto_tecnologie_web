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