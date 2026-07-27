const Item = require('../models/items');

exports.saveItem = async (req,res) => {
  try {
    const {name, price, description, image, museumId, quantity, duration, tone} = req.body;

    console.log(name, price, description, image, museumId, quantity, duration, tone);

    const item = new Item({
      name: name,
      price: price,
      description: description,
      image: image,
      museumId: museumId,
      quantity: quantity,
      duration: duration,
      tone: tone
    });

    item.save()
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        console.log(err);
      })
  }
  catch (err) {
    res.send(err);
  }
}

exports.getItemByMuseum = async (museumId) => {
  try {
    return await Item.find({museumId: museumId});
  }
  catch (err) {
    throw err;
  }
}

exports.modofyItemById = async (itemId, updateData) => {
  try {
  return await Item.findByIdAndUpdate(itemId, updateData, {new: true});
  }
  catch (err) {
    throw err;
  }
}
