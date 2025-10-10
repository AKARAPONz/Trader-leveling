const express = require('express');
const router = express.Router();
const TournamentRequest = require('../../models/TournamentRequest');

// POST /join
router.post('/join', async (req, res) => {
  const { tournamentId, userId } = req.body;

  const exists = await TournamentRequest.findOne({ tournamentId, userId });
  if (exists) return res.status(400).json({ message: 'You already requested.' });

  const request = new TournamentRequest({
    tournamentId,
    userId,
    status: 'accepted' // ✅ เพิ่มตรงนี้
  });

  await request.save();
  res.redirect(`/dashboard?tournamentId=${tournamentId}`);

});


// POST /:id/accept
router.post('/:id/accept', async (req, res) => {
  const request = await TournamentRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'accepted' },
    { new: true }
  );
  res.json({ success: true, request });
});

// POST /:id/reject
router.post('/:id/reject', async (req, res) => {
  const request = await TournamentRequest.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  );
  res.json({ success: true, request });
});

module.exports = router;
