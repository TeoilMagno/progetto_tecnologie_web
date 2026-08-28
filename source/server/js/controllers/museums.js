const Museum = require("../models/museums");
const Section = require("../models/sections");
const Work = require("../models/works");
const { User } = require("../models/users");
const Visit = require("../models/visits");
const Author = require("../models/author");
const Style = require("../models/style");

const { deleteLocalFile } = require("../utils/file-helper");

// va riscritta anche se c'e' gia' in config.js
// Funzione helper per tradurre l'indirizzo in coordinate
async function geocodeAddress(address) {
  try {
    // Usiamo encodeURIComponent per gestire spazi e virgole nell'indirizzo
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArtAround/1.0 (progetto universitario)' 
      }
    });

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon) 
      };
    }
  } catch (error) {
    console.error("Errore durante il geocoding dell'indirizzo:", error);
  }
  return { lat: null, lon: null };
}

// AGGIUNTA: Formula di Haversine in fondo al file
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// utilizzato da admin
exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  } catch (err) {
    throw err;
  }
};

// funzione getMuseums scalabile
exports.getMuseums = async (search, tags, freeEntry, maxPrice, services, day, lat, lon, maxDistance, page = 1, limit = 20) => {
  // 2. Costruiamo dinamicamente la query di MongoDB
  const query = {};

  // Ricerca Testuale (Nome o Indirizzo)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } }
    ];
  }

  // Filtro Stili / Tag (Match se il museo ne contiene almeno uno tra quelli scelti)
  if (tags) {
    const tagsArray = tags.split(',');
    query.tags = { $in: tagsArray };
  }

  // Prezzo (Gratis o con un tetto massimo)
  if (freeEntry === 'true') {
    // Per coprire i casi in cui il prezzo è 0, null o non specificato
    query.$or = [{ ticketPrice: 0 }, { ticketPrice: null }, { ticketPrice: { $exists: false } }];
  } else if (maxPrice && parseInt(maxPrice) < 50) {
    query.ticketPrice = { $lte: parseInt(maxPrice) };
  }

  // Servizi (Il museo deve averli TUTTI quelli spuntati)
  if (services) {
    const servicesArray = services.split(',');
    query.services = { $all: servicesArray };
  }

  // Giorni di apertura (Cerca dentro l'array di oggetti schedule)
  if (day) {
    query.schedule = { $elemMatch: { day: day } };
  }

  let museums = [];
    let total = 0;

    // 3. Logica di Distanza (Geolocalizzazione)
    if (lat && lon) {
      /* 
         APPROCCIO IBRIDO SICURO: Per non forzarti a ristrutturare il database 
         inserendo indici geospaziali 2dsphere (che richiedono un formato GeoJSON rigido),
         usiamo una query classica e poi calcoliamo la distanza sui risultati in memoria.
         (Su qualche migliaio di musei è fulmineo).
      */
      const allFiltered = await Museum.find(query); // Mongoose model (es. Museum)
      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);
      const maxDist = parseInt(maxDistance) || 500;

      // Calcola distanza, filtra e ordina dal più vicino
      const sorted = allFiltered.map(m => {
        const d = getDistanceFromLatLonInKm(userLat, userLon, m.latitude, m.longitude);
        return { ...m.toObject(), tempDistance: d };
      })
      .filter(m => maxDist >= 500 || m.tempDistance <= maxDist)
      .sort((a, b) => (a.tempDistance || 0) - (b.tempDistance || 0));

      // Paginazione "manuale" sull'array ordinato
      total = sorted.length;
      const startIndex = (page - 1) * limit;
      museums = sorted.slice(startIndex, startIndex + Number(limit));

    } else {
      /*
         APPROCCIO SCALABILE PURO: Se non c'è il GPS attivo, deleghiamo la paginazione 
         direttamente a MongoDB (altamente scalabile, regge milioni di record).
      */
      total = await Museum.countDocuments(query);
      museums = await Museum.find(query)
                            .sort({ createdAt: -1, _id: 1 }) // AGGIUNTO IL TIE-BREAKER!
                            .skip((page - 1) * limit)
                            .limit(Number(limit));
    }

    // 4. Risposta al frontend con metadati per l'infinite scroll
    return({
      museums,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
}

exports.uploadAllMuseums = async (data) => {
  try {
    let cleared = await Museum.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Museum.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.saveMuseum = async (museumData, userId) => {
  const { name, address, contact_email, contact_phone, image, tags, ticketPrice, sections, schedule, services, accessibility } = museumData;

  // validazione modello
  const museumToValidate = new Museum({
    name,
    address,
    contact_email,
    contact_phone,
    image,
    tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags,
    ticketPrice: typeof ticketPrice === 'number' ? ticketPrice : 0,
    schedule,
    services,
    accessibility
  });
  
  await museumToValidate.validate();

  // conversione indirizzo a coordinate tramite OpenStreetMap
  const coords = await geocodeAddress(museumData.address);
  museumToValidate.latitude = coords.lat;
  museumToValidate.longitude = coords.lon;

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
      { returnDocument: 'after' }
    );
  }

  return museumId;
};

exports.updateMuseum = async (museumId, updateData) => {
  const updatedMuseum = await Museum.findById(museumId);

  if (updatedMuseum && updatedMuseum.image && updatedMuseum.image !== updateData.image){
    await deleteLocalFile(updatedMuseum.image);
  }

  // Se il curatore ha modificato il prezzo, sincronizziamo la visita libera
  if (updateData.ticketPrice !== undefined) {
    const Visit = require("../models/visits");
    await Visit.findOneAndUpdate(
      { museumId: museumId, visitType: 'standard' },
      { price: updateData.ticketPrice }
    );
  }

  // Se l'utente ha modificato l'indirizzo, ricalcoliamo le coordinate
  if (updateData.address) {
    const coords = await geocodeAddress(updateData.address);
    updateData.latitude = coords.lat;
    updateData.longitude = coords.lon;
  }

  return await Museum.findByIdAndUpdate(museumId, updateData, { returnDocument: 'after', runValidators: true });
};

exports.removeSectionFromMuseum = async (museumId, sectionId) => {
  return await Museum.findByIdAndUpdate(
    museumId,
    { $pull: { sections: sectionId } },
    { returnDocument: 'after' }
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

  if(museum?.image) await deleteLocalFile(museum.image);

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

  // rimuove museumId da tutte le descrizioni degli autori
  await Author.updateMany(
    { "data.museumId": museumId },
    { $pull: { "data.$[].museumId": museumId } }
  );

  // rimuove museumId da tutte le descrizioni degli stili
  await Style.updateMany(
    { "data.museumId": museumId },
    { $pull: { "data.$[].museumId": museumId } }
  );

  return await Museum.findByIdAndDelete(museumId);
};
