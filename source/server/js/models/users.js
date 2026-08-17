const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:        { type: String, unique: true, sparse: true },
  email:           { type: String, unique: true, sparse: true }, // sparse: true perché gli utenti OAuth potrebbero non averla
  password:        { type: Buffer }, 
  salt:            { type: Buffer },
  name:            { type: String }, // usato dal login Google/Facebook
  role: {
    type: String,
    enum: ['curator', 'visitor', 'admin'],
    default: 'visitor'
  },

  type: {
    type: String,
    enum: ['student', 'teacher', 'none'],
    default: 'none'
  },

  // tracciamento dello stato di richiesta curatore
  curator_status: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },

  // Musei gestiti (per curatori)
  managed_museums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Museum' }],

  // Visite create (per curatori)
  created_visits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }],

  // Visite acquistate (per visitatori)
  purchased_visits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Visit' }],
  preferences: {
    favorite_styles:  [String],
    visit_history:    [mongoose.Schema.Types.ObjectId],
    expertiseLevel: { 
      type: String, 
      enum: ['simple', 'medium', 'professional', 'expert'],
      default: 'medium' 
    },
    interactionsCount: { // Contatore per capire quando fare il "salto" di livello
      simpler_requests: { type: Number, default: 0 },
      deeper_requests: { type: Number, default: 0 }
    }
  }
});

const federatedSchema = new mongoose.Schema({
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: { type: String },
  subject:  { type: String }
});
federatedSchema.index({ provider: 1, subject: 1 }, { unique: true });

const Users = mongoose.model('User', userSchema);
const FederatedCredential = mongoose.model('FederatedCredential', federatedSchema);

module.exports = { User: Users, FederatedCredential };
