// routes/api/marketPrices.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// ✅ Binance mirror endpoint (ใช้ได้บน Render)
const BINANCE_API = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=';

// ✅ TwelveData (สำรองเมื่อ Binance ใช้ไม่ได้)
const TWELVE_API = 'https://api.twelvedata.com/price?symbol=';
const TWELVE_KEY = process.env.TWELVE_API_KEY; // ตั้งใน Render Dashboard

router.get('/price', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ status: 'error', message: 'Symbol is required' });
    }

    const upper = symbol.toUpperCase();

    try {
      // ✅ Primary source: Binance Vision API
      const response = await axios.get(BINANCE_API + upper, { timeout: 8000 });
      if (response.data && response.data.price) {
        return res.json({
          status: 'success',
          symbol: upper,
          price: parseFloat(response.data.price),
          source: 'binance',
          timestamp: new Date().toISOString()
        });
      }
      throw new Error('Invalid response from Binance');
    } catch (err) {
      console.warn('⚠️ Binance unavailable, trying TwelveData...');
      // ✅ Fallback: TwelveData API
      if (!TWELVE_KEY) {
        throw new Error('TwelveData API key missing');
      }
      const alt = await axios.get(`${TWELVE_API}${upper}&apikey=${TWELVE_KEY}`);
      if (alt.data && alt.data.price) {
        return res.json({
          status: 'success',
          symbol: upper,
          price: parseFloat(alt.data.price),
          source: 'twelvedata',
          timestamp: new Date().toISOString()
        });
      }
      throw new Error('Invalid response from TwelveData');
    }
  } catch (err) {
    console.error('❌ Price API Error:', err.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch price data',
      error: err.message
    });
  }
});

module.exports = router;