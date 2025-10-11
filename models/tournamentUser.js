const mongoose = require('mongoose');

const tournamentuserSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'tournament', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  balance: { type: Number, required: true, default: 0 }
});

tournamentuserSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.tournamentuser || mongoose.model('tournamentuser', tournamentuserSchema);