// routes/api/close-position.js
const express = require('express');
const router = express.Router();
const OpenPosition = require('../../models/openPosition');
const TradeLog = require('../../models/tradeLog');
const axios = require('axios');
const TournamentUser = require('../../models/tournamentUser');

router.post('/', async (req, res) => {
  try {
    const { positionId, lotToClose } = req.body;

    const position = await OpenPosition.findById(positionId);
    if (!position) return res.status(404).json({ success: false, error: "Position not found" });

    const closeLot = parseFloat(lotToClose);
    if (closeLot > position.lot) {
      return res.status(400).json({ success: false, error: "Cannot close more than current lot" });
    }

    // ✅ ดึงราคาปัจจุบันจาก API
    let closePrice = position.entryPrice;
    if (position.symbol) {
      try {
        const resPrice = await axios.get(`http://localhost:4000/api/price?symbol=${encodeURIComponent(position.symbol)}`);
        if (resPrice.data && resPrice.data.price) {
          closePrice = parseFloat(resPrice.data.price);
        }
      } catch (e) {
        console.error('Price API error:', e.message);
      }
    }

    // ✅ คำนวณ PnL และ Score ตามสูตร
    let score = 0;
    if (position.action === 'buy') {
      if (position.entryPrice < closePrice) {
        score = (closePrice - position.entryPrice) * closeLot; // กำไร
      } else {
        score = -((position.entryPrice - closePrice) * closeLot); // ขาดทุน
      }
    } else if (position.action === 'sell') {
      if (position.entryPrice > closePrice) {
        score = (position.entryPrice - closePrice) * closeLot; // กำไร
      } else {
        score = -((closePrice - position.entryPrice) * closeLot); // ขาดทุน
      }
    }
    const pnl = score; // ใช้ค่าเดียวกัน

    // ✅ สร้าง TradeLog
await TradeLog.create({
  tournamentId: pos.tournamentId,
  userId: pos.userId,
  symbol: pos.symbol,
  action: `close-${pos.action}`,
  lot: pos.lot,
  entryPrice: pos.entryPrice,
  closePrice: price,
  pnl: score,
  score: score,
  closedAt: new Date()   // ✅ เพิ่มตรงนี้
});

    // ✅ อัปเดต Lot ที่เหลือ
    position.lot -= closeLot;
    if (position.lot <= 0) {
      await position.deleteOne();
    } else {
      await position.save();
    }

    return res.json({ success: true, message: 'Position closed', pnl, score });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;