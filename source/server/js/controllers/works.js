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

// Aggiorna un'opera esistente
exports.updateWorkById = async (workId, updateData) => {
  const updatedWork = await Work.findByIdAndUpdate(workId, updateData, { new: true, runValidators: true });
  if (!updatedWork) throw new Error("Opera non trovata");
  return updatedWork;
};

// Elimina un'opera
exports.deleteWorkById = async (workId) => {
  const deletedWork = await Work.findByIdAndDelete(workId);
  if (!deletedWork) throw new Error("Opera non trovata");
  return deletedWork;
};