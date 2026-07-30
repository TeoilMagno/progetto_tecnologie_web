const Work = require('../models/works');

exports.saveWorks = async (req,res) => {
  try {
    const rworks = req.body;

    const section = new Section({
      name: rworks.name,
      author: rworks.author,
      style: rworks.style,
      year: rworks.year,
      image: rworks.image,
      description: rworks.description
    });

    section.save()
      .then((result) => {
        res.status(201).json(result._id);
      })
      .catch((err) => {
        console.log(err);
      })
  }
  catch (err) {
    res.send(err);
  }
}
