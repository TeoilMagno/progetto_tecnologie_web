const Order = require('../models/orders');
const { User } = require('../models/users'); //

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