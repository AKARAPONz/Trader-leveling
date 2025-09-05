
const OHLC = require('../models/ohlc');

const receiveMt5Data = async (req, res) => {
  try {
    const mt5Data = req.body; // MT5 data sent from the EA
    console.log('Received MT5 data:', mt5Data);

    // Broadcast the MT5 data to all connected clients
    req.app.get('io').emit('mt5ChartData', mt5Data);

    // Save OHLC data to global cache for /api/trade/ohlc
    // Expect mt5Data = { tournamentId, symbol, bars: [ {time,open,high,low,close,volume}, ... ] }
    if (mt5Data && mt5Data.symbol && Array.isArray(mt5Data)) {
      // กรณีส่งเป็น array ตรง ๆ (ตาม EA)
      const bars = mt5Data;
      await OHLC.insertMany(bars.map(bar => ({
        symbol: bar.symbol,
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        tick_volume: bar.tick_volume
      })));
    } else if (mt5Data && mt5Data.tournamentId && mt5Data.symbol && Array.isArray(mt5Data.bars)) {
      // กรณีเดิม
      global.mt5OhlcCache = global.mt5OhlcCache || {};
      const cacheKey = `${mt5Data.tournamentId}_${mt5Data.symbol}`;
      global.mt5OhlcCache[cacheKey] = mt5Data.bars;
      // บันทึกลง MongoDB ด้วย
      await OHLC.insertMany(mt5Data.bars.map(bar => ({
        symbol: mt5Data.symbol,
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        tick_volume: bar.volume || bar.tick_volume
      })));
    }

    res.status(200).json({ success: true, message: 'MT5 data received and saved to MongoDB' });
  } catch (error) {
    console.error('Error receiving MT5 data:', error);
    res.status(500).json({ success: false, message: 'Failed to receive MT5 data' });
  }
};

module.exports = { receiveMt5Data };
