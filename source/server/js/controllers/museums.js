const Museum = require("../models/museums");
const Section = require("../models/sections");
const Work = require("../models/works");
const { User } = require("../models/users");

// utilizzato da admin
exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  } catch (err) {
    throw err;
  }
};

exports.saveMuseum = async (museumData, userId) => {
  const { name, address, contact_email, contact_phone, image, tags, sections } = museumData;

  // validazione modello
  const museumToValidate = new Museum({
    name,
    address,
    contact_email,
    contact_phone,
    image,
    tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags
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
        workIds = savedWorks.map(w => ({ work: w._id }));
      }

      // Salviamo la sezione
      const newSection = new Section({
        name: s.name,
        image: s.image,
        works: workIds,
        museumId: museumId
      });
      
      const savedSection = await newSection.save();
      savedSectionIds.push(savedSection._id);
    }

    // aggiorniamo il museo con gli ID delle sezioni
    museumResult.sections = savedSectionIds;
    await museumResult.save();
  }

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
  return await Museum.findByIdAndUpdate(museumId, updateData, { new: true, runValidators: true });
};

exports.removeSectionFromMuseum = async (museumId, sectionId) => {
  return await Museum.findByIdAndUpdate(
    museumId,
    { $pull: { sections: sectionId } },
    { new: true }
  );
};