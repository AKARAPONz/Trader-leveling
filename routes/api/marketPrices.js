const express = require('express');
const axios = require('axios');
const router = express.Router();

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=';

let lastPrice = {};
let lastFetch = {};

router.get('/price', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ success: false, message: 'Missing symbol' });

  const upper = symbol.toUpperCase();
  const now = Date.now();

  // ✅ ใช้ cache ถ้ายังไม่เกิน 5 วิ
  if (lastPrice[upper] && now - lastFetch[upper] < 5000) {
    return res.json({
      success: true,
      symbol: upper,
      price: lastPrice[upper],
      source: 'cache'
    });
  }

  try {
    // ✅ ดึงราคาหลักจาก Binance
    const resp = await axios.get(BINANCE_API + upper, { timeout: 5000 });
    const price = parseFloat(resp.data.price);
    lastPrice[upper] = price;
    lastFetch[upper] = now;
    return res.json({ success: true, symbol: upper, price, source: 'binance' });
  } catch (err) {
    console.warn(`⚠️ Binance error: ${err.response?.status || err.message}`);

    // ✅ fallback → TwelveData
    if (TWELVE_KEY) {
      try {
        const alt = await axios.get(`${TWELVE_API}${upper}&apikey=${TWELVE_KEY}`);
        if (alt.data && alt.data.price) {
          const price = parseFloat(alt.data.price);
          lastPrice[upper] = price;
          lastFetch[upper] = now;
          return res.json({ success: true, symbol: upper, price, source: 'twelvedata' });
        }
      } catch (fallbackErr) {
        console.error('❌ Fallback error:', fallbackErr.message);
      }
    }

    // ✅ fallback สุดท้าย: ใช้ cache เก่า
    if (lastPrice[upper]) {
      console.warn(`⚠️ Using cached price for ${upper}`);
      return res.json({
        success: true,
        symbol: upper,
        price: lastPrice[upper],
        source: 'cache-fallback'
      });
    }

    return res.status(500).json({ success: false, message: 'All price sources failed' });
  }
});

// ✅ ดึงราคาทั้งหมด (ใช้โดย orderWatcher)
router.get('/allprices', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/ticker/price');
    res.json(data);
  } catch (err) {
    console.error('❌ Error loading allprices:', err.message);
    res.status(500).json({ error: 'Failed to load all prices' });
  }
});

module.exports = router;