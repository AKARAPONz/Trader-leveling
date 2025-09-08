// ตัวแปรสำหรับจัดการ symbol และราคาปัจจุบัน
let currentSymbol = null;
let lastKnownPrice = null; // Store last known price for fallback
let priceInterval = null; // สำหรับ interval อัปเดตราคา

// ฟังก์ชันโหลดข้อมูลราคาและแสดงบนหน้าเว็บ
async function loadAsset(symbol) {
  // Validate symbol is a string
  if (typeof symbol !== 'string' || !symbol.trim()) {
    console.warn('Invalid symbol:', symbol);
    return;
  }

  currentSymbol = symbol;
  
  // Show loading state
  const priceElement = document.getElementById("current-price");
  priceElement.textContent = "กำลังโหลด...";
  priceElement.className = "badge badge-warning";

  // ตั้ง interval สำหรับอัปเดตราคาแบบเรียลไทม์
  if (priceInterval) clearInterval(priceInterval);
  priceInterval = setInterval(() => {
    fetchAndUpdatePrice(symbol);
  }, 5000);
  // โหลดราคาทันที
  fetchAndUpdatePrice(symbol);
  createTradingViewWidget(symbol);
}

// ฟังก์ชันดึงราคาจาก backend และอัปเดต DOM
async function fetchAndUpdatePrice(symbol) {
  // Validate symbol is a string
  if (typeof symbol !== 'string' || !symbol.trim()) {
    console.warn('Invalid symbol:', symbol);
    return;
  }
  currentSymbol = symbol;
  const priceElement = document.getElementById("current-price");
  priceElement.textContent = "กำลังโหลด...";
  priceElement.className = "badge badge-warning";
  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.status === 'success' && data.price) {
      const formattedPrice = parseFloat(data.price).toFixed(2);
      priceElement.textContent = `${formattedPrice} ${data.currency || 'USD'}`;
      priceElement.className = "badge badge-success";
      lastKnownPrice = data.price;
      const symbolElement = document.getElementById("current-symbol");
      if (symbolElement) symbolElement.textContent = data.symbol || symbol;
    } else {
      handlePriceError(data.message || 'ไม่พบราคา', data.error);
    }
  } catch (err) {
    console.error('❌ Price fetch error:', err);
    
    // Determine error type and show appropriate message
    if (err.message.includes('timeout') || err.message.includes('408')) {
      handlePriceError('การเชื่อมต่อช้า กรุณาลองใหม่', 'TIMEOUT');
    } else if (err.message.includes('503') || err.message.includes('unavailable')) {
      handlePriceError('บริการไม่พร้อมใช้งานชั่วคราว', 'SERVICE_UNAVAILABLE');
    } else if (err.message.includes('404') || err.message.includes('not found')) {
      handlePriceError('ไม่พบข้อมูลราคาสำหรับสัญลักษณ์นี้', 'SYMBOL_NOT_FOUND');
    } else if (lastKnownPrice) {
      // Show last known price as fallback
      const formattedPrice = parseFloat(lastKnownPrice).toFixed(2);
      priceElement.textContent = `${formattedPrice} USD (ราคาล่าสุด)`;
      priceElement.className = "badge badge-warning";
    } else {
      handlePriceError('ไม่สามารถดึงข้อมูลราคาได้', 'FETCH_ERROR');
    }
  }
}

// ฟังก์ชันแสดง error ในช่องราคา
function handlePriceError(message, errorType) {
  const priceElement = document.getElementById("current-price");
  priceElement.textContent = message;
  priceElement.className = "badge badge-danger";
  
  // Add tooltip or additional info based on error type
  if (errorType === 'SYMBOL_NOT_FOUND') {
    priceElement.title = 'ลองเปลี่ยนสัญลักษณ์ เช่น AAPL, BTC/USD, EUR/USD';
  } else if (errorType === 'TIMEOUT') {
    priceElement.title = 'ลองรีเฟรชหน้าเว็บ';
  }
}

// ฟังก์ชันโหลด symbol ที่ custom input
function loadCustomAsset() {
  const symbol = document.getElementById('customSymbol').value.trim();
  if (!symbol) {
    alert('กรุณาใส่สัญลักษณ์');
    return;
  }
  loadAsset(symbol);
}

// สร้าง TradingView widget สำหรับกราฟ
function createTradingViewWidget(symbol) {
  // Remove previous widget if exists
  if (window.tvWidget) {
    window.tvWidget.remove();
    window.tvWidget = null;
  }

  // Validate symbol and interval
  const validSymbol = typeof symbol === 'string' ? symbol : 'AAPL';
  const interval = '1'; // default interval as string

  // ตรวจสอบว่ามี div id="dynamic-graph" จริงหรือไม่
  const container = document.getElementById("dynamic-graph");
  if (!container) {
    console.error('❌ ไม่พบ div id="dynamic-graph" ในหน้า index.ejs');
    return;
  }

  window.tvWidget = new TradingView.widget({
    symbol: validSymbol,
    interval: interval,
    container_id: "dynamic-graph",
    autosize: true,
    timezone: "Asia/Bangkok",
    style: 1,
    locale: "en",
    enable_publishing: false,
    hide_legend: false,
    allow_symbol_change: true,
    width: "100%",
    height: 500,
  });
}

// ฟังก์ชันเปิด/ปิด fullscreen สำหรับกราฟ
function toggleFullscreen() {
  const el = document.getElementById("dynamic-graph");
  if (!document.fullscreenElement) {
    el.requestFullscreen().then(function() {
      // Success
    }).then(function() {
      // Handle success
    }, function(err) {
      console.error('Error attempting fullscreen: ' + err.message);
    });
  } else {
    document.exitFullscreen();
  }
}

// ฟังก์ชันโหลดข้อมูล level/exp ของ user
async function loadUserLevelInfo() {
  try {
    const response = await fetch('/api/user-level');
    const data = await response.json();
    
    if (data.success) {
      const levelInfo = data.levelInfo;
      
      // Update level display
      const currentLevelElement = document.getElementById('currentLevel');
      const userLevelElement = document.getElementById('userLevel');
      const currentExpElement = document.getElementById('currentExp');
      const userExpElement = document.getElementById('userExp');
      
      if (currentLevelElement) currentLevelElement.textContent = levelInfo.level;
      if (userLevelElement) userLevelElement.textContent = levelInfo.level;
      if (currentExpElement) currentExpElement.textContent = levelInfo.exp;
      if (userExpElement) userExpElement.textContent = levelInfo.exp;
      
      // Update level name
      const levelNameElement = document.getElementById('levelName');
      if (levelNameElement) levelNameElement.textContent = levelInfo.levelInfo.name;
      
      // Update progress bar
      const progressBar = document.getElementById('levelProgress');
      const progressPercent = document.getElementById('progressPercent');
      if (progressBar) progressBar.style.width = levelInfo.progressToNextLevel + '%';
      if (progressPercent) progressPercent.textContent = Math.round(levelInfo.progressToNextLevel);
      
      // Update next level exp
      const nextLevelExpElement = document.getElementById('nextLevelExp');
      if (nextLevelExpElement) {
        if (levelInfo.isMaxLevel) {
          nextLevelExpElement.textContent = 'MAX LEVEL';
        } else {
          nextLevelExpElement.textContent = levelInfo.nextLevelExp;
        }
      }
      
      // Update benefits
      const benefitsTextElement = document.getElementById('benefitsText');
      if (benefitsTextElement) benefitsTextElement.textContent = levelInfo.levelInfo.benefits;
    }
  } catch (error) {
    console.error('Error loading user level info:', error);
  }
}

// Initialize with default asset
document.addEventListener('DOMContentLoaded', function() {
  // โหลด asset เริ่มต้น
  loadAsset('AAPL');
  loadUserLevelInfo();
  
  // Add Enter key support for custom symbol input
  const customSymbolInput = document.getElementById('customSymbol');
  if (customSymbolInput) {
    customSymbolInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        loadCustomAsset();
      }
    });
  }
});