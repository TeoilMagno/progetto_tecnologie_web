const Museum = require('../models/museums');

//salva un singolo museo passato in input
exports.saveMuseum = async (rmuseum) => {
  const museum = new Museum({
    museum_data: {
      name: rmuseum.name,
      address: rmuseum.address,
      contact_email: rmuseum.contact_email,
      contact_phone: rmuseum.contact_phone
    },

    sections: [],
    image: rmuseum.image,
    tags: rmuseum.tags
  });

  return museum.save();
}

exports.addSectionToMuseum = async (req,res) => {
  try {
        const {museumId, sectionId} = req.body;
        const updatedMuseum = await Museum.findByIdAndUpdate(
            museumId, 
            { $push: { sections: sectionId } }, // Operatore per aggiungere all'array
            { new: true, useFindAndModify: false } // Opzioni: ritorna il documento modificato
        );

        if (!updatedMuseum) {
          res.status(200).send('<div>aggiunto con successo</div>');
        }

        return updatedMuseum;
    } catch (error) {
        console.error("Errore durante l'aggiornamento:", error);
        throw error;
    }
}

exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  }
  catch (err) {
    throw err;
  }
}
