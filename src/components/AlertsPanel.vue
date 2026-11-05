<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertsStore } from '../stores/alerts.js'
import { useWeatherStore } from '../stores/weather.js'

const COLLAPSED_COUNT = 6
const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })
const numberFormatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

const alertsStore = useAlertsStore()
const weatherStore = useWeatherStore()
const router = useRouter()
const expanded = ref(false)

const items = computed(() => alertsStore.report(weatherStore.favorites))
const visibleItems = computed(() => (expanded.value ? items.value : items.value.slice(0, COLLAPSED_COUNT)))
const hiddenCount = computed(() => Math.max(0, items.value.length - COLLAPSED_COUNT))

const formatDay = (dateKey) => dayFormatter.format(new Date(`${dateKey}T12:00:00`))
const formatMm = (value) => `${numberFormatter.format(value)} mm`
const kindIcon = (kind) => (kind === 'snow' ? '❄️' : '🌧️')
const kindLabel = (kind) => (kind === 'snow' ? 'برف' : 'باران')
const openProvince = (id) => router.push({ name: 'province', params: { id } })

onMounted(() => alertsStore.load())
</script>

<template>
  <section class="alerts" aria-labelledby="alerts-title">
    <h2 id="alerts-title" class="section-title">هشدار باران و برف</h2>

    <div v-if="alertsStore.status === 'error' && !alertsStore.payload" class="card empty-note">
      <p>دریافت هشدارها ممکن نشد.</p>
      <button type="button" @click="alertsStore.load(true)">تلاش دوباره</button>
    </div>

    <div v-else-if="!alertsStore.payload" class="alerts__grid" aria-busy="true">
      <div v-for="n in 3" :key="n" class="card alerts__skeleton"></div>
    </div>

    <p v-else-if="items.length === 0" class="card empty-note">در حال حاضر هشداری ثبت نشده است.</p>

    <template v-else>
      <div class="alerts__grid">
        <article
          v-for="item in visibleItems"
          :key="item.provinceId"
          class="card alerts__card"
          role="link"
          tabindex="0"
          @click="openProvince(item.provinceId)"
          @keydown.enter="openProvince(item.provinceId)"
        >
          <header class="alerts__head">
            <strong>{{ item.name }}</strong>
            <span v-if="item.isFavorite" class="alerts__fav" title="مورد علاقه">★</span>
          </header>

          <section v-for="day in item.days" :key="day.date" class="alerts__day">
            <div class="alerts__day-title">
              <span aria-hidden="true">{{ kindIcon(day.kind) }}</span>
              <span>{{ kindLabel(day.kind) }} — {{ formatDay(day.date) }}</span>
            </div>
            <ul class="alerts__sources">
              <li v-for="source in day.sources" :key="source.id" class="alerts__chip">
                <span>{{ source.name }}</span>
                <bdi>{{ source.label }} · {{ formatMm(source.precip) }}</bdi>
              </li>
            </ul>
          </section>
        </article>
      </div>

      <button v-if="hiddenCount > 0" type="button" class="alerts__more" @click="expanded = !expanded">
        {{ expanded ? 'نمایش کمتر' : `نمایش ${numberFormatter.format(hiddenCount)} استان دیگر` }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.alerts { margin-top: 24px; }
.alerts__grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); }
.alerts__card { cursor: pointer; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.alerts__card:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.alerts__skeleton { height: 120px; opacity: 0.4; }
.alerts__head { display: flex; justify-content: space-between; align-items: center; }
.alerts__fav { color: #f59e0b; }
.alerts__day-title { display: flex; gap: 6px; font-size: 0.9rem; font-weight: 600; }
.alerts__sources { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.alerts__chip { display: flex; gap: 6px; font-size: 0.78rem; padding: 3px 8px; border-radius: 999px; background: rgba(127, 127, 127, 0.15); }
.alerts__chip > span:first-child { color: var(--text-muted, #737373); }
.alerts__more { display: block; margin: 12px auto 0; cursor: pointer; }
</style>
