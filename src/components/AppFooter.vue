<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="container app-footer">
    <span>© {{ year }} هواشناسی</span>
    <a href="https://mhkarami97.ir" target="_blank" rel="noopener noreferrer">mhkarami97.ir</a>
  </footer>
  <footer class="container app-footer-info">
    <p>منبع داده: Windy.com (مدل GFS برای پیش‌بینی و CAMS برای کیفیت هوا) - داده‌ها پیش‌بینی مدلی برای مختصات مرکز هر استان است و ممکن است با شرایط محلی تفاوت داشته باشد.</p>
  </footer>
</template>
