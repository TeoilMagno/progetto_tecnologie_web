const Section = require('../models/sections');
const Work = require('../models/works');

const { getWorksById, deleteWorkById } = require('./works');
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

exports.getWorksBySection = async (sectionId) => {
  const section = await Section.findById(sectionId);
  if (!section) throw new Error("Sezione non trovata");

  const workIds = section.works.map(w => w.workId);

  return await getWorksById(workIds);
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

exports.uploadMap = async (mapData) => {
  const {sections} = mapData;
  
  if(!sections || !Array.isArray(sections) || sections.lenght === 0) {
    throw new Error("Nessuna sezione fornita nel payload");
  }

  const updatedSections = [];

  for (const section of sections) {
    const {_id, color, works, shape} = section;

    if(!_id) {
      console.warn("Ricevuta una sezione senza _id, ignorata.");
      continue;
    }

    const updatedSection = await Section.findByIdAndUpdate(
      _id,
      {
        $set: {
          color: color,
          shape: shape,
          works: works
        }
      },
      {
        returnDocument: 'after',
        runValidators: true
      }
    );

    if(!updatedSection) {
      throw new Error(`Impossibile trovare e aggiornare le sezioni con id ${_id}`);
    }

    updatedSections.push(updatedSection);
  }

  return updatedSections;
}

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
  const deletedSection = await Section.findOneAndDelete({ _id: sectionId, museumId: museumId });

  if (!deletedSection) {
    const error = new Error("Sezione non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }

  if (deletedSection.image) {
    await deleteLocalFile(deletedSection.image);
  }

  // Deleghiamo l'eliminazione di ogni opera a deleteWorkById (gestisce lei stessa
  // immagine, visita libera, ecc). Se un'opera fosse già sparita dal DB, non blocchiamo
  // l'eliminazione dell'intera sezione: logghiamo e proseguiamo con le altre.
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