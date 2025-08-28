let currentTheme = "light";
let currentSymbol = null;
let lastKnownPrice = null; // Store last known price for fallback

async function loadAsset(symbol) {
  if (!symbol) return;

  currentSymbol = symbol;
  
  // Show loading state
  const priceElement = document.getElementById("current-price");
  priceElement.textContent = "กำลังโหลด...";
  priceElement.className = "badge badge-warning";

  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (data.status === 'success' && data.price) {
      // Success case
      const formattedPrice = parseFloat(data.price).toFixed(2);
      priceElement.textContent = `${formattedPrice} ${data.currency || 'USD'}`;
      priceElement.className = "badge badge-success";
      lastKnownPrice = data.price; // Store for fallback
      
      // Update symbol display if available
      const symbolElement = document.getElementById("current-symbol");
      if (symbolElement) {
        symbolElement.textContent = data.symbol || symbol;
      }
    } else {
      // API returned error
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

  renderChart(symbol);
}

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

function loadCustomAsset() {
  const customSymbolInput = document.getElementById('customSymbol');
  const symbol = customSymbolInput.value.trim();
  
  if (!symbol) {
    alert('กรุณาใส่สัญลักษณ์ที่ต้องการค้นหา');
    return;
  }
  
  // Basic validation
  if (symbol.length < 2 || symbol.length > 20) {
    alert('สัญลักษณ์ต้องมีความยาว 2-20 ตัวอักษร');
    return;
  }
  
  // Clean the symbol (remove special characters except /)
  const cleanSymbol = symbol.replace(/[^A-Za-z0-9/]/g, '').toUpperCase();
  
  if (cleanSymbol !== symbol.toUpperCase()) {
    alert('สัญลักษณ์มีอักขระที่ไม่ถูกต้อง กรุณาใช้เฉพาะตัวอักษร ตัวเลข และ / เท่านั้น');
    return;
  }
  
  loadAsset(cleanSymbol);
  customSymbolInput.value = ''; // Clear input after search
}



function renderChart(symbol) {
  document.getElementById("dynamic-graph").innerHTML = '';

  new TradingView.widget({
    "container_id": "dynamic-graph",
    "autosize": true,
    "symbol": symbol.replace('/', ''),
    "interval": "1",
    "timezone": "Asia/Bangkok",
    "theme": currentTheme,
    "style": 1,
    "locale": "en",
    "toolbar_bg": currentTheme === "dark" ? "#1e293b" : "#f8fafc",
    "enable_publishing": false,
    "hide_legend": false,
    "allow_symbol_change": true
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const themeButton = document.querySelector('[onclick="toggleTheme()"] i');
  
  if (html.getAttribute('data-theme') === 'light') {
    html.setAttribute('data-theme', 'dark');
    currentTheme = "dark";
    themeButton.className = "bi bi-sun";
  } else {
    html.setAttribute('data-theme', 'light');
    currentTheme = "light";
    themeButton.className = "bi bi-moon";
  }

  if (currentSymbol) {
    renderChart(currentSymbol);
  }
}

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