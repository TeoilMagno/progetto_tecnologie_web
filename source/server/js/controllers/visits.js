const Visit = require("../models/visits");

exports.createVisit = async (visitPayload, user) => {
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
  } = visitPayload;

  // Sicurezza: Verifichiamo che l'utente sia loggato (grazie al nostro mock/passport)
  if (!user) {
    const error = new Error("Devi essere autenticato per creare una visita");
    error.statusCode = 401;
    throw error;
  }

  // Prepariamo i dati di base della visita
  const visitData = {
    title,
    description,
    museum: museumId,
    creator: user._id, // Preso automaticamente dalla sessione
    items, // Array ordinato di ObjectId delle opere
    duration,
    language: language || "it",
  };

  // GESTIONE LOGICA DIFFERENZIATA IN BASE AL RUOLO
  if (user.role === "curator") {
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
  return await newVisit.save();
};

exports.getVisits = async (UserId) => {
  return await Visit.find({ creator: userId }).populate('museum')
}

exports.getVisitById = async (visitId) => {
  const visit = await Visit.findById(visitId).populate('museum').populate('items'); // ci servono le informazioni delle opere

  if (!visit) {
    const error = new Error("Visita non trovata");
    error.statusCode = 404;
    throw error;
  }
  return visit;
};

exports.editVisitById = async (visitId, payload) => {
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
    const error = new Error("Visita non trovata nel database.");
    error.statusCode = 404;
    throw error;
  }
  
  return updatedVisit;
}
