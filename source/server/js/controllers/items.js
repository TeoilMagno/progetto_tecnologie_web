const Item = require('../models/items');

exports.getAllItems = async () => {
  try {
    return await Item.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllItems = async (data) => {
  try {
    let cleared = await Item.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Item.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.getItemByMuseum = async (museumId) => {
  try {
    return await Item.find({ museumId: museumId });
  }
  catch (err) {
    throw err;
  }
}

exports.modifyItemById = async (itemId, updateData) => {
  try {
    return await Item.findByIdAndUpdate(itemId, updateData, {new: true});
  }
  catch (err) {
    throw err;
  }
}
