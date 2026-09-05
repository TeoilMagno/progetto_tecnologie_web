const Item = require('../models/items');
const { deleteLocalFile } = require('../utils/file-helper');

exports.getAllItems = async () => {
  try {
    return await Item.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllItems = async (data) => {
  try {
    let cleared = await Item.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Item.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.getMuseumItems = async (museumIdStr, page = 1, limit = 12, search = "") => {
  try {
    const mongoose = require("mongoose");
    const museumObjectId = new mongoose.Types.ObjectId(museumIdStr);
    
    const query = { museumId: museumObjectId };

    // Supporto per una futura barra di ricerca nel bookshop
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const Item = require("../models/items"); // Verifica che il percorso del modello sia corretto
    
    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
                            .sort({ createdAt: -1, _id: 1 }) // Tie-Breaker vitale per l'infinite scroll
                            .skip((page - 1) * limit)
                            .limit(Number(limit));

    return {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  } catch (err) {
    throw err;
  }
};

exports.modifyItemById = async (itemId, updateData) => {
  try {
    return await Item.findByIdAndUpdate(itemId, updateData, {new: true});
  }
  catch (err) {
    throw err;
  }
}

// Elimina un articolo del bookshop (stesso pattern di deleteWorkById/deleteSectionById:
// findOneAndDelete atomico filtrato su _id + museumId, per verificare in un colpo solo
// esistenza e proprietà)
exports.deleteItemById = async (itemId, museumId) => {
  const deletedItem = await Item.findOneAndDelete({ _id: itemId, museumId: museumId });

  if (!deletedItem) {
    const error = new Error("Articolo non trovato o non sei autorizzato a eliminarlo");
    error.statusCode = 403;
    throw error;
  }

  // Se in futuro gli articoli avranno un'immagine locale caricata, questo la ripulisce già;
  // se il campo non esiste sul modello, la condizione è semplicemente falsa e non fa nulla.
  if (deletedItem.image) {
    await deleteLocalFile(deletedItem.image);
  }

  return deletedItem;
};

// Elimina tutti gli articoli di un museo. Usata in cascata da deleteMuseumById:
// non richiede un controllo di proprietà separato perché l'autorizzazione
// è già stata verificata a monte sul museo stesso.
exports.deleteAllItemsByMuseum = async (museumId) => {
  const items = await Item.find({ museumId: museumId }).select('_id');

  for (const item of items) {
    try {
      await exports.deleteItemById(item._id, museumId);
    } catch (err) {
      console.warn(`Impossibile eliminare l'articolo ${item._id} durante la cascata: ${err.message}`);
    }
  }
};