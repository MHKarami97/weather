/**
 * دریافت داده‌ی آب‌وهوای ۳۱ استان از Windy Point Forecast API.
 *
 *  - همیشه فایل‌های قبلی را بازنویسی می‌کند (داده‌ی قدیمی انباشته نمی‌شود).
 *  - اگر دریافت یک استان شکست بخورد، آخرین فایل معتبر همان استان نگه داشته می‌شود (stale: true).
 *  - خروجی: <OUT_DIR>/latest.json  و  <OUT_DIR>/provinces/<id>.json
 *
 * متغیرهای محیطی:
 *   WINDY_API_KEY (الزامی) | OUT_DIR (پیش‌فرض data-out) | WINDY_AQ (پیش‌فرض 1؛ با 0 کیفیت هوا غیرفعال می‌شود)
 *   WINDY_MODEL (پیش‌فرض gfs)
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PROVINCES } from '../src/lib/provinces.js'
import { aggregateDaily, buildSummary, normalizeAir, normalizeForecast } from '../src/lib/weather.js'

const API_URL = 'https://api.windy.com/api/point-forecast/v2'
const KEY = process.env.WINDY_API_KEY
const OUT_DIR = path.resolve(process.env.OUT_DIR || 'data-out')
const MODEL = process.env.WINDY_MODEL || 'gfs'
const WITH_AQ = process.env.WINDY_AQ !== '0'
const CONCURRENCY = 3
const KEEP_PAST_MS = 3 * 3600 * 1000

const WEATHER_PARAMS = [
  'temp', 'dewpoint', 'precip', 'convPrecip', 'snowPrecip', 'wind', 'windGust',
  'cape', 'ptype', 'lclouds', 'mclouds', 'hclouds', 'rh', 'pressure',
]
const AQ_FULL = ['aqi', 'pm2p5', 'pm10', 'dustsm', 'no2', 'so2sm', 'go3', 'cosc']
const AQ_MIN = ['aqi', 'pm2p5', 'pm10']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function windy(body, attempts = 3) {
  let lastErr
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, key: KEY }),
        signal: AbortSignal.timeout(25000),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        const err = new Error(`HTTP ${res.status} ${txt.slice(0, 160)}`)
        err.status = res.status
        throw err
      }
      return await res.json()
    } catch (e) {
      lastErr = e
      if ([400, 401, 403].includes(e.status)) break
      if (i < attempts) await sleep(1500 * i)
    }
  }
  throw lastErr
}

const readJson = async (file) => {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return null }
}

async function fetchProvince(p, nowMs) {
  const raw = await windy({ lat: p.lat, lon: p.lon, model: MODEL, parameters: WEATHER_PARAMS, levels: ['surface'] })
  const rows = normalizeForecast(raw).filter((r) => r.t >= nowMs - KEEP_PAST_MS)
  if (rows.length < 4) throw new Error('forecast too short')

  let air = []
  if (WITH_AQ) {
    try {
      let aq
      try {
        aq = await windy({ lat: p.lat, lon: p.lon, model: 'cams', parameters: AQ_FULL, levels: ['surface'] }, 2)
      } catch (e) {
        if (e.status !== 400) throw e
        aq = await windy({ lat: p.lat, lon: p.lon, model: 'cams', parameters: AQ_MIN, levels: ['surface'] }, 1)
      }
      air = normalizeAir(aq).filter((r) => r.t >= nowMs - KEEP_PAST_MS)
    } catch (e) {
      console.warn(`  ! air-quality skipped for ${p.id}: ${e.message}`)
    }
  }

  const fetchedAtMs = Date.now()
  return {
    id: p.id, name: p.name, capital: p.capital, lat: p.lat, lon: p.lon, model: MODEL,
    fetchedAt: new Date(fetchedAtMs).toISOString(), fetchedAtMs,
    summary: buildSummary(rows, p, nowMs),
    daily: aggregateDaily(rows, p),
    hourly: rows,
    air,
  }
}

async function main() {
  if (!KEY) { console.error('WINDY_API_KEY is not set.'); process.exit(1) }
  await mkdir(path.join(OUT_DIR, 'provinces'), { recursive: true })
  const nowMs = Date.now()
  const results = new Array(PROVINCES.length)
  let cursor = 0

  async function worker() {
    while (cursor < PROVINCES.length) {
      const idx = cursor++
      const p = PROVINCES[idx]
      const file = path.join(OUT_DIR, 'provinces', `${p.id}.json`)
      try {
        const data = await fetchProvince(p, nowMs)
        await writeFile(file, JSON.stringify(data))
        results[idx] = { p, data, stale: false }
        console.log(`✔ ${p.id}`)
      } catch (e) {
        console.error(`✘ ${p.id}: ${e.message}`)
        results[idx] = { p, data: await readJson(file), stale: true }
      }
      await sleep(250)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const ok = results.filter((r) => !r.stale).length
  if (ok === 0) { console.error('No province could be fetched; previous snapshot left untouched.'); process.exit(1) }

  const latest = {
    schema: 1, model: MODEL, source: 'Windy Point Forecast API',
    fetchedAt: new Date().toISOString(), fetchedAtMs: Date.now(),
    okCount: ok,
    failed: results.filter((r) => r.stale).map((r) => r.p.id),
    provinces: results.map(({ p, data, stale }) => ({
      id: p.id, name: p.name, capital: p.capital, lat: p.lat, lon: p.lon,
      fetchedAt: data?.fetchedAt ?? null,
      stale: stale || undefined,
      summary: data?.summary ?? null,
    })),
  }
  await writeFile(path.join(OUT_DIR, 'latest.json'), JSON.stringify(latest))

  const keep = new Set(PROVINCES.map((p) => `${p.id}.json`))
  for (const f of await readdir(path.join(OUT_DIR, 'provinces'))) {
    if (!keep.has(f)) await rm(path.join(OUT_DIR, 'provinces', f))
  }
  console.log(`Done: ${ok}/${PROVINCES.length} provinces refreshed.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
