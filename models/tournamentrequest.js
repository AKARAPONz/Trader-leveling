const mongoose = require('mongoose');

const tournamentrequestSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'tournament' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'removed'],
    default: 'pending'
  },
  appliedAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
});

module.exports = mongoose.models.tournamentrequest || mongoose.model('tournamentrequest', tournamentrequestSchema);