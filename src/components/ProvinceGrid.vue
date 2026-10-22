<script setup>
import { useWeatherStore } from '../stores/weather.js'
import ProvinceCard from './ProvinceCard.vue'

defineProps({ provinces: { type: Array, default: () => [] } })
const store = useWeatherStore()
</script>

<template>
  <ProvinceCard
    v-for="p in provinces"
    :key="p.id"
    :province="p"
    :is-favorite="store.favorites.includes(p.id)"
  />
</template>
