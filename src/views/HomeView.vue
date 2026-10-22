<script setup>
import { computed } from 'vue'
import { useWeatherStore } from '../stores/weather.js'
import { fa } from '../utils/format.js'
import FavoritesBar from '../components/FavoritesBar.vue'
import ProvinceGrid from '../components/ProvinceGrid.vue'

const store = useWeatherStore()
const isSearching = computed(() => store.search.trim().length > 0)
const showFavorites = computed(() => !isSearching.value && store.favoriteProvinces.length > 0)
</script>

<template>
  <main class="container" style="flex: 1; padding-bottom: 48px;">
    <FavoritesBar v-if="showFavorites" />

    <h2 class="section-title">
      {{ isSearching ? 'نتایج جستجو' : 'همه استان‌ها' }}
      <small style="color: var(--text-muted); font-weight: 500;">({{ fa(store.filteredProvinces.length) }})</small>
    </h2>

    <div v-if="store.provinces.length" class="grid">
      <ProvinceGrid :provinces="store.filteredProvinces" />
    </div>

    <div v-else-if="store.status === 'loading' || store.status === 'idle'" class="grid">
      <div v-for="n in 8" :key="n" class="asset-card asset-card--skeleton" />
    </div>

    <div v-else class="card empty-note">
      <p>دریافت داده ممکن نشد. اتصال اینترنت را بررسی کنید.</p>
      <button type="button" @click="store.refresh()">تلاش دوباره</button>
    </div>

    <p v-if="store.provinces.length && !store.filteredProvinces.length" class="empty-note">استانی با این نام پیدا نشد.</p>
  </main>
</template>
