<script setup>
import { computed, onMounted } from 'vue'
import { useAlertsStore } from '../stores/alerts.js'
import AlertSourceList from './AlertSourceList.vue'

const props = defineProps({
  provinceId: { type: String, required: true },
})

const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })
const numberFormatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
const alertsStore = useAlertsStore()

const entries = computed(() => {
  const item = alertsStore.report([]).find((candidate) => candidate.provinceId === props.provinceId)
  if (!item) return []
  return [item.today, ...item.otherDays]
    .filter(Boolean)
    .map((day) => ({ ...day, isToday: day === item.today }))
})

const formatDay = (dateKey) => dayFormatter.format(new Date(`${dateKey}T12:00:00`))
const formatCount = (value) => numberFormatter.format(value)
const formatMm = (value) => `${numberFormatter.format(value)} mm`
const kindIcon = (kind) => (kind === 'snow' ? '❄️' : '🌧️')

onMounted(() => alertsStore.load())
</script>

<template>
  <section v-if="entries.length" class="province-alerts">
    <div class="province-alerts__header">
      <h2 class="section-title">هشدار باران و برف</h2>
      <span class="province-alerts__note">بارش‌های مؤثر بالای ۱٫۵ میلی‌متر</span>
    </div>
    <div class="province-alerts__grid">
      <article
        v-for="day in entries"
        :key="day.date"
        class="card province-alerts__card"
        :class="[`is-${day.kind}`, `is-${day.intensity}`]"
      >
        <header class="province-alerts__head">
          <span aria-hidden="true">{{ kindIcon(day.kind) }}</span>
          <strong>{{ day.intensityLabel }}</strong>
          <span class="province-alerts__badge">تا {{ formatMm(day.maxPrecip) }}</span>
          <span v-if="day.sourceCount > 1" class="province-alerts__sources">({{ formatCount(day.sourceCount) }} منبع)</span>
          <small>{{ day.isToday ? 'امروز' : formatDay(day.date) }}</small>
        </header>
        <AlertSourceList :sources="day.sources" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.province-alerts { margin-top: 16px; }
.province-alerts__header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.province-alerts__header .section-title { margin-bottom: 0; }
.province-alerts__note { font-size: 0.78rem; color: var(--text-muted, #737373); }
.province-alerts__grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); align-items: start; }
.province-alerts__card { padding: 14px; border-inline-start: 4px solid transparent; min-width: 0; }
.province-alerts__card.is-rain { border-inline-start-color: #3b82f6; }
.province-alerts__card.is-snow { border-inline-start-color: #67e8f9; }
.province-alerts__card.is-heavy { border-inline-start-color: #ef4444; }
.province-alerts__head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.province-alerts__badge { font-size: 0.72rem; padding: 2px 7px; border-radius: 6px; background: rgba(59, 130, 246, 0.18); color: #60a5fa; font-weight: 600; }
[data-theme='light'] .province-alerts__badge { color: #1d4ed8; }
.province-alerts__sources { font-size: 0.72rem; color: var(--text-muted, #737373); }
.province-alerts__head small { margin-inline-start: auto; color: var(--text-muted, #737373); font-size: 0.78rem; }
</style>
