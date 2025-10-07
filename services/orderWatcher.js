// services/orderWatcher.js
const axios = require('axios');
const OpenPosition = require('../models/openPosition');
const TradeLog = require('../models/tradeLog');
const TournamentUser = require('../models/tournamentUser');

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=';

// ✅ สร้าง instance ของ axios ที่มี retry delay
const api = axios.create({ baseURL: BINANCE_API });

// หน่วงระหว่าง request แต่ละ symbol เพื่อไม่ให้โดน block
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkPositions() {
  try {
    const openPositions = await OpenPosition.find({});
    if (!openPositions.length) return;

    console.log(`🔍 Checking ${openPositions.length} open positions...`);

    for (const pos of openPositions) {
      try {
        // ✅ ดึงราคาปัจจุบันจาก Binance (retry ถ้าโดน rate limit)
        let price = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { data } = await api.get(pos.symbol);
            price = parseFloat(data.price);
            break; // ✅ สำเร็จออกจาก loop retry
          } catch (err) {
            if (err.response && err.response.status === 429) {
              console.warn(`⚠️ Rate limit hit (attempt ${attempt}) → waiting 5s...`);
              await delay(5000); // รอ 5 วิแล้วลองใหม่
            } else {
              throw err;
            }
          }
        }

        if (!price) {
          console.warn(`⚠️ Failed to fetch price for ${pos.symbol}`);
          continue;
        }

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
            score = (price - pos.entryPrice) * pos.lot;
          } else if (pos.action === 'sell') {
            score = (pos.entryPrice - price) * pos.lot;
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
            closedAt: new Date(),
          });

          // ✅ อัปเดต balance
          const tu = await TournamentUser.findOne({
            tournamentId: pos.tournamentId,
            userId: pos.userId,
          });
          if (tu) {
            tu.balance += pnl;
            await tu.save();
          }

          // ✅ ลบ position ที่ปิดแล้ว
          await OpenPosition.findByIdAndDelete(pos._id);
        }

        // ✅ เว้นช่วง 1 วิ ต่อ symbol เพื่อไม่ให้โดน rate limit
        await delay(1000);
      } catch (err) {
        console.error(`❌ Error processing ${pos.symbol}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Error in checkPositions:', err.message);
  }
}

// ✅ รันทุก 10 วินาที (ปลอดภัยกว่า 5 วินาที)
setInterval(checkPositions, 10000);

module.exports = { checkPositions };