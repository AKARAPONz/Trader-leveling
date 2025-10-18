const express = require('express');
const axios = require('axios');
const router = express.Router();

const BINANCE_API = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=';

let cache = {};
let lastFetch = {};

router.get('/price', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol)
    return res.status(400).json({ success: false, message: 'Missing symbol' });

  const upper = symbol.toUpperCase();
  const now = Date.now();

  // ✅ ใช้ cache ถ้าไม่เกิน 5 วิ
  if (cache[upper] && now - lastFetch[upper] < 5000) {
    return res.json({ status: 'success', symbol: upper, price: cache[upper], source: 'cache' });
  }

  try {
    // ✅ ใช้ Binance mirror (data-api)
    const { data } = await axios.get(`${BINANCE_API}${upper}`, { timeout: 5000 });
    const price = parseFloat(data.price);
    cache[upper] = price;
    lastFetch[upper] = now;
    return res.json({ status: 'success', symbol: upper, price, source: 'binance-vision' });
  } catch (err) {
    console.error('❌ Price API error:', err.message);
    if (cache[upper]) {
      return res.json({ status: 'success', symbol: upper, price: cache[upper], source: 'cache-fallback' });
    } else {
      return res.status(500).json({ status: 'error', message: 'Price API fetch failed' });
    }
  }
});

router.get('/allprices', async (req, res) => {
  try {
    const { data } = await axios.get('https://data-api.binance.vision/api/v3/ticker/price');
    res.json(data);
  } catch (err) {
    console.error('❌ Error loading allprices:', err.message);
    res.status(500).json({ error: 'Failed to load all prices' });
  }
});

module.exports = router;