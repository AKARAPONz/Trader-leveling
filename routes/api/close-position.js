// routes/api/close-position.js
const express = require('express');
const router = express.Router();
const OpenPosition = require('../../models/openposition');
const TradeLog = require('../../models/tradelog');
const axios = require('axios');
const TournamentUser = require('../../models/tournamentuser');

// 🔧 ดึง BASE_URL จาก .env (Render จะใช้ URL ของจริง)
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

router.post('/', async (req, res) => {
  try {
    const { positionId, lotToClose } = req.body;

    const position = await OpenPosition.findById(positionId);
    if (!position) return res.status(404).json({ success: false, error: "Position not found" });

    const closeLot = parseFloat(lotToClose);
    if (closeLot > position.lot) {
      return res.status(400).json({ success: false, error: "Cannot close more than current lot" });
    }

    // ✅ ดึงราคาปัจจุบันจาก API พร้อม fallback
    let closePrice = position.entryPrice;
    if (position.symbol) {
      try {
        const resPrice = await axios.get(`${API_BASE}/api/price?symbol=${encodeURIComponent(position.symbol)}`, { timeout: 6000 });
        if (resPrice.data && resPrice.data.price) {
          closePrice = parseFloat(resPrice.data.price);
        } else {
          console.warn(`⚠️ Invalid price data for ${position.symbol}, using entryPrice fallback`);
        }
      } catch (e) {
        console.error(`❌ Price API error for ${position.symbol}:`, e.message);
      }
    }

    // ✅ คำนวณ PnL
    let score = 0;
    if (position.action === 'buy') {
      score = (closePrice - position.entryPrice) * closeLot;
    } else if (position.action === 'sell') {
      score = (position.entryPrice - closePrice) * closeLot;
    }
    const pnl = score;

    // ✅ บันทึก TradeLog
    await TradeLog.create({
      tournamentId: position.tournamentId,
      userId: position.userId,
      symbol: position.symbol,
      action: `close-${position.action}`,
      lot: closeLot,
      entryPrice: position.entryPrice,
      closePrice,
      pnl,
      score,
      closedAt: new Date()
    });

    // ✅ อัปเดต balance
    const tournamentUser = await TournamentUser.findOne({
      tournamentId: position.tournamentId,
      userId: position.userId
    });

    if (tournamentUser) {
      tournamentUser.balance += pnl;
      await tournamentUser.save();
    }

    // ✅ ลด lot ที่เหลือ
    position.lot -= closeLot;
    if (position.lot <= 0) {
      await position.deleteOne();
    } else {
      await position.save();
    }

    console.log(`✔ Closed ${position.symbol} | PnL: ${pnl.toFixed(2)} | Source: ${API_BASE}`);
    return res.json({ success: true, message: 'Position closed', pnl, score, closePrice });
  } catch (err) {
    console.error('❌ Close Position Error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;