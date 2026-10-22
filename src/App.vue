<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useWeatherStore } from './stores/weather.js'
import { REFRESH_INTERVAL_MS } from './config.js'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import UpdateToast from './components/UpdateToast.vue'

const store = useWeatherStore()
let timerId = null

function onVisible() {
  if (document.visibilityState === 'visible') store.refresh()
}

onMounted(() => {
  store.loadFromCache()
  store.refresh()
  timerId = setInterval(() => store.refresh(), REFRESH_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => {
  clearInterval(timerId)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <AppHeader />
  <router-view v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  <AppFooter />
  <UpdateToast />
</template>
