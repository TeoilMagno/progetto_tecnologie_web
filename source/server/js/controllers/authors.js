const Author = require('../models/author');

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
  const { museumId, bio, bd, studies } = newData;
  
  const author = await Author.findById(authorId);
  if (!author) {
    const error = new Error('Autore non trovato');
    error.statusCode = 404;
    throw error;
  }

  // Aggiungiamo la nuova card all'array data dell'autore
  author.data.push({
    museumId: [museumId],
    bio,
    bd,
    studies,
    mainWorksId: [] // Inizialmente vuoto
  });

  return await author.save();
};