const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, default: 'REGISTRATION' },
  expGiven: { type: Boolean, default: false }
});

module.exports = mongoose.models.tournament || mongoose.model('tournament', tournamentSchema);