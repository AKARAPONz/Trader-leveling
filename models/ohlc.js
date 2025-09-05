const mongoose = require('mongoose');

const ohlcSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  time: { type: Number, required: true },
  open: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
  close: { type: Number, required: true },
  tick_volume: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OHLC', ohlcSchema);
