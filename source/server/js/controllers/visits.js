const Visit = require("../models/visits");

exports.createVisit = async (visitPayload, user) => {
  const {
    title,
    description,
    museumId,
    works,
    price,
    isDraft,
    isPublic,
    duration,
    language,
  } = visitPayload;

  // dati di base della visita
  const visitData = {
    title,
    description,
    museumId,
    creator: user._id, // Preso automaticamente dalla sessione
    works,
    duration,
    language: language || "it",
  };

  // logica differenziata in base al ruolo
  if (user.role === "curator" || user.role === "admin") {
    // Il curatore può decidere liberamente prezzo e visibilità
    visitData.price = price || 0;
    visitData.isDraft = isDraft !== undefined ? isDraft : true;
    visitData.isPublic = isPublic !== undefined ? isPublic : false;
  } else {
    visitData.price = 0;
    visitData.isDraft = false;
    visitData.isPublic = false; // Sempre privata, non va sul marketplace
  }

  const newVisit = new Visit(visitData);
  return await newVisit.save();
};

exports.getVisits = async (userId) => {
  return await Visit.find({ creator: userId }).populate('museumId')
}

exports.getVisitById = async (visitId, user) => {
  const visit = await Visit.findById(visitId).populate('museumId').populate('works'); 

  if (!visit) {
    const error = new Error("Visita non trovata");
    error.statusCode = 404;
    throw error;
  }

  // Passa se è pubblica, o se l'utente è il creatore/admin
  if (visit.isPublic || user?.role === "admin" || visit.creator.toString() === user?._id?.toString() ) {
    return visit;
  } else {
    const error = new Error("Accesso negato: questa visita è privata");
    error.statusCode = 403;
    throw error;
  }
};

exports.editVisitById = async (visitId, payload, user) => {
  const query = { _id: visitId };

  // Se NON è admin, limitiamo la modifica solo alla visita creata dall'utente
  if (user.role !== 'admin') {
    query.creator = user._id;
  }
  
  // Troviamo e aggiorniamo SOLO se l'ID corrisponde e il creatore è l'utente corrente
  const updatedVisit = await Visit.findOneAndUpdate(      
    query,
    payload,
    { new: true } // Opzione per farci restituire il documento aggiornato
  );

  if (!updatedVisit) {
    const error = new Error("Visita non trovata nel database o non sei autorizzato a modificarla");
    error.statusCode = 403;
    throw error;
  }
  
  return updatedVisit;
}

exports.getPublicVisits = async () => {
  // Cerchiamo le visite completate (non bozze) e pubbliche
  const visits = await Visit.find({ isPublic: true, isDraft: false })
    .populate('museumId')
    .populate('works');

  return visits;
};