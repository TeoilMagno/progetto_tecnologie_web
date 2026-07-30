const Museum = require("../models/museums");
const Section = require("../models/sections");
const Work = require("../models/works");
const { User } = require("../models/users");


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
    const { name, address, contact_email, contact_phone, image, tags, sections } = req.body;

    // --- 1. VALIDAZIONE PREVENTIVA ---
    // Creiamo l'istanza del museo per validarla
    const museumToValidate = new Museum({
      name: name,
      address: address,
      contact_email: contact_email,
      contact_phone: contact_phone,
      image: image,
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags
    });
    
    // Validazione del museo
    await museumToValidate.validate();

    // Validazione di tutte le sezioni e opere
    if (sections && sections.length > 0) {
      for (const s of sections) {
        // Validiamo la sezione (usiamo un ID fittizio per il campo required museumId)
        const sectionToValidate = new Section({
          name: s.name,
          image: s.image,
          museumId: new (require('mongoose')).Types.ObjectId() 
        });
        await sectionToValidate.validate();

        // Validiamo ogni opera all'interno della sezione
        if (s.works && s.works.length > 0) {
          for (const w of s.works) {
            const workToValidate = new Work(w);
            await workToValidate.validate(); // Se un'opera manca di author/year, l'errore scatta qui
          }
        }
      }
    }

    // --- 2. SALVATAGGIO REALE (Eseguito solo se la validazione sopra ha avuto successo) ---
    // Salviamo il museo per ottenere l'ID reale
    const museumResult = await museumToValidate.save();
    const museumId = museumResult._id;
    let savedSectionIds = [];

    if (sections && sections.length > 0) {
      for (const s of sections) {
        let workIds = [];
        // Salviamo le opere
        if (s.works && s.works.length > 0) {
          const savedWorks = await Work.insertMany(s.works);
          workIds = savedWorks.map(w => w._id);
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

      // Aggiorniamo il museo con gli ID delle sezioni
      museumResult.sections = savedSectionIds;
      await museumResult.save();
    }


    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $push: { managed_museums: museumId } }, // $push aggiunge l'elemento all'array
        { new: true }
      );
    }

    res.status(201).json({ success: true, message: "Tutto salvato correttamente", id: museumId });

  } catch (error) {
    // Se la validazione fallisce, catturiamo l'errore qui
    console.error("Errore validazione o salvataggio:", error);
    res.status(400).json({ 
      error: "Dati incompleti o errati", 
      details: error.message // Invia al frontend il motivo esatto (es. "Path author is required")
    });
  }
};
