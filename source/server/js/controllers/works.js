const Work = require('../models/works');
const Visit = require('../models/visits');

const { deleteLocalFile } = require('../utils/file-helper');

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
  const oldWork = await Work.findOne({ 
      _id: workId, 
      museumId: museumId, 
      $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }] 
    });
  // Se l'immagine è cambiata, elimina quella vecchia
  if (oldWork && oldWork.image && oldWork.image !== updateData.image) {
    await deleteLocalFile(oldWork.image);
  }

  const updatedWork = await Work.findOneAndUpdate(
    { 
      _id: workId, 
      museumId: museumId, 
      $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }] 
    }, 
    updateData, 
    { returnDocument: 'after', runValidators: true }
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
  const workToDelete = await Work.findOne({
    _id: workId,
    museumId: museumId,
    $or: [{ adoptionId: null }, { adoptionId: { $exists: false } }]
  });

  if (workToDelete && workToDelete.image) {
    await deleteLocalFile(workToDelete.image);
  }

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
