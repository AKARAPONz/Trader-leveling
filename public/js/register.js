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