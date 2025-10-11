const mongoose = require('mongoose');

const openpositionSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'tournament', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

  symbol: { type: String, required: true },          // ✅ เช่น BTCUSDT
  action: { type: String, enum: ['buy', 'sell'], required: true },
  type: { type: String, enum: ['market', 'limit', 'stop'], default: 'market' },

  lot: { type: Number, required: true },
  entryPrice: { type: Number, required: true },

  stopLoss: { type: Number },
  takeProfit: { type: Number },
  stopPrice: { type: Number },                        // สำหรับ stop order

  status: { type: String, enum: ['pending', 'active', 'closed'], default: 'active' },
  triggeredAt: { type: Date },
  createdAt: { type: Date, default: Date.now }        // ✅ ใส่ default
});

module.exports = mongoose.models.openposition || mongoose.model('openposition', openpositionSchema);