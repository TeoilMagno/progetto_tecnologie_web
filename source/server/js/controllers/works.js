const Work = require('../models/works');
const Visit = require('../models/visits');

const { deleteLocalFile } = require('../utils/file-helper');

exports.getAllWorks = async () => {
  try {
    return await Work.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllWorks = async (data) => {
  try {
    let cleared = await Work.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Work.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.getMuseumWorks = async (museumIdStr, search, author, technique, workstyle, page = 1, limit = 12, fetchMetadata) => {
  try {
    const mongoose = require("mongoose");
    const museumObjectId = new mongoose.Types.ObjectId(museumIdStr);
    
    const query = { museumId: museumObjectId };

    // Costruzione dinamica dei filtri
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (author) {
      query.authorName = { $in: author.split(',') };
    }
    if (technique) {
      query.technique = { $in: technique.split(',') };
    }
    if (workstyle) {
      query.styleName = { $in: workstyle.split(',') };
    }

    // Paginazione e query con Tie-Breaker per lo scroll infinito
    const Work = require("../models/works"); // Assicurati che il percorso sia corretto
    const total = await Work.countDocuments(query);
    const works = await Work.find(query)
                            .sort({ createdAt: -1, _id: 1 }) // Tie-Breaker
                            .skip((page - 1) * limit)
                            .limit(Number(limit));

    // Estrazione dei metadati unici per popolare i filtri nella sidebar
    let metadata = null;
    if (fetchMetadata === 'true') {
       const uniqueAuthors = await Work.distinct("authorName", { museumId: museumObjectId, authorName: { $ne: null } });
       const uniqueTechniques = await Work.distinct("technique", { museumId: museumObjectId, technique: { $ne: null } });
       const uniqueStyles = await Work.distinct("styleName", { museumId: museumObjectId, styleName: { $ne: null } });
       
       metadata = { uniqueAuthors, uniqueTechniques, uniqueStyles };
    }

    return {
      works,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      metadata
    };
  } catch (err) {
    throw err;
  }
};

exports.getWorksById = async (workIds) => {
  return await Work.find({ _id: { $in: workIds } });
}

// Aggiorna un'opera esistente
exports.updateWorkById = async (workId, updateData, museumId) => {
  const oldWork = await Work.findOne({ 
      _id: workId, 
      museumId: museumId, 
      $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }] 
    });
  // Se l'immagine è cambiata, elimina quella vecchia
  if (oldWork && oldWork.image && oldWork.image !== updateData.image) {
    await deleteLocalFile(oldWork.image);
  }

  const updatedWork = await Work.findOneAndUpdate(
    { 
      _id: workId, 
      museumId: museumId, 
      $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }] 
    }, 
    updateData, 
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedWork) {
    const error = new Error("Opera non trovata o non sei autorizzato a modificarla");
    error.statusCode = 403;
    throw error;
  }
  return updatedWork;
};

// Elimina un'opera
exports.deleteWorkById = async (workId, museumId) => {
  // Un solo findOneAndDelete atomico: cancella e restituisce il documento in un'unica query,
  // niente più findOne "di controllo" prima, quindi niente più rischio di null-dereference
  // se l'opera fosse già stata rimossa (a mano o da una cascata precedente).
  const deletedWork = await Work.findOneAndDelete({
    _id: workId,
    museumId: museumId,
    $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }]
  });

  if (!deletedWork) {
    const error = new Error("Opera non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }

  if (deletedWork.image) {
    await deleteLocalFile(deletedWork.image);
  }

  await Visit.findOneAndUpdate(
    { museumId: museumId, visitType: 'standard' },
    { $pull: { works: workId } } 
  );

  return deletedWork;
};