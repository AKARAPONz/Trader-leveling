const express = require('express');
const router = express.Router();

// In-memory store for MT5 OHLC data (for demo; use DB in production)
const mt5DataStore = {};

// POST: EA ส่งข้อมูล OHLC มาบันทึก
router.post('/', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  let data = req.body;
  try {
    // ตัดอักขระขยะท้าย JSON (ถ้ามี)
    const endIdx = data.lastIndexOf(']');
    if (endIdx !== -1) data = data.substring(0, endIdx + 1);
    data = JSON.parse(data);

    const symbol = data[0] && data[0].symbol;
    if (symbol && Array.isArray(data)) {
      mt5DataStore[symbol.toUpperCase().replace(/\//g, '')] = data;
      console.log('MT5 OHLC updated for', symbol, 'bars:', data.length);
      return res.json({ success: true });
    }
    console.log('Invalid data received:', data);
    res.status(400).json({ success: false, error: 'Invalid data' });
  } catch (e) {
    console.log('Parse error:', e, 'raw:', req.body);
    res.status(400).json({ success: false, error: 'Invalid format' });
  }
});

// GET: ดึงข้อมูล OHLC สำหรับ symbol
router.get('/', (req, res) => {
  let symbol = req.query.symbol;
  if (!symbol) return res.status(404).json([]);
  let cleanSymbol = symbol.toUpperCase().replace(/\//g, '');
  let data = mt5DataStore[cleanSymbol] || mt5DataStore[symbol] || mt5DataStore[symbol.toUpperCase()];
  if (data) {
    console.log('GET OHLC for', cleanSymbol, 'bars:', data.length);
    return res.json(data);
  }
  console.log('No OHLC found for', symbol, 'or', cleanSymbol);
  res.status(404).json([]);
});

module.exports = router;
