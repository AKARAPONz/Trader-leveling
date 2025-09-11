// ตัวแปรสำหรับจัดการสถานะการเทรดและกราฟ
let currentAction = 'buy'; // buy/sell
let windowStart = 0; // index เริ่มต้นของ window กราฟ
const windowSize = 20; // จำนวนแท่งกราฟที่แสดง
let chart;
let candleSeries;

function setAction(action) {
  currentAction = action;
  document.getElementById('selectedAction').textContent = action.toUpperCase();

  // ปุ่มสี (Buy=เขียว, Sell=แดง)
  document.getElementById('buyBtn').classList.toggle('btn-success', action === 'buy');
  document.getElementById('sellBtn').classList.toggle('btn-danger', action === 'sell');
}

// เพิ่ม tooltip ราคาบนกราฟ
function addPriceTooltipOverlay(container, chart) {
  let priceTooltip = document.createElement('div');
  priceTooltip.className = 'price-tooltip-overlay';
  priceTooltip.style.position = 'absolute';
  priceTooltip.style.pointerEvents = 'none';
  priceTooltip.style.background = 'rgba(30,30,30,0.95)';
  priceTooltip.style.color = '#fff';
  priceTooltip.style.padding = '2px 10px';
  priceTooltip.style.borderRadius = '6px';
  priceTooltip.style.fontSize = '1rem';
  priceTooltip.style.fontWeight = 'bold';
  priceTooltip.style.zIndex = 20;
  priceTooltip.style.display = 'none';
  container.appendChild(priceTooltip);
  chart.subscribeCrosshairMove(function(param) {
    if (param.point && param.seriesPrices && candleSeries) {
      let price = param.price || param.seriesPrices.get(candleSeries);
      if (price) {
        priceTooltip.innerText = price.toFixed(5);
        priceTooltip.style.left = (param.point.x + 10) + 'px';
        priceTooltip.style.top = (param.point.y - 18) + 'px';
        priceTooltip.style.display = 'block';
      } else {
        priceTooltip.style.display = 'none';
      }
    } else {
      priceTooltip.style.display = 'none';
    }
  });
}

// แสดง toast แจ้งผลการเทรด
function showTradeToast(message, isError) {
  let toast = document.createElement('div');
  toast.className = 'trade-toast';
  toast.style.position = 'fixed';
  toast.style.top = '30px';
  toast.style.right = '30px';
  toast.style.zIndex = 9999;
  toast.style.background = isError ? '#ef4444' : '#10b981';
  toast.style.color = 'white';
  toast.style.padding = '1rem 2rem';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.fontSize = '1.1rem';
  toast.style.opacity = '0.95';
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 500);
  }, 2000);
}

// โหลด recent trades จาก backend
function loadRecentTrades() {
  // ดึง recent trades จาก backend และแสดงผล
  try {
    let tournamentId = document.body.getAttribute('data-tournament-id');
    if (!tournamentId) {
      tournamentId = getTournamentId();
    }
    if (!tournamentId) return;
fetch(`/api/trade/positions?tournamentId=${tournamentId}`)

      .then(res => res.json())
      .then(data => {
        const recentTradesDiv = document.getElementById('recentTrades');
        if (data.success && data.trades && data.trades.length > 0) {
          const tradesHtml = data.trades.map(trade => `
            <div class="trade-item">
              <div class="d-flex justify-content-between">
                <span class="badge badge-${trade.action === 'buy' ? 'success' : 'danger'}">${trade.action.toUpperCase()}</span>
                <small>${new Date(trade.createdAt).toLocaleTimeString()}</small>
              </div>
              <div>Lot: ${trade.lot} | Score: ${trade.score || 0}</div>
            </div>
          `).join('');
          recentTradesDiv.innerHTML = tradesHtml;
        } else {
          recentTradesDiv.innerHTML = '<p class="text-muted text-center">No recent trades</p>';
        }
      })
      .catch(() => {
        document.getElementById('recentTrades').innerHTML = '<p class="text-muted text-center">Error loading trades</p>';
      });
  } catch (error) {
    document.getElementById('recentTrades').innerHTML = '<p class="text-muted text-center">Error loading trades</p>';
  }
}

// โหลด open positions จาก backend
function loadOpenPositions() {
  const tournamentId = getTournamentId && getTournamentId();
  if (!tournamentId) return;
  const openPositionsDiv = document.getElementById('openPositions');
  if (!openPositionsDiv) return;
  openPositionsDiv.innerHTML = '<p class="text-muted text-center">Loading open positions...</p>';
fetch(`/api/trade/positions?tournamentId=${tournamentId}`)

    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.positions || !data.positions.length) {
        openPositionsDiv.innerHTML = '<p class="text-muted text-center">No open positions</p>';
        return;
      }
      let html = '';
      data.positions.forEach(pos => {
        const action = pos.action ? pos.action.toUpperCase() : '';
        const lot = pos.lot || '';
        const entry = pos.entryPrice !== undefined && pos.entryPrice !== null ? pos.entryPrice : '-';
        const time = pos.createdAt ? new Date(pos.createdAt).toLocaleTimeString('en-GB', { hour12: false }) : '';
        html += `<div class="open-position-item mb-2">
          <span class="badge ${action === 'BUY' ? 'bg-success' : 'bg-danger'}">${action}</span>
          <span class="ms-2">${time}</span>
          <span class="ms-2">Lot: ${lot} | Entry: ${entry}</span>
        </div>`;
      });
      openPositionsDiv.innerHTML = html;
    })
    .catch(() => {
      openPositionsDiv.innerHTML = '<p class="text-danger text-center">Error loading open positions</p>';
    });
}

// ฟังก์ชันสำหรับ submit ฟอร์มเทรด, ตรวจสอบ tournament, และ UI
// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Mouse move price tooltip overlay
  var chartDiv = document.getElementById('dynamic-graph');
  if (chartDiv) {
    let priceTooltip = document.createElement('div');
    priceTooltip.className = 'price-tooltip-overlay';
    priceTooltip.style.position = 'absolute';
    priceTooltip.style.pointerEvents = 'none';
    priceTooltip.style.background = 'rgba(30,30,30,0.95)';
    priceTooltip.style.color = '#fff';
    priceTooltip.style.padding = '2px 10px';
    priceTooltip.style.borderRadius = '6px';
    priceTooltip.style.fontSize = '1rem';
    priceTooltip.style.fontWeight = 'bold';
    priceTooltip.style.zIndex = 20;
    priceTooltip.style.display = 'none';
    chartDiv.appendChild(priceTooltip);

    chartDiv.addEventListener('mousemove', function(e) {
      var rect = chartDiv.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var minY = 1.22, maxY = 1.25;
      if (window.lastChartMinY !== undefined && window.lastChartMaxY !== undefined) {
        minY = window.lastChartMinY;
        maxY = window.lastChartMaxY;
      }
      var percent = 1 - ((y - 30) / (chartDiv.clientHeight - 60));
      percent = Math.max(0, Math.min(1, percent));
      var price = minY + (maxY - minY) * percent;
      priceTooltip.style.left = (rect.width - 90) + 'px';
      priceTooltip.style.top = (y - 18) + 'px';
      priceTooltip.innerText = price.toFixed(5);
      priceTooltip.style.display = 'block';
    });
    chartDiv.addEventListener('mouseleave', function() {
      priceTooltip.style.display = 'none';
    });
  }
  // Set initial symbol from data attributes
  var initialSymbol = document.body.getAttribute('data-initial-symbol') || '';
  if (initialSymbol) {
    currentSymbol = initialSymbol;
  }
  
  // Set initial symbol if available
  var symbolElement = document.getElementById('symbolSelect');
  if (symbolElement) {
    currentSymbol = symbolElement.value;
  }
  
  // Initialize if tournament exists
  var hasTournament = document.body.getAttribute('data-has-tournament') === 'true';
  if (hasTournament) {
    initChart();
    setAction('buy');
    // Check tournament status and update UI
    checkTournamentStatus();
  }
  
  // Handle form submission
  var tradeForm = document.getElementById('tradeForm');
  if (tradeForm) {
    tradeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var formData = new FormData(this);
      
      // Ensure tournamentId is included if available
      var tournamentIdInput = document.querySelector('input[name="tournamentId"]');
      if (tournamentIdInput && tournamentIdInput.value) {
        formData.set('tournamentId', tournamentIdInput.value);
      } else {
        // Fallback: try to get tournamentId from URL query parameter
        var urlParams = new URLSearchParams(window.location.search);
        var urlTournamentId = urlParams.get('tournamentId');
        if (urlTournamentId) {
          formData.set('tournamentId', urlTournamentId);
        }
      }
      
      // เพิ่ม symbol ลงใน formData
      var symbolSelect = document.getElementById('symbolSelect');
      if (symbolSelect && symbolSelect.value) {
        formData.set('symbol', symbolSelect.value);
      }
      
      formData.append('action', currentAction);
      formData.append('type', formData.get('entryPrice') ? 'limit' : 'market');
      
      fetch('/api/trade', {
        method: 'POST',
        body: formData
      })
      .then(function(response) {
        if (response.ok) {
          // Get entry price and action for marker
          var entryPrice = formData.get('entryPrice');
          var lot = formData.get('lot') || '0.01';
          var action = formData.get('action') || currentAction;
          // If entryPrice ไม่ระบุ ให้ใช้ราคาตลาด (mock: ใช้ close ล่าสุดจากกราฟ)
          if (!entryPrice) {
            entryPrice = getLastClosePriceOnChart();
          }
          showTradeToast('Order placed successfully!');
          markTradeOnChart(action, parseFloat(entryPrice), parseFloat(lot));
          tradeForm.reset();
          setAction('buy');
          // Refresh recent trades and open positions
          loadRecentTrades();
          loadOpenPositions();
        } else {
          return response.text().then(function(text) { 
            throw new Error(text); 
          });
        }
      })
      .catch(function(error) {
        showTradeToast('Error placing order: ' + error.message, true);
      });
    });
  }
});