import { PROVINCES } from './provinces.js'

export const MIN_ALERT_PRECIP_MM = 1.5
export const MIN_ALERT_SNOW_PRECIP_MM = 1.0
export const SIGNIFICANT_ALERT_PRECIP_MM = 2.5

const SNOWY_CODES = new Set(['snow', 'sleet'])
const NAME_BY_ID = new Map(PROVINCES.map((province) => [province.id, province.name]))
const clockFormatter = new Intl.DateTimeFormat('fa-IR', {
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const formatClock = (ms) => clockFormatter.format(ms)

export function isValidAlertEntry(entry) {
  if (!entry) return false
  const precip = Number(entry.precip) || 0
  const isSnow = SNOWY_CODES.has(entry.code)
  const minThreshold = isSnow ? MIN_ALERT_SNOW_PRECIP_MM : MIN_ALERT_PRECIP_MM
  return precip >= minThreshold
}

export class AlertsReport {
  #payload
  #todayKey

  constructor(payload, now = new Date()) {
    this.#payload = payload ?? { provinces: {}, sources: {} }
    this.#todayKey = AlertsReport.toDateKey(now)
  }

  static toDateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  }

  build(favoriteIds = []) {
    const favoriteOrder = new Map(favoriteIds.map((id, index) => [id, index]))
    const items = []
    const totalActiveSources = Object.keys(this.#payload.sources ?? {}).length

    for (const [provinceId, byDate] of Object.entries(this.#payload.provinces ?? {})) {
      const days = this.#buildDays(byDate, totalActiveSources)
      if (days.length === 0) continue
      const today = days.find((day) => day.date === this.#todayKey) ?? null
      items.push({
        provinceId,
        name: NAME_BY_ID.get(provinceId) ?? provinceId,
        isFavorite: favoriteOrder.has(provinceId),
        favoriteIndex: favoriteOrder.get(provinceId) ?? Number.MAX_SAFE_INTEGER,
        firstDate: days[0].date,
        today,
        otherDays: days.filter((day) => day !== today),
      })
    }
    return items.sort(
      (a, b) =>
        Number(b.isFavorite) - Number(a.isFavorite) ||
        a.favoriteIndex - b.favoriteIndex ||
        Number(Boolean(b.today)) - Number(Boolean(a.today)) ||
        a.firstDate.localeCompare(b.firstDate) ||
        a.name.localeCompare(b.name, 'fa'),
    )
  }

  #buildDays(byDate, totalActiveSources = 0) {
    return Object.entries(byDate ?? {})
      .filter(([date, entries]) => date >= this.#todayKey && Array.isArray(entries))
      .map(([date, entries]) => {
        const validEntries = entries.filter(isValidAlertEntry)
        if (validEntries.length === 0) return null

        const maxPrecip = Math.max(...validEntries.map((e) => Number(e.precip) || 0))
        const hasSnow = validEntries.some((e) => SNOWY_CODES.has(e.code))
        const isSignificant = hasSnow ? maxPrecip >= 1.5 : maxPrecip >= SIGNIFICANT_ALERT_PRECIP_MM
        const hasConsensus = validEntries.length >= 2
        const onlyFewSources = totalActiveSources <= 2

        // فیلتر کردن پیش‌بینی‌های تک‌منبع با بارش اندک
        if (!hasConsensus && !isSignificant && !onlyFewSources) {
          return null
        }

        return this.#buildDay(date, validEntries)
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  #buildDay(date, entries) {
    const names = this.#payload.sources ?? {}
    const sources = entries.map((entry) => ({
      id: entry.source,
      name: names[entry.source] ?? entry.source,
      code: entry.code,
      label: entry.label,
      precip: Number(Number(entry.precip).toFixed(1)) || 0,
      startT: Number.isFinite(entry.startT) ? entry.startT : null,
    }))
    const starts = sources.map((source) => source.startT).filter((value) => value !== null)
    const snowVotes = sources.filter((source) => SNOWY_CODES.has(source.code)).length
    const isSnow = snowVotes * 2 >= sources.length
    const maxPrecip = Math.max(...sources.map((source) => source.precip))
    const minPrecip = Math.min(...sources.map((source) => source.precip))
    const avgPrecip = Number(
      (sources.reduce((sum, s) => sum + s.precip, 0) / sources.length).toFixed(1),
    )

    let intensity = 'light'
    let intensityLabel = isSnow ? 'برف سبک' : 'باران خفیف'
    if (isSnow) {
      if (maxPrecip >= 8) {
        intensity = 'heavy'
        intensityLabel = 'برف سنگین'
      } else if (maxPrecip >= 3) {
        intensity = 'moderate'
        intensityLabel = 'برف متوسط'
      }
    } else {
      if (maxPrecip >= 15) {
        intensity = 'heavy'
        intensityLabel = 'باران شدید'
      } else if (maxPrecip >= 5) {
        intensity = 'moderate'
        intensityLabel = 'باران متوسط'
      }
    }

    return {
      date,
      kind: isSnow ? 'snow' : 'rain',
      intensity,
      intensityLabel,
      maxPrecip,
      minPrecip,
      avgPrecip,
      sourceCount: sources.length,
      startT: starts.length > 0 ? Math.min(...starts) : null,
      sources,
    }
  }
}
