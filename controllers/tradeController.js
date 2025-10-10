const Tournament = require('../models/Tournament');
const TournamentRequest = require('../models/TournamentRequest');
const TradeLog = require('../models/TradeLog');
const TournamentUser = require('../models/TournamentUser');

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
        error: 'Please select a tournament from the tournament page'
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
        tournamentId,
        error: 'Tournament not found'
      });
    }

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

    // ✅ หา TournamentUser หรือสร้างใหม่ถ้าไม่มี
    let tournamentUser = await TournamentUser.findOne({
      tournamentId: tournament._id,
      userId: req.session.user._id
    });

    if (!tournamentUser) {
      console.log('⚠️ TournamentUser not found, creating new one');
      tournamentUser = new TournamentUser({
        tournamentId: tournament._id,
        userId: req.session.user._id,
        balance: tournament.balance
      });
      await tournamentUser.save();
    }

    console.log('✅ TournamentUser:', tournamentUser);

    let userBalance = tournamentUser.balance;

    res.render('trade', {
      tournament,
      tournamentStatus,
      userBalance,
      user: req.session.user,
      loggedIn: !!req.session.user,
      tournamentId,
      error: null
    });
  } catch (err) {
    console.error('❌ TradePage Error:', err.message);
    res.render('trade', {
      tournament: null,
      tournamentStatus: null,
      userBalance: 0,
      user: req.session.user,
      loggedIn: !!req.session.user,
      tournamentId: null,
      error: 'Server Error'
    });
  }
};