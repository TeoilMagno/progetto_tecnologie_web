const Museum = require('../../models/museums');

exports.saveMuseum = async (req,res) => {
  try {
    const {name, address, image_path, tags} = req.body;

    console.log(name, address, image_path, tags);

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const museum = new Museum({
      name: name,
      address: address,
      image: image_path,
      tags: tagsArray
    });

    museum.save()
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
