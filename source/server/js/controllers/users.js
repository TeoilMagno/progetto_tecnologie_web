// controllers/users.js
const { User } = require('../models/users');
const { FederatedCredential } = require('../models/users');
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, hash) => {
      if (err) reject(err); else resolve(hash);
    });
  });
}

exports.createLocalUser = async ({ username, password, requestedRole }) => {
  const salt = crypto.randomBytes(16);
  const hash = await hashPassword(password, salt);

  const initialCuratorStatus = requestedRole === 'curator' ? 'pending' : 'none';

  return await User.create({
    username,
    password: hash,
    salt,
    role: 'visitor',
    curator_status: initialCuratorStatus
  });
};

exports.verifyPassword = async (user, password) => {
  const hash = await hashPassword(password, user.salt);
  return crypto.timingSafeEqual(hash, user.password);
};

exports.findOrCreateFederatedUser = async (provider, subject, userData) => {
  const cred = await FederatedCredential.findOne({ provider, subject });

  if (cred) {
    return await User.findById(cred.user_id); // null se l'utente è stato eliminato nel frattempo
  }

  const user = await User.create(userData);
  await FederatedCredential.create({ user_id: user._id, provider, subject });
  return user;
};

// controllers/users.js
exports.isManagingMuseum = async (userId, museumId) => {
  // Andiamo diretti al DB (non alla sessione) perché managed_museums può essere
  // cambiato da un altro processo/tab dopo il login — commento originale, comportamento preservato
  const freshUser = await User.findById(userId);
  const managed = freshUser.managed_museums || [];
  return managed.some(id => id.toString() === museumId.toString());
};

exports.addPurchasedVisits = async (userId, visitIds) => {
  if (!visitIds || visitIds.length === 0) return;

  return await User.findByIdAndUpdate(userId, {
    $addToSet: { purchased_visits: { $each: visitIds } }
  });
};