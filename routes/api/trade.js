const express = require('express');
const router = express.Router();

// GET /api/trade/recent?tournamentId=xxx
router.get('/recent', async (req, res) => {
  try {
    const tournamentId = req.query.tournamentId;
    const userId = req.session.user?._id;
    if (!tournamentId || !userId) {
      return res.json({ success: true, trades: [] });
    }

    const trades = await TradeLog.find({
        tournamentId,
        userId,
        action: { $in: ['close-buy', 'close-sell'] }   // ✅ เฉพาะ order ที่ปิดแล้ว
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, trades });
  } catch (error) {
    res.json({ success: false, trades: [], error: error.message });
  }
});

// ...existing code...
const TradeLog = require('../../models/tradeLog');
const OpenPosition = require('../../models/openPosition');
const Tournament = require('../../models/tournament');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { addExp, checkDailyTradeBonus, checkStrategyBonus } = require('../../utils/expSystem');
const axios = require('axios');
const TournamentUser = require('../../models/tournamentUser');

// ✅ POST /api/trade
router.post('/', async (req, res) => {

  try {
    // Handle both FormData and JSON
    let tournamentId, action, type, lot, entryPrice, stopLoss, takeProfit, stopPrice;
    
    // Check if req.body exists and has content
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ 
        error: 'Request body is empty. Please check your form submission.',
        debug: {
          body: req.body,
          headers: req.headers,
          url: req.url
        }
      });
    }
    
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle FormData
      tournamentId = req.body.tournamentId;
      action = req.body.action;
      type = req.body.type;
      lot = req.body.lot;
      entryPrice = req.body.entryPrice;
      stopLoss = req.body.stopLoss;
      takeProfit = req.body.takeProfit;
      stopPrice = req.body.stopPrice;
    } else {
      // Handle JSON
      ({
        tournamentId,
        action,
        type,
        lot,
        entryPrice,
        stopLoss,
        takeProfit,
        stopPrice
      } = req.body);
    }

    // Clean up empty values
    if (entryPrice === '' || entryPrice === null || entryPrice === undefined) {
      entryPrice = null;
    }
    if (stopLoss === '' || stopLoss === null || stopLoss === undefined) {
      stopLoss = null;
    }
    if (takeProfit === '' || takeProfit === null || takeProfit === undefined) {
      takeProfit = null;
    }
    if (stopPrice === '' || stopPrice === null || stopPrice === undefined) {
      stopPrice = null;
    }

    // Debug: Log the request body
    console.log('📝 Request body:', req.body);
    console.log('📝 Content-Type:', req.headers['content-type']);
    console.log('📝 Extracted tournamentId:', tournamentId);
    console.log('📝 Cleaned values:', { tournamentId, action, type, lot, entryPrice, stopLoss, takeProfit, stopPrice });
    
    // Fallback: try to get tournamentId from URL query parameter
    if (!tournamentId) {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
      tournamentId = urlParams.get('tournamentId');
    }
    
    // Fallback: try to get tournamentId from session
    if (!tournamentId && req.session.user && req.session.user.currentTournamentId) {
      tournamentId = req.session.user.currentTournamentId;
    }
    
    // Fallback: try to get tournamentId from referer header
    if (!tournamentId && req.headers.referer) {
      const refererUrl = new URL(req.headers.referer);
      tournamentId = refererUrl.searchParams.get('tournamentId');
    }
    
    // Fallback: try to get tournamentId from request headers
    if (!tournamentId && req.headers['x-tournament-id']) {
      tournamentId = req.headers['x-tournament-id'];
    }
    
    // Validate required fields
    if (!tournamentId) {
      return res.status(400).json({ 
        error: 'Tournament ID is required. Please select a tournament first.',
        debug: {
          body: req.body,
          headers: req.headers,
          url: req.url
        }
      });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action (buy/sell) is required' });
    }

    if (!lot) {
      return res.status(400).json({ error: 'Lot size is required' });
    }

    const userId = req.session.user._id;
    const now = new Date();

    // ✅ ตรวจสอบ Tournament ว่ายังไม่หมดเวลา
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (now > tournament.end) {
      return res.status(403).json({ error: 'Tournament has ended' });
    }

    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    const parsedLot = parseFloat(lot);
    const parsedEntryPrice = entryPrice ? parseFloat(entryPrice) : null;
    const parsedStopLoss = stopLoss ? parseFloat(stopLoss) : null;
    const parsedTakeProfit = takeProfit ? parseFloat(takeProfit) : null;

    // Validate lot size
    if (isNaN(parsedLot) || parsedLot <= 0) {
      return res.status(400).json({ error: 'Invalid lot size. Please enter a valid number greater than 0.' });
    }

    // ดึง TournamentUser ของ user+ทัวร์นาเมนต์
    let tournamentUser = await TournamentUser.findOne({ tournamentId, userId });
    if (!tournamentUser) {
      // สร้างใหม่ถ้ายังไม่มี (balance เริ่มต้น = tournament.balance)
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      tournamentUser = await TournamentUser.create({ tournamentId, userId, balance: tournament.balance });
    }
    // ตรวจสอบ balance
    if (tournamentUser.balance < parsedLot * parsedEntryPrice) {
      return res.status(400).json({ error: 'ยอดเงินคงเหลือไม่เพียงพอ' });
    }
    // หัก balance
    tournamentUser.balance -= parsedLot * parsedEntryPrice;
    await tournamentUser.save();

    // กำหนด symbol จาก req.body หรือ req.fields
    const symbol = req.body.symbol || req.fields?.symbol;

    // ใช้ entryPrice ที่ผู้ใช้ระบุเท่านั้น (ไม่ fallback ไป current price)
    const finalEntryPrice = parsedEntryPrice;
    if (!finalEntryPrice) {
      return res.status(400).json({ error: 'Entry Price is required.' });
    }

    // ✅ บันทึก Trade Log
    const tradeData = {
      tournamentId: tournament._id,
      userId,
      action,
      type,
      lot: parsedLot,
      score: 10, // ให้ score 10 เสมอเมื่อเปิดออเดอร์
      createdAt: now,
      entryPrice: finalEntryPrice
    };
    if (parsedStopLoss !== null) {
      tradeData.stopLoss = parsedStopLoss;
    }
    if (parsedTakeProfit !== null) {
      tradeData.takeProfit = parsedTakeProfit;
    }
    if (type === 'stop' && stopPrice !== null) {
      tradeData.stopPrice = parseFloat(stopPrice);
    }
    const trade = await TradeLog.create(tradeData);

    // ✅ บันทึก Open Position
    const positionData = {
      tournamentId: tournament._id,
      userId,
      action,
      lot: parsedLot,
      createdAt: now,
      type,
      symbol,
      entryPrice: finalEntryPrice
    };
    if (parsedStopLoss !== null) {
      positionData.stopLoss = parsedStopLoss;
    }
    if (parsedTakeProfit !== null) {
      positionData.takeProfit = parsedTakeProfit;
    }
    if (type === 'stop' && stopPrice !== null) {
      positionData.stopPrice = parseFloat(stopPrice);
    }
    const openPosition = await OpenPosition.create(positionData);

    // ✅ ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
    const savedTrade = await TradeLog.findById(trade._id);
    const savedPosition = await OpenPosition.findById(openPosition._id);
    
    if (!savedTrade || !savedPosition) {
      return res.status(500).json({ error: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' });
    }
    
    // ✅ เพิ่ม EXP สำหรับการเปิดออเดอร์
    const expResult = await addExp(userId, 10, `Trade Order (${action.toUpperCase()})`);
    if (expResult.success && expResult.levelUp) {
    }

    // ✅ ตรวจสอบโบนัสการเทรด 3 ครั้งต่อวัน
    const dailyBonusResult = await checkDailyTradeBonus(userId);
    if (dailyBonusResult.success && dailyBonusResult.bonusGiven) {
    }

    // ✅ ตรวจสอบโบนัสการเทรดตามกลยุทธ์
    const strategyBonusResult = await checkStrategyBonus(userId, 'Basic Strategy');
    if (strategyBonusResult.success && strategyBonusResult.bonusGiven) {
    }

    const io = req.app.get('io');

    // ✅ Broadcast trade รายตัว
    io.to(tournamentId).emit('newTrade', trade);

    // ✅ สร้าง leaderboard ใหม่
    const logs = await TradeLog.aggregate([
      { $match: { tournamentId: tournamentObjectId } },
      {
        $group: {
          _id: '$userId',
          totalTrades: { $sum: 1 },
          totalLot: { $sum: '$lot' },
          score: { $sum: '$score' }
        }
      },
      { $sort: { score: -1 } }
    ]);

    const leaderboard = await Promise.all(
      logs.map(async (entry) => {
        const user = await User.findById(entry._id);
        return {
          _id: entry._id,
          name: user?.name || user?.username || 'Unknown',
          totalTrades: entry.totalTrades,
          totalLot: entry.totalLot,
          score: entry.score
        };
      })
    );

    // ✅ Broadcast leaderboard ไปยังทุก client
    io.to(tournamentId).emit('leaderboardUpdate', leaderboard);

    // ✅ Return JSON response instead of redirect
    return res.json({ 
      success: true, 
      message: 'Order placed successfully',
      trade: {
        _id: trade._id,
        action: trade.action,
        type: trade.type,
        lot: trade.lot,
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        score: trade.score,
        createdAt: trade.createdAt
      },
      position: {
        _id: openPosition._id,
        action: openPosition.action,
        lot: openPosition.lot,
        entryPrice: openPosition.entryPrice,
        createdAt: openPosition.createdAt
      },
      exp: {
        added: 10,
        levelUp: expResult.levelUp,
        oldLevel: expResult.oldLevel,
        newLevel: expResult.newLevel,
        oldExp: expResult.oldExp,
        newExp: expResult.newExp,
        dailyBonus: dailyBonusResult.bonusGiven,
        strategyBonus: strategyBonusResult.bonusGiven
      },
      leaderboard: leaderboard
    });
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งคำสั่งซื้อขาย' });
  }
});

function calculateScore(action, lot, pnl) {
  if (action === 'buy' || action === 'sell') {
    return 10;
  }
  if (action.startsWith('close-')) {
    if (pnl > 0) return 50;
    return 5;
  }
  return 0;
}

// ✅ GET /api/trades - ดึงข้อมูล trades ล่าสุด
router.get('/trades', async (req, res) => {
  try {
    const { tournamentId, limit = 10 } = req.query;
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }
    const isAdmin = req.session.user && req.session.user.role === 'admin';
    const trades = await TradeLog.find({ 
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      ...(isAdmin ? {} : { userId: req.session.user._id })
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('userId', 'name username');
    res.json({ 
      success: true, 
      trades: trades 
    });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล trades' });
  }
});

// ✅ GET /api/positions - ดึงข้อมูล open positions
router.get('/positions', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }
    const isAdmin = req.session.user && req.session.user.role === 'admin';
    const positions = await OpenPosition.find({ 
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      ...(isAdmin ? {} : { userId: req.session.user._id })
    })
    .sort({ createdAt: -1 })
    .populate('userId', 'name username');
    res.json({ 
      success: true, 
      positions: positions 
    });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล positions' });
  }
});

// ✅ GET /api/trading-score - ดึงข้อมูลคะแนนการเทรด
router.get('/trading-score', async (req, res) => {
  try {
    const { tournamentId, userId } = req.query;
    
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : req.session.user._id;

    // ดึงข้อมูล trades ของผู้ใช้ เฉพาะ action ที่เกี่ยวข้อง
    const validActions = ['buy', 'sell', 'close-buy', 'close-sell'];
    const userTrades = await TradeLog.find({ 
      tournamentId: tournamentObjectId,
      userId: userObjectId,
      action: { $in: validActions }
    }).sort({ createdAt: -1 });

    // คำนวณคะแนนรวมจาก score จริง
    let totalScore = userTrades.reduce((acc, trade) => acc + (trade.score || 0), 0);
    let openOrders = userTrades.filter(trade => trade.action === 'buy' || trade.action === 'sell').length;
    let profitableTrades = userTrades.filter(trade => (trade.action === 'close-buy' || trade.action === 'close-sell') && trade.score === 50).length;
    let lossTrades = userTrades.filter(trade => (trade.action === 'close-buy' || trade.action === 'close-sell') && trade.score === 5).length;

    res.json({
      success: true,
      tradingScore: {
        totalScore,
        openOrders,
        profitableTrades,
        lossTrades,
        totalTrades: userTrades.length
      },
      scoreBreakdown: {
        openOrderPoints: 10,
        profitPoints: 50,
        lossPoints: 5
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงคะแนนการเทรด' });
  }
});

// ✅ POST /api/trade/edit-position - แก้ไข stopLoss/takeProfit ของ OpenPosition
router.post('/edit-position', async (req, res) => {
  try {
    const { positionId, stopLoss, takeProfit } = req.body;
    if (!positionId) return res.status(400).json({ error: 'Missing positionId' });
    const position = await OpenPosition.findById(positionId);
    if (!position) return res.status(404).json({ error: 'Position not found' });
    if (stopLoss !== undefined) position.stopLoss = stopLoss === '' ? undefined : parseFloat(stopLoss);
    if (takeProfit !== undefined) position.takeProfit = takeProfit === '' ? undefined : parseFloat(takeProfit);
    await position.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error editing position' });
  }
});

// ✅ POST /api/trade/close-position - ปิด position ทั้งหมดหรือบางส่วน
router.post('/close-position', async (req, res) => {
  try {
    const { positionId, lotToClose, closePrice: clientClosePrice } = req.body;
    if (!positionId || !lotToClose) return res.status(400).json({ error: 'Missing positionId or lotToClose' });
    const position = await OpenPosition.findById(positionId);
    if (!position) return res.status(404).json({ error: 'Position not found' });
    const closeLot = parseFloat(lotToClose);
    if (closeLot > position.lot) return res.status(400).json({ error: 'Cannot close more than current lot' });
    // ใช้ closePrice ที่ client ส่งมาเท่านั้น
    if (typeof clientClosePrice === 'undefined' || clientClosePrice === null || clientClosePrice === '') {
      return res.status(400).json({ error: 'Close price is required' });
    }
    let closePrice = parseFloat(clientClosePrice);
    if (isNaN(closePrice)) {
      return res.status(400).json({ error: 'Close price must be a number' });
    }
    // ไม่ดึงราคาตลาด ไม่ fallback ใดๆ

    // ตอนปิดออเดอร์
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

const pnl = score; // ใช้ค่าเดียวกัน

await TradeLog.create({
  userId: position.userId,
  tournamentId: position.tournamentId,
  action: `close-${position.action}`,
  lot: closeLot,
  score: score,     // ✅ คำนวณจาก pnl
  pnl: pnl,
  createdAt: new Date()
});

    // คืน balance ให้ TournamentUser
    let tournamentUser = await TournamentUser.findOne({ tournamentId: position.tournamentId, userId: position.userId });
    if (tournamentUser) {
      tournamentUser.balance += closeLot * closePrice;
      await tournamentUser.save();
    }
    // ปรับลด Lot ที่เหลือ
    position.lot -= closeLot;
    if (position.lot <= 0) {
      await position.deleteOne();
    } else {
      await position.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error closing position' });
  }
});

module.exports = router;
