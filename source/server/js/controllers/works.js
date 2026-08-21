const Work = require('../models/works');
const Visit = require('../models/visits');

exports.getAllWorks = async () => {
  try {
    return await Work.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllWorks = async (data) => {
  try {
    let cleared = await Work.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Work.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.getWorksById = async (workIds) => {
  return await Work.find({ _id: { $in: workIds } });
}

// Aggiorna un'opera esistente
exports.updateWorkById = async (workId, updateData, museumId) => {
  const updatedWork = await Work.findOneAndUpdate(
    { 
      _id: workId, 
      museumId: museumId, 
      $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }] 
    }, 
    updateData, 
    { new: true, runValidators: true }
  );

  if (!updatedWork) {
    const error = new Error("Opera non trovata o non sei autorizzato a modificarla");
    error.statusCode = 403;
    throw error;
  }
  return updatedWork;
};

// Elimina un'opera
exports.deleteWorkById = async (workId, museumId) => {
  const deletedWork = await Work.findOneAndDelete({
    _id: workId,
    museumId: museumId,
    $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }]
  });

  if (!deletedWork) {
    const error = new Error("Opera non trovata o non sei autorizzato a eliminarla");
    error.statusCode = 403;
    throw error;
  }
  
  await Visit.findOneAndUpdate(
    { museumId: museumId, visitType: 'standard' },
    { $pull: { works: workId } } 
  );

  return deletedWork;
};
