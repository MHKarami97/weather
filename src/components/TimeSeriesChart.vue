<script setup>
/**
 * نمودار سری زمانی سبک (SVG خالص، بدون کتابخانه): خطی / ناحیه‌ای / ستونی، با tooltip و خط «اکنون».
 * rows: آرایه‌ای از اشیا با کلید t (میلی‌ثانیه) - series: [{ key, label, color, type, unit, decimals, dashed }]
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fa, fmtTime, fmtTooltip, fmtWeekdayShort } from '../utils/format.js'
import { TEHRAN_OFFSET_MS } from '../lib/weather.js'

const props = defineProps({
  rows: { type: Array, required: true },
  series: { type: Array, required: true },
  height: { type: Number, default: 230 },
  nowMs: { type: Number, default: null },
  fixedMin: { type: Number, default: null },
  fixedMax: { type: Number, default: null },
  zeroBased: { type: Boolean, default: false },
})

const uid = 'c' + Math.random().toString(36).slice(2, 8)
const wrap = ref(null)
const width = ref(640)
const hover = ref(null)
let ro = null

onMounted(() => {
  width.value = Math.max(260, wrap.value?.clientWidth || 640)
  if (typeof ResizeObserver !== 'undefined' && wrap.value) {
    ro = new ResizeObserver((entries) => {
      width.value = Math.max(260, Math.floor(entries[0].contentRect.width))
    })
    ro.observe(wrap.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())

const PAD = { l: 44, r: 12, t: 12, b: 28 }
const iw = computed(() => width.value - PAD.l - PAD.r)
const ih = computed(() => props.height - PAD.t - PAD.b)
const hasBars = computed(() => props.series.some((s) => s.type === 'bar'))
const hasData = computed(() => props.rows.length >= 2)

const step = computed(() => {
  const n = props.rows.length
  return n < 2 ? 3 * 3600000 : (props.rows[n - 1].t - props.rows[0].t) / (n - 1)
})
const tMin = computed(() => (props.rows[0]?.t ?? 0) - (hasBars.value ? step.value / 2 : 0))
const tMax = computed(() => (props.rows[props.rows.length - 1]?.t ?? 1) + (hasBars.value ? step.value / 2 : 0))
const x = (t) => PAD.l + ((t - tMin.value) / (tMax.value - tMin.value || 1)) * iw.value

function niceTicks(lo, hi, n = 4) {
  if (hi - lo < 1e-9) hi = lo + 1
  const raw = (hi - lo) / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const s = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const out = []
  for (let v = Math.floor(lo / s) * s; v <= Math.ceil(hi / s) * s + 1e-9; v += s) out.push(Number(v.toFixed(6)))
  return out
}

const yTicks = computed(() => {
  let lo = Infinity
  let hi = -Infinity
  for (const s of props.series) {
    for (const r of props.rows) {
      const v = r[s.key]
      if (v == null) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  if (!Number.isFinite(lo)) { lo = 0; hi = 1 }
  if (props.zeroBased || hasBars.value) lo = Math.min(lo, 0)
  if (props.fixedMin != null) lo = props.fixedMin
  if (props.fixedMax != null) hi = props.fixedMax
  if (hasBars.value && hi < 1) hi = 1
  return niceTicks(lo, hi)
})
const d0 = computed(() => yTicks.value[0])
const d1 = computed(() => yTicks.value[yTicks.value.length - 1])
const y = (v) => PAD.t + (1 - (v - d0.value) / (d1.value - d0.value || 1)) * ih.value
const baseY = computed(() => y(Math.max(d0.value, Math.min(0, d1.value))))

const xTicks = computed(() => {
  const H = 3600000
  const span = (tMax.value - tMin.value) / H
  const maxN = Math.max(3, Math.floor(iw.value / 64))
  const interval = [3, 6, 12, 24, 48].find((h) => span / h <= maxN) || 48
  const out = []
  let t = Math.ceil((tMin.value + TEHRAN_OFFSET_MS) / (interval * H)) * interval * H - TEHRAN_OFFSET_MS
  for (; t <= tMax.value; t += interval * H) {
    const major = (t + TEHRAN_OFFSET_MS) % 86400000 === 0
    out.push({ t, major, label: major ? fmtWeekdayShort(t) : fmtTime(t) })
  }
  return out
})

function linePath(s) {
  let d = ''
  let pen = false
  for (const r of props.rows) {
    const v = r[s.key]
    if (v == null) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  }
  return d
}
function areaPath(s) {
  const pts = props.rows.filter((r) => r[s.key] != null)
  if (pts.length < 2) return ''
  const line = pts.map((r, i) => `${i ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(r[s.key]).toFixed(1)}`).join('')
  return `${line}L${x(pts[pts.length - 1].t).toFixed(1)},${baseY.value.toFixed(1)}L${x(pts[0].t).toFixed(1)},${baseY.value.toFixed(1)}Z`
}
const barW = computed(() => Math.max(2, (iw.value * step.value) / (tMax.value - tMin.value || 1) - 2))

const nowX = computed(() => (props.nowMs && props.nowMs >= tMin.value && props.nowMs <= tMax.value ? x(props.nowMs) : null))

function onMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const px = e.clientX - rect.left
  let best = 0
  let bd = Infinity
  props.rows.forEach((r, i) => {
    const d = Math.abs(x(r.t) - px)
    if (d < bd) { bd = d; best = i }
  })
  hover.value = best
}

const hoverRow = computed(() => (hover.value == null ? null : props.rows[hover.value]))
const tipLeft = computed(() => {
  if (!hoverRow.value) return 0
  const tx = x(hoverRow.value.t)
  return Math.min(Math.max(tx - 80, 4), width.value - 170)
})
const fmt = (s, v) => (v == null ? '—' : `${fa(v, s.decimals ?? 0)} ${s.unit || ''}`)
</script>

<template>
  <div ref="wrap" class="tsc" dir="ltr">
    <p v-if="!hasData" class="tsc__empty" dir="rtl">داده‌ی کافی برای نمودار وجود ندارد.</p>

    <template v-else>
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        class="tsc__svg"
        @pointermove="onMove"
        @pointerdown="onMove"
        @pointerleave="hover = null"
      >
        <defs>
          <linearGradient v-for="(s, i) in series" :id="`${uid}-${i}`" :key="s.key" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" :stop-color="s.color" stop-opacity="0.35" />
            <stop offset="1" :stop-color="s.color" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <g>
          <template v-for="v in yTicks" :key="`y${v}`">
            <line :x1="PAD.l" :x2="width - PAD.r" :y1="y(v)" :y2="y(v)" class="tsc__grid" />
            <text :x="PAD.l - 6" :y="y(v) + 3.5" text-anchor="end" class="tsc__label">{{ fa(v, v % 1 ? 1 : 0) }}</text>
          </template>
        </g>

        <g>
          <template v-for="tk in xTicks" :key="`x${tk.t}`">
            <line :x1="x(tk.t)" :x2="x(tk.t)" :y1="PAD.t" :y2="height - PAD.b" :class="tk.major ? 'tsc__vgrid tsc__vgrid--major' : 'tsc__vgrid'" />
            <text :x="x(tk.t)" :y="height - 8" text-anchor="middle" :class="tk.major ? 'tsc__label tsc__label--major' : 'tsc__label'">{{ tk.label }}</text>
          </template>
        </g>

        <g v-for="(s, i) in series" :key="s.key">
          <template v-if="s.type === 'bar'">
            <rect
              v-for="r in rows.filter((r) => r[s.key] > 0)"
              :key="r.t"
              :x="x(r.t) - barW / 2"
              :y="y(r[s.key])"
              :width="barW"
              :height="Math.max(1, baseY - y(r[s.key]))"
              :fill="s.color"
              rx="2"
              opacity="0.9"
            />
          </template>
          <template v-else>
            <path v-if="s.type === 'area'" :d="areaPath(s)" :fill="`url(#${uid}-${i})`" />
            <path
              :d="linePath(s)"
              fill="none"
              :stroke="s.color"
              stroke-width="2.2"
              stroke-linejoin="round"
              stroke-linecap="round"
              :stroke-dasharray="s.dashed ? '5 4' : null"
            />
          </template>
        </g>

        <g v-if="nowX !== null">
          <line :x1="nowX" :x2="nowX" :y1="PAD.t" :y2="height - PAD.b" class="tsc__now" />
          <text :x="nowX" :y="PAD.t + 9" text-anchor="middle" class="tsc__now-label">اکنون</text>
        </g>

        <g v-if="hoverRow">
          <line :x1="x(hoverRow.t)" :x2="x(hoverRow.t)" :y1="PAD.t" :y2="height - PAD.b" class="tsc__cursor" />
          <template v-for="s in series" :key="`h${s.key}`">
            <circle v-if="hoverRow[s.key] != null && s.type !== 'bar'" :cx="x(hoverRow.t)" :cy="y(hoverRow[s.key])" r="4" :fill="s.color" class="tsc__dot" />
          </template>
        </g>
      </svg>

      <div v-if="hoverRow" class="tsc__tip" :style="{ left: tipLeft + 'px' }" dir="rtl">
        <strong>{{ fmtTooltip(hoverRow.t) }}</strong>
        <div v-for="s in series" :key="`t${s.key}`" class="tsc__tip-row">
          <i :style="{ background: s.color }" />
          <span>{{ s.label }}</span>
          <bdi>{{ fmt(s, hoverRow[s.key]) }}</bdi>
        </div>
      </div>

      <div class="tsc__legend" dir="rtl">
        <span v-for="s in series" :key="`l${s.key}`"><i :style="{ background: s.color }" />{{ s.label }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tsc { position: relative; width: 100%; }
.tsc__svg { display: block; touch-action: pan-y; overflow: visible; }
.tsc__empty { margin: 0; padding: 40px 0; text-align: center; color: var(--text-muted); }
.tsc__grid { stroke: var(--border); stroke-width: 1; }
.tsc__vgrid { stroke: var(--border); stroke-width: 1; opacity: 0.45; }
.tsc__vgrid--major { opacity: 1; stroke-dasharray: 2 3; }
.tsc__label { fill: var(--text-muted); font-size: 10.5px; font-family: inherit; }
.tsc__label--major { font-weight: 700; fill: var(--text); }
.tsc__now { stroke: var(--accent); stroke-width: 1.4; stroke-dasharray: 4 3; }
.tsc__now-label { fill: var(--accent); font-size: 10px; font-weight: 700; font-family: inherit; }
.tsc__cursor { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; }
.tsc__dot { stroke: var(--card); stroke-width: 2; }
.tsc__tip {
  position: absolute; top: 4px; z-index: 5; min-width: 150px; padding: 8px 10px; pointer-events: none;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow);
  font-size: 0.74rem; line-height: 1.7;
}
.tsc__tip strong { display: block; margin-bottom: 2px; font-size: 0.74rem; }
.tsc__tip-row { display: flex; align-items: center; gap: 6px; }
.tsc__tip-row span { flex: 1; color: var(--text-muted); }
.tsc__tip-row i, .tsc__legend i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.tsc__legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; font-size: 0.74rem; color: var(--text-muted); }
.tsc__legend span { display: inline-flex; align-items: center; gap: 5px; }
</style>
