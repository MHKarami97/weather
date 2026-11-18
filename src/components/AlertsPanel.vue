<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertsStore } from '../stores/alerts.js'
import { useWeatherStore } from '../stores/weather.js'
import AlertSourceList from './AlertSourceList.vue'

const FALLBACK_COUNT = 4
const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })
const numberFormatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

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
const formatMm = (value) => `${numberFormatter.format(value)} mm`
const kindIcon = (kind) => (kind === 'snow' ? '❄️' : '🌧️')
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

    <p v-else-if="items.length === 0" class="card empty-note">
      در حال حاضر هشدار باران یا برف مؤثری برای استان‌ها ثبت نشده است.
    </p>

    <template v-else>
      <p v-if="noFavoriteAlerts && !expandedList" class="card empty-note">برای استان‌های مورد علاقه هشداری ثبت نشده است.</p>

      <div class="alerts__grid">
        <article
          v-for="item in visibleItems"
          :key="item.provinceId"
          class="card alerts__card"
          :class="[item.today ? `is-${item.today.kind}` : 'is-none', item.today ? `is-${item.today.intensity}` : '']"
        >
          <header class="alerts__header">
            <button type="button" class="alerts__name" @click="openProvince(item.provinceId)">
              {{ item.name }}
              <span v-if="item.isFavorite" class="alerts__fav" title="مورد علاقه">★</span>
            </button>
            <span v-if="item.today" class="alerts__badge alerts__badge--intensity" :class="`alerts__badge--${item.today.intensity}`">
              {{ item.today.intensityLabel }}
            </span>
          </header>

          <div v-if="item.today">
            <div class="alerts__day-title">
              <span aria-hidden="true">{{ kindIcon(item.today.kind) }}</span>
              <span class="alerts__day-name">امروز</span>
              <span class="alerts__badge alerts__badge--precip" :title="`بیشینه بارش پیش‌بینی‌شده: ${formatMm(item.today.maxPrecip)}`">
                تا {{ formatMm(item.today.maxPrecip) }}
              </span>
              <span v-if="item.today.sourceCount > 1" class="alerts__badge alerts__badge--sources" :title="`${formatCount(item.today.sourceCount)} منبع این بارش را تأیید کرده‌اند`">
                {{ formatCount(item.today.sourceCount) }} منبع
              </span>
            </div>
            <AlertSourceList :sources="item.today.sources" />
          </div>
          <p v-else class="alerts__quiet">امروز هشدار مؤثری نیست.</p>

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
              <section v-for="day in item.otherDays" :key="day.date" class="alerts__other-day">
                <div class="alerts__day-title">
                  <span aria-hidden="true">{{ kindIcon(day.kind) }}</span>
                  <span class="alerts__day-name">{{ formatDay(day.date) }}</span>
                  <span class="alerts__badge alerts__badge--intensity" :class="`alerts__badge--${day.intensity}`">
                    {{ day.intensityLabel }}
                  </span>
                  <span class="alerts__badge alerts__badge--precip" :title="`بیشینه بارش پیش‌بینی‌شده: ${formatMm(day.maxPrecip)}`">
                    تا {{ formatMm(day.maxPrecip) }}
                  </span>
                  <span v-if="day.sourceCount > 1" class="alerts__badge alerts__badge--sources">
                    {{ formatCount(day.sourceCount) }} منبع
                  </span>
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
.alerts__card.is-heavy { border-inline-start-color: #ef4444; }
.alerts__card.is-none { border-inline-start-color: rgba(127, 127, 127, 0.4); }
.alerts__skeleton { height: 120px; opacity: 0.4; }
.alerts__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.alerts__name { background: none; border: 0; padding: 0; color: inherit; font: inherit; font-weight: 700; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.alerts__name:hover { text-decoration: underline; }
.alerts__fav { color: #f59e0b; }
.alerts__day-title { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; font-weight: 600; flex-wrap: wrap; }
.alerts__day-name { font-weight: 600; }
.alerts__badge { font-size: 0.72rem; padding: 2px 7px; border-radius: 6px; font-weight: 500; display: inline-flex; align-items: center; white-space: nowrap; }
.alerts__badge--precip { background: rgba(59, 130, 246, 0.18); color: #60a5fa; font-weight: 600; }
[data-theme='light'] .alerts__badge--precip { color: #1d4ed8; }
.alerts__badge--sources { background: rgba(127, 127, 127, 0.14); color: var(--text-muted, #737373); }
.alerts__badge--intensity { font-size: 0.7rem; }
.alerts__badge--light { background: rgba(56, 189, 248, 0.16); color: #38bdf8; }
[data-theme='light'] .alerts__badge--light { color: #0284c7; }
.alerts__badge--moderate { background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-weight: 600; }
[data-theme='light'] .alerts__badge--moderate { color: #1e40af; }
.alerts__badge--heavy { background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 700; }
[data-theme='light'] .alerts__badge--heavy { color: #b91c1c; }
.alerts__quiet { margin: 0; font-size: 0.85rem; color: var(--text-muted, #737373); }
.alerts__days-btn { align-self: flex-start; padding: 4px 10px; font: inherit; font-size: 0.8rem; color: inherit; background: transparent; border: 1px solid rgba(127, 127, 127, 0.4); border-radius: 999px; cursor: pointer; }
.alerts__days-btn:hover { background: rgba(127, 127, 127, 0.12); }
.alerts__others { display: flex; flex-direction: column; gap: 12px; padding-top: 10px; border-top: 1px dashed rgba(127, 127, 127, 0.35); }
.alerts__other-day { padding-bottom: 4px; }
.alerts__other-day:not(:last-child) { border-bottom: 1px dashed rgba(127, 127, 127, 0.2); margin-bottom: 4px; }
.alerts__more { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px auto 0; padding: 8px 18px; font: inherit; color: inherit; background: rgba(127, 127, 127, 0.12); border: 1px solid rgba(127, 127, 127, 0.35); border-radius: 999px; cursor: pointer; transition: background 0.15s ease; }
.alerts__more:hover { background: rgba(127, 127, 127, 0.22); }
.alerts__more-icon { transition: transform 0.2s ease; }
.alerts__more-icon.is-open { transform: rotate(180deg); }
.alerts__days-btn:focus-visible, .alerts__more:focus-visible, .alerts__name:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
</style>
