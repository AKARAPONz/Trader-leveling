// Backend: routes/api/marketPrices.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = '0ad60105b7144eab84e83e39e86db0cf';

// Supported symbols for validation
const SUPPORTED_SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
  'BTC/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD', 'DOT/USD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD'
];

router.get('/price', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    // Validate symbol parameter
    if (!symbol) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Symbol parameter is required',
        error: 'MISSING_SYMBOL'
      });
    }

    // Clean and validate symbol
    const cleanSymbol = symbol.trim().toUpperCase();
    
    // Check if symbol is supported (optional validation)
    if (!SUPPORTED_SYMBOLS.includes(cleanSymbol)) {
      console.warn(`⚠️ Unsupported symbol requested: ${cleanSymbol}`);
    }

    // Make API request with timeout
    const response = await axios.get(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(cleanSymbol)}&apikey=${API_KEY}`,
      { timeout: 10000 } // 10 second timeout
    );

    // Validate API response
    if (!response.data) {
      return res.status(500).json({
        status: 'error',
        message: 'Invalid response from price API',
        error: 'INVALID_API_RESPONSE'
      });
    }

    // Check for API errors
    if (response.data.status === 'error') {
      return res.status(400).json({
        status: 'error',
        message: response.data.message || 'Symbol not found or API error',
        error: 'SYMBOL_NOT_FOUND',
        details: response.data
      });
    }

    // Validate price data
    if (!response.data.price || isNaN(parseFloat(response.data.price))) {
      return res.status(500).json({
        status: 'error',
        message: 'Invalid price data received',
        error: 'INVALID_PRICE_DATA'
      });
    }

    // Return successful response
    res.json({
      status: 'success',
      symbol: cleanSymbol,
      price: parseFloat(response.data.price),
      currency: response.data.currency || 'USD',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Price API Error:', err.message);
    
    // Handle different types of errors
    if (err.code === 'ECONNABORTED') {
      return res.status(408).json({
        status: 'error',
        message: 'Request timeout - please try again',
        error: 'TIMEOUT'
      });
    }
    
    if (err.response) {
      // API returned error status
      const status = err.response.status;
      const message = err.response.data?.message || 'API request failed';
      
      return res.status(status).json({
        status: 'error',
        message: message,
        error: 'API_ERROR',
        statusCode: status
      });
    }
    
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        status: 'error',
        message: 'Service temporarily unavailable',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    // Generic error
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch price data',
      error: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
