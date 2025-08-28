const express = require('express');
const router = express.Router();
const Tournament = require('../../models/tournament');
const mt5DataController = require('../../controllers/mt5DataController');

// ตัวอย่าง cache หรือดึงข้อมูล OHLC จาก MT5 (ควรปรับตามจริง)
// สมมุติ MT5 ส่งข้อมูลมาเก็บไว้ใน global (ควรใช้ DB หรือ Redis จริงจัง)
global.mt5OhlcCache = global.mt5OhlcCache || {};

// GET /api/trade/ohlc
router.get('/', async (req, res) => {
  try {
    const { tournamentId, symbol, from, to } = req.query;
    if (!tournamentId || !symbol) {
      return res.status(400).json({ bars: [] });
    }
    // ดึงข้อมูลจาก cache (หรือ mock ถ้าไม่มี)
    const cacheKey = `${tournamentId}_${symbol}`;
    let bars = global.mt5OhlcCache[cacheKey] || [];
    // ถ้าไม่มีข้อมูลเลย ให้ mock ข้อมูลแท่งเทียนตัวอย่างสำหรับทดสอบ
    if (!bars.length) {
      const now = Math.floor(Date.now() / 1000);
      bars = [];
      let price = 1.2345;
      for (let i = 60; i > 0; i--) {
        const time = now - i * 60;
        const open = price;
        const close = +(open + (Math.random() - 0.5) * 0.002).toFixed(5);
        const high = Math.max(open, close) + +(Math.random() * 0.001).toFixed(5);
        const low = Math.min(open, close) - +(Math.random() * 0.001).toFixed(5);
        const volume = Math.floor(Math.random() * 100) + 1;
        bars.push({ time, open, high, low, close, volume });
        price = close;
      }
    }
    // filter by from/to (timestamp วินาที)
    if (from && to) {
      bars = bars.filter(bar => bar.time >= Number(from) && bar.time <= Number(to));
    }
    return res.json({ bars });
  } catch (error) {
    return res.status(500).json({ bars: [] });
  }
});

module.exports = router;
