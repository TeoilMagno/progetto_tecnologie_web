const Section = require('../models/sections');

exports.saveSection = async (req,res) => {
  try {
    const {rsection, museumId} = req.body;

    const section = new Section({
      title: rsection.title
      image: rsection.image,
      works: [null],
      museumId: museumId
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
