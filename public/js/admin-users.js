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
      const userLevelElement = document.getElementById('userLevel');
      const userExpElement = document.getElementById('userExp');
      
      if (userLevelElement) userLevelElement.textContent = levelInfo.level;
      if (userExpElement) userExpElement.textContent = levelInfo.exp;
    }
  } catch (error) {
    console.error('Error loading user level info:', error);
  }
}

// Load user level info when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadUserLevelInfo();
}); 