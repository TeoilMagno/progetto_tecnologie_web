const Style = require('../models/style');

exports.getAllStyles = async () => {
  try {
    return await Style.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllStyles = async (data) => {
  try {
    let cleared = await Style.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Style.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.searchStyles = async (query) => {
  if (!query) return [];
  return await Style.find({ name: { $regex: query, $options: 'i' } })
                    .select('_id name')
                    .limit(10);
};

exports.getStyleById = async (styleId) => {
  const style = await Style.findById(styleId).populate('data.museumId', 'name image');
  if (!style) {
    const error = new Error('Stile non trovato');
    error.statusCode = 404;
    throw error;
  }
  return style;
};

exports.createStyle = async (styleData) => {
  const { name, data } = styleData;
  const newStyle = new Style({ name, data: [data] });
  try {
    return await newStyle.save();
  } catch (error) {
    if (error.code === 11000) {
      const dupError = new Error("Uno stile con questo nome esiste già.");
      dupError.statusCode = 400;
      throw dupError;
    }
    throw error;
  }
};

// Aggiungi una nuova definizione personalizzata (e toglie le altre)
exports.addStyleData = async (styleId, newData) => {
  const { museumId, oldDataId, description } = newData;
  const style = await Style.findById(styleId);
  if (!style) throw Object.assign(new Error('Stile non trovato'), { statusCode: 404 });

  if (oldDataId) {
    const oldData = style.data.id(oldDataId);
    if (oldData && oldData.museumId) {
      oldData.museumId = oldData.museumId.filter(mId => mId.toString() !== museumId.toString());
    
      // * vedi autore addAuthorData
    }
  }

  // Rimuoviamo il museo dalle altre definizioni (singola scelta)
  style.data.forEach(item => {
    item.museumId = item.museumId.filter(id => id.toString() !== museumId.toString());
  });

  style.data.push({ museumId: [museumId], description });
  return await style.save();
};

// Adotta una definizione esistente
exports.adoptStyleData = async (styleId, dataId, museumId) => {
  await Style.updateOne(
    { _id: styleId },
    { $pull: { "data.$[].museumId": museumId } }
  );

  const updatedStyle = await Style.findOneAndUpdate(
    { _id: styleId, "data._id": dataId },
    { $addToSet: { "data.$.museumId": museumId } },
    { new: true }
  ).populate('data.museumId', 'name image');

  if (!updatedStyle) {
    const error = new Error('Stile o descrizione non trovata');
    error.statusCode = 404;
    throw error;
  }

  return updatedStyle;
};