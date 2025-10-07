const express = require('express');
const router = express.Router();
const OpenPosition = require('../../models/openPosition');
const TradeLog = require('../../models/tradeLog');
const TournamentUser = require('../../models/tournamentUser');
const Tournament = require('../../models/tournament');
const axios = require('axios');

// ✅ เปิดออเดอร์ใหม่
router.post('/', async (req, res) => {
  try {
    const { tournamentId, symbol, action, lot, entryPrice, stopLoss, takeProfit, type } = req.body;
    const userId = req.session.user._id;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    let tournamentUser = await TournamentUser.findOne({ tournamentId, userId });
    if (!tournamentUser) {
      tournamentUser = new TournamentUser({
        tournamentId,
        userId,
        balance: tournament.balance
      });
      await tournamentUser.save();
    }

    const parsedLot = parseFloat(lot);
    const parsedEntryPrice = parseFloat(entryPrice);
    const parsedStopLoss = stopLoss ? parseFloat(stopLoss) : null;
    const parsedTakeProfit = takeProfit ? parseFloat(takeProfit) : null;

    // ✅ แค่ตรวจสอบ ไม่หัก balance
    if (parsedLot <= 0) {
      return res.status(400).json({ error: 'Invalid lot size' });
    }

    const newPosition = new OpenPosition({
      tournamentId,
      userId,
      symbol,
      action,
      type,
      lot: parsedLot,
      entryPrice: parsedEntryPrice,
      stopLoss: parsedStopLoss,
      takeProfit: parsedTakeProfit,
      status: 'active'
    });
    await newPosition.save();

    res.json({ success: true, message: 'Order placed', position: newPosition });
  } catch (err) {
    console.error('❌ Place order error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ ปิดออเดอร์
router.post('/close-position', async (req, res) => {
  try {
    const { positionId, lotToClose } = req.body;
    const position = await OpenPosition.findById(positionId);
    if (!position) return res.status(404).json({ success: false, error: 'Position not found' });

    const closeLot = parseFloat(lotToClose);
    if (closeLot > position.lot) {
      return res.status(400).json({ success: false, error: 'Close lot exceeds open lot' });
    }

    // ดึงราคาปัจจุบันจาก Binance
    let closePrice = position.entryPrice;
    try {
      const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${position.symbol}`);
      if (data && data.price) closePrice = parseFloat(data.price);
    } catch (e) {
      console.error('❌ Price fetch error:', e.message);
    }

    // ✅ คำนวณ PnL / Score
    let score = 0;
    if (position.action === 'buy') {
      if (position.entryPrice < closePrice) {
        score = (closePrice - position.entryPrice) * closeLot;
      } else {
        score = -((position.entryPrice - closePrice) * closeLot);
      }
    } else if (position.action === 'sell') {
      if (position.entryPrice > closePrice) {
        score = (position.entryPrice - closePrice) * closeLot;
      } else {
        score = -((closePrice - position.entryPrice) * closeLot);
      }
    }

    const pnl = score;

    // ✅ บันทึก TradeLog
    await TradeLog.create({
      userId: position.userId,
      tournamentId: position.tournamentId,
      symbol: position.symbol,
      action: `close-${position.action}`,
      lot: closeLot,
      entryPrice: position.entryPrice,
      closePrice: closePrice,
      score,
      pnl,
      closedAt: new Date()
    });

    // ✅ อัปเดต balance ของ TournamentUser
    let tournamentUser = await TournamentUser.findOne({
      tournamentId: position.tournamentId,
      userId: position.userId
    });
    if (tournamentUser) {
      tournamentUser.balance += pnl;   // ✅ เพิ่มเฉพาะกำไร/ขาดทุน
      await tournamentUser.save();
    }

    // ✅ อัปเดต Lot ของ position
    position.lot -= closeLot;
    if (position.lot <= 0) {
      await position.deleteOne();
    } else {
      await position.save();
    }

    res.json({ success: true, message: 'Position closed', pnl, score });
  } catch (err) {
    console.error('❌ Close position error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }

});

// ✅ ดึง Open Positions
router.get('/positions', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) return res.json({ success: true, positions: [] });

    const positions = await OpenPosition.find({ tournamentId, userId: req.session.user._id });
    res.json({ success: true, positions });
  } catch (err) {
    console.error('❌ Get positions error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ✅ ดึง Recent Trades (รวม open + closed)
router.get('/recent', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) return res.json({ success: true, trades: [] });

    const userId = req.session.user._id;

    // 🔹 ดึง order ที่เปิดอยู่ (OpenPosition)
    const openPositions = await OpenPosition.find({ tournamentId, userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 🔹 ดึง order ที่ปิดแล้ว (TradeLog)
    const closedTrades = await TradeLog.find({ tournamentId, userId })
      .sort({ closedAt: -1 })
      .limit(10)
      .lean();

    // 🔹 รวมรายการทั้งหมด
    const combined = [
      ...openPositions.map(p => ({
        _id: p._id,
        symbol: p.symbol,
        action: p.action,
        lot: p.lot,
        entryPrice: p.entryPrice,
        closePrice: null,
        score: 0,
        status: 'OPEN',
        createdAt: p.createdAt,
        closedAt: null
      })),
      ...closedTrades.map(t => ({
        _id: t._id,
        symbol: t.symbol,
        action: t.action,
        lot: t.lot,
        entryPrice: t.entryPrice,
        closePrice: t.closePrice,
        score: t.score || 0,
        status: 'CLOSED',
        createdAt: t.createdAt || t.closedAt,
        closedAt: t.closedAt
      }))
    ];

    // 🔹 เรียงตามเวลาใหม่สุดก่อน
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, trades: combined.slice(0, 20) });
  } catch (err) {
    console.error('❌ Get recent trades error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
module.exports = router;