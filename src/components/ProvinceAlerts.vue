<script setup>
import { computed, onMounted } from 'vue'
import { useAlertsStore } from '../stores/alerts.js'
import AlertSourceList from './AlertSourceList.vue'

const props = defineProps({
  provinceId: { type: String, required: true },
})

const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' })
const alertsStore = useAlertsStore()

const entries = computed(() => {
  const item = alertsStore.report([]).find((candidate) => candidate.provinceId === props.provinceId)
  if (!item) return []
  return [item.today, ...item.otherDays]
    .filter(Boolean)
    .map((day) => ({ ...day, isToday: day === item.today }))
})

const formatDay = (dateKey) => dayFormatter.format(new Date(`${dateKey}T12:00:00`))
const kindIcon = (kind) => (kind === 'snow' ? '❄️' : '🌧️')
const kindLabel = (kind) => (kind === 'snow' ? 'برف' : 'باران')

onMounted(() => alertsStore.load())
</script>

<template>
  <section v-if="entries.length" class="province-alerts">
    <h2 class="section-title">هشدار باران و برف</h2>
    <div class="province-alerts__grid">
      <article
        v-for="day in entries"
        :key="day.date"
        class="card province-alerts__card"
        :class="`is-${day.kind}`"
      >
        <header class="province-alerts__head">
          <span aria-hidden="true">{{ kindIcon(day.kind) }}</span>
          <strong>{{ kindLabel(day.kind) }}</strong>
          <small>{{ day.isToday ? 'امروز' : formatDay(day.date) }}</small>
        </header>
        <AlertSourceList :sources="day.sources" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.province-alerts { margin-top: 16px; }
.province-alerts__grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); align-items: start; }
.province-alerts__card { padding: 14px; border-inline-start: 4px solid transparent; min-width: 0; }
.province-alerts__card.is-rain { border-inline-start-color: #3b82f6; }
.province-alerts__card.is-snow { border-inline-start-color: #67e8f9; }
.province-alerts__head { display: flex; align-items: center; gap: 6px; }
.province-alerts__head small { margin-inline-start: auto; color: var(--text-muted, #737373); }
</style>
