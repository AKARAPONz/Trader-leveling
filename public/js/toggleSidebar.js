// public/js/toggleSidebar.js
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const main = document.querySelector(".main");

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // ปิด sidebar เมื่อคลิกเนื้อหาหลัก
  main.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }
  });
});