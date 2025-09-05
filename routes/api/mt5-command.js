const express = require('express');
const router = express.Router();

let mt5CommandQueue = [];

// POST /api/mt5-command - เว็บส่งคำสั่ง (buy/sell) มาที่ backend
router.post('/', (req, res) => {
  const { symbol, action, volume, price } = req.body;
  if (!symbol || !action || !volume) {
    return res.status(400).json({ error: 'symbol, action, volume required' });
  }
  mt5CommandQueue.push({ symbol, action, volume, price: price || 0, createdAt: Date.now() });
  res.json({ success: true });
});

// GET /api/mt5-command?symbol=EURUSD - EA ดึงคำสั่งล่าสุด (1 คำสั่ง/ครั้ง/สัญลักษณ์)
router.get('/', (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const idx = mt5CommandQueue.findIndex(cmd => cmd.symbol === symbol);
  if (idx === -1) return res.json({ command: null });
  const command = mt5CommandQueue.splice(idx, 1)[0];
  res.json({ command });
});

module.exports = router;
