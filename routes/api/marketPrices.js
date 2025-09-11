// routes/api/marketPrices.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Binance endpoint
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=';

router.get('/price', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ status: 'error', message: 'Symbol is required' });
    }

    const upper = symbol.toUpperCase();

    // ✅ ดึงราคาจาก Binance โดยตรง
    const response = await axios.get(BINANCE_API + upper, { timeout: 8000 });

    if (!response.data || !response.data.price) {
      return res.status(500).json({ status: 'error', message: 'Invalid data from Binance' });
    }

    return res.json({
      status: 'success',
      symbol: upper,
      price: parseFloat(response.data.price),
      currency: 'USDT', // Binance คู่เทรดหลักคือ USDT
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Price API Error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch price data' });
  }
});

module.exports = router;