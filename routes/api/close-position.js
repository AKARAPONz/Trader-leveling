const express = require('express');
const router = express.Router();
const OpenPosition = require('../../models/openPosition');
const TradeLog = require('../../models/tradeLog');
const axios = require('axios');
const TournamentUser = require('../../models/tournamentUser');

router.post('/', async (req, res) => {
  const { positionId, lotToClose } = req.body;

  const position = await OpenPosition.findById(positionId);
  if (!position) return res.status(404).send("Position not found");

  const closeLot = parseFloat(lotToClose);
  if (closeLot > position.lot) return res.status(400).send("Cannot close more than current lot");

  // ดึงราคาปัจจุบันจาก market API
  let closePrice = position.entryPrice;
  if (position.symbol) {
    try {
      const resPrice = await axios.get(`http://localhost:4000/api/price?symbol=${encodeURIComponent(position.symbol)}`);
      if (resPrice.data && resPrice.data.price) {
        closePrice = parseFloat(resPrice.data.price);
      }
    } catch (e) {}
  }

  // ตอนปิดออเดอร์
  let pnl = 0;
  if (position.action === 'buy') {
    pnl = (closePrice - position.entryPrice) * closeLot;
  } else if (position.action === 'sell') {
    pnl = (position.entryPrice - closePrice) * closeLot;
  }
  let score = 0;
  if (pnl > 0) score = 50;
  else score = 5;
  await TradeLog.create({
    userId: position.userId,
    tournamentId: position.tournamentId,
    action: `close-${position.action}`,
    lot: closeLot,
    score: score,
    pnl: pnl,
    createdAt: new Date()
  });

  // ✅ ปรับลด Lot ที่เหลือ
  position.lot -= closeLot;
  if (position.lot <= 0) {
    await position.deleteOne();
  } else {
    await position.save();
  }

  res.redirect('back');
});

// GET /position-detail?positionId=...
router.get('/position-detail', async (req, res) => {
  const { positionId } = req.query;
  if (!positionId) return res.status(400).json({ error: 'Missing positionId' });
  const position = await OpenPosition.findById(positionId);
  if (!position) return res.status(404).json({ error: 'Position not found' });
  res.json({ entryPrice: position.entryPrice, action: position.action });
});

module.exports = router;
