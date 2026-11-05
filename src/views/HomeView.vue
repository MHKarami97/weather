<script setup>
import { computed } from 'vue'
import { useWeatherStore } from '../stores/weather.js'
import FavoritesBar from '../components/FavoritesBar.vue'
import ProvinceGrid from '../components/ProvinceGrid.vue'
import AlertsPanel from '../components/AlertsPanel.vue'
import IranWeatherMap from '../components/IranWeatherMap.vue'

const store = useWeatherStore()
const isSearching = computed(() => store.search.trim().length > 0)
const showFavorites = computed(() => !isSearching.value && store.favoriteProvinces.length > 0)
const showOverview = computed(() => !isSearching.value && store.provinces.length > 0)
</script>

<template>
  <main class="container" style="flex: 1; padding-bottom: 48px">
    <FavoritesBar v-if="showFavorites" />
    <AlertsPanel v-if="showOverview" />
    <IranWeatherMap v-if="showOverview" />

    <h2 class="section-title">
      {{ isSearching ? 'نتایج جستجو' : 'همه استان‌ها' }}
      <small v-if="isSearching" style="color: var(--text-muted); font-weight: 500">
        ({{ store.filteredProvinces.length.toLocaleString('fa-IR') }})
      </small>
    </h2>

    <div v-if="store.provinces.length" class="grid">
      <ProvinceGrid :provinces="store.filteredProvinces" />
    </div>
    <div v-else-if="store.status === 'loading' || store.status === 'idle'" class="grid">
      <div v-for="n in 8" :key="n" class="asset-card asset-card--skeleton"></div>
    </div>
    <div v-else class="card empty-note">
      <p>دریافت اطلاعات ممکن نشد.</p>
      <button type="button" @click="store.refresh()">تلاش دوباره</button>
    </div>
    <p v-if="store.provinces.length && !store.filteredProvinces.length" class="empty-note">موردی یافت نشد.</p>
  </main>
</template>
