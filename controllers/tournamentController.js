const Tournament = require('../models/tournament');

// ✅ สร้าง Tournament ใหม่
exports.createTournament = async (req, res) => {
  // ตรวจสอบ admin role
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied. Admin only.');
  }

  const { name, balance, start, end } = req.body;

  try {
    const newTournament = new Tournament({
      name,
      balance,
      start,
      end,
    });

    await newTournament.save();
    res.redirect('/tournament');
  } catch (err) {
    console.error('Create Tournament Error:', err);
    res.status(500).send('Server Error');
  }
};

// ✅ ดึงรายการ Tournament ทั้งหมด พร้อมส่ง loggedIn และ latestTournamentId
exports.getTournaments = async (req, res) => {
  try {
    // ดึงรายการ tournament ทั้งหมดและเรียงจาก start date ลดหลั่น
    const tournaments = await Tournament.find().sort({ start: -1 });

    // หา tournament ล่าสุดที่สถานะ running หรือ complete (เริ่มแล้ว)
    const latestRunningOrCompleted = tournaments.find(t => {
      const now = new Date();
      return now >= new Date(t.start); // started or completed
    });

    // คำนวณสถานะของแต่ละ tournament
    const tournamentsWithStatus = tournaments.map(t => {
      const now = new Date();
      const start = new Date(t.start);
      const end = new Date(t.end);
      
      let status;
      if (now < start) {
        status = 'REGISTRATION';
      } else if (now >= start && now <= end) {
        status = 'RUNNING';
      } else {
        status = 'COMPLETE';
      }
      
      return {
        ...t.toObject(),
        status
      };
    });

    res.render('tournament', {
      tournaments: tournamentsWithStatus,
      user: req.session.user,
      loggedIn: !!req.session.user,
      latestTournamentId: latestRunningOrCompleted ? latestRunningOrCompleted._id : null
    });
  } catch (err) {
    console.error('Get Tournaments Error:', err);
    res.status(500).send('Server Error');
  }
};

// ✅ แก้ไข Tournament
exports.updateTournament = async (req, res) => {
  // ตรวจสอบ admin role
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied. Admin only.');
  }

  const { tournamentId, name, balance, start, end } = req.body;

  try {
    await Tournament.findByIdAndUpdate(tournamentId, {
      name,
      balance,
      start,
      end,
    });

    res.redirect('/tournament');
  } catch (err) {
    console.error('Update Tournament Error:', err);
    res.status(500).send('Server Error');
  }
};

// ✅ ลบ Tournament
exports.deleteTournament = async (req, res) => {
  // ตรวจสอบ admin role
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied. Admin only.');
  }

  try {
    await Tournament.findByIdAndDelete(req.params.id);
    res.redirect('/tournament');
  } catch (err) {
    console.error('Delete Tournament Error:', err);
    res.status(500).send('Server Error');
  }
};
