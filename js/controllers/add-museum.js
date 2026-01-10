const Museum = require('../../models/museums');

exports.saveMuseum = async (req,res) => {
  try {
    const {name, address, image_path} = req.body;

    console.log(name, address, image_path);

    const museum = new Museum({
      Name: name,
      Address: address,
      Image: image_path
    });

    user.save()
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        console.log(err);
      })
  } catch (err) {
    res.send(err);
  }
}
