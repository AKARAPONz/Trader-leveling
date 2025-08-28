window.onload = function () {
  var errorMessage = document.body.getAttribute('data-error-message') || '';
  var successMessage = document.body.getAttribute('data-success-message') || '';
  
  if (errorMessage && errorMessage !== '') {
    showAlert(errorMessage, "error");
  }
  
  if (successMessage && successMessage !== '') {
    showAlert(successMessage, "success");
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-' + (type === 'error' ? 'danger' : 'success');
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '1rem';
  alertDiv.style.left = '50%';
  alertDiv.style.transform = 'translateX(-50%)';
  alertDiv.style.zIndex = '1000';
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(function() {
    alertDiv.remove();
  }, 5000);
}

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