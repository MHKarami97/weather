/**
 * Builds <OUT_DIR>/alerts.json: one compact file with every rain/snow day of every province and source.
 * The notification worker reads only this file instead of one file per province per source.
 *
 * Shape:
 * { schema, generatedAt, sources: { <id>: <name> },
 *   provinces: { <provinceId>: { <YYYY-MM-DD>: [ { source, code, label, precip } ] } } }
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SCHEMA = 1
const WINDY_ID = 'windy'
const PRECIP_THRESHOLD_MM = 0.2
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000
const RAIN_SNOW_CODES = new Set(['storm', 'heavy-rain', 'rain', 'drizzle', 'snow', 'sleet'])
const SOURCE_NAMES = {
  windy: 'Windy',
  'met-no': 'MET Norway',
  'open-meteo': 'Open-Meteo',
  openweather: 'OpenWeather',
  'pirate-weather': 'Pirate Weather',
  'tomorrow-io': 'Tomorrow.io',
  weatherapi: 'WeatherAPI',
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

class AlertsBuilder {
  constructor(outDir, nowMs) {
    this.outDir = outDir
    this.nowMs = nowMs
  }

  async build() {
    const sources = {}
    const provinces = {}

    for (const source of await this.#listSources()) {
      const docs = await this.#readFreshProvinces(source.provincesDir)
      if (docs.length === 0) continue

      sources[source.id] = SOURCE_NAMES[source.id] ?? source.id
      for (const doc of docs) this.#collect(provinces, source.id, doc)
    }

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

  #collect(provinces, sourceId, doc) {
    for (const day of doc.daily) {
      const code = day.condition?.code ?? ''
      const precip = day.precip ?? 0
      if (!day.key || (!RAIN_SNOW_CODES.has(code) && precip < PRECIP_THRESHOLD_MM)) continue

      const byDate = (provinces[doc.id] ??= {})
      ;(byDate[day.key] ??= []).push({
        source: sourceId,
        code: code || 'rain',
        label: day.condition?.label || '',
        precip,
      })
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
