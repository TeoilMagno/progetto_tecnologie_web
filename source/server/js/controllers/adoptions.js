const Adoption = require('../models/adoptions');
const Work = require('../models/works');
const Museum = require('../models/museums');
const { User } = require('../models/users');
const Visit = require('../models/visits');

exports.getAllAdoptions = async () => {
  try {
    return await Adoption.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllAdoptions = async (data) => {
  try {
    let cleared = await Adoption.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Adoption.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
}

exports.getWorkByAdoption = async (adoptionId) => {
  try {
    const adoption = await Adoption.findOne({ _id: adoptionId });
    return adoption.workId;
  }
  catch (err) {
    throw err;
  }
}

// Un museo richiede in adozione un'opera (status: pending)
exports.createAdoptionRequest = async (data, requestingUser) => {
  const { workId, toMuseumId, beginDate, endDate, targetRoomId } = data;

  // controllo di sicurezza: L'utente loggato deve essere il proprietario del museo richiedente (toMuseumId)
  if (requestingUser.role !== 'admin') {
    const isOwnerOfTarget = requestingUser.managed_museums.some(
      (mId) => mId.toString() === toMuseumId.toString()
    );
    if (!isOwnerOfTarget) {
      const error = new Error("Non sei autorizzato a richiedere adozioni per questo museo.");
      error.statusCode = 403;
      throw error;
    }
  }

  // controlli sulle date
  const start = new Date(beginDate);
  const end = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (start < now) {
    throw new Error("La data di inizio non può essere nel passato.");
  }
  if (end <= start) {
    throw new Error("La data di fine deve essere successiva alla data di inizio.");
  }
  if (end.getFullYear() > now.getFullYear() + 50) {
    throw new Error("La data di fine supera il limite massimo di 50 anni consentito.");
  }

  const work = await Work.findById(workId);
  if (!work) throw new Error("Opera non trovata");

  const fromMuseumId = work.museumId; 
  if (!fromMuseumId) throw new Error("L'opera non appartiene a nessun museo");

  // Identifichiamo il curatore proprietario dell'opera
  const ownerUser = await User.findOne({ managed_museums: fromMuseumId });
  
  if (!ownerUser) {
    throw new Error("Impossibile trovare il curatore del museo proprietario.");
  }
  if (ownerUser._id.toString() === requestingUser._id.toString()) {
    throw new Error("Non puoi richiedere in adozione un'opera che appartiene già a un tuo museo!");
  }

  const fromCuratorId = ownerUser._id; // Assegnazione corretta e sicura

  const newAdoption = new Adoption({ 
    fromMuseumId,
    toMuseumId,
    fromCuratorId,
    toCuratorId: requestingUser._id, 
    beginDate,
    endDate,
    workId,
    originalRoomId: work.roomId || null, 
    targetRoomId: targetRoomId || null,
    status: 'pending' 
  });

  return await newAdoption.save(); 
};

// Recupera le adozioni in entrata e in uscita per il curatore
exports.getUserAdoptions = async (userId) => {
  return await Adoption.find({ //
    $or: [{ fromCuratorId: userId }, { toCuratorId: userId }]
  })
    .populate('fromMuseumId', 'name image') //
    .populate('toMuseumId', 'name image') //
    .populate('workId', 'name author image') //
    .sort({ createdAt: -1 });
};

// Rispondi alla richiesta (accepted / refused)
exports.respondToAdoption = async (adoptionId, status, targetRoomId, user) => {
  if (!['accepted', 'refused'].includes(status)) {
    throw new Error("Stato non valido. Usa 'accepted' o 'refused'.");
  }

  const adoption = await Adoption.findById(adoptionId);
  if (!adoption) throw new Error("Richiesta di adozione non trovata");

  // Solo il curatore proprietario o un admin può accettare/rifiutare
  if (user.role !== 'admin' && adoption.fromCuratorId.toString() !== user._id.toString()) { //
    const error = new Error("Non sei autorizzato a gestire questa richiesta");
    error.statusCode = 403;
    throw error;
  }

  adoption.status = status; 
  if (targetRoomId) adoption.targetRoomId = targetRoomId;
  await adoption.save(); 

  // SE ACCETTATA: L'opera è in transito. Salviamo la stanza originale ma NON la spostiamo ancora.
  if (status === 'accepted') {
    const work = await Work.findById(adoption.workId);
    if (work) {
      adoption.originalRoomId = work.roomId;
      await adoption.save();
    }
  }

  return adoption;
};

// Fine dell'adozione (completed)
exports.completeAdoption = async (adoptionId, user) => {
  const adoption = await Adoption.findById(adoptionId); 
  if (!adoption) throw new Error("Adozione non trovata");

  if (adoption.status !== 'active') {
    throw new Error("Solo un'adozione attiva ('active') può essere completata");
  }

  const isAuthorized = user.role === 'admin' || 
    adoption.fromCuratorId.toString() === user._id.toString() || 
    adoption.toCuratorId.toString() === user._id.toString(); 

  if (!isAuthorized) {
    const error = new Error("Non sei autorizzato a completare questa adozione");
    error.statusCode = 403;
    throw error;
  }

  adoption.status = 'completed'; 
  await adoption.save(); 

  // RIPRISTINO DELL'OPERA: Torna al museo originario
  const work = await Work.findById(adoption.workId); 
  if (work) { 
    work.museumId = adoption.fromMuseumId; 
    work.roomId = adoption.originalRoomId || null;
    work.adoptionId = null; 
    await work.save(); 
  }

  // Operazione inversa: togli dalla Visita Libera ospite e rimetti in quella originaria
  await Visit.findOneAndUpdate({ museumId: adoption.toMuseumId, visitType: 'standard' }, { $pull: { works: adoption.workId } });
  await Visit.findOneAndUpdate({ museumId: adoption.fromMuseumId, visitType: 'standard' }, { $push: { works: adoption.workId } });

  return adoption;
};

// Il museo richiedente conferma l'arrivo dell'opera (status -> active)
exports.confirmArrival = async (adoptionId, user) => {
  const adoption = await Adoption.findById(adoptionId);
  if (!adoption) throw new Error("Adozione non trovata");

  if (adoption.status !== 'accepted') {
    throw new Error("L'adozione non è in transito (accepted)");
  }

  // Solo il curatore RICEVENTE (chi ha fatto la richiesta) può confermare l'arrivo
  if (user.role !== 'admin' && adoption.toCuratorId.toString() !== user._id.toString()) {
    const error = new Error("Non sei autorizzato a confermare l'arrivo di questa opera");
    error.statusCode = 403;
    throw error;
  }

  adoption.status = 'active';
  await adoption.save();

  // ORA AVVIENE LO SPOSTAMENTO FISICO SUL DB
  const work = await Work.findById(adoption.workId);
  if (work) {
    work.museumId = adoption.toMuseumId;
    work.roomId = adoption.targetRoomId || null;
    work.adoptionId = adoption._id;
    await work.save();
  }

  // Togli dalla Visita Libera originaria e metti in quella nuova
  await Visit.findOneAndUpdate({ museumId: adoption.fromMuseumId, visitType: 'standard' }, { $pull: { works: adoption.workId } });
  await Visit.findOneAndUpdate({ museumId: adoption.toMuseumId, visitType: 'standard' }, { $push: { works: adoption.workId } });

  return adoption;
};
