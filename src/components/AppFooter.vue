<script setup>
import { computed } from 'vue'
import { useWeatherStore } from '../stores/weather.js'
import { DEFAULT_SOURCE_ID } from '../services/weatherService.js'

const WINDY_ATTRIBUTION = 'Windy.com (مدل GFS برای پیش‌بینی و CAMS برای کیفیت هوا)'
const year = new Date().getFullYear()
const store = useWeatherStore()

const attribution = computed(
  () => store.currentSource?.attribution || (store.sourceId === DEFAULT_SOURCE_ID ? WINDY_ATTRIBUTION : ''),
)
</script>

<template>
  <footer class="container app-footer">
    <span>© {{ year }} هواشناسی</span>
    <a href="https://mhkarami97.ir" target="_blank" rel="noopener noreferrer">mhkarami97.ir</a>
  </footer>
  <footer class="container app-footer-info">
    <p>
      <template v-if="attribution">منبع داده: {{ attribution }} - </template>داده‌ها پیش‌بینی مدلی برای مختصات مرکز هر استان است و ممکن است با شرایط محلی تفاوت داشته باشد.
    </p>
  </footer>
</template>
