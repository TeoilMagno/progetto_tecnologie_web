const Order = require('../models/orders');
const Item = require('../models/items');
const userController = require('./users')

exports.getAllOrders = async () => {
  try {
    return await Order.find();
  } catch (err) {
    throw err;
  }
};

exports.uploadAllOrders = async (data) => {
  try {
    let cleared = await Order.deleteMany({});

    console.log(`... ${cleared.deletedCount || 0} records deleted.`);
    console.log(`Trying to add ${data.length} new records... `);

 		let insertedCount = 0;
		await Order.insertMany(data).then(() => {
			insertedCount += data.length;
		});

 		console.log(`... ${insertedCount || 0} records added.`);
  } catch (e) {
    console.log(e);
  }
};

exports.processCheckout = async (userId, cartData) => {
  const { items, visits, totalAmount } = cartData;

  const newOrder = new Order({
    user: userId,
    items: items || [],
    visits: visits || [],
    totalAmount: totalAmount
  });

  const savedOrder = await newOrder.save();

  if (items && items.length > 0) {
    const bulkOps = items.map(cartItem => ({
      updateOne: {
        filter: { _id: cartItem.itemId },
        update: { $inc: { quantity: -cartItem.quantity } }
      }
    }));
    if (bulkOps.length > 0) await Item.bulkWrite(bulkOps);
  }

  if (visits && visits.length > 0) {
    const visitIds = visits.map(v => v.visitId);
    await userController.addPurchasedVisits(userId, visitIds);
  }

  return savedOrder;
};

// Recupera lo storico degli ordini di un utente
exports.getUserOrders = async (userId) => {
  // ordinati per data decrescente
  return await Order.find({ user: userId }).sort({ createdAt: -1 });
};