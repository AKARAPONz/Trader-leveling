const mongoose = require('mongoose');

const tournamentUserSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, required: true, default: 0 }
});

tournamentUserSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.TournamentUser || mongoose.model('TournamentUser', tournamentUserSchema);