<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeatherStore } from '../stores/weather.js'
import { useReminderStore } from '../stores/reminder.js'
import { PROVINCE_BY_ID } from '../lib/provinces.js'
import { CONDITION_COLORS, describeCondition, pickCurrent, stepHours, sunTimes, windDirLabel } from '../lib/weather.js'
import { buildReports } from '../lib/reports.js'
import { fa, faTemp, fmtDateTime, fmtTime, relativeFa } from '../utils/format.js'
import RangeTabs from '../components/RangeTabs.vue'
import TimeSeriesChart from '../components/TimeSeriesChart.vue'
import StatTiles from '../components/StatTiles.vue'
import DailyForecast from '../components/DailyForecast.vue'
import ReportList from '../components/ReportList.vue'
import AirPanel from '../components/AirPanel.vue'

const route = useRoute()
const router = useRouter()
const store = useWeatherStore()
const reminderStore = useReminderStore()

const id = computed(() => route.params.id)
const meta = computed(() => PROVINCE_BY_ID[id.value] || null)
const data = computed(() => store.details[id.value] || null)
const status = computed(() => store.detailStatus[id.value])
const isFavorite = computed(() => store.favorites.includes(id.value))
const isSubscribed = computed(() => reminderStore.isSubscribed(id.value))
const isStale = computed(() => store.provinces.find((p) => p.id === id.value)?.stale)

const now = ref(Date.now())
let tick = null
onMounted(() => {
  tick = setInterval(() => { now.value = Date.now() }, 60_000)
})
onBeforeUnmount(() => clearInterval(tick))

watch(id, (v) => { if (v && PROVINCE_BY_ID[v]) store.loadProvince(v) }, { immediate: true })
watch(() => store.fetchedAtMs, () => { if (meta.value) store.loadProvince(id.value, { force: true }) })

const RANGES = [
  { value: 24, label: '۲۴ ساعت' },
  { value: 48, label: '۴۸ ساعت' },
  { value: 168, label: '۷ روز' },
  { value: 0, label: 'همه' },
]
const range = ref(48)

const rows = computed(() => data.value?.hourly || [])
const air = computed(() => data.value?.air || [])
const daily = computed(() => (data.value?.daily || []).filter((d) => d.t + 86400000 > now.value))
const stepH = computed(() => stepHours(rows.value))

function windowed(list) {
  const from = now.value - (stepH.value * 3600000 + 1800000)
  const to = range.value ? now.value + range.value * 3600000 : Infinity
  return list.filter((r) => r.t >= from && r.t <= to)
}
const chartRows = computed(() => windowed(rows.value))
const airRows = computed(() => windowed(air.value))

const current = computed(() => pickCurrent(rows.value, now.value))
const cond = computed(() =>
  current.value && meta.value ? describeCondition(current.value, { lat: meta.value.lat, lon: meta.value.lon, stepH: stepH.value }) : null,
)
const accent = computed(() => {
  if (!cond.value) return CONDITION_COLORS.cloudy
  if (current.value.temp >= 38) return CONDITION_COLORS.hot
  return CONDITION_COLORS[cond.value.code] || CONDITION_COLORS.cloudy
})
const todayRange = computed(() => data.value?.daily?.find((d) => d.t <= now.value && now.value < d.t + 86400000) || data.value?.daily?.[0] || null)
const sun = computed(() => (meta.value ? sunTimes(meta.value.lat, meta.value.lon, now.value) : {}))
const next24Precip = computed(() =>
  rows.value.filter((r) => r.t > now.value - 3600000 && r.t <= now.value + 24 * 3600000).reduce((a, r) => a + (r.precip ?? 0), 0),
)

const reports = computed(() =>
  data.value && meta.value
    ? buildReports({ rows: rows.value, daily: data.value.daily, air: air.value, lat: meta.value.lat, lon: meta.value.lon }, now.value)
    : [],
)

const instability = (cape) => (cape == null ? '—' : cape < 300 ? 'پایدار' : cape < 1000 ? 'کمی ناپایدار' : cape < 2500 ? 'ناپایدار' : 'بسیار ناپایدار')

const tiles = computed(() => {
  const c = current.value
  if (!c) return []
  return [
    { label: 'دمای محسوس', value: faTemp(c.feels), sub: `نقطه‌ی شبنم ${faTemp(c.dew)}` },
    { label: 'رطوبت نسبی', value: `${fa(c.rh)}٪`, sub: c.rh >= 80 ? 'هوای شرجی' : c.rh <= 25 ? 'هوای خشک' : 'مطبوع' },
    { label: 'باد', value: `${fa(c.wind)} km/h`, sub: `از ${windDirLabel(c.dir)} · تندباد ${fa(c.gust)}`, arrow: c.dir == null ? null : (c.dir + 180) % 360 },
    { label: 'فشار هوا', value: `${fa(c.pressure)} hPa` },
    { label: 'پوشش ابر', value: `${fa(c.cloud)}٪`, sub: `پایین ${fa(c.low)} · میانی ${fa(c.mid)} · بالا ${fa(c.high)}` },
    { label: 'بارش ۲۴ ساعت آینده', value: `${fa(next24Precip.value, 1)} mm` },
    { label: 'ناپایداری جوی', value: instability(c.cape), sub: `CAPE ${fa(c.cape)} J/kg` },
    { label: 'طلوع / غروب', value: sun.value.sunrise ? `${fmtTime(sun.value.sunrise)} / ${fmtTime(sun.value.sunset)}` : '—' },
  ]
})

const nextHours = computed(() =>
  rows.value
    .filter((r) => r.t >= now.value - stepH.value * 3600000)
    .slice(0, 10)
    .map((r) => ({
      ...r,
      cond: describeCondition(r, { lat: meta.value.lat, lon: meta.value.lon, stepH: stepH.value }),
    })),
)

const dailyRows = computed(() => daily.value.map((d) => ({ ...d })))

const S = {
  temp: [
    { key: 'temp', label: 'دما', color: '#ef4444', type: 'area', unit: '°C', decimals: 1 },
    { key: 'feels', label: 'دمای محسوس', color: '#f59e0b', type: 'line', unit: '°C', decimals: 1, dashed: true },
    { key: 'dew', label: 'نقطه‌ی شبنم', color: '#38bdf8', type: 'line', unit: '°C', decimals: 1, dashed: true },
  ],
  precip: [{ key: 'precip', label: 'بارش (هر گام)', color: '#3b82f6', type: 'bar', unit: 'mm', decimals: 1 }],
  wind: [
    { key: 'wind', label: 'سرعت باد', color: '#14b8a6', type: 'area', unit: 'km/h' },
    { key: 'gust', label: 'تندباد', color: '#a855f7', type: 'line', unit: 'km/h', dashed: true },
  ],
  humidity: [{ key: 'rh', label: 'رطوبت نسبی', color: '#0ea5e9', type: 'area', unit: '٪' }],
  cloud: [
    { key: 'cloud', label: 'کل', color: '#94a3b8', type: 'area', unit: '٪' },
    { key: 'low', label: 'پایین', color: '#64748b', type: 'line', unit: '٪' },
    { key: 'mid', label: 'میانی', color: '#6366f1', type: 'line', unit: '٪' },
    { key: 'high', label: 'بالا', color: '#22d3ee', type: 'line', unit: '٪' },
  ],
  pressure: [{ key: 'pressure', label: 'فشار هوا', color: '#8b5cf6', type: 'line', unit: 'hPa' }],
  cape: [{ key: 'cape', label: 'CAPE', color: '#f97316', type: 'area', unit: 'J/kg' }],
  aqi: [{ key: 'aqi', label: 'AQI', color: '#ef4444', type: 'area', unit: '' }],
  pm: [
    { key: 'pm25', label: 'PM2.5', color: '#f97316', type: 'line', unit: 'µg/m³', decimals: 1 },
    { key: 'pm10', label: 'PM10', color: '#a16207', type: 'line', unit: 'µg/m³', decimals: 1 },
    { key: 'dust', label: 'گردوخاک', color: '#eab308', type: 'area', unit: 'µg/m³', decimals: 1 },
  ],
  gases: [
    { key: 'no2', label: 'NO₂', color: '#ef4444', type: 'line', unit: 'µg/m³', decimals: 1 },
    { key: 'so2', label: 'SO₂', color: '#8b5cf6', type: 'line', unit: 'µg/m³', decimals: 1 },
    { key: 'o3', label: 'O₃', color: '#22c55e', type: 'line', unit: 'µg/m³', decimals: 1 },
  ],
  dailyTemp: [
    { key: 'max', label: 'بیشینه', color: '#ef4444', type: 'line', unit: '°C' },
    { key: 'min', label: 'کمینه', color: '#38bdf8', type: 'line', unit: '°C' },
  ],
  dailyPrecip: [{ key: 'precip', label: 'مجموع بارش', color: '#3b82f6', type: 'bar', unit: 'mm', decimals: 1 }],
}
const hasAir = computed(() => airRows.value.length > 1 && airRows.value.some((r) => r.aqi != null))
const hasGases = computed(() => airRows.value.some((r) => r.no2 != null || r.so2 != null || r.o3 != null))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'home' })
}
async function share() {
  const url = window.location.href
  const text = `آب‌وهوای ${meta.value.name}: ${faTemp(current.value?.temp)} ${cond.value?.label || ''}`
  try {
    if (navigator.share) await navigator.share({ title: 'هواشناسی', text, url })
    else await navigator.clipboard.writeText(url)
  } catch { /* لغو توسط کاربر */ }
}
</script>

<template>
  <div class="container detail">
    <button type="button" class="icon-btn detail__back" @click="goBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
      بازگشت
    </button>

    <p v-if="!meta" class="card detail__empty">استان موردنظر پیدا نشد.</p>

    <template v-else>
      <section class="detail__hero card" :style="{ '--accent': accent }">
        <header class="detail__title-row">
          <span class="asset-card__icon detail__icon" aria-hidden="true">{{ cond ? cond.icon : '⏳' }}</span>
          <div class="detail__heading">
            <h1>استان {{ meta.name }}</h1>
            <span class="detail__chip">مرکز: {{ meta.capital }}</span>
          </div>
          <div class="detail__actions">
            <button type="button" class="icon-btn" title="اشتراک‌گذاری" aria-label="اشتراک‌گذاری" :disabled="!current" @click="share">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
                <path d="M8.2 10.9l7.6-4.4M8.2 13.1l7.6 4.4" />
              </svg>
            </button>
            <button
              type="button"
              class="icon-btn detail__bell"
              :class="{ 'is-active': isSubscribed }"
              :aria-pressed="isSubscribed"
              :title="isSubscribed ? 'لغو هشدار باران و برف' : 'اعلام یادآوری باران و برف در تلگرام'"
              @click="reminderStore.toggleSubscription(id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" :fill="isSubscribed ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button
              type="button"
              class="icon-btn detail__fav"
              :class="{ 'is-active': isFavorite }"
              :aria-pressed="isFavorite"
              :title="isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'"
              @click="store.toggleFavorite(id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="m12 20-1.45-1.32C5.4 14 2 10.9 2 7.25A5.25 5.25 0 0 1 7.25 2 5.8 5.8 0 0 1 12 4.65 5.8 5.8 0 0 1 16.75 2 5.25 5.25 0 0 1 22 7.25c0 3.65-3.4 6.75-8.55 11.43L12 20Z" />
              </svg>
            </button>
          </div>
        </header>

        <template v-if="current">
          <div class="detail__price-row">
            <bdi class="detail__price">{{ faTemp(current.temp) }}</bdi>
            <span class="detail__unit">{{ cond.label }}</span>
            <span class="asset-card__badge is-neutral">دمای محسوس <bdi>{{ faTemp(current.feels) }}</bdi></span>
          </div>
          <dl v-if="todayRange" class="asset-card__range detail__range">
            <div><dt>کمینه‌ی امروز</dt><dd><bdi>{{ faTemp(todayRange.min) }}</bdi></dd></div>
            <div><dt>میانگین امروز</dt><dd><bdi>{{ faTemp(todayRange.avg) }}</bdi></dd></div>
            <div><dt>بیشینه‌ی امروز</dt><dd><bdi>{{ faTemp(todayRange.max) }}</bdi></dd></div>
          </dl>
          <p class="detail__updated">
            آخرین دریافت داده‌ی این استان: {{ fmtDateTime(data.fetchedAtMs) }} ({{ relativeFa(data.fetchedAtMs, now) }})
            <span v-if="isStale" class="asset-card__stale"> - دریافت اخیر ناموفق بود؛ آخرین داده‌ی معتبر نمایش داده می‌شود</span>
          </p>
        </template>
        <p v-else-if="status === 'error'" class="detail__empty detail__empty--page">
          دریافت اطلاعات این استان ممکن نشد.
          <button type="button" class="detail__retry" @click="store.loadProvince(id, { force: true })">تلاش دوباره</button>
        </p>
        <p v-else class="detail__empty detail__empty--page">در حال بارگذاری…</p>
      </section>

      <template v-if="current">
        <h2 class="section-title">وضعیت لحظه‌ای</h2>
        <StatTiles :items="tiles" />

        <h2 class="section-title">ساعت‌های آینده</h2>
        <div class="scroll-row detail__hours">
          <div v-for="h in nextHours" :key="h.t" class="card detail__hour">
            <small>{{ fmtTime(h.t) }}</small>
            <span aria-hidden="true">{{ h.cond.icon }}</span>
            <strong><bdi>{{ faTemp(h.temp) }}</bdi></strong>
            <small>{{ h.cond.label }}</small>
            <small v-if="h.precip > 0"><bdi>{{ fa(h.precip, 1) }}</bdi> mm</small>
          </div>
        </div>

        <h2 class="section-title">گزارش‌های کاربردی</h2>
        <ReportList :reports="reports" />

        <div class="detail__section-head">
          <h2 class="section-title">نمودارهای تحلیلی</h2>
          <RangeTabs v-model="range" :options="RANGES" />
        </div>

        <div class="detail__charts">
          <section class="card detail__chart"><h3>دما، دمای محسوس و نقطه‌ی شبنم (°C)</h3><TimeSeriesChart :rows="chartRows" :series="S.temp" :now-ms="now" /></section>
          <section class="card detail__chart"><h3>بارش (میلی‌متر)</h3><TimeSeriesChart :rows="chartRows" :series="S.precip" :now-ms="now" /></section>
          <section class="card detail__chart"><h3>سرعت باد و تندباد (km/h)</h3><TimeSeriesChart :rows="chartRows" :series="S.wind" :now-ms="now" :zero-based="true" /></section>
          <section class="card detail__chart"><h3>رطوبت نسبی (٪)</h3><TimeSeriesChart :rows="chartRows" :series="S.humidity" :now-ms="now" :fixed-min="0" :fixed-max="100" /></section>
          <section class="card detail__chart"><h3>پوشش ابر (٪)</h3><TimeSeriesChart :rows="chartRows" :series="S.cloud" :now-ms="now" :fixed-min="0" :fixed-max="100" /></section>
          <section class="card detail__chart"><h3>فشار هوا (hPa)</h3><TimeSeriesChart :rows="chartRows" :series="S.pressure" :now-ms="now" /></section>
          <section class="card detail__chart"><h3>ناپایداری جوی - CAPE (J/kg)</h3><TimeSeriesChart :rows="chartRows" :series="S.cape" :now-ms="now" :zero-based="true" /></section>
        </div>

        <template v-if="hasAir">
          <h2 class="section-title">کیفیت هوا</h2>
          <AirPanel :air="air" :now-ms="now" />
          <div class="detail__charts">
            <section class="card detail__chart"><h3>شاخص کیفیت هوا (AQI)</h3><TimeSeriesChart :rows="airRows" :series="S.aqi" :now-ms="now" :zero-based="true" /></section>
            <section class="card detail__chart"><h3>ذرات معلق و گردوخاک (µg/m³)</h3><TimeSeriesChart :rows="airRows" :series="S.pm" :now-ms="now" :zero-based="true" /></section>
            <section v-if="hasGases" class="card detail__chart"><h3>گازهای آلاینده (µg/m³)</h3><TimeSeriesChart :rows="airRows" :series="S.gases" :now-ms="now" :zero-based="true" /></section>
          </div>
        </template>

        <h2 class="section-title">پیش‌بینی روزانه</h2>
        <DailyForecast :days="daily" :now-ms="now" />
        <div class="detail__charts" style="margin-top: 12px;">
          <section class="card detail__chart"><h3>روند کمینه و بیشینه‌ی دما (°C)</h3><TimeSeriesChart :rows="dailyRows" :series="S.dailyTemp" :now-ms="now" /></section>
          <section class="card detail__chart"><h3>مجموع بارش روزانه (mm)</h3><TimeSeriesChart :rows="dailyRows" :series="S.dailyPrecip" :now-ms="now" /></section>
        </div>

        <p class="detail__note">
          منبع: Windy.com - مدل GFS (پیش‌بینی) و CAMS (کیفیت هوا) برای مختصات مرکز استان
          ({{ fa(meta.lat, 2) }}، {{ fa(meta.lon, 2) }}). بارش هر نقطه، مجموع {{ fa(stepH) }} ساعت منتهی به همان زمان است.
          زمان‌ها به وقت ایران هستند.
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.detail { padding-top: 20px; padding-bottom: 48px; }
.detail__back { width: auto; gap: 6px; padding: 0 14px; font-size: 0.85rem; }
.detail__hero {
  position: relative; display: flex; flex-direction: column; gap: 14px; margin-top: 16px; padding: 18px 18px 16px; overflow: hidden;
  background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%), var(--card);
}
.detail__hero::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--accent); }
.detail__title-row { display: flex; align-items: center; gap: 12px; }
.detail__icon { width: 44px; height: 44px; border-radius: 14px; font-size: 1.4rem; }
.detail__heading { flex: 1; min-width: 0; }
.detail__heading h1 { margin: 0; font-size: 1.25rem; line-height: 1.4; overflow-wrap: anywhere; }
.detail__chip { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
.detail__actions { display: flex; gap: 8px; }
.detail__fav.is-active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.detail__bell.is-active { color: #38bdf8; border-color: color-mix(in srgb, #38bdf8 45%, transparent); }
.detail__price-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.detail__price { font-size: clamp(2.2rem, 8vw, 3.2rem); font-weight: 800; letter-spacing: -0.02em; }
.detail__unit { font-size: 1.05rem; font-weight: 600; }
.detail__range { max-width: 460px; }
.detail__updated { margin: 0; font-size: 0.74rem; color: var(--text-muted); line-height: 1.9; }
.detail__empty { margin: 0; padding: 40px 0; text-align: center; line-height: 1.9; color: var(--text-muted); }
.detail__empty--page { margin-top: 4px; padding: 0; text-align: start; }
.detail__retry { margin-inline-start: 8px; padding: 4px 14px; border-radius: 8px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text); }
.detail__hours { padding-bottom: 8px; }
.detail__hour { flex: 0 0 auto; min-width: 86px; padding: 10px 10px; display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; }
.detail__hour > span { font-size: 1.5rem; line-height: 1.3; }
.detail__hour small { font-size: 0.66rem; color: var(--text-muted); }
.detail__section-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 22px; }
.detail__section-head .section-title { margin: 0; }
.detail__charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 12px; margin-top: 12px; }
.detail__chart { padding: 12px 14px 10px; min-width: 0; }
.detail__chart h3 { margin: 0 0 8px; font-size: 0.86rem; font-weight: 700; }
.detail__note { margin: 20px 0 0; font-size: 0.76rem; line-height: 1.9; color: var(--text-muted); }
@media (max-width: 480px) {
  .detail { padding-top: 14px; }
  .detail__hero { padding: 14px 14px 12px; }
  .detail__chart { padding: 10px 8px 8px; }
}
</style>
