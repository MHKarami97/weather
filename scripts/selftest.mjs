/** تست سریع منطق بدون API:  npm run test:logic */
import { PROVINCES } from '../src/lib/provinces.js'
import { aggregateDaily, buildSummary, normalizeAir, normalizeForecast } from '../src/lib/weather.js'
import { buildReports } from '../src/lib/reports.js'

const p = PROVINCES.find((x) => x.id === 'tehran')
const now = Date.now()
const ts = Array.from({ length: 80 }, (_, i) => now - 3600000 + i * 3 * 3600000)
const raw = {
  ts,
  units: { 'temp-surface': 'K', 'dewpoint-surface': 'K', 'pressure-surface': 'Pa' },
  'temp-surface': ts.map((_, i) => 288 + 8 * Math.sin(i / 4)),
  'dewpoint-surface': ts.map(() => 280),
  'rh-surface': ts.map(() => 50),
  'wind_u-surface': ts.map(() => 3), 'wind_v-surface': ts.map(() => 2), 'gust-surface': ts.map(() => 9),
  'past3hprecip-surface': ts.map((_, i) => (i % 11 === 4 ? 4.5 : 0)),
  'past3hsnowprecip-surface': ts.map(() => 0), 'past3hconvprecip-surface': ts.map(() => 0),
  'lclouds-surface': ts.map(() => 20), 'mclouds-surface': ts.map(() => 10), 'hclouds-surface': ts.map(() => 10),
  'pressure-surface': ts.map(() => 88000), 'cape-surface': ts.map(() => 100), 'ptype-surface': ts.map(() => 0),
}
const rows = normalizeForecast(raw)
const summary = buildSummary(rows, p, now)
const daily = aggregateDaily(rows, p)
const air = normalizeAir({ ts, 'aqi_us-surface': ts.map(() => 120), 'pm2p5-surface': ts.map(() => 40), 'chem_dustsm-surface': ts.map(() => 20) })
const reports = buildReports({ rows, daily, air, lat: p.lat, lon: p.lon }, now)
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1) } }
assert(PROVINCES.length === 31 && new Set(PROVINCES.map((x) => x.id)).size === 31, '31 unique provinces')
assert(rows[0].temp > -5 && rows[0].temp < 35, 'Kelvin -> Celsius')
assert(rows[0].pressure > 800 && rows[0].pressure < 1100, 'Pa -> hPa')
assert(summary?.condition?.label, 'summary')
assert(daily.length >= 8, 'daily aggregation')
assert(reports.length >= 6, 'reports')
console.log('OK', reports.map((r) => r.title).join(' / '))
