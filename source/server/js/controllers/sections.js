const Section = require('../models/sections');
const Work = require('../models/works');
const Museum = require('../models/museums');

const { deleteLocalFile } = require('../utils/file-helper')

exports.getAllSections = async () => {
  try {
    return await Section.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllSections = async (data) => {
  try {
    let cleared = await Section.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Section.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.saveSection = async (sectionData, museumId) => {
  let workObjects = [];
  
  if (sectionData.works && sectionData.works.length > 0) {
    const savedWorks = await Work.insertMany(sectionData.works);
    workObjects = savedWorks.map(work => ({ workId: work._id }));
  }

  const section = new Section({
    name: sectionData.name,
    image: sectionData.image,
    works: workObjects,
    museumId: museumId
  });

  const result = await section.save();
  return result._id;
}

exports.addWorkToSection = async (sectionId, workId) => {
  const updatedSection = await Section.findByIdAndUpdate(
    sectionId, 
    { $push: { works: { workId: workId } } }, 
    { returnDocument: 'after', useFindAndModify: false } 
  );

  if (!updatedSection) throw new Error("Sezione non trovata");
  return updatedSection;
}

exports.getSectionsByMuseum = async (museumId) => {
  return await Section.find({ museumId: museumId });
}

exports.getWorksBySection = async (sectionId, page = 1, limit = null) => {
  const { getWorksById } = require('./works'); // require differito
  const section = await Section.findById(sectionId);
  if (!section) throw new Error("Sezione non trovata");

  let workIds = section.works.map(w => w.workId);
  
  // Aggiunta logica di paginazione
  const total = workIds.length;
  let totalPages = 1;
  
  if (limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + Number(limit);
    workIds = workIds.slice(startIndex, endIndex);
    totalPages = Math.ceil(total / limit);
  }

  const works = await getWorksById(workIds);
  
  // Se viene richiesta la paginazione, ritorniamo l'oggetto completo
  if (limit) {
     return { works, total, page: Number(page), totalPages };
  }
  return works; // Ritorno array classico per retrocompatibilità con altre chiamate
}

// Aggiorna i dati base di una sezione
exports.updateSectionById = async (sectionId, updateData, museumId) => {
  const oldSection = await Section.findOne({ _id: sectionId, museumId: museumId });
  if (oldSection && oldSection.image && oldSection.image !== updateData.image) {
    await deleteLocalFile(oldSection.image);
  }

  const updatedSection = await Section.findOneAndUpdate(
    { _id: sectionId, museumId: museumId},
    updateData,
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedSection) {
    const error = new Error("Sezione non trovata o non sei autorizzato a modificarla");
    error.statusCode = 403;
    throw error;
  }

  return updatedSection;
}

exports.updateSections = async (museumId, sectionsData) => {
  const validSectionIds = [];

  for (const s of sectionsData) {
    if (s._id) {
      // CASO A: LA SEZIONE ESISTE -> Riutilizzo updateSectionById
      try {
        const updatedSection = await exports.updateSectionById(s._id, s, museumId);
        validSectionIds.push(updatedSection._id);
      } catch (err) {
        console.warn(`Impossibile aggiornare la sezione ${s._id}:`, err.message);
      }
    } else {
      // CASO B: LA SEZIONE E' NUOVA -> La creiamo
      const newSection = new Section({
        name: s.name,
        svgGroupId: s.svgGroupId,
        image: s.image,
        museumId: museumId,
        viewBox: s.viewBox,
        works: [], 
        rooms: []  
      });

      const savedSection = await newSection.save();
      validSectionIds.push(savedSection._id);
    }
  }

  await Museum.findByIdAndUpdate(museumId, {
    sections: validSectionIds
  });

  return validSectionIds;
};

// Rimuove l'opera dall'array della sezione
exports.removeWorkFromSection = async (sectionId, workId) => {
  return await Section.findByIdAndUpdate(
    sectionId,
    { $pull: { works: { workId: workId } } },
    { returnDocument: 'after' }
  );
};

// Elimina una sezione e tutte le opere contenute al suo interno
exports.deleteSectionById = async (sectionId, museumId) => {
  const { deleteWorkById } = require('./works'); // require differito
  const deletedSection = await Section.findOneAndDelete({ _id: sectionId, museumId: museumId });

  if (!deletedSection) {
    const error = new Error("Sezione non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }

  if (deletedSection.image) await deleteLocalFile(deletedSection.image);

  if (deletedSection.works && deletedSection.works.length > 0) {
    for (const w of deletedSection.works) {
      if (!w.workId) continue;
      try {
        await deleteWorkById(w.workId, museumId);
      } catch (err) {
        console.warn(`Impossibile eliminare l'opera ${w.workId} durante la cascata: ${err.message}`);
      }
    }
  }

  return deletedSection;
};