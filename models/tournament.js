const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, required: true },
  assets: [{ type: String, required: true }],
  start: { type: Date, required: true },  // แก้ตรงนี้
  end: { type: Date, required: true },    // แก้ตรงนี้
});

module.exports = mongoose.model('Tournament', tournamentSchema);
