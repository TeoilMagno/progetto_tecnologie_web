const Section = require('../models/sections');
const Work = require('../models/works')

exports.saveSection = async (sectionData, museumId) => {
  const savedWorks = await Work.insertMany(sectionData.works);
  const workIds = savedWorks.map(work => work._id);

  const section = new Section({
    title: sectionData.title,
    image: sectionData.image,
    works: workIds,
    museumId: museumId
  });

  const result = await section.save()
  return result._id;
}

exports.addWorkToSection = async (sectionId, workId) => {
  const updatedSection = await Section.findByIdAndUpdate(
    sectionId, 
    { $push: { works: workId } }, // Operatore per aggiungere all'array
    { new: true, useFindAndModify: false } // Opzioni: ritorna il documento modificato
  );

  if (!updatedSection) {
    const error = new Error("Sezione non trovata");
    error.statusCode = 404;
    throw error;
  }

  return updatedSection;
}

exports.getSectionsByMuseum = async (museumId) => {
  return await Section.find({ museumId: museumId });
}

exports.getWorksBySection = async (sectionId) => {
  const { getWorksById } = require('./works');

  const section = await Section.findById(sectionId);
  if (!section) {
    const error = new Error("Sezione non trovata");
    error.statusCode = 404;
    throw error;
  }
  return await getWorksById(section.works);
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

// exports.saveSection = async (req, res) => {
//   try {
//     const { name, image_path, museumId, works } = req.body;

//     // 1. Salviamo prima tutte le opere nel database
//     // Assumendo che tu abbia un modello 'Work'
//     const savedWorks = await Work.insertMany(works);
    
//     // 2. Estraiamo solo gli ID delle opere appena create
//     const workIds = savedWorks.map(work => work._id);

//     // 3. Creiamo la sezione collegando gli ID delle opere
//     const newSection = new Section({
//       title: name,
//       image: image_path,
//       works: workIds,
//       museumId: museumId
//     });

//     const result = await newSection.save();
//     res.status(201).json(result);
    
//   } catch (err) {
//     console.error("Errore nel salvataggio completo:", err);
//     res.status(500).json({ error: "Errore durante il salvataggio dei dati" });
//   }
// };

