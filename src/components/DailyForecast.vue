<script setup>
import { computed } from 'vue'
import { fa, faTemp, fmtDayMonth, fmtWeekday } from '../utils/format.js'

const props = defineProps({ days: { type: Array, required: true }, nowMs: { type: Number, default: Date.now() } })

const lo = computed(() => Math.min(...props.days.map((d) => d.min)))
const hi = computed(() => Math.max(...props.days.map((d) => d.max)))
const pct = (v) => (hi.value === lo.value ? 50 : ((v - lo.value) / (hi.value - lo.value)) * 100)
const isToday = (d) => new Date(d.t + 12600000).toISOString().slice(0, 10) === new Date(props.nowMs + 12600000).toISOString().slice(0, 10)
</script>

<template>
  <div class="daily">
    <article v-for="d in days" :key="d.key" class="daily__card card" :class="{ 'is-today': isToday(d) }">
      <header>
        <strong>{{ isToday(d) ? 'امروز' : fmtWeekday(d.t) }}</strong>
        <small>{{ fmtDayMonth(d.t) }}</small>
      </header>
      <div class="daily__icon" aria-hidden="true">{{ d.condition.icon }}</div>
      <div class="daily__cond">{{ d.condition.label }}</div>
      <div class="daily__range">
        <bdi>{{ faTemp(d.min) }}</bdi>
        <div class="daily__track"><i :style="{ insetInlineStart: pct(d.min) + '%', width: Math.max(6, pct(d.max) - pct(d.min)) + '%' }" /></div>
        <bdi>{{ faTemp(d.max) }}</bdi>
      </div>
      <dl>
        <div><dt>بارش</dt><dd><bdi>{{ fa(d.precip, 1) }}</bdi> mm</dd></div>
        <div><dt>باد تا</dt><dd><bdi>{{ fa(d.windMax) }}</bdi> km/h</dd></div>
        <div><dt>رطوبت</dt><dd><bdi>{{ fa(d.rhAvg) }}٪</bdi></dd></div>
      </dl>
      <small v-if="d.partial" class="daily__partial">داده‌ی ناقص</small>
    </article>
  </div>
</template>

<style scoped>
.daily { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.daily__card { padding: 12px 12px 10px; display: flex; flex-direction: column; gap: 6px; text-align: center; }
.daily__card.is-today { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.daily__card header { display: flex; flex-direction: column; }
.daily__card header small { color: var(--text-muted); font-size: 0.7rem; }
.daily__icon { font-size: 1.9rem; line-height: 1.2; }
.daily__cond { font-size: 0.78rem; font-weight: 600; }
.daily__range { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; }
.daily__track { position: relative; flex: 1; height: 5px; border-radius: 999px; background: var(--border); }
.daily__track i { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #f59e0b, #ef4444); }
.daily dl { margin: 0; padding-top: 6px; border-top: 1px solid var(--border); display: grid; gap: 2px; }
.daily dl div { display: flex; justify-content: space-between; font-size: 0.7rem; }
.daily dt { color: var(--text-muted); }
.daily dd { margin: 0; font-weight: 700; }
.daily__partial { color: var(--text-muted); font-size: 0.64rem; }
</style>
