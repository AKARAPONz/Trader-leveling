// public/js/trade.js

// ===== Chart Setup =====
let chart;
let candleSeries;
let lastPriceLine;
let currentSymbol = 'BTCUSDT'; // ค่า default

function initChart() {
  const chartElement = document.getElementById('chart');
  if (!chartElement) return;

  chart = LightweightCharts.createChart(chartElement, {
    width: chartElement.clientWidth,
    height: 400,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#000'
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' }
    }
  });

  candleSeries = chart.addCandlestickSeries();
  lastPriceLine = null;

  loadChartData(currentSymbol);
}

async function loadChartData(symbol) {
  try {
    const response = await fetch(`/api/price?symbol=${symbol}`);
    const data = await response.json();
    if (data && data.price) {
      const price = parseFloat(data.price);
      if (lastPriceLine) candleSeries.removePriceLine(lastPriceLine);
      lastPriceLine = candleSeries.createPriceLine({
        price,
        color: 'blue',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Last Price'
      });
    }
  } catch (err) {
    console.error('Chart load error:', err.message);
  }
}

// ===== Load Open Positions =====
async function loadOpenPositions() {
  const div = document.getElementById('openPositions');
  if (!div) return;

  try {
    const response = await fetch(`/api/trade/positions?tournamentId=${document.body.dataset.tournamentId}`);
    const data = await response.json();
    if (data.success) {
      div.innerHTML = data.positions.map(pos => `
        <div class="position-item">
          <strong>${pos.symbol}</strong> (${pos.action.toUpperCase()})<br>
          Lot: ${pos.lot} | Entry: ${pos.entryPrice}
        </div>
      `).join('');
    } else {
      div.innerHTML = `<p class="text-muted">No open positions</p>`;
    }
  } catch (err) {
    div.innerHTML = `<p class="text-danger">Error loading positions</p>`;
    console.error('Open positions error:', err.message);
  }
}

// ===== Load Recent Trades =====
async function loadRecentTrades() {
  const div = document.getElementById('recentTrades');
  if (!div) return;

  try {
    const response = await fetch(`/api/trade/recent?tournamentId=${document.body.dataset.tournamentId}`);
    const data = await response.json();
    if (data.success) {
      div.innerHTML = data.trades.map(trade => `
        <div class="trade-item">
          <div class="d-flex justify-content-between">
            <span class="badge ${
              trade.action === 'buy' || trade.action === 'close-buy'
                ? 'badge-success'
                : 'badge-danger'
            }">
              ${trade.action.toUpperCase()}
            </span>
            <small>${
              trade.closedAt
                ? new Date(trade.closedAt).toLocaleTimeString()
                : new Date(trade.createdAt).toLocaleTimeString()
            }</small>
          </div>
          <div>
            Symbol: ${trade.symbol} | Lot: ${trade.lot} | Score: ${Number(trade.score).toFixed(2)}
          </div>
        </div>
      `).join('');
    } else {
      div.innerHTML = `<p class="text-muted">No trades yet</p>`;
    }
  } catch (err) {
    div.innerHTML = `<p class="text-danger">Error loading trades</p>`;
    console.error('Recent trades error:', err.message);
  }
}

// ===== Tournament Status =====
async function checkTournamentStatus() {
  try {
    const el = document.getElementById('tournamentStatus');
    if (!el) return;

    const tournamentId = document.body.dataset.tournamentId;
    if (!tournamentId) return;

    const response = await fetch(`/api/tournament/status?tournamentId=${tournamentId}`);
    const data = await response.json();
    if (data && data.status) {
      el.textContent = data.status;
    }
  } catch (err) {
    console.error('Tournament status error:', err.message);
  }
}

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', function () {
  const hasTournament = document.body.dataset.hasTournament === 'true';

  if (hasTournament) {
    initChart();
    checkTournamentStatus();
    loadOpenPositions();
    loadRecentTrades();
    setInterval(loadOpenPositions, 5000);
    setInterval(loadRecentTrades, 5000);
  }
});