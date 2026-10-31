import { apparentTemp, round } from '../../src/lib/weather.js'

export const HOUR_MS = 3_600_000
export const KEEP_PAST_MS = 3 * HOUR_MS
export const HORIZON_MS = 10 * 24 * HOUR_MS

/** Same numeric codes that `describeCondition` in src/lib/weather.js understands. */
export const PTYPE = Object.freeze({ NONE: 0, RAIN: 1, FREEZING_RAIN: 3, SNOW: 5, SLEET: 7 })

const NEAREST_FIELDS = new Set(['dir'])
const SNOW_WATER_RATIO = 10 / 7 // Open-Meteo docs: 7 cm of snow ~ 10 mm of water

export const msToKmh = (value) => (value == null ? null : value * 3.6)
export const snowCmToWaterMm = (cm) => (cm == null ? null : cm * SNOW_WATER_RATIO)
export const fractionToPercent = (value) => (value == null ? null : value * 100)

export function dewPoint(tempC, rh) {
  if (tempC == null || rh == null || rh <= 0) return null
  const a = 17.625
  const b = 243.04
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC)
  return (b * gamma) / (a - gamma)
}

function blend(from, to, ratio, offsetMs) {
  const row = { t: from.t + offsetMs }
  for (const key of Object.keys(from)) {
    if (key === 't') continue
    const a = from[key]
    const b = to[key]
    const canInterpolate = typeof a === 'number' && typeof b === 'number' && !NEAREST_FIELDS.has(key)
    row[key] = canInterpolate ? a + (b - a) * ratio : ratio < 0.5 ? a : (b ?? a)
  }
  return row
}

/** Expands irregular steps (e.g. 3 h or 6 h) to a regular 1 h grid using linear interpolation. */
export function interpolateHourly(points) {
  const sorted = [...points].sort((x, y) => x.t - y.t)
  const rows = []
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i]
    const to = sorted[i + 1]
    if (!to) {
      rows.push({ ...from })
      break
    }
    const steps = Math.max(1, Math.round((to.t - from.t) / HOUR_MS))
    for (let k = 0; k < steps; k++) rows.push(blend(from, to, k / steps, k * HOUR_MS))
  }
  return rows
}

/**
 * Accumulates period amounts into 1 h bins keyed by the bin END time,
 * which is the convention used by the Windy rows (`past3hprecip`).
 */
export class HourlyLedger {
  #bins = new Map()

  add(startMs, hours, amount) {
    if (amount == null || !(hours > 0)) return
    const share = amount / hours
    for (let k = 1; k <= hours; k++) {
      const end = startMs + k * HOUR_MS
      this.#bins.set(end, (this.#bins.get(end) ?? 0) + share)
    }
  }

  mark(startMs, hours, value) {
    for (let k = 1; k <= hours; k++) this.#bins.set(startMs + k * HOUR_MS, value)
  }

  at(endMs) {
    return this.#bins.get(endMs) ?? null
  }
}

/** Builds the row shape consumed by the UI (identical keys to `normalizeForecast`). */
export function toForecastRow(raw) {
  const windMs = raw.wind == null ? null : raw.wind / 3.6
  const layers = [raw.low, raw.mid, raw.high]
  const cloud =
    raw.cloud ??
    (layers.some((v) => v != null)
      ? 100 * (1 - layers.reduce((acc, v) => acc * (1 - (v ?? 0) / 100), 1))
      : null)
  return {
    t: raw.t,
    temp: round(raw.temp),
    feels: round(raw.feels ?? apparentTemp(raw.temp, raw.rh, windMs)),
    dew: round(raw.dew ?? dewPoint(raw.temp, raw.rh)),
    rh: round(raw.rh, 0),
    wind: round(raw.wind, 0),
    dir: round(raw.dir, 0),
    gust: round(raw.gust, 0),
    precip: round(raw.precip, 2),
    snow: round(raw.snow, 2),
    conv: null,
    low: round(raw.low, 0),
    mid: round(raw.mid, 0),
    high: round(raw.high, 0),
    cloud: round(cloud, 0),
    pressure: round(raw.pressure, 0),
    cape: round(raw.cape, 0),
    ptype: raw.ptype ?? PTYPE.NONE,
  }
}

export function clipWindow(rows, nowMs) {
  return rows.filter((row) => row.t >= nowMs - KEEP_PAST_MS && row.t <= nowMs + HORIZON_MS)
}

export function finalizeRows(rawRows, nowMs) {
  return clipWindow(
    rawRows.map(toForecastRow).filter((row) => row.temp !== null),
    nowMs,
  )
}
