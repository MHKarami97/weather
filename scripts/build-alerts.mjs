/**
 * Builds <OUT_DIR>/alerts.json: one compact file with every rain/snow day of every province and source.
 * The notification worker reads only this file instead of one file per province per source.
 *
 * Shape:
 * { schema, generatedAt, sources: { <id>: <name> },
 *   provinces: { <provinceId>: { <YYYY-MM-DD>: [ { source, code, label, precip, startT? } ] } } }
 *
 * startT (optional, epoch ms): estimated start of the first wet period of that day for that source.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { TEHRAN_OFFSET_MS, localDayKey, stepHours } from '../src/lib/weather.js'

const SCHEMA = 1
const WINDY_ID = 'windy'
const HOUR_MS = 3600000

// حداقل بارش روزانه برای ثبت هشدار باران و ارسال نوتیفیکیشن (میلی‌متر)
// مقادیر کمتر از ۱٫۵ میلی‌متر معمولاً در آب‌وهوای ایران به صورت قطره‌های ناچیز، ویرگا یا رطوبت سطحی ظاهر می‌شوند
// و نباید به عنوان هشدار بارندگی به کاربر گزارش شوند.
export const PRECIP_THRESHOLD_MM = 1.5
export const SNOW_PRECIP_THRESHOLD_MM = 1.0
export const SIGNIFICANT_PRECIP_MM = 2.5
export const WET_MM_PER_HOUR = 0.2

const MAX_SNAPSHOT_AGE_MS = 24 * HOUR_MS
const RAIN_SNOW_CODES = new Set(['storm', 'heavy-rain', 'rain', 'snow', 'sleet'])
const SOURCE_NAMES = {
  windy: 'Windy',
  'met-no': 'MET Norway',
  'open-meteo': 'Open Meteo',
  openweather: 'Open Weather',
  'pirate-weather': 'Pirate Weather',
  'tomorrow-io': 'Tomorrow Io',
  weatherapi: 'Weather Api',
}

const readJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

const listDir = async (dir, options) => {
  try {
    return await readdir(dir, options)
  } catch {
    return []
  }
}

export class AlertsBuilder {
  constructor(outDir, nowMs) {
    this.outDir = outDir
    this.nowMs = nowMs
  }

  async build() {
    const sources = {}
    const provinces = {}

    const listed = await this.#listSources()
    for (const source of listed) {
      const docs = await this.#readFreshProvinces(source.provincesDir)
      if (docs.length === 0) continue

      sources[source.id] = SOURCE_NAMES[source.id] ?? source.id
      for (const doc of docs) this.#collect(provinces, source.id, doc)
    }

    const totalActiveSources = Object.keys(sources).length
    this.#pruneUnreliableAlerts(provinces, totalActiveSources)

    return { schema: SCHEMA, generatedAt: new Date(this.nowMs).toISOString(), sources, provinces }
  }

  /** Windy keeps its legacy root layout, every other source lives under sources/<id>. */
  async #listSources() {
    const entries = await listDir(path.join(this.outDir, 'sources'), { withFileTypes: true })
    const others = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ id: entry.name, provincesDir: path.join(this.outDir, 'sources', entry.name, 'provinces') }))
    return [{ id: WINDY_ID, provincesDir: path.join(this.outDir, 'provinces') }, ...others]
  }

  async #readFreshProvinces(dir) {
    const files = (await listDir(dir)).filter((name) => name.endsWith('.json'))
    const docs = await Promise.all(files.map((name) => readJson(path.join(dir, name))))
    return docs.filter((doc) => doc?.id && Array.isArray(doc.daily) && this.#isFresh(doc))
  }

  #isFresh(doc) {
    return typeof doc.fetchedAtMs !== 'number' || this.nowMs - doc.fetchedAtMs <= MAX_SNAPSHOT_AGE_MS
  }

  /**
   * Rows carry the precipitation of the period that ENDS at row.t, so the wet period starts
   * one step earlier. The result is clamped to local midnight of the day the row belongs to.
   */
  #firstWetStarts(doc) {
    const starts = new Map()
    const rows = Array.isArray(doc.hourly) ? [...doc.hourly].sort((a, b) => a.t - b.t) : []
    if (rows.length < 2) return starts

    const stepH = stepHours(rows)
    for (const row of rows) {
      if ((row.precip ?? 0) / Math.max(stepH, 1) < WET_MM_PER_HOUR) continue
      const key = localDayKey(row.t)
      if (starts.has(key)) continue
      const dayStart = Date.parse(`${key}T00:00:00Z`) - TEHRAN_OFFSET_MS
      starts.set(key, Math.max(row.t - stepH * HOUR_MS, dayStart))
    }
    return starts
  }

  #collect(provinces, sourceId, doc) {
    const starts = this.#firstWetStarts(doc)

    for (const day of doc.daily) {
      if (!day.key) continue
      const rawCode = day.condition?.code ?? ''
      const precip = Number(day.precip) || 0
      const isSnow = rawCode === 'snow' || rawCode === 'sleet'
      const minThreshold = isSnow ? SNOW_PRECIP_THRESHOLD_MM : PRECIP_THRESHOLD_MM

      // اگر بارش روزانه کمتر از حداقل تعیین‌شده باشد، از هشدار صرف‌نظر می‌شود
      if (precip < minThreshold) continue

      const code = RAIN_SNOW_CODES.has(rawCode) ? rawCode : (isSnow ? 'snow' : 'rain')
      const entry = {
        source: sourceId,
        code,
        label: day.condition?.label || (isSnow ? 'برف' : 'باران'),
        precip: Number(precip.toFixed(1)),
      }
      if (starts.has(day.key)) entry.startT = starts.get(day.key)

      const byDate = (provinces[doc.id] ??= {})
      ;(byDate[day.key] ??= []).push(entry)
    }
  }

  /**
   * حذف روزهای نامطمئن:
   * اگر چندین منبع فعال در سیستم باشند و تنها ۱ منبع با بارش اندک (زیر ۲٫۵ میلی‌متر) هشدار داده
   * باشد در حالی که سایر مدل‌ها هوا را خشک پیش‌بینی کرده‌اند، نویز مدل محسوب شده و هشدار لغو می‌شود.
   */
  #pruneUnreliableAlerts(provinces, totalActiveSources) {
    for (const [provinceId, byDate] of Object.entries(provinces)) {
      for (const [dateKey, entries] of Object.entries(byDate)) {
        if (!entries || entries.length === 0) {
          delete byDate[dateKey]
          continue
        }

        const maxPrecip = Math.max(...entries.map((e) => Number(e.precip) || 0))
        const hasSnow = entries.some((e) => e.code === 'snow' || e.code === 'sleet')
        const isSignificant = hasSnow ? maxPrecip >= 1.5 : maxPrecip >= SIGNIFICANT_PRECIP_MM
        const hasConsensus = entries.length >= 2
        const onlyFewSources = totalActiveSources <= 2

        if (!hasConsensus && !isSignificant && !onlyFewSources) {
          delete byDate[dateKey]
        }
      }

      if (Object.keys(byDate).length === 0) {
        delete provinces[provinceId]
      }
    }
  }
}

export async function buildAlerts(outDir, nowMs = Date.now()) {
  const alerts = await new AlertsBuilder(outDir, nowMs).build()
  await writeFile(path.join(outDir, 'alerts.json'), JSON.stringify(alerts))
  return alerts
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  const outDir = path.resolve(process.env.OUT_DIR || 'data-out')
  const alerts = await buildAlerts(outDir)
  const days = Object.values(alerts.provinces).reduce((sum, byDate) => sum + Object.keys(byDate).length, 0)
  console.log(`alerts.json: ${Object.keys(alerts.sources).length} sources, ${Object.keys(alerts.provinces).length} provinces, ${days} alert days`)
}
