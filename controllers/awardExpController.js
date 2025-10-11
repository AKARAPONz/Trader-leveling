const Tournament = require('../models/tournament');
const TournamentUser = require('../models/tournamentuser');
const User = require('../models/user')

module.exports = async function awardExpForTournament(tournamentId) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return console.log('❌ Tournament not found');
    if (tournament.status !== 'END') return console.log('⏳ Tournament still running.');

    const players = await TournamentUser.find({ tournamentId }).populate('userId');
    if (players.length === 0) return console.log('⚠️ No players found.');

    // เรียงอันดับตาม Balance
    const ranked = players.sort((a, b) => b.balance - a.balance);

    for (let i = 0; i < ranked.length; i++) {
      const player = ranked[i];
      const user = player.userId;
      if (!user) continue;

      let expToAdd = 10;
      if (i === 0) expToAdd = 100;
      else if (i === 1) expToAdd = 50;
      else if (i === 2) expToAdd = 25;

      user.exp = (user.exp || 0) + expToAdd;

      // ระบบเลเวล: 100 exp ต่อเลเวล
      while (user.exp >= user.level * 100) {
        user.exp -= user.level * 100;
        user.level += 1;
      }

      await user.save();
      console.log(`🏅 ${user.username} +${expToAdd} EXP`);
    }

    tournament.expGiven = true; // ป้องกันแจกซ้ำ
    await tournament.save();

    console.log(`✅ EXP awarded for tournament: ${tournament.name}`);
  } catch (err) {
    console.error('❌ Error awarding EXP:', err);
  }
};