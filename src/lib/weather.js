/**
 * منطق خالص (بدون وابستگی به Vue/DOM) برای تحلیل داده‌ی Windy:
 * تبدیل واحد، تعیین وضعیت هوا، شبانه‌روز و تجمیع روزانه.
 * هم در اسکریپت Node و هم در فرانت‌اند استفاده می‌شود.
 */
const RAD = Math.PI / 180
export const TEHRAN_OFFSET_MS = 3.5 * 3600 * 1000

export const round = (v, d = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return null
  const m = 10 ** d
  return Math.round(v * m) / m
}

export function solarElevation(lat, lon, ms) {
  const d = ms / 86400000 + 2440587.5 - 2451545.0
  const g = (357.529 + 0.98560028 * d) * RAD
  const q = 280.459 + 0.98564736 * d
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const e = (23.439 - 0.00000036 * d) * RAD
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))
  const dec = Math.asin(Math.sin(e) * Math.sin(L))
  const gmst = (280.46061837 + 360.98564736629 * d) * RAD
  const H = gmst + lon * RAD - ra
  return Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(H)) / RAD
}
export const isDaylight = (lat, lon, ms) => solarElevation(lat, lon, ms) > -0.833

/** طلوع و غروب خورشید برای روز محلی (ایران) که ms در آن قرار دارد */
export function sunTimes(lat, lon, ms) {
  const start = Math.floor((ms + TEHRAN_OFFSET_MS) / 86400000) * 86400000 - TEHRAN_OFFSET_MS
  let sunrise = null
  let sunset = null
  let prev = isDaylight(lat, lon, start)
  for (let t = start + 300000; t < start + 86400000; t += 300000) {
    const cur = isDaylight(lat, lon, t)
    if (!prev && cur && sunrise === null) sunrise = t
    if (prev && !cur && sunset === null) sunset = t
    prev = cur
  }
  return { sunrise, sunset }
}

const toCelsius = (v, u) => (v === null || v === undefined ? null : u === 'K' || v > 150 ? v - 273.15 : v)
const toHpa = (v, u) => (v === null || v === undefined ? null : u === 'Pa' || v > 5000 ? v / 100 : v)
const toKmh = (v) => (v === null || v === undefined ? null : v * 3.6)

export const windSpeed = (u, v) => (u == null || v == null ? null : Math.hypot(u, v))
/** جهتی که باد از آن می‌وزد (درجه، ۰ = شمال) */
export const windFromDeg = (u, v) => (u == null || v == null ? null : (Math.atan2(-u, -v) / RAD + 360) % 360)
const DIRS = ['شمال', 'شمال‌شرق', 'شرق', 'جنوب‌شرق', 'جنوب', 'جنوب‌غرب', 'غرب', 'شمال‌غرب']
export const windDirLabel = (deg) => (deg == null ? '—' : DIRS[Math.round(deg / 45) % 8])

/** دمای محسوس (Steadman): دما °C، رطوبت %، باد m/s */
export function apparentTemp(t, rh, wMs) {
  if (t == null) return null
  const e = ((rh ?? 50) / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
  return t + 0.33 * e - 0.7 * (wMs ?? 0) - 4.0
}

export function normalizeForecast(raw) {
  const ts = raw.ts || []
  const U = raw.units || {}
  const col = (k) => raw[k] || []
  const temp = col('temp-surface'), dew = col('dewpoint-surface'), rh = col('rh-surface')
  const wu = col('wind_u-surface'), wv = col('wind_v-surface'), gust = col('gust-surface')
  const p3 = col('past3hprecip-surface'), s3 = col('past3hsnowprecip-surface'), c3 = col('past3hconvprecip-surface')
  const lc = col('lclouds-surface'), mc = col('mclouds-surface'), hc = col('hclouds-surface')
  const pr = col('pressure-surface'), cape = col('cape-surface'), ptype = col('ptype-surface')
  const out = []
  for (let i = 0; i < ts.length; i++) {
    const tC = toCelsius(temp[i], U['temp-surface'])
    const wMs = windSpeed(wu[i], wv[i])
    const low = lc[i], mid = mc[i], high = hc[i]
    let cloud = null
    if (low != null || mid != null || high != null) {
      cloud = 100 * (1 - (1 - (low ?? 0) / 100) * (1 - (mid ?? 0) / 100) * (1 - (high ?? 0) / 100))
    }
    out.push({
      t: ts[i],
      temp: round(tC),
      feels: round(apparentTemp(tC, rh[i], wMs)),
      dew: round(toCelsius(dew[i], U['dewpoint-surface'])),
      rh: round(rh[i], 0),
      wind: round(toKmh(wMs), 0),
      dir: round(windFromDeg(wu[i], wv[i]), 0),
      gust: round(toKmh(gust[i]), 0),
      precip: round(p3[i], 2),
      snow: round(s3[i], 2),
      conv: round(c3[i], 2),
      low: round(low, 0), mid: round(mid, 0), high: round(high, 0),
      cloud: round(cloud, 0),
      pressure: round(toHpa(pr[i], U['pressure-surface']), 0),
      cape: round(cape[i], 0),
      ptype: ptype[i] ?? 0,
    })
  }
  return out.filter((r) => r.temp !== null)
}

export function normalizeAir(raw) {
  if (!raw || !raw.ts) return []
  const g = (k) => raw[k] || []
  const aqi = g('aqi_us-surface'), pm25 = g('pm2p5-surface'), pm10 = g('pm10-surface')
  const dust = g('chem_dustsm-surface'), no2 = g('no2-surface'), so2 = g('chem_so2sm-surface')
  const o3 = g('go3-surface'), co = g('chem_cosc-surface')
  return raw.ts.map((t, i) => ({
    t, aqi: round(aqi[i], 0), pm25: round(pm25[i], 1), pm10: round(pm10[i], 1), dust: round(dust[i], 1),
    no2: round(no2[i], 1), so2: round(so2[i], 1), o3: round(o3[i], 1), co: round(co[i], 0),
  }))
}

export function stepHours(rows) {
  if (!rows || rows.length < 2) return 3
  const diffs = []
  for (let i = 1; i < Math.min(rows.length, 12); i++) diffs.push((rows[i].t - rows[i - 1].t) / 3600000)
  diffs.sort((a, b) => a - b)
  return diffs[Math.floor(diffs.length / 2)] || 3
}

export const CONDITION_COLORS = {
  'clear-day': '#f59e0b', 'clear-night': '#6366f1', 'partly-day': '#fbbf24', 'partly-night': '#818cf8',
  cloudy: '#94a3b8', overcast: '#64748b', fog: '#9ca3af', drizzle: '#38bdf8', rain: '#3b82f6',
  'heavy-rain': '#1d4ed8', storm: '#7c3aed', snow: '#38bdf8', sleet: '#06b6d4', hot: '#ef4444',
}

export function describeCondition(r, { lat, lon, stepH = 3 } = {}) {
  const day = lat != null ? isDaylight(lat, lon, r.t) : true
  const perHour = (r.precip ?? 0) / Math.max(stepH, 1)
  const snowShare = r.precip > 0 ? (r.snow ?? 0) / r.precip : 0
  const isSnow = perHour >= 0.03 && (r.ptype === 5 || snowShare > 0.6 || (r.temp != null && r.temp <= 0.5))
  const isSleet = perHour >= 0.03 && (r.ptype === 7 || r.ptype === 8)
  const isFreezingRain = perHour >= 0.03 && r.ptype === 3
  const cloud = r.cloud ?? 0
  const mk = (code, label, icon) => ({ code, label, icon })
  if (perHour >= 0.03) {
    if ((r.cape ?? 0) > 800 && perHour >= 0.2 && !isSnow) return mk('storm', 'رعد و برق', '⛈️')
    if (isFreezingRain) return mk('sleet', 'باران یخ‌زده', '🌧️')
    if (isSleet) return mk('sleet', 'بارش باران و برف', '🌨️')
    if (isSnow) return perHour >= 0.8 ? mk('snow', 'برف سنگین', '❄️') : perHour >= 0.2 ? mk('snow', 'برف', '🌨️') : mk('snow', 'برف سبک', '🌨️')
    if (perHour >= 2.5) return mk('heavy-rain', 'باران شدید', '🌧️')
    if (perHour >= 0.7) return mk('rain', 'باران', '🌧️')
    if (perHour >= 0.2) return mk('rain', 'باران خفیف', '🌦️')
    return mk('drizzle', 'نم‌نم باران', '🌦️')
  }
  if ((r.rh ?? 0) >= 96 && (r.wind ?? 0) < 8 && r.temp != null && r.dew != null && r.temp - r.dew < 1) {
    return mk('fog', 'مه‌آلود', '🌫️')
  }
  if (cloud < 15) return day ? mk('clear-day', 'آفتابی', '☀️') : mk('clear-night', 'صاف', '🌙')
  if (cloud < 40) return day ? mk('partly-day', 'کمی ابری', '🌤️') : mk('partly-night', 'کمی ابری', '☁️')
  if (cloud < 65) return day ? mk('partly-day', 'نیمه‌ابری', '⛅') : mk('partly-night', 'نیمه‌ابری', '☁️')
  if (cloud < 85) return mk('cloudy', 'ابری', '🌥️')
  return mk('overcast', 'کاملاً ابری', '☁️')
}

export const localDayKey = (ms) => new Date(ms + TEHRAN_OFFSET_MS).toISOString().slice(0, 10)

export function aggregateDaily(rows, { lat, lon }) {
  const stepH = stepHours(rows)
  const byDay = new Map()
  for (const r of rows) {
    const k = localDayKey(r.t)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k).push(r)
  }
  const sev = ['storm', 'heavy-rain', 'snow', 'sleet', 'rain', 'drizzle']
  const days = []
  for (const [key, list] of byDay) {
    const temps = list.map((r) => r.temp)
    const hourOf = (r) => new Date(r.t + TEHRAN_OFFSET_MS).getUTCHours()
    const noon = list.reduce((b, r) => (Math.abs(hourOf(r) - 13) < Math.abs(hourOf(b) - 13) ? r : b), list[0])
    const worst = list
      .map((r) => describeCondition(r, { lat, lon, stepH }))
      .filter((c) => sev.includes(c.code))
      .sort((a, b) => sev.indexOf(a.code) - sev.indexOf(b.code))[0]
    const avg = (k) => round(list.reduce((a, r) => a + (r[k] ?? 0), 0) / list.length, 0)
    days.push({
      key, t: list[0].t,
      partial: list.length < 24 / stepH - 1,
      min: Math.min(...temps), max: Math.max(...temps),
      avg: round(temps.reduce((a, b) => a + b, 0) / temps.length),
      precip: round(list.reduce((a, r) => a + (r.precip ?? 0), 0)),
      windMax: Math.max(...list.map((r) => r.wind ?? 0)),
      gustMax: Math.max(...list.map((r) => r.gust ?? 0)),
      rhAvg: avg('rh'), cloudAvg: avg('cloud'), pressureAvg: avg('pressure'),
      condition: worst || describeCondition(noon, { lat, lon, stepH }),
    })
  }
  return days
}

export const pickCurrent = (rows, now = Date.now()) => {
  if (!rows.length) return null
  let best = rows[0]
  for (const r of rows) if (Math.abs(r.t - now) < Math.abs(best.t - now)) best = r
  return best
}

/** خلاصه‌ی کارت صفحه‌ی اول */
export function buildSummary(rows, { lat, lon }, now = Date.now()) {
  const cur = pickCurrent(rows, now)
  if (!cur) return null
  const stepH = stepHours(rows)
  const todayKey = localDayKey(now)
  const today = rows.filter((r) => localDayKey(r.t) === todayKey)
  const pool = today.length ? today : rows.slice(0, 8)
  const next24 = rows.filter((r) => r.t >= now - 3600000 && r.t <= now + 24 * 3600000)
  return {
    t: cur.t, temp: cur.temp, feels: cur.feels, rh: cur.rh, wind: cur.wind, dir: cur.dir, gust: cur.gust,
    pressure: cur.pressure, cloud: cur.cloud, dew: cur.dew,
    condition: describeCondition(cur, { lat, lon, stepH }),
    min: Math.min(...pool.map((r) => r.temp)),
    max: Math.max(...pool.map((r) => r.temp)),
    precip24: round(next24.reduce((a, r) => a + (r.precip ?? 0), 0)),
  }
}
