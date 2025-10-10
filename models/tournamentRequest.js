const mongoose = require('mongoose');

const tournamentRequestSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'removed'],
    default: 'pending'
  },
  appliedAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
});

module.exports = mongoose.models.TournamentRequest || mongoose.model('TournamentRequest', tournamentRequestSchema);