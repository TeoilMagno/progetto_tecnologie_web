const Work = require('../models/works');

exports.saveWorks = async (workData) => {
  const section = new Section({
    name: rworks.name,
    author: rworks.author,
    style: rworks.style,
    year: rworks.year,
    image: rworks.image,
    description: rworks.description
  });

  const result = await work.save();
  return result._id;
}

exports.getWorksById = async (workIds) => {
  return await Work.find({ _id: { $in: workIds } });
}
