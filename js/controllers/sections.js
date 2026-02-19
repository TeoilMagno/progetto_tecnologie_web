const Section = require('../models/sections');

exports.saveSection = async (req,res) => {
  try {
    const {rsection, museumId} = req.body;

    const section = new Section({
      title: rsection.title,
      image: rsection.image,
      works: [null],
      museumId: museumId
    });

    section.save()
      .then((result) => {
        res.status(201).json(result._id);
      })
      .catch((err) => {
        console.log(err);
      })
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

        if (!updatedMuseum) {
            console.log("Museo non trovato");
            return null;
        }

        return updatedMuseum;
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
