module.exports = function startAutoCloseWorker({ OpenPosition, TradeLog, getMarketPrice }) {
  async function closePosition(position, reason) {
    const closeLot = position.lot;
    const score = 900 * closeLot;
    await TradeLog.create({
      userId: position.userId,
      tournamentId: position.tournamentId,
      action: `auto-close-${reason}-${position.action}`,
      lot: closeLot,
      score: score,
      createdAt: new Date()
    });
    await position.deleteOne();
  }

  async function checkAndClosePositions() {
    const openPositions = await OpenPosition.find({});
    for (const pos of openPositions) {
      // หาสัญลักษณ์ที่ใช้
      const symbol = pos.symbol || pos.asset;
      if (!symbol) {
        continue;
      }
      // Trigger stop order (pending -> active)
      if (pos.type === 'stop' && pos.status === 'pending' && pos.stopPrice) {
        const price = await getMarketPrice(symbol);
        if (!price) continue;
        if ((pos.action === 'buy' && price >= pos.stopPrice) ||
            (pos.action === 'sell' && price <= pos.stopPrice)) {
          pos.status = 'active';
          pos.entryPrice = price;
          pos.triggeredAt = new Date();
          await pos.save();
          continue;
        }
        continue;
      }
      // Auto-close SL/TP เฉพาะ active position
      if (pos.status !== 'active') continue;
      const price = await getMarketPrice(symbol);
      if (!price) continue;
      if (pos.stopLoss) {
        if ((pos.action === 'buy' && price <= pos.stopLoss) ||
            (pos.action === 'sell' && price >= pos.stopLoss)) {
          await closePosition(pos, 'stoploss');
          continue;
        }
      }
      if (pos.takeProfit) {
        if ((pos.action === 'buy' && price >= pos.takeProfit) ||
            (pos.action === 'sell' && price <= pos.takeProfit)) {
          await closePosition(pos, 'takeprofit');
          continue;
        }
      }
    }
  }

  async function main() {
    while (true) {
      try {
        await checkAndClosePositions();
      } catch (e) {}
      await new Promise(res => setTimeout(res, 10000));
    }
  }

  main();
}; 