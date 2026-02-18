const Museum = require('../models/museums');

exports.saveMuseum = async (req,res) => {
  try {
    const rmuseum = req.body;

    console.log(rmuseum.museum_data.name, rmuseum.address, rmuseum.image_path, rmuseum.tags);

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const museum = new Museum({
      museum_data: {
        name: rmuseum.name,
        location: rmuseum.location,
        contact_email: rmuseum.contact_email,
        contact_phone: rmuseum.contact_phone
      },

      sections: [null],
      address: rmuseum.address,
      image: rmuseum.image,
      tags: rmuseum.tags
    });

    museum.save()
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

export.modifyMuseumById = async (museumId, sectionId) => {
  try {
        const updatedMuseum = await Museum.findByIdAndUpdate(
            museumId, 
            { $push: { sections: sectionId } }, // Operatore per aggiungere all'array
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

exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  }
  catch (err) {
    throw err;
  }
}
