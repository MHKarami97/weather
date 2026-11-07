<script setup>
import { computed } from 'vue'
import { formatClock } from '../lib/alerts.js'

const props = defineProps({
  sources: { type: Array, required: true },
})

const numberFormatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
const formatMm = (value) => `${numberFormatter.format(value)} mm`

const earliestStart = computed(() => {
  const starts = props.sources.map((source) => source.startT).filter((value) => Number.isFinite(value))
  return starts.length > 0 ? Math.min(...starts) : null
})

const summary = computed(() => {
  if (earliestStart.value === null) return ''
  const clock = formatClock(earliestStart.value)
  return earliestStart.value <= Date.now() ? `از ساعت ${clock} شروع شده` : `شروع بارش حدود ساعت ${clock}`
})
</script>

<template>
  <div class="source-list">
    <p v-if="summary" class="source-list__summary">
      <span aria-hidden="true">⏰</span>
      <span>{{ summary }}</span>
    </p>
    <ul class="source-list__items">
      <li v-for="source in sources" :key="source.id" class="source-list__row">
        <span class="source-list__name">{{ source.name }}</span>
        <bdi class="source-list__value">{{ source.label }} · {{ formatMm(source.precip) }}</bdi>
        <span v-if="source.startT !== null" class="source-list__time">شروع: {{ formatClock(source.startT) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.source-list { margin-top: 6px; }
.source-list__summary { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 0.82rem; font-weight: 700; }
.source-list__items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.source-list__row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 2px 8px; padding: 5px 10px; font-size: 0.8rem; border-radius: 10px; background: rgba(127, 127, 127, 0.12); }
.source-list__name { color: var(--text-muted, #737373); flex: none; }
.source-list__value { font-weight: 600; text-align: end; }
.source-list__time { flex-basis: 100%; text-align: end; font-size: 0.72rem; color: var(--text-muted, #737373); }
</style>
