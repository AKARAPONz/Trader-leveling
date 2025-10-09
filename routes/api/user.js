router.post('/check', async (req, res) => {
  try {
    const { username, email } = req.body;
    const existing = await User.findOne({
      $or: [{ username }, { email }]
    });
    if (existing) {
      const field = existing.username === username ? 'username' : 'email';
      return res.json({ exists: true, field });
    }
    return res.json({ exists: false });
  } catch (err) {
    console.error('Check duplicate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});