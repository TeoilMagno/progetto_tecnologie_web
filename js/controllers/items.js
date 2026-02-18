const Museum = require('../models/items');

exports.saveItem = async (req,res) => {
  try {
    const {name, address, image_path, tags} = req.body;

    console.log(name, address, image_path, tags);

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const item = new Item({
      Name: name,
      Address: address,
      Image: image_path,
      Tags: tagsArray
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

exports.getAllMuseums = async () => {
  try {
    return await Museum.find();
  }
  catch (err) {
    throw err;
  }
}
