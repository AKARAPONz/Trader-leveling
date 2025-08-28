const mongoose = require('mongoose');

const tradeLogSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,         // buy / sell
  type: String,           // market / limit
  lot: Number,
  entryPrice: Number,
  stopLoss: Number,
  takeProfit: Number,
  score: Number,
  createdAt: Date
});

module.exports = mongoose.model('TradeLog', tradeLogSchema);
