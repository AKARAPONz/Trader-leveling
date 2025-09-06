const TradeLog = require('../models/tradeLog');
const User = require('../models/User');
const TournamentRequest = require('../models/tournamentRequest');
const Tournament = require('../models/tournament');
const OpenPosition = require('../models/openPosition'); // ✅ เพิ่มบรรทัดนี้
const mongoose = require('mongoose');
const TournamentUser = require('../models/tournamentUser'); // เพิ่ม import

exports.index = async (req, res) => {
  const tournamentId = req.query.tournamentId;

  if (!tournamentId) {
    return res.redirect('/tournament');
  }

  let tournamentObjectId;
  try {
    tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
  } catch (error) {
    return res.redirect('/tournament');
  }

  const tournament = await Tournament.findById(tournamentObjectId);
  if (!tournament) {
    return res.redirect('/tournament');
  }

  const now = new Date();
  const isRunning = now >= tournament.start && now <= tournament.end;
  const isEnd = now > tournament.end;

  if (!isRunning && !isEnd) {
    return res.redirect('/tournament');
  }

  const isClosed = isEnd;

  // ดึง trade log เฉพาะ action ที่เกี่ยวข้อง
  const validActions = ['buy', 'sell', 'close-buy', 'close-sell'];
  const userTrades = await TradeLog.find({
    tournamentId: tournamentObjectId,
    userId: req.session.user._id,
    action: { $in: validActions }
  });

  const totalScore = userTrades.reduce((acc, trade) => acc + (trade.score || 0), 0);

  // Aggregate คะแนนรวมของทุก user ใน tournament เฉพาะ action ที่เกี่ยวข้อง
  const logs = await TradeLog.aggregate([
    { $match: { tournamentId: tournamentObjectId, action: { $in: validActions } } },
    {
      $group: {
        _id: '$userId',
        score: { $sum: { $ifNull: ['$score', 0] } }
      }
    },
    { $sort: { score: -1 } }
  ]);

  // Get all accepted participants
  const acceptedRequests = await TournamentRequest.find({
    tournamentId: tournamentObjectId,
    status: 'accepted'
  }).populate('userId');

  // Build a map of userId to score from logs
  const scoreMap = new Map();
  logs.forEach(entry => {
    scoreMap.set(entry._id.toString(), entry.score);
  });

  // Build leaderboard: all accepted participants, with score if exists, else 0
  const leaderboard = acceptedRequests.map(req => {
    const user = req.userId;
    return {
      _id: user._id,
      name: user.name || user.email || 'Unknown',
      score: scoreMap.get(user._id.toString()) || 0
    };
  });

  // Sort leaderboard by score descending
  leaderboard.sort((a, b) => b.score - a.score);

  let winner = null;
  if (isClosed && leaderboard.length > 0) {
    winner = leaderboard[0];
  }

  const pendingRequests = await TournamentRequest.find({
    tournamentId: tournamentObjectId,
    status: 'pending'
  }).populate('userId');

  const request = await TournamentRequest.findOne({
    tournamentId: tournamentObjectId,
    userId: req.session.user._id
  });

  const joinStatus = request?.status || null;

  const tradeHistory = await TradeLog.find({
    tournamentId: tournamentObjectId,
    userId: req.session.user._id
  }).sort({ createdAt: -1 });

  // ดึง TournamentUser
  let tournamentUser = await TournamentUser.findOne({ tournamentId: tournamentObjectId, userId: req.session.user._id });
  const accountBalance = tournamentUser ? tournamentUser.balance : 0;

  // ✅ ดึง openPositions ของผู้ใช้งานนี้ใน tournament ปัจจุบัน
 const openPositions = await OpenPosition.find({
  tournamentId: tournamentObjectId,
  userId: req.session.user._id
});

  // DEBUG: log userTrades, totalScore, leaderboard
  console.log('userTrades:', userTrades.map(t => ({action: t.action, score: t.score, createdAt: t.createdAt})));
  console.log('totalScore:', totalScore);
  console.log('leaderboard:', leaderboard);

  res.render('dashboard', {
    leaderboard,
    pendingRequests,
    user: req.session.user,
    tournamentId,
    tournament, // เพิ่ม tournament
    tournamentStatus: isEnd ? 'END' : 'RUNNING',
    tradeHistory,
    isClosed,
    winner,
    loggedIn: !!req.session.user,
    joinStatus,
    tournamentAsset: tournament.assets[0],
    tournamentStart: tournament.start,
    tournamentEnd: tournament.end,
    accountBalance,
    currentPrice: 107000.00, // ✅ เพิ่มไว้ใช้ autofill
    openPositions, // ✅ ส่งค่าไปหน้า dashboard
    totalScore // ส่งคะแนนรวมของคุณ
  });
};
