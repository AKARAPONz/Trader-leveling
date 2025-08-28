function toggleTheme() {
  const html = document.documentElement;
  const themeButton = document.querySelector('[onclick="toggleTheme()"] i');
  if (html.getAttribute('data-theme') === 'light') {
    html.setAttribute('data-theme', 'dark');
    themeButton.className = "bi bi-sun";
  } else {
    html.setAttribute('data-theme', 'light');
    themeButton.className = "bi bi-moon";
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

// Load user level info when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadUserLevelInfo();
}); 