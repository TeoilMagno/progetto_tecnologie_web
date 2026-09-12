// controllers/users.js
const { User } = require('../models/users');
const { FederatedCredential } = require('../models/users');
const Visit = require('../models/visits');
const Order = require('../models/orders');
const Adoption = require('../models/adoptions');

const { deleteMuseumById } = require("../models/museums");
const { deleteVisitById } = require("../models/visits");
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

exports.getAllUsers = async () => {
  // Usiamo .lean() per ottenere oggetti JS puri dal DB
  const users = await User.find({}).lean();
  
  return users.map(user => {
    // Convertiamo esplicitamente i Buffer in stringhe Base64 per un JSON pulito
    if (user.password) user.password = user.password.toString('base64');
    if (user.salt) user.salt = user.salt.toString('base64');
    
    return user;
  });
};

exports.uploadAllUsers = async (usersData) => {
  await User.deleteMany({});
  
  const formattedUsers = usersData.map(user => {
    // Ripristiniamo la stringa Base64 nel formato Buffer nativo richiesto da crypto
    if (user.password) user.password = Buffer.from(user.password, 'base64');
    if (user.salt) user.salt = Buffer.from(user.salt, 'base64');
    
    return user;
  });

  await User.insertMany(formattedUsers);
};

exports.getAllFederatedCredentials = async () => {
  return await FederatedCredential.find({}).lean();
};

exports.uploadAllFederatedCredentials = async (credentialsData) => {
  await FederatedCredential.deleteMany({});
  await FederatedCredential.insertMany(credentialsData);
};

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

exports.updateUserProfile = async (userId, updateData) => {
  const { username, newPassword, oldPassword, expertiseLevel, type, requestCurator } = updateData;
  const user = await User.findById(userId);

  // 1. Aggiornamento Username
  if (username) {
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== user._id.toString()) {
      const error = new Error("Username già in uso.");
      error.status = 400;
      throw error;
    }
    user.username = username;
  }

  // 2. Aggiornamento Expertise
  if (expertiseLevel) {
    if (!user.preferences) user.preferences = {};
    user.preferences.expertiseLevel = expertiseLevel;
  }

  // 3. Aggiornamento Password (riutilizzando hashPassword nativo del controller)
  if (newPassword) {
    if (user.password && user.salt) {
      if (!oldPassword) {
        const error = new Error("Devi inserire la password attuale.");
        error.status = 400;
        throw error;
      }
      const oldHash = await hashPassword(oldPassword, user.salt);
      if (!crypto.timingSafeEqual(user.password, oldHash)) {
        const error = new Error("La password attuale non è corretta.");
        error.status = 401;
        throw error;
      }
    }
    const newSalt = crypto.randomBytes(16);
    const newHash = await hashPassword(newPassword, newSalt);
    
    user.salt = newSalt;
    user.password = newHash;
  }

  // 4. Aggiornamento Tipo / Ruoli
  if (type) user.type = type;

  if (requestCurator && (user.curator_status === 'none' || user.curator_status === 'rejected')) {
    user.curator_status = 'pending';
  }

  await user.save();
  return user;
};


exports.deleteUserAccount = async (userId) => {
  // Richiamiamo i controller internamente per evitare dipendenze circolari globali

  const user = await User.findById(userId);
  if (!user) return;

  // 1. Elimina i musei del curatore a cascata
  if (user.managed_museums && user.managed_museums.length > 0) {
    for (const museumId of user.managed_museums) {
      await deleteMuseumById(museumId);
    }
  }

  // 2. Elimina le visite create dall'utente
  const userVisits = await Visit.find({ creator: user._id });
  for (const visit of userVisits) {
    await deleteVisitById(visit._id, user);
  }

  // 3. Elimina fisicamente Ordini e Adozioni
  await Order.deleteMany({ userId: user._id });
  await Adoption.deleteMany({ requestedBy: user._id });

  // 4. Elimina eventuali credenziali social orfane (risolvendo il bug delle FederatedCredentials)
  await FederatedCredential.deleteMany({ user_id: user._id });

  // 5. Elimina profilo principale
  return await User.findByIdAndDelete(user._id);
};

exports.evaluateExpertiseLevel = async (userId, sessionExpertise) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Utente non trovato");

  const levels = ['simple', 'medium', 'professional', 'expert'];
  const currentExpertise = user.preferences?.expertiseLevel || 'medium';

  const currentIndex = levels.indexOf(currentExpertise);
  const sessionIndex = levels.indexOf(sessionExpertise);

  if (sessionIndex === -1) return { newExpertise: currentExpertise, hasChanged: false };

  // Inizializzazione sicura se i campi mancano
  if (!user.preferences) user.preferences = {};
  if (!user.preferences.interactionsCount) {
    user.preferences.interactionsCount = { simpler_requests: 0, deeper_requests: 0 };
  }

  let updated = false;

  if (sessionIndex > currentIndex) {
    user.preferences.interactionsCount.deeper_requests += 1;
    user.preferences.interactionsCount.simpler_requests = 0; // Azzera l'altro contatore

    if (user.preferences.interactionsCount.deeper_requests >= 2) {
      user.preferences.expertiseLevel = levels[currentIndex + 1];
      user.preferences.interactionsCount.deeper_requests = 0;
      updated = true;
    }
  } else if (sessionIndex < currentIndex) {
    user.preferences.interactionsCount.simpler_requests += 1;
    user.preferences.interactionsCount.deeper_requests = 0; 

    if (user.preferences.interactionsCount.simpler_requests >= 2) {
      user.preferences.expertiseLevel = levels[currentIndex - 1];
      user.preferences.interactionsCount.simpler_requests = 0;
      updated = true;
    }
  } else {
    // Stesso livello: l'utente si trova bene, azzeriamo i contatori per
    // richiedere 2 salti consecutivi "puri" in futuro
    user.preferences.interactionsCount.simpler_requests = 0;
    user.preferences.interactionsCount.deeper_requests = 0;
  }

  await user.save();
  
  return {
    newExpertise: user.preferences.expertiseLevel,
    hasChanged: updated
  };
};