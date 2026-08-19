const Style = require('../models/style');

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
  const style = await Style.findById(styleId);
  if (!style) throw Object.assign(new Error('Stile non trovato'), { statusCode: 404 });

  // Rimuoviamo il museo dalle altre definizioni
  style.data.forEach(item => {
    item.museumId = item.museumId.filter(id => id.toString() !== museumId.toString());
  });
  
  const dataItem = style.data.id(dataId);
  if (!dataItem) throw Object.assign(new Error('Definizione non trovata'), { statusCode: 404 });

  // Selezioniamo questa
  if (!dataItem.museumId.includes(museumId)) {
    dataItem.museumId.push(museumId);
    await style.save();
  }

  return await Style.findById(styleId).populate('data.museumId', 'name image');
};