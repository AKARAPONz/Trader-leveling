// services/orderWatcher.js
const axios = require('axios');
const OpenPosition = require('../models/openPosition');
const TradeLog = require('../models/tradeLog');
const TournamentUser = require('../models/tournamentUser');

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=';

async function checkPositions() {
  try {
    const openPositions = await OpenPosition.find({});
    for (const pos of openPositions) {
      // ✅ ดึงราคาปัจจุบันจาก Binance
      const { data } = await axios.get(BINANCE_API + pos.symbol);
      const price = parseFloat(data.price);

      let shouldClose = false;

      if (pos.action === 'buy') {
        if (pos.stopLoss && price <= pos.stopLoss) shouldClose = true;
        if (pos.takeProfit && price >= pos.takeProfit) shouldClose = true;
      } else if (pos.action === 'sell') {
        if (pos.stopLoss && price >= pos.stopLoss) shouldClose = true;
        if (pos.takeProfit && price <= pos.takeProfit) shouldClose = true;
      }

if (shouldClose) {
  console.log(`📉 Auto-close triggered for ${pos.symbol} at ${price}`);

  let score = 0;
  if (pos.action === 'buy') {
    if (pos.entryPrice < price) {
      score = (price - pos.entryPrice) * pos.lot;
    } else {
      score = -((pos.entryPrice - price) * pos.lot);
    }
  } else if (pos.action === 'sell') {
    if (pos.entryPrice > price) {
      score = (pos.entryPrice - price) * pos.lot;
    } else {
      score = -((price - pos.entryPrice) * pos.lot);
    }
  }

  const pnl = score;

  // ✅ บันทึก TradeLog
  await TradeLog.create({
    tournamentId: pos.tournamentId,
    userId: pos.userId,
    symbol: pos.symbol,
    action: `close-${pos.action}`,
    lot: pos.lot,
    entryPrice: pos.entryPrice,
    closePrice: price,
    pnl,
    score,
    closedAt: new Date()
  });

  // ✅ อัปเดต balance
  const tu = await TournamentUser.findOne({
    tournamentId: pos.tournamentId,
    userId: pos.userId
  });
  if (tu) {
    tu.balance += pnl;
    await tu.save();
  }

  // ✅ ลบ position
  await OpenPosition.findByIdAndDelete(pos._id);
}
    }
  } catch (err) {
    console.error('❌ Error in checkPositions:', err.message);
  }
}

// รันทุก 5 วินาที
setInterval(checkPositions, 5000);

module.exports = { checkPositions };