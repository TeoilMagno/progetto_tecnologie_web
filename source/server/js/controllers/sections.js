const Section = require('../models/sections');
const Work = require('../models/works');

const { getWorksById, deleteWorkById } = require('./works');

exports.saveSection = async (sectionData, museumId) => {
  let workObjects = [];
  
  if (sectionData.works && sectionData.works.length > 0) {
    const savedWorks = await Work.insertMany(sectionData.works);
    workObjects = savedWorks.map(work => ({ work: work._id }));
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
    { $push: { works: { work: workId } } }, 
    { new: true, useFindAndModify: false } 
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

  const workIds = section.works.map(w => w.work);

  return await getWorksById(workIds);
}

// Aggiorna i dati base di una sezione
exports.updateSectionById = async (sectionId, updateData, museumId) => {
  const updatedSection = await Section.findOneAndUpdate(
    { _id: sectionId, museumId: museumId},
    updateData, 
    { new: true, runValidators: true }
  );
}

exports.uploadMap = async (mapData) => {
  const {sections} = mapData;
  
  if(!sections || !Array.isArray(sections) || sections.lenght === 0) {
    throw new Error("Nessuna sezione fornita nel payload");
  }

  const updatedSections = [];

  for (const section of sections) {
    const {_id, color, works, rooms, shape} = section;

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
          works: works,
          rooms: rooms
        }
      },
      {
        new: true,
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
    { $pull: { works: { work: workId } } },
    { new: true }
  );
};

// Elimina una sezione e tutte le opere contenute al suo interno
exports.deleteSectionById = async (sectionId, museumId) => {
  const section = await Section.findOne({ _id:sectionId, museumId: museumId });
  if (!section) {
    const error = new Error("Sezione non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }

  if (section.works && section.works.length > 0) {
    for (const w of section.works) {
      if (w.work) await deleteWorkById(w.work, museumId);
    }
  }

  return await Section.findByIdAndDelete(sectionId);
};

