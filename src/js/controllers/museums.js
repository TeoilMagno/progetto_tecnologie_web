const Museum = require("../models/museums");
const Section = require("../models/sections");
const Work = require("../models/works");


//salva un singolo museo passato in input
// exports.saveMuseum = async (rmuseum) => {
//   const museum = new Museum({
//     museum_data: {
//       name: rmuseum.name,
//       address: rmuseum.address,
//       contact_email: rmuseum.contact_email,
//       contact_phone: rmuseum.contact_phone,
//     },

//     sections: [],
//     image: rmuseum.image,
//     tags: rmuseum.tags,
//   });

//   return museum.save();
// };

exports.addSectionToMuseum = async (req, res) => {
  try {
    const { museumId, sectionId } = req.body;
    const updatedMuseum = await Museum.findByIdAndUpdate(
      museumId,
      { $push: { sections: sectionId } }, // Operatore per aggiungere all'array
      { new: true, useFindAndModify: false }, // Opzioni: ritorna il documento modificato
    );

    if (!updatedMuseum) {
      res.status(200).send("<div>aggiunto con successo</div>");
    }

    return updatedMuseum;
  } catch (error) {
    console.error("Errore durante l'aggiornamento:", error);
    throw error;
  }
};

exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  } catch (err) {
    throw err;
  }
};

exports.saveMuseum = async (req, res) => {
  try {
    // Riceviamo il payload strutturato dal fetch
    console.log("saveMuseum in controllers called correctly")
    const { name, address, contact_email, contact_phone, image, tags, sections } = req.body;

    let savedSectionIds = [];

    // Cicliamo sulle sezioni ricevute
    if (sections && sections.length > 0) {
      for (const s of sections) {
        // 1. Salviamo le opere di questa sezione
        let workIds = [];
        if (s.works && s.works.length > 0) {
          const savedWorks = await Work.insertMany(s.works);
          workIds = savedWorks.map(w => w._id);
        }

        // 2. Creiamo la sezione collegandola alle sue opere
        const newSection = new Section({
          title: s.title,
          image: s.image,
          works: workIds
          // museumId lo assegneremo implicitamente tramite l'array nel museo
        });
        
        const savedSection = await newSection.save();
        savedSectionIds.push(savedSection._id);
      }
    }

    // 3. Creiamo il Museo finale con gli ID delle sezioni
    const newMuseum = new Museum({
      museum_data: {
        name: name,
        address: address,
        contact_email: contact_email,
        contact_phone: contact_phone
      },
      sections: savedSectionIds, // Array di ObjectId (Hybrid Approach)
      image: image,
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags
    });

    const result = await newMuseum.save();
    
    // Rispondiamo con un JSON di successo (niente redirect server-side!)
    res.status(201).json({ success: true, message: "Museo creato", id: result._id });

  } catch (error) {
    console.error("Errore nel salvataggio globale:", error);
    res.status(500).json({ error: "Errore interno durante il salvataggio dei dati" });
  }
};
