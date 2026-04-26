const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:        { type: String, unique: true, sparse: true },
  email:           { type: String, unique: true, sparse: true }, // sparse: true perché gli utenti OAuth potrebbero non averla
  password: { type: Buffer }, // rinominato da 'password' per chiarezza
  salt:            { type: Buffer },
  name:            { type: String }, // usato dal login Google/Facebook
  role: {
    type: String,
    enum: ['curator', 'visitor', 'museum'],
    default: 'visitor'
  },
  // Musei gestiti (per curatori)
  managed_museums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Museum' }],

  // Visite create (per curatori)
  created_visits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }],

  // Visite acquistate (per Visitatori/Customer)
  purchased_visits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }],
  preferences: {
    favorite_styles:  [String],
    visit_history:    [mongoose.Schema.Types.ObjectId]
  }
});

const federatedSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: { type: String },
  subject:  { type: String }
});
federatedSchema.index({ provider: 1, subject: 1 }, { unique: true });

const Users = mongoose.model('User', userSchema, 'Users');
const FederatedCredential = mongoose.model('FederatedCredential', federatedSchema, 'FederatedCredentials');

// esporta entrambi in un oggetto unico — mai due module.exports separati
module.exports = { User: Users, FederatedCredential };