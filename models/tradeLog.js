const mongoose = require('mongoose');

const tradelogSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'tournament' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  symbol: String,
  action: String,         // buy / sell / close-buy / close-sell
  type: String,           // market / limit
  lot: Number,
  entryPrice: Number,
  closePrice: Number,
  stopLoss: Number,
  takeProfit: Number,
  pnl: Number,            // ✅ เพิ่ม
  score: Number,
  createdAt: { type: Date, default: Date.now },
  closedAt: Date          // ✅ เพิ่ม
});

module.exports = mongoose.models.tradelog || mongoose.model('tradelog', tradelogSchema);