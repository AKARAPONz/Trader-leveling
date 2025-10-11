const express = require('express');
const router = express.Router();
const TournamentRequest = require('../../models/tournamentrequest');

// ✅ Kick ผู้เล่นออกจาก Tournament
router.post('/kick', async (req, res) => {
  const { tournamentId, userId } = req.body;

  try {
    // ✅ ป้องกัน kick ตัวเอง
    if (req.session.user._id === userId) {
      return res.status(400).send("You can't kick yourself.");
    }

    // ✅ ตรวจสอบสิทธิ์แอดมินก่อน
    if (!req.session.user?.isAdmin) {
      return res.status(403).send("Permission denied");
    }

    // ✅ ลบ request ที่ถูก accept ทิ้ง
    await TournamentRequest.deleteOne({
      tournamentId,
      userId,
      status: 'accepted'
    });

    // ✅ Broadcast ไปยังทุก client ที่อยู่ใน tournamentId room
    const io = req.app.get('io');
    io.to(tournamentId).emit('userKicked', { userId });

    // ✅ redirect admin กลับ dashboard
    res.redirect(`/dashboard?tournamentId=${tournamentId}`);
  } catch (err) {
    console.error('Kick error:', err);
    res.status(500).send('Kick failed');
  }
});

module.exports = router;
