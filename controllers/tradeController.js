const Tournament = require('../models/tournament');
const TournamentRequest = require('../models/tournamentRequest');
const TradeLog = require('../models/tradeLog');
const TournamentUser = require('../models/tournamentUser');

// Controller สำหรับหน้า trade
exports.getTradePage = async (req, res) => {
  try {
    // รับ tournamentId จาก query string
    const { tournamentId } = req.query;
    
    // ถ้าไม่มี tournamentId ให้แจ้งข้อผิดพลาด
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

    // ดึงข้อมูล tournament จาก DB
    const tournament = await Tournament.findById(tournamentId);
    
    // ถ้าไม่พบ tournament ให้แจ้งข้อผิดพลาด
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
    
    // ถ้ายังไม่ได้สมัครหรือไม่ได้รับการยอมรับ
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

    // ถ้าสถานะเป็น pending ให้แจ้งเตือน
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

    // คำนวณสถานะ tournament (REGISTRATION, RUNNING, END)
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

    // คำนวณ user balance จาก trade log
    const userTrades = await TradeLog.find({
      tournamentId: tournament._id,
      userId: req.session.user._id
    });

    const totalPnL = userTrades.reduce((acc, trade) => acc + (trade.pnl || 0), 0);
    const userBalance = tournament.balance + totalPnL;

    // ดึง TournamentUser เพื่อแสดง balance ล่าสุด
    let tournamentUser = await TournamentUser.findOne({ tournamentId: tournament._id, userId: req.session.user._id });
    const userBalanceFromUser = tournamentUser ? tournamentUser.balance : 0;

    // ส่งข้อมูลไป render หน้า trade
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
    // กรณีเกิด error ใน server
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
