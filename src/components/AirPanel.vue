<script setup>
import { computed } from 'vue'
import { aqiLevel } from '../lib/reports.js'
import { pickCurrent } from '../lib/weather.js'
import { fa } from '../utils/format.js'

const props = defineProps({ air: { type: Array, required: true }, nowMs: { type: Number, required: true } })

const cur = computed(() => pickCurrent(props.air, props.nowMs))
const level = computed(() => aqiLevel(cur.value?.aqi))
const pos = computed(() => Math.min(100, Math.max(0, ((cur.value?.aqi ?? 0) / 300) * 100)))
const pollutants = computed(() => {
  const c = cur.value || {}
  return [
    { label: 'ذرات PM2.5', value: c.pm25, unit: 'µg/m³', d: 1 },
    { label: 'ذرات PM10', value: c.pm10, unit: 'µg/m³', d: 1 },
    { label: 'گردوخاک', value: c.dust, unit: 'µg/m³', d: 1 },
    { label: 'دی‌اکسید نیتروژن', value: c.no2, unit: 'µg/m³', d: 1 },
    { label: 'دی‌اکسید گوگرد', value: c.so2, unit: 'µg/m³', d: 1 },
    { label: 'ازن', value: c.o3, unit: 'µg/m³', d: 1 },
    { label: 'مونوکسید کربن', value: c.co, unit: 'µg/m³', d: 0 },
  ].filter((p) => p.value != null)
})
</script>

<template>
  <section v-if="cur && level" class="air card" :style="{ '--tone': level.color }">
    <div class="air__main">
      <div class="air__value"><bdi>{{ fa(cur.aqi) }}</bdi><small>AQI</small></div>
      <div class="air__text">
        <strong>{{ level.label }}</strong>
        <p>{{ level.advice }}</p>
      </div>
    </div>
    <div class="air__bar"><i :style="{ insetInlineStart: pos + '%' }" /></div>
    <div class="air__scale"><span>۰</span><span>۱۰۰</span><span>۲۰۰</span><span>۳۰۰+</span></div>
    <dl v-if="pollutants.length" class="air__grid">
      <div v-for="p in pollutants" :key="p.label">
        <dt>{{ p.label }}</dt>
        <dd><bdi>{{ fa(p.value, p.d) }}</bdi> <small>{{ p.unit }}</small></dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.air { padding: 16px; border-top: 3px solid var(--tone); }
.air__main { display: flex; align-items: center; gap: 16px; }
.air__value { display: flex; flex-direction: column; align-items: center; min-width: 74px; padding: 8px 12px; border-radius: 14px; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
.air__value bdi { font-size: 1.9rem; font-weight: 800; line-height: 1.1; }
.air__value small { font-size: 0.66rem; font-weight: 700; }
.air__text strong { font-size: 1rem; color: var(--tone); }
.air__text p { margin: 4px 0 0; font-size: 0.8rem; line-height: 1.9; color: var(--text-muted); }
.air__bar { position: relative; height: 6px; margin: 16px 0 6px; border-radius: 999px; background: linear-gradient(90deg, #22c55e 0%, #eab308 17%, #f97316 33%, #ef4444 50%, #a855f7 67%, #7f1d1d 100%); }
.air__bar i { position: absolute; top: 50%; width: 14px; height: 14px; margin-inline-start: -7px; border-radius: 50%; transform: translateY(-50%); background: var(--card); border: 3px solid var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35); }
.air__scale { display: flex; justify-content: space-between; font-size: 0.66rem; color: var(--text-muted); }
.air__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin: 14px 0 0; }
.air__grid div { padding: 8px 10px; border: 1px solid var(--border); border-radius: 12px; }
.air__grid dt { font-size: 0.7rem; color: var(--text-muted); }
.air__grid dd { margin: 2px 0 0; font-weight: 800; font-size: 0.95rem; }
.air__grid small { font-weight: 500; font-size: 0.62rem; color: var(--text-muted); }
</style>
