const Order = require('../models/orders');
const Item = require('../models/items');
const userController = require('./users')
const { invalidateCache } = require('../utils/cache');

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

  // Guardia disponibilità magazzino
  if (items && items.length > 0) {
    const itemIds = items.map(i => i.itemId);
    const dbItems = await Item.find({ _id: { $in: itemIds } });

    for (const cartItem of items) {
      const dbItem = dbItems.find(i => i._id.toString() === cartItem.itemId);
      
      // Se l'articolo è inesistente o la richiesta supera lo stock disponibile, blocca tutto
      if (!dbItem || dbItem.quantity < cartItem.quantity) {
        const error = new Error(`L'articolo "${cartItem.name}" non ha disponibilità sufficiente (Rimanenti: ${dbItem ? dbItem.quantity : 0}).`);
        error.statusCode = 400; 
        throw error;
      }
    }
  }

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
    if (bulkOps.length > 0) {
      await Item.bulkWrite(bulkOps);

      // Invalidiamo solo la cache dei musei coinvolti in QUESTO acquisto,
      // non l'intero catalogo globale di /items.
      // const purchasedItems = await Item.find(
      //   { _id: { $in: items.map(i => i.itemId) } },
      //   'museumId'
      // );
      // const museumIds = [...new Set(purchasedItems.map(i => i.museumId.toString()))];
      invalidateCache(['/items']);
    }
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