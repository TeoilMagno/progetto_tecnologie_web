const Author = require('../models/author');

exports.getAllAuthors = async () => {
  try {
    return await Author.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllAuthors = async (data) => {
  try {
    let cleared = await Author.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Author.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

// Ricerca autori con fuzzy search
exports.searchAuthors = async (query) => {
  if (!query) return [];
  
  // Cerca gli autori che contengono la stringa (case-insensitive) e limita a 10
  return await Author.find({ name: { $regex: query, $options: 'i' } })
                     .select('_id name')
                     .limit(10);
};

// Ottieni tutti i dettagli di un autore
exports.getAuthorById = async (authorId) => {
  const author = await Author.findById(authorId).populate('data.museumId', 'name image');
  
  if (!author) {
    const error = new Error('Autore non trovato');
    error.statusCode = 404;
    throw error;
  }
  
  return author;
};

// Crea un nuovo autore
exports.createAuthor = async (authorData) => {
  const { name, data } = authorData;
  
  const newAuthor = new Author({
    name,
    data: [data] // Inizializziamo l'array con la prima card scritta dal curatore
  });
  
  try {
    return await newAuthor.save();
  } catch (error) {
    // Gestione errore duplicato di MongoDB
    if (error.code === 11000) {
      const duplicateError = new Error("Un autore con questo nome esiste già.");
      duplicateError.statusCode = 400;
      throw duplicateError;
    }
    throw error;
  }
};

// Aggiungi una nuova card descrittiva a un autore esistente
exports.addAuthorData = async (authorId, newData) => {
  const { museumId, oldDataId, bio, bd, studies, mainWorks } = newData;
  
  const author = await Author.findById(authorId);
  if (!author) {
    const error = new Error('Autore non trovato');
    error.statusCode = 404;
    throw error;
  }

  if(oldDataId) {
    const oldData = author.data.id(oldDataId);
    if(oldData && oldData.museumId) {
      // Rimuoviamo il museo dalla vecchia descrizione
      oldData.museumId = oldData.museumId.filter(mId => mId.toString() !== museumId.toString());
    
      // * non viene rimossa la descrizione se rimane senza museumId perche' presumibilmente puo' sceglierla un altro curatore; si potrebbe pensare ad operazioni settimanali/mensili di pulizia del db
    }
  }
  // rimuoviamo le altre selezioni -> una descrizione per autore consentita
  author.data.forEach(item => {
    item.museumId = item.museumId.filter(id => id.toString() !== museumId.toString());
  });

  // Aggiungiamo la nuova card all'array data dell'autore
  author.data.push({
    museumId: [museumId],
    bio,
    bd,
    studies,
    mainWorks // Inizialmente vuoto
  });

  return await author.save();
};

// Aggiunge il museo corrente all'array museumId di una specifica card esistente (permette di utilizzare una descrizione esistente)
exports.adoptAuthorData = async (authorId, dataId, museumId) => {
  // 1. Rimuove il museo da qualsiasi altra descrizione di questo autore
  await Author.updateOne(
    { _id: authorId },
    { $pull: { "data.$[].museumId": museumId } }
  );

  // 2. Aggiunge il museo alla descrizione scelta senza innescare la validazione globale
  const updatedAuthor = await Author.findOneAndUpdate(
    { _id: authorId, "data._id": dataId },
    { $addToSet: { "data.$.museumId": museumId } },
    { new: true } 
  ).populate('data.museumId', 'name image');

  if (!updatedAuthor) {
    const error = new Error('Autore o descrizione non trovata');
    error.statusCode = 404;
    throw error;
  }

  return updatedAuthor;
};
