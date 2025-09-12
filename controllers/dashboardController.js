const Tournament = require('../models/tournament');
const TournamentRequest = require('../models/tournamentRequest');
const TournamentUser = require('../models/tournamentUser');
const TradeLog = require('../models/tradeLog');
const OpenPosition = require('../models/openPosition');

// Dashboard Controller
exports.getDashboardPage = async (req, res) => {
  try {
    const tournamentId = req.query.tournamentId;
    const tournament = tournamentId ? await Tournament.findById(tournamentId) : null;

    let leaderboard = [];
    let pendingRequests = [];
    let joinStatus = null;
    let tradeHistory = [];
    let openPositions = [];
    let winner = null;
    let accountBalance = 0;
    let isClosed = false;

    if (tournament) {
      // ผู้เข้าร่วม
      leaderboard = await TournamentUser.find({ tournamentId: tournament._id }).populate('userId');

      // ✅ เติม score ให้แต่ละ user
      for (let entry of leaderboard) {
        const userTrades = await TradeLog.find({
          tournamentId: tournament._id,
          userId: entry.userId._id,
          action: { $in: ['close-buy', 'close-sell'] }
        });
        entry.score = userTrades.reduce((sum, t) => sum + (t.score || 0), 0);
      }

      // คำขอเข้าร่วม
      pendingRequests = await TournamentRequest.find({ tournamentId: tournament._id, status: 'pending' }).populate('userId');

      // เช็คสถานะผู้ใช้
      if (req.session.user) {
        const reqJoin = await TournamentRequest.findOne({
          tournamentId: tournament._id,
          userId: req.session.user._id
        });
        joinStatus = reqJoin ? reqJoin.status : null;
      }

      // ประวัติการเทรด
      tradeHistory = await TradeLog.find({ tournamentId: tournament._id }).populate('userId');

      // Open positions
      openPositions = await OpenPosition.find({ tournamentId: tournament._id }).populate('userId');

      // Balance ของ user ปัจจุบัน
      const tournamentUser = req.session.user
        ? await TournamentUser.findOne({ tournamentId: tournament._id, userId: req.session.user._id })
        : null;
      accountBalance = tournamentUser ? tournamentUser.balance : 0;

      // ปิด tournament
      const now = new Date();
      if (tournament.end < now) {
        isClosed = true;
        // หาผู้ชนะ
        winner = leaderboard.sort((a, b) => b.balance - a.balance)[0];
      }
    }

    // ✅ คำนวณกำไร/ขาดทุน/คะแนนรวม ของ user ปัจจุบัน
    let totalProfit = 0;
    let totalLoss = 0;
    let totalScore = 0;

    if (req.session.user && tournament) {
      const closedTrades = await TradeLog.find({
        tournamentId: tournament._id,
        userId: req.session.user._id,
        action: { $in: ['close-buy', 'close-sell'] }
      });

      totalProfit = closedTrades
        .filter(t => t.pnl > 0)
        .reduce((sum, t) => sum + t.pnl, 0);

      totalLoss = closedTrades
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + Math.abs(t.pnl), 0);

      totalScore = closedTrades.reduce((sum, t) => sum + (t.score || 0), 0);
    }

    // Render
    res.render('dashboard', {
      leaderboard,
      pendingRequests,
      user: req.session.user,
      tournamentId,
      tournament,
      tournamentStatus: tournament
        ? (new Date() > tournament.end ? 'END' : 'RUNNING')
        : null,
      tradeHistory,
      isClosed,
      winner,
      loggedIn: !!req.session.user,
      joinStatus,
      tournamentStart: tournament ? tournament.start : null,
      tournamentEnd: tournament ? tournament.end : null,
      accountBalance,
      currentPrice: 107000.0, // mock
      openPositions,
      totalProfit,
      totalLoss,
      totalScore
    });
  } catch (err) {
    console.error('❌ Dashboard Error:', err.message);
    res.render('dashboard', {
      leaderboard: [],
      pendingRequests: [],
      user: req.session.user,
      tournamentId: null,
      tournament: null,
      tournamentStatus: null,
      tradeHistory: [],
      isClosed: false,
      winner: null,
      loggedIn: !!req.session.user,
      joinStatus: null,
      tournamentStart: null,
      tournamentEnd: null,
      accountBalance: 0,
      currentPrice: 0,
      openPositions: [],
      totalProfit: 0,
      totalLoss: 0,
      totalScore: 0
    });
  }
};