const Visit = require("../models/visits");
const Work = require("../models/works");
const { calculateVisitDuration, recommendLengthForTime } = require('../utils/visitCalculator')

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
    preferredLength
  } = visitPayload;

  // dati di base della visita
  const visitData = {
    title,
    description,
    museumId,
    creator: user._id, // Preso automaticamente dalla sessione
    works,
    duration,
    preferredLength,
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
  return await Visit.find({ creator: userId })
    .populate('museumId')
    .populate({ path: 'works', populate: { path: 'adoptionId' } });
}

exports.getVisitById = async (visitId, user) => {
  const visit = await Visit.findById(visitId).populate('museumId')
    .populate('works')
    .populate({ path: 'works', populate: { path: 'adoptionId' } }); 

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
    .populate('works')
    .populate({ path: 'works', populate: { path: 'adoptionId' } });

  return visits;
};

exports.deleteVisitById = async (visitId, user) => {
  const query = { _id: visitId };

  // Se NON è admin, limitiamo l'eliminazione alla sole visite create dall'utente
  if (user.role !== 'admin') {
    query.creator = user._id;
  }

  const deletedVisit = await Visit.findOneAndDelete(query);

  if (!deletedVisit) {
    const error = new Error("Visita non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }

  return deletedVisit;
};

exports.estimateDuration = async (workIds, preferredLength) => {
  // Se non ci sono opere selezionate, il tempo è 0
  if (!workIds || workIds.length === 0) {
    return 0;
  }

  // recuperiamo i roomId delle opere
  const works = await Work.find({ _id: { $in: workIds } }).select('_id roomId');

  // Mongoose non garantisce l'ordine con l'operatore $in.
  // Riordiniamo l'array rispettando l'ordine esatto inviato dal frontend.
  const orderedWorks = workIds.map(id => 
    works.find(w => w._id.toString() === id.toString())
  ).filter(w => w != null);

  // Restituiamo il calcolo pulito
  return calculateVisitDuration(orderedWorks, preferredLength);
};

exports.recommendLength = async (workIds, availableMinutes) => {
  if (!workIds || !Array.isArray(workIds)) return 'medium';
  
  // Per questo calcolo ci basta sapere QUANTE opere ci sono
  const worksCount = workIds.length;
  
  // Utilizziamo la funzione matematica che avevamo già preparato
  return recommendLengthForTime(worksCount, availableMinutes);
};