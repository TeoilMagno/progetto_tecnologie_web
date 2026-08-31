const Visit = require("../models/visits");
const Work = require("../models/works");
const { User } = require("../models/users")
const { calculateVisitDuration, recommendLengthForTime } = require('../utils/visitCalculator')
const { deleteLocalFile } = require("../utils/file-helper");

exports.getAllVisits = async () => {
  try {
    return await Visit.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllVisits = async (data) => {
  try {
    let cleared = await Visit.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Visit.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

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
    maxDuration,
    language,
    preferredLength,
    expertiseLevel,
    targetAudience, 
    accessibility,  
    coverImage,
    quiz
  } = visitPayload;

  // dati di base della visita
  const visitData = {
    title,
    description,
    museumId,
    creator: user._id, // Preso automaticamente dalla sessione
    works,
    duration,
    maxDuration,
    preferredLength,
    expertiseLevel,
    language: language || "it",
  };

  if(coverImage) visitData.coverImage = coverImage;

  if (quiz && Array.isArray(quiz) && quiz.length > 0) {
    visitData.quiz = quiz;
  }

  // logica differenziata in base al ruolo
  if (user.role === "curator" || user.role === "admin") {
    // Il curatore può decidere liberamente prezzo e visibilità
    visitData.isDraft = isDraft !== undefined ? isDraft : true;
    visitData.isPublic = isPublic !== undefined ? isPublic : false;
    if(visitData.isPublic) {
      visitData.price = price || 0;
      if (targetAudience?.length > 0) visitData.targetAudience = targetAudience;
      if (accessibility?.length > 0) visitData.accessibility = accessibility;
    }
  } else {
    visitData.isDraft = false;
    visitData.isPublic = false; // Sempre privata, non va sul marketplace
  }

  const newVisit = new Visit(visitData);
  const savedVisit = await newVisit.save();

  // AGGIUNTO: Aggiorniamo le preferenze globali dell'utente se ha cambiato il registro
  if (visitPayload.expertiseLevel && user._id && user.preferences.expertiseLevel !== visitPayload.expertiseLevel) {
    await User.findByIdAndUpdate(user._id, { 
      $set: { 'preferences.expertiseLevel': visitPayload.expertiseLevel } 
    });
  }

  return savedVisit;
};

exports.getVisits = async (userId) => {
  // Trova le visite create dall'utente
  const created = await Visit.find({ creator: userId })
    .populate('museumId')
    .populate({ path: 'works', populate: { path: 'adoptionId' } });

  // Trova l'utente per prenderne le visite acquistate/salvate
  const { User } = require('../models/users');
  const user = await User.findById(userId).populate({
    path: 'purchased_visits',
    populate: [
      { path: 'museumId' },
      { path: 'works' }
    ]
  });

  const purchased = user?.purchased_visits || [];

  // Combina gli array evitando duplicati per ID
  const allVisits = [...created];
  purchased.forEach(pVisit => {
    if (pVisit && !allVisits.some(v => v._id.toString() === pVisit._id.toString())) {
      allVisits.push(pVisit);
    }
  });

  return allVisits;
};

exports.getVisitById = async (visitId, user, isShared = false) => {
  const visit = await Visit.findById(visitId).populate('museumId')
    .populate('works')
    .populate('creator', 'username email')
    .populate({ path: 'works', populate: { path: 'adoptionId' } }); 

  if (!visit) {
    const error = new Error("Visita non trovata");
    error.statusCode = 404;
    throw error;
  }

  // Passa se è pubblica, o se l'utente è il creatore/admin
  if (isShared || visit.isPublic || user?.role === "admin" || visit.creator.toString() === user?._id?.toString() ) {
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

  // --- SICUREZZA: Puliamo il payload se è un utente base ---
  if ((user.role !== "curator" && user.role !== "admin" )|| !payload.isPublic) {
    // Cancelliamo forzatamente i campi che non gli competono, 
    // così Mongoose non li salverà mai, anche se l'utente ha provato a inviarli!
    delete payload.price;
    delete payload.isPublic;
    delete payload.targetAudience;
    delete payload.accessibility;

    payload.$unset = {
      price: 1,
      targetAudience: 1,
      accessibility: 1
    };
  }

  // Pulizia immagine
  const oldVisit = await Visit.findOne(query);
  if (oldVisit && oldVisit.image && oldVisit.image !== updateData.image) {
    await deleteLocalFile(oldVisit.image);
  }
  
  // Troviamo e aggiorniamo SOLO se l'ID corrisponde e il creatore è l'utente corrente
  const updatedVisit = await Visit.findOneAndUpdate(      
    query,
    payload,
    { returnDocument: 'after' }
  );

  if (!updatedVisit) {
    const error = new Error("Visita non trovata nel database o non sei autorizzato a modificarla");
    error.statusCode = 403;
    throw error;
  }

  // AGGIUNTO: Aggiorniamo le preferenze globali dell'utente
  if (payload.expertiseLevel && user._id && user.preferences.expertiseLevel !== payload.expertiseLevel) {
    await User.findByIdAndUpdate(user._id, { 
      $set: { 'preferences.expertiseLevel': payload.expertiseLevel } 
    });
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

// Funzione interna condivisa: cancella la visita individuata dalla query e ripulisce
// la copertina se presente. Usata sia dall'eliminazione diretta (con controllo sul
// creatore) sia dalla cascata da museo (dove l'autorizzazione è già verificata a monte).
async function deleteVisitByQuery(query, notFoundMessage) {
  const deletedVisit = await Visit.findOneAndDelete(query);

  if (!deletedVisit) {
    const error = new Error(notFoundMessage);
    error.statusCode = 403;
    throw error;
  }

  if (deletedVisit.coverImage) {
    await deleteLocalFile(deletedVisit.coverImage);
  }

  return deletedVisit;
}

exports.deleteVisitById = async (visitId, user) => {
  const query = { _id: visitId };

  // Se NON è admin, limitiamo l'eliminazione alla sole visite create dall'utente
  if (user.role !== 'admin') {
    query.creator = user._id;
  }

  return await deleteVisitByQuery(query, "Visita non trovata o non sei autorizzato a eliminarla");
};

// Elimina tutte le visite di un museo (inclusa la "visita libera" standard).
// Usata in cascata da deleteMuseumById: nessun controllo sul creatore, perché
// l'autorizzazione è già stata verificata a monte sul museo stesso.
exports.deleteAllVisitsByMuseum = async (museumId) => {
  const visits = await Visit.find({ museumId: museumId }).select('_id');

  for (const visit of visits) {
    try {
      await deleteVisitByQuery({ _id: visit._id, museumId: museumId }, "Visita non trovata");
    } catch (err) {
      console.warn(`Impossibile eliminare la visita ${visit._id} durante la cascata: ${err.message}`);
    }
  }
};

exports.estimateDuration = async (workIds, preferredLength) => {
  // Se non ci sono opere selezionate, il tempo è 0
  if (!workIds || workIds.length === 0) {
    return 0;
  }

  // recuperiamo i sectionId delle opere
  const works = await Work.find({ _id: { $in: workIds } }).select('_id sectionid');

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