<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeatherStore } from '../stores/weather.js'
import { fmtDateTime, relativeFa } from '../utils/format.js'
import ThemeToggle from './ThemeToggle.vue'

const BASE = import.meta.env.BASE_URL
const store = useWeatherStore()
const router = useRouter()
const route = useRoute()
const now = ref(Date.now())
let tickId = null

onMounted(() => {
  tickId = setInterval(() => { now.value = Date.now() }, 15_000)
})
onBeforeUnmount(() => clearInterval(tickId))

const isHome = computed(() => route.name === 'home')
const fetchedLabel = computed(() => (store.fetchedAtMs ? fmtDateTime(store.fetchedAtMs) : '—'))
const agoLabel = computed(() => (store.fetchedAtMs ? relativeFa(store.fetchedAtMs, now.value) : ''))
const isOutdated = computed(() => store.fetchedAtMs && now.value - store.fetchedAtMs > 3 * 3600 * 1000)
const statusLabel = computed(() => {
  if (store.status === 'loading') return 'در حال بررسی داده‌ی جدید…'
  if (store.status === 'error') return 'خطا در دریافت داده'
  if (store.status === 'stale') return 'خطا در بررسی داده‌ی جدید (نمایش آخرین داده‌ی معتبر)'
  return isOutdated.value ? 'داده قدیمی است' : 'بروز'
})

function goHome() {
  store.setSearch('')
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="container app-header">
    <div class="app-header__row">
      <button type="button" class="app-header__brand" @click="goHome" title="بازگشت به صفحه اصلی">
        <img
          :src="BASE + 'icons/icon-96.png'"
          alt="هواشناسی"
          class="app-header__logo"
          @error="$event.target.style.display = 'none'"
        />
        <h1 class="app-header__title">هواشناسی</h1>
      </button>

      <div v-if="isHome" class="app-header__search-wrap">
        <input
          type="search"
          :value="store.search"
          @input="store.setSearch($event.target.value)"
          placeholder="جستجوی استان یا شهر..."
          class="card app-header__search"
        />
      </div>

      <ThemeToggle />
    </div>

    <div class="app-header__status">
      <span>{{ statusLabel }}</span>
      <span>· آخرین دریافت داده: <bdi>{{ fetchedLabel }}</bdi><template v-if="agoLabel"> ({{ agoLabel }})</template></span>
    </div>
  </header>
</template>
