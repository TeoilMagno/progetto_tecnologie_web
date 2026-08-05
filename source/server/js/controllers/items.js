const Item = require('../models/items');

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
