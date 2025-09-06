const Tournament = require('../models/tournament');
const TournamentRequest = require('../models/tournamentRequest');
const TradeLog = require('../models/tradeLog');
const TournamentUser = require('../models/tournamentUser');

exports.getTradePage = async (req, res) => {
  try {
    const { tournamentId } = req.query;
    
    if (!tournamentId) {
      return res.render('trade', {
        tournament: null,
        tournamentStatus: null,
        userBalance: 0,
        user: req.session.user,
        loggedIn: !!req.session.user,
        tournamentId: null,
        error: 'Please select a tournament from the tournament page' // ส่งข้อผิดพลาดไปยัง EJS
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.render('trade', {
        tournament: null,
        tournamentStatus: null,
        userBalance: 0,
        user: req.session.user,
        loggedIn: !!req.session.user,
        tournamentId: tournamentId,
        error: 'Tournament not found'
      });
    }

    // ตรวจสอบว่าผู้ใช้ได้สมัครและได้รับการยอมรับแล้วหรือไม่
    const userRequest = await TournamentRequest.findOne({
      tournamentId,
      userId: req.session.user._id,
      status: { $in: ['accepted', 'pending'] }
    });
    
    if (!userRequest) {
      return res.render('trade', {
        tournament: null,
        tournamentStatus: null,
        userBalance: 0,
        user: req.session.user,
        loggedIn: !!req.session.user,
        error: 'You need to join this tournament first'
      });
    }

    // ถ้าสถานะเป็น pending ให้แสดงข้อความแจ้งเตือน
    if (userRequest.status === 'pending') {
      return res.render('trade', {
        tournament: null,
        tournamentStatus: null,
        userBalance: 0,
        user: req.session.user,
        loggedIn: !!req.session.user,
        error: 'Your tournament join request is pending approval'
      });
    }

    const now = new Date();
    const start = new Date(tournament.start);
    const end = new Date(tournament.end);
    
    let tournamentStatus = '';
    if (now > end) {
      tournamentStatus = 'END';
    } else if (now >= start && now <= end) {
      tournamentStatus = 'RUNNING';
    } else {
      tournamentStatus = 'REGISTRATION';
    }

    // ✅ คำนวณ user balance จาก tournament balance + trading history
    const userTrades = await TradeLog.find({
      tournamentId: tournament._id,
      userId: req.session.user._id
    });

    const totalPnL = userTrades.reduce((acc, trade) => acc + (trade.pnl || 0), 0);
    const userBalance = tournament.balance + totalPnL;

    // ดึง TournamentUser
    let tournamentUser = await TournamentUser.findOne({ tournamentId: tournament._id, userId: req.session.user._id });
    const userBalanceFromUser = tournamentUser ? tournamentUser.balance : 0;

    res.render('trade', {
      tournament,
      tournamentStatus,
      userBalance: userBalanceFromUser,
      user: req.session.user,
      loggedIn: !!req.session.user,
      tournamentId: tournamentId,
      error: null // ไม่มีข้อผิดพลาด
    });
  } catch (err) {
    res.render('trade', {
      tournament: null,
      tournamentStatus: null,
      userBalance: 0,
      user: req.session.user,
      loggedIn: !!req.session.user,
      tournamentId: null,
      error: 'Server Error' // ข้อผิดพลาดจาก server
    });
  }
};
