const Order = require('../models/orders');
const { User } = require('../models/users'); 
const Item = require('../models/items');

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

// Processa il carrello e crea l'ordine
exports.processCheckout = async (userId, cartData) => {
  const { items, visits, totalAmount } = cartData;

  const newOrder = new Order({
    user: userId,
    items: items || [],
    visits: visits || [],
    totalAmount: totalAmount
  });
  
  const savedOrder = await newOrder.save();

  // scala la quantita' degli items in magazzino
  if (items && items.length > 0) {
    const bulkOps = items.map(cartItem => {
      const targetId = cartItem.itemId;
      const qtyToSubtract = cartItem.quantity; 

      return {
        updateOne: {
          filter: { _id: targetId },
          // Usiamo $inc con valore negativo per sottrarre la quantità in modo sicuro
          update: { $inc: { quantity: -qtyToSubtract } } 
        }
      };
    });

    // Eseguiamo tutte le sottrazioni sul database in un colpo solo
    if (bulkOps.length > 0) {
      await Item.bulkWrite(bulkOps);
    }
  }

  // se ci sono visite guidate, estraiamo gli ID e li aggiungiamo al profilo dell'utente.
  if (visits && visits.length > 0) {
    const visitIds = visits.map(v => v.visitId);
    
    await User.findByIdAndUpdate(userId, {
      $addToSet: { purchased_visits: { $each: visitIds } }
    });
  }

  return savedOrder;
};

// Recupera lo storico degli ordini di un utente
exports.getUserOrders = async (userId) => {
  // ordinati per data decrescente
  return await Order.find({ user: userId }).sort({ createdAt: -1 });
};