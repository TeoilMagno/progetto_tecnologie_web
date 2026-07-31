const Work = require('../models/works');

exports.saveWorks = async (workData) => {
  const section = new Section({
    name: workData.name,
    author: workData.author,
    style: workData.style,
    year: workData.year,
    image: workData.image,
    description: workData.description
  });

  const result = await work.save();
  return result._id;
}

exports.getWorksById = async (workIds) => {
  return await Work.find({ _id: { $in: workIds } });
}
