import { PROVINCES } from './provinces.js'

const SNOWY_CODES = new Set(['snow', 'sleet'])
const NAME_BY_ID = new Map(PROVINCES.map((province) => [province.id, province.name]))

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
    for (const [provinceId, byDate] of Object.entries(this.#payload.provinces ?? {})) {
      const days = this.#buildDays(byDate)
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

  #buildDays(byDate) {
    return Object.entries(byDate ?? {})
      .filter(([date, entries]) => date >= this.#todayKey && Array.isArray(entries) && entries.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => this.#buildDay(date, entries))
  }

  #buildDay(date, entries) {
    const names = this.#payload.sources ?? {}
    const sources = entries.map((entry) => ({
      id: entry.source,
      name: names[entry.source] ?? entry.source,
      code: entry.code,
      label: entry.label,
      precip: Number(entry.precip) || 0,
    }))
    const snowVotes = sources.filter((source) => SNOWY_CODES.has(source.code)).length
    return {
      date,
      kind: snowVotes * 2 >= sources.length ? 'snow' : 'rain',
      maxPrecip: Math.max(...sources.map((source) => source.precip)),
      sources,
    }
  }
}
