const Museum = require("../models/museums");
const Section = require("../models/sections");
const Work = require("../models/works");
const { User } = require("../models/users");
const Visit = require("../models/visits");

// utilizzato da admin
exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  } catch (err) {
    throw err;
  }
};

exports.saveMuseum = async (museumData, userId) => {
  const { name, address, contact_email, contact_phone, image, tags, ticketPrice, sections, openingHours, openingDays, services, accessibility } = museumData;

  // validazione modello
  const museumToValidate = new Museum({
    name,
    address,
    contact_email,
    contact_phone,
    image,
    tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags,
    ticketPrice: typeof ticketPrice === 'number' ? ticketPrice : 0,
    openingDays,
    openingHours,
    services,
    accessibility
  });
  
  await museumToValidate.validate();

  // Validazione di tutte le sezioni e opere
  if (sections && sections.length > 0) {
    for (const s of sections) {

      const sectionToValidate = new Section({
        name: s.name,
        image: s.image,
        museumId: new (require('mongoose')).Types.ObjectId() 
      });
      await sectionToValidate.validate();

      if (s.works && s.works.length > 0) {
        for (const w of s.works) {
          const workToValidate = new Work({
              ...w, 
              museumId: new (require('mongoose')).Types.ObjectId(), // ID fittizio
          });
          await workToValidate.validate();
        }
      }
    }
  }

  // salvataggio reale (eseguito solo se la validazione sopra ha avuto successo)
  // Salviamo il museo per ottenere l'ID reale
  const museumResult = await museumToValidate.save();
  const museumId = museumResult._id;
  let savedSectionIds = [];
  let allSavedWorkIds = [];

  if (sections && sections.length > 0) {
    for (const s of sections) {
      let workIds = [];

      // Salviamo le opere
      if (s.works && s.works.length > 0) {
        const worksToInsert = s.works.map(work => ({
            ...work,               
            museumId: museumId     // sovrascriviamo il museumId reale
        }));
        const savedWorks = await Work.insertMany(worksToInsert);
        workIds = savedWorks.map(w => w._id);

        allSavedWorkIds.push(...workIds);
      }

      // Salviamo la sezione
      const newSection = new Section({
        name: s.name,
        image: s.image,
        works: workIds.map(id => ({ workId: id })),
        museumId: museumId
      });
      
      const savedSection = await newSection.save();
      savedSectionIds.push(savedSection._id);
    }

    // aggiorniamo il museo con gli ID delle sezioni
    museumResult.sections = savedSectionIds;
    await museumResult.save();
  }

  // creiamo la visita libera associata
    const standardVisit = new Visit({
      title: "Visita libera",
      description: "Ingresso base con accesso a tutte le opere in esposizione.",
      museumId: museumResult._id, // Colleghiamo al nuovo museo
      creator: userId, 
      price: museumResult.ticketPrice, 
      isDraft: false, 
      isPublic: true, // Visibile a tutti da subito
      visitType: 'standard', 
      targetAudience: ['all'], 
      accessibility: museumResult.accessibility || ['none'], // Ereditiamo dal museo
      works: allSavedWorkIds
    });

    await standardVisit.save();

  if (userId) {
    await User.findByIdAndUpdate(
      userId,
      { $push: { managed_museums: museumId } },
      { new: true }
    );
  }

  return museumId;
};

exports.updateMuseum = async (museumId, updateData) => {
  const updatedMuseum = await Museum.findByIdAndUpdate(museumId, updateData, { new: true, runValidators: true });
  // Se il curatore ha modificato il prezzo, sincronizziamo la visita libera
  if (updateData.ticketPrice !== undefined) {
    const Visit = require("../models/visits");
    await Visit.findOneAndUpdate(
      { museumId: museumId, visitType: 'standard' },
      { price: updateData.ticketPrice }
    );
  }

  return await Museum.findByIdAndUpdate(museumId, updateData, { new: true, runValidators: true });
};

exports.removeSectionFromMuseum = async (museumId, sectionId) => {
  return await Museum.findByIdAndUpdate(
    museumId,
    { $pull: { sections: sectionId } },
    { new: true }
  );
};

exports.deleteMuseumById = async (museumId) => {
  const { deleteSectionById } = require('./sections');

  const museum = await Museum.findById(museumId);
  if (!museum) {
    const error = new Error("Museo non trovato");
    error.statusCode = 404;
    throw error;
  }

  // eliminiamo tutte le sezioni (e relative opere) collegate a questo museo
  if (museum.sections && museum.sections.length > 0) {
    for (const sectionId of museum.sections) {
      await deleteSectionById(sectionId, museumId);
    }
  }

  // rimuoviamo il museo dai musei gestiti dagli utenti
  await User.updateMany(
    { managed_museums: museumId },
    { $pull: { managed_museums: museumId } }
  );

  return await Museum.findByIdAndDelete(museumId);
};
