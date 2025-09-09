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

async function loadTradingScore() {
  try {
    // Get tournament ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentId = urlParams.get('tournamentId');
    
    if (!tournamentId) {
      console.log('No tournament ID found in URL');
      return;
    }

    const response = await fetch(`/api/trade/trading-score?tournamentId=${tournamentId}`);
    const data = await response.json();
    
    if (data.success) {
      const tradingScore = data.tradingScore;
      const scoreBreakdown = data.scoreBreakdown;
      
      // Update score breakdown display
      const openOrderPointsElement = document.getElementById('openOrderPoints');
      const profitPointsElement = document.getElementById('profitPoints');
      const lossPointsElement = document.getElementById('lossPoints');
      const totalTradingPointsElement = document.getElementById('totalTradingPoints');
      
      if (openOrderPointsElement) openOrderPointsElement.textContent = scoreBreakdown.openOrderPoints;
      if (profitPointsElement) profitPointsElement.textContent = scoreBreakdown.profitPoints;
      if (lossPointsElement) lossPointsElement.textContent = scoreBreakdown.lossPoints;
      if (totalTradingPointsElement) totalTradingPointsElement.textContent = tradingScore.totalScore;
      
      console.log('📊 Trading score loaded:', tradingScore);
      console.log('📊 Score breakdown:', scoreBreakdown);
    }
  } catch (error) {
    console.error('Error loading trading score:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Simple time display for now
  const timeLeftElement = document.getElementById('timeLeft');
  if (timeLeftElement) {
    timeLeftElement.textContent = 'Active Tournament';
  }
  
  // Load user level info
  loadUserLevelInfo();
  
  // Load trading score
  loadTradingScore();
}); 