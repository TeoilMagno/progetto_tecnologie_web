const Adoption = require('../models/adoptions');

exports.getWorkByAdoption = async (adoptionId) => {
  try {
    const adoption = await Adoption.findOne({ _id: adoptionId });
    return adoption.workId;
  }
  catch (err) {
    throw err;
  }
}
