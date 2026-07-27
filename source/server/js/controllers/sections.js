const Section = require('../models/sections');
const Work = require('../models/works')

exports.saveSection = async (req,res) => {
  try {
    const { rsection, museumId } = req.body;

    const section = new Section({
      title: rsection.title,
      image: rsection.image,
      works: [],
      museumId: museumId
    });

    const result = await section.save()
    
    res.status(201).json(result._id);
  }
  catch (err) {
    res.send(err);
  }
}

exports.addWorkToSection = async (req,res) => {
  try {
        const {sectionId, workId} = req.body;
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId, 
            { $push: { works: workId } }, // Operatore per aggiungere all'array
            { new: true, useFindAndModify: false } // Opzioni: ritorna il documento modificato
        );

        if (!updatedSection) {
            console.log("Sezione non trovata");
            return null;
        }

        return updatedSection;
    } catch (error) {
        console.error("Errore durante l'aggiornamento:", error);
        throw error;
    }
}

exports.getSectionsByMuseum = async (museumId) => {
  try {
    return await Section.find({museumId: museum});
  }
  catch (err) {
    throw err;
  }
}

exports.getWorksBySection = async (sectionId) => {
  try {
    const {getWorksById} = require('./works');

    let workIds;
    workIds = await Section.find({_id: sectionId}).works;
    return await getWorksById(workIds)
  }
  catch (err) {
    throw err;
  }
}

exports.saveFullSection = async (req, res) => {
  try {
    const { name, image_path, museumId, works } = req.body;

    // 1. Salviamo prima tutte le opere nel database
    // Assumendo che tu abbia un modello 'Work'
    const savedWorks = await Work.insertMany(works);
    
    // 2. Estraiamo solo gli ID delle opere appena create
    const workIds = savedWorks.map(work => work._id);

    // 3. Creiamo la sezione collegando gli ID delle opere
    const newSection = new Section({
      title: name,
      image: image_path,
      works: workIds,
      museumId: museumId
    });

    const result = await newSection.save();
    res.status(201).json(result);
    
  } catch (err) {
    console.error("Errore nel salvataggio completo:", err);
    res.status(500).json({ error: "Errore durante il salvataggio dei dati" });
  }
};

