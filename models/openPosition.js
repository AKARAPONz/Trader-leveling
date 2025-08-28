const mongoose = require('mongoose');

const openPositionSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,         // buy / sell
  type: String,           // market / limit / stop
  lot: Number,
  entryPrice: Number,
  stopLoss: Number,
  takeProfit: Number,
  stopPrice: Number,      // สำหรับ stop order
  status: { type: String, enum: ['pending', 'active', 'closed'], default: 'active' },
  triggeredAt: Date,      // เวลาที่ stop order ถูก activate
  createdAt: Date
});

module.exports = mongoose.model('OpenPosition', openPositionSchema);
