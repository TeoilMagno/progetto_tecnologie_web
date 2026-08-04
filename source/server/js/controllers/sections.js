const Section = require('../models/sections');
const Work = require('../models/works')

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
  const { getWorksById } = require('./works');

  const section = await Section.findById(sectionId);
  if (!section) throw new Error("Sezione non trovata");

  const workIds = section.works.map(w => w.work);

  return await getWorksById(workIds);
}

// Aggiorna i dati base di una sezione
exports.updateSectionById = async (sectionId, updateData) => {
  const updatedSection = await Section.findByIdAndUpdate(sectionId, updateData, { new: true, runValidators: true });
  if (!updatedSection) throw new Error("Sezione non trovata");
  return updatedSection;
};

// Rimuove l'opera dall'array della sezione
exports.removeWorkFromSection = async (sectionId, workId) => {
  return await Section.findByIdAndUpdate(
    sectionId,
    { $pull: { works: { work: workId } } },
    { new: true }
  );
};

// Elimina una sezione e tutte le opere contenute al suo interno
exports.deleteSectionById = async (sectionId) => {
  const { deleteWorkById } = require('./works');
  
  const section = await Section.findById(sectionId);
  if (!section) throw new Error("Sezione non trovata");

  if (section.works && section.works.length > 0) {
    for (const w of section.works) {
      if (w.work) await deleteWorkById(w.work);
    }
  }

  return await Section.findByIdAndDelete(sectionId);
};

