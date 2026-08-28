const Item = require('../models/items');

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

exports.getItemByMuseum = async (museumId) => {
  try {
    return await Item.find({ museumId: museumId });
  }
  catch (err) {
    throw err;
  }
}

exports.modifyItemById = async (itemId, updateData) => {
  try {
    return await Item.findByIdAndUpdate(itemId, updateData, {new: true});
  }
  catch (err) {
    throw err;
  }
}
