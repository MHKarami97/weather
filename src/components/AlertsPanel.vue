<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertsStore } from '../stores/alerts.js'
import { useWeatherStore } from '../stores/weather.js'
import AlertSourceList from './AlertSourceList.vue'

const FALLBACK_COUNT = 4
const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })
const numberFormatter = new Intl.NumberFormat('fa-IR')

const alertsStore = useAlertsStore()
const weatherStore = useWeatherStore()
const router = useRouter()
const expandedList = ref(false)
const expandedDays = reactive(new Set())

const items = computed(() => alertsStore.report(weatherStore.favorites))
const hasFavorites = computed(() => weatherStore.favorites.length > 0)
const collapsedItems = computed(() => {
  if (!hasFavorites.value) return items.value.slice(0, FALLBACK_COUNT)
  return items.value.filter((item) => item.isFavorite)
})
const visibleItems = computed(() => (expandedList.value ? items.value : collapsedItems.value))
const hiddenCount = computed(() => items.value.length - collapsedItems.value.length)
const noFavoriteAlerts = computed(() => hasFavorites.value && collapsedItems.value.length === 0)

const formatDay = (dateKey) => dayFormatter.format(new Date(`${dateKey}T12:00:00`))
const formatCount = (value) => numberFormatter.format(value)
const kindIcon = (kind) => (kind === 'snow' ? '❄️' : '🌧️')
const kindLabel = (kind) => (kind === 'snow' ? 'برف' : 'باران')
const openProvince = (id) => router.push({ name: 'province', params: { id } })

function toggleDays(id) {
  if (expandedDays.has(id)) expandedDays.delete(id)
  else expandedDays.add(id)
}

onMounted(() => alertsStore.load())
</script>

<template>
  <div class="alerts">
    <div v-if="alertsStore.status === 'error' && !alertsStore.payload" class="card empty-note">
      <p>دریافت هشدارها ممکن نشد.</p>
      <button type="button" @click="alertsStore.load(true)">تلاش دوباره</button>
    </div>

    <div v-else-if="!alertsStore.payload" class="alerts__grid" aria-busy="true">
      <div v-for="n in 4" :key="n" class="card alerts__skeleton"></div>
    </div>

    <p v-else-if="items.length === 0" class="card empty-note">در حال حاضر هشداری ثبت نشده است.</p>

    <template v-else>
      <p v-if="noFavoriteAlerts && !expandedList" class="card empty-note">برای استان‌های مورد علاقه هشداری ثبت نشده است.</p>

      <div class="alerts__grid">
        <article
          v-for="item in visibleItems"
          :key="item.provinceId"
          class="card alerts__card"
          :class="item.today ? `is-${item.today.kind}` : 'is-none'"
        >
          <header>
            <button type="button" class="alerts__name" @click="openProvince(item.provinceId)">
              {{ item.name }}
              <span v-if="item.isFavorite" class="alerts__fav" title="مورد علاقه">★</span>
            </button>
          </header>

          <div v-if="item.today">
            <div class="alerts__day-title">
              <span aria-hidden="true">{{ kindIcon(item.today.kind) }}</span>
              <span>امروز: {{ kindLabel(item.today.kind) }}</span>
            </div>
            <AlertSourceList :sources="item.today.sources" />
          </div>
          <p v-else class="alerts__quiet">امروز هشداری نیست.</p>

          <template v-if="item.otherDays.length">
            <button
              type="button"
              class="alerts__days-btn"
              :aria-expanded="expandedDays.has(item.provinceId)"
              @click="toggleDays(item.provinceId)"
            >
              {{ expandedDays.has(item.provinceId) ? 'پنهان کردن روزهای دیگر' : `نمایش روزهای دیگر (${formatCount(item.otherDays.length)})` }}
            </button>
            <div v-if="expandedDays.has(item.provinceId)" class="alerts__others">
              <section v-for="day in item.otherDays" :key="day.date">
                <div class="alerts__day-title">
                  <span aria-hidden="true">{{ kindIcon(day.kind) }}</span>
                  <span>{{ formatDay(day.date) }}: {{ kindLabel(day.kind) }}</span>
                </div>
                <AlertSourceList :sources="day.sources" />
              </section>
            </div>
          </template>
        </article>
      </div>

      <button v-if="hiddenCount > 0" type="button" class="alerts__more" :aria-expanded="expandedList" @click="expandedList = !expandedList">
        <span>{{ expandedList ? 'نمایش کمتر' : `نمایش ${formatCount(hiddenCount)} استان دیگر` }}</span>
        <svg class="alerts__more-icon" :class="{ 'is-open': expandedList }" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped>
.alerts__grid { display: grid; gap: 12px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 640px) { .alerts__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .alerts__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.alerts__card { padding: 14px; display: flex; flex-direction: column; gap: 10px; border-inline-start: 4px solid transparent; min-width: 0; }
.alerts__card.is-rain { border-inline-start-color: #3b82f6; }
.alerts__card.is-snow { border-inline-start-color: #67e8f9; }
.alerts__card.is-none { border-inline-start-color: rgba(127, 127, 127, 0.4); }
.alerts__skeleton { height: 120px; opacity: 0.4; }
.alerts__name { background: none; border: 0; padding: 0; color: inherit; font: inherit; font-weight: 700; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.alerts__name:hover { text-decoration: underline; }
.alerts__fav { color: #f59e0b; }
.alerts__day-title { display: flex; gap: 6px; font-size: 0.9rem; font-weight: 600; }
.alerts__quiet { margin: 0; font-size: 0.85rem; color: var(--text-muted, #737373); }
.alerts__days-btn { align-self: flex-start; padding: 4px 10px; font: inherit; font-size: 0.8rem; color: inherit; background: transparent; border: 1px solid rgba(127, 127, 127, 0.4); border-radius: 999px; cursor: pointer; }
.alerts__days-btn:hover { background: rgba(127, 127, 127, 0.12); }
.alerts__others { display: flex; flex-direction: column; gap: 12px; padding-top: 10px; border-top: 1px dashed rgba(127, 127, 127, 0.35); }
.alerts__more { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px auto 0; padding: 8px 18px; font: inherit; color: inherit; background: rgba(127, 127, 127, 0.12); border: 1px solid rgba(127, 127, 127, 0.35); border-radius: 999px; cursor: pointer; transition: background 0.15s ease; }
.alerts__more:hover { background: rgba(127, 127, 127, 0.22); }
.alerts__more-icon { transition: transform 0.2s ease; }
.alerts__more-icon.is-open { transform: rotate(180deg); }
.alerts__days-btn:focus-visible, .alerts__more:focus-visible, .alerts__name:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
</style>
