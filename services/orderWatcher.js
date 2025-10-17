// services/orderWatcher.js
const axios = require('axios');
const OpenPosition = require('../models/openposition');
const TradeLog = require('../models/tradelog');
const TournamentUser = require('../models/tournamentuser');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkPositions() {
  try {
    const openPositions = await OpenPosition.find({});
    if (!openPositions.length) return;

    console.log(`🔍 Checking ${openPositions.length} open positions...`);

    // ✅ ดึงราคาทั้งหมดจาก Binance ทีเดียว (เร็วมาก)
    const { data: allPrices } = await axios.get('http://localhost:4000/api/allprices');

    for (const pos of openPositions) {
      try {
        // ✅ ข้ามออเดอร์ที่เพิ่งเปิดไม่เกิน 10 วินาที
        const secondsSinceOpen = (Date.now() - new Date(pos.createdAt).getTime()) / 1000;
        if (secondsSinceOpen < 10) {
          console.log(`⏱ Skip ${pos.symbol} (just opened ${secondsSinceOpen.toFixed(1)}s ago)`);
          continue;
        }

        // ✅ หา symbol จากราคาที่ดึงมาทั้งหมด
        const found = allPrices.find(p => p.symbol === pos.symbol.toUpperCase());
        if (!found) {
          console.warn(`⚠️ Symbol not found on Binance: ${pos.symbol}`);
          continue;
        }

        const price = parseFloat(found.price);
        if (!price || isNaN(price)) {
          console.warn(`⚠️ Invalid price for ${pos.symbol}`);
          continue;
        }

        let shouldClose = false;
        let reason = '';

        // ✅ ตรวจสอบ TP/SL
        if (pos.action === 'buy') {
          if (pos.stopLoss && price <= Number(pos.stopLoss)) {
            shouldClose = true;
            reason = 'StopLoss';
          }
          if (pos.takeProfit && price >= Number(pos.takeProfit)) {
            shouldClose = true;
            reason = 'TakeProfit';
          }
        } else if (pos.action === 'sell') {
          if (pos.stopLoss && price >= Number(pos.stopLoss)) {
            shouldClose = true;
            reason = 'StopLoss';
          }
          if (pos.takeProfit && price <= Number(pos.takeProfit)) {
            shouldClose = true;
            reason = 'TakeProfit';
          }
        }

        if (shouldClose) {
          console.log(
            `📉 Auto-close triggered for ${pos.symbol} at ${price.toFixed(2)} | Reason: ${reason}`
          );

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

          // ✅ log สีสวย
          const color = reason === 'TakeProfit' ? '\x1b[32m' : '\x1b[31m';
          console.log(`${color}✔ Closed ${pos.symbol} | ${reason} | PnL: ${pnl.toFixed(2)}\x1b[0m`);
        }

        // ✅ เว้นช่วงเล็กน้อยเพื่อไม่ให้ console ล้น
        await delay(100);
      } catch (err) {
        console.error(`❌ Error processing ${pos.symbol}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Error in checkPositions:', err.message);
  }
}

// ✅ ตรวจทุก 5 วิ (แต่ละรอบเร็วกว่าเดิมมาก)
setInterval(checkPositions, 5000);

module.exports = { checkPositions };