/** Offline test for the secondary sources: mocks every HTTP call.  Run:  npm run test:sources */
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PROVINCES } from '../src/lib/provinces.js'
import { buildManifest } from './build-manifest.mjs'
import { SnapshotStore } from './lib/snapshot-store.mjs'
import { RunStatus, SourceRunner } from './lib/source-runner.mjs'
import { createProviders } from './providers/index.mjs'

const HOUR = 3_600_000
const now = Math.floor(Date.now() / HOUR) * HOUR
const hourly = (count, startOffsetH = -2) => Array.from({ length: count }, (_, i) => now + (startOffsetH + i) * HOUR)
const isoZ = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z')
const wave = (i, base, amp) => base + amp * Math.sin(i / 5)

const calls = []
const respond = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

function openMeteoBody(locations) {
  const times = hourly(24 * 10)
  const block = (fn) => times.map((_, i) => fn(i))
  const one = {
    hourly: {
      time: times.map((t) => t / 1000),
      temperature_2m: block((i) => wave(i, 15, 8)), apparent_temperature: block((i) => wave(i, 14, 8)),
      dew_point_2m: block(() => 5), relative_humidity_2m: block(() => 55),
      precipitation: block((i) => (i % 17 === 3 ? 1.2 : 0)), snowfall: block(() => 0), weather_code: block((i) => (i % 17 === 3 ? 61 : 1)),
      surface_pressure: block(() => 880), cloud_cover: block(() => 40), cloud_cover_low: block(() => 10),
      cloud_cover_mid: block(() => 10), cloud_cover_high: block(() => 20),
      wind_speed_10m: block(() => 12), wind_direction_10m: block(() => 270), wind_gusts_10m: block(() => 30), cape: block(() => 120),
    },
  }
  return locations === 1 ? one : Array.from({ length: locations }, () => one)
}

function openMeteoAirBody(locations) {
  const times = hourly(24 * 5)
  const col = (v) => times.map(() => v)
  const one = { hourly: { time: times.map((t) => t / 1000), us_aqi: col(80), pm10: col(40), pm2_5: col(20), dust: col(5),
    nitrogen_dioxide: col(10), sulphur_dioxide: col(3), ozone: col(60), carbon_monoxide: col(200) } }
  return Array.from({ length: locations }, () => one)
}

function metBody() {
  const short = hourly(12, 0)
  const long = Array.from({ length: 10 }, (_, i) => short.at(-1) + (i + 1) * 6 * HOUR)
  const timeseries = [...short, ...long].map((t, i) => ({
    time: isoZ(t),
    data: {
      instant: { details: { air_temperature: wave(i, 10, 5), relative_humidity: 60, dew_point_temperature: 3, wind_speed: 4,
        wind_speed_of_gust: i < 12 ? 9 : undefined, wind_from_direction: 200, air_pressure_at_sea_level: 1015,
        cloud_area_fraction: 50, cloud_area_fraction_low: 20, cloud_area_fraction_medium: 20, cloud_area_fraction_high: 30 } },
      ...(i < 12
        ? { next_1_hours: { summary: { symbol_code: i === 5 ? 'snow' : 'cloudy' }, details: { precipitation_amount: i === 5 ? 2 : 0 } } }
        : { next_6_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 6 } } }),
    },
  }))
  return { properties: { timeseries } }
}

const owmBody = () => ({
  list: Array.from({ length: 16 }, (_, i) => ({
    dt: (now + (i + 1) * 3 * HOUR) / 1000,
    main: { temp: wave(i, 12, 6), feels_like: 11, pressure: 1012, grnd_level: 880, humidity: 50 },
    clouds: { all: 30 }, wind: { speed: 5, deg: 100, gust: 9 },
    rain: i === 2 ? { '3h': 3 } : undefined, weather: [{ id: i === 2 ? 500 : 800 }],
  })),
})

const pirateBody = () => ({
  hourly: { data: hourly(72).map((t, i) => ({
    time: t / 1000, temperature: wave(i, 9, 6), apparentTemperature: 8, dewPoint: 2, humidity: 0.5, pressure: 1010,
    windSpeed: 15, windGust: 30, windBearing: 90, cloudCover: 0.25, precipIntensity: i === 10 ? 2 : 0, precipType: i === 10 ? 'rain' : 'none', cape: 50 })) },
})

const tomorrowBody = () => ({
  timelines: { hourly: hourly(72).map((t, i) => ({ time: isoZ(t), values: {
    temperature: wave(i, 7, 5), temperatureApparent: 6, dewPoint: 1, humidity: 55, windSpeed: 3, windGust: 6, windDirection: 45,
    pressureSurfaceLevel: 885, cloudCover: 35, rainIntensity: i === 8 ? 1.5 : 0, snowIntensity: 0, sleetIntensity: 0, freezingRainIntensity: 0 } })) },
})

const weatherApiBody = () => ({
  forecast: { forecastday: [0, 1, 2].map((d) => ({ hour: Array.from({ length: 24 }, (_, h) => {
    const t = now - 2 * HOUR + (d * 24 + h) * HOUR
    return { time_epoch: t / 1000, temp_c: wave(h, 11, 6), feelslike_c: 10, dewpoint_c: 2, humidity: 52, wind_kph: 14, gust_kph: 25,
      wind_degree: 180, pressure_mb: 1011, precip_mm: h === 4 ? 0.8 : 0, snow_cm: 0, cloud: 45 } }) })) },
})

globalThis.fetch = async (url, init = {}) => {
  const target = new URL(url)
  calls.push({ host: target.host, url: String(url), headers: init.headers ?? {} })
  const locations = (target.searchParams.get('latitude') ?? '').split(',').length
  switch (target.host) {
    case 'api.open-meteo.com': return respond(openMeteoBody(locations))
    case 'air-quality-api.open-meteo.com': return respond(openMeteoAirBody(locations))
    case 'api.met.no': return respond(metBody())
    case 'api.openweathermap.org': return respond(owmBody())
    case 'api.pirateweather.net': return respond(pirateBody())
    case 'api.tomorrow.io': return respond(tomorrowBody())
    case 'api.weatherapi.com': return respond(weatherApiBody())
    default: return new Response('unexpected host', { status: 500 })
  }
}

const env = { OPENWEATHER_API_KEY: 'k1', WEATHERAPI_KEY: 'k2', PIRATE_WEATHER_API_KEY: 'k3', TOMORROW_API_KEY: 'k4', MET_USER_AGENT: 'selftest/1.0 test@example.com' }
const outDir = await mkdtemp(path.join(os.tmpdir(), 'weather-sources-'))
const store = new SnapshotStore(outDir)
const log = { warn: () => {} }
const runAll = (providers, at) => Promise.all(providers.map((provider) => new SourceRunner({ provider, store, provinces: PROVINCES, log }).run(at)))

try {
  const providers = createProviders(env)
  const first = await runAll(providers, now)
  first.forEach((r) => assert.equal(r.status, RunStatus.UPDATED, `${r.id}: ${r.reason}`))

  for (const provider of providers) {
    const latest = await store.readLatest(provider.id)
    const tehran = await store.readProvince(provider.id, 'tehran')
    assert.ok(tehran?.hourly.length >= 24, `${provider.id}: hourly rows`)
    const steps = tehran.hourly.slice(1).map((r, i) => r.t - tehran.hourly[i].t)
    assert.ok(steps.every((s) => s === HOUR), `${provider.id}: regular 1h grid`)
    assert.ok(tehran.hourly.every((r) => r.temp > -40 && r.temp < 60), `${provider.id}: temperature range`)
    assert.ok(tehran.hourly.every((r) => r.wind === null || (r.wind >= 0 && r.wind < 200)), `${provider.id}: wind km/h`)
    assert.ok(tehran.daily.length >= 1 && tehran.summary?.condition?.label, `${provider.id}: summary/daily`)
    assert.equal(latest.provinces.length, 31)
  }

  const met = await store.readProvince('met-no', 'tehran')
  assert.ok(met.hourly.some((r) => r.precip > 0), 'met-no precip distributed over hours')
  assert.ok(met.hourly.length >= 60, 'met-no 6-hourly steps resampled to 1h')
  assert.ok(calls.filter((c) => c.host === 'api.met.no').every((c) => c.headers['User-Agent'] === 'selftest/1.0 test@example.com'), 'met-no User-Agent')
  assert.ok((await store.readProvince('open-meteo', 'tehran')).air.length > 24, 'open-meteo air quality')
  assert.equal(calls.filter((c) => c.host === 'api.open-meteo.com').length, 1, 'open-meteo uses one batch request')
  assert.ok(calls.filter((c) => c.host === 'api.pirateweather.net').every((c) => !c.url.includes('k3')), 'pirate key not in URL')

  const tomorrow = await store.readLatest('tomorrow-io')
  assert.equal(tomorrow.okCount, 20, 'tomorrow.io limited to 20 requests per run')
  assert.equal(tomorrow.cursor, 20)
  assert.equal(tomorrow.provinces.filter((p) => p.summary).length, 20)

  const notDue = await runAll(providers, now + 30 * 60_000)
  notDue.forEach((r) => assert.equal(r.status, RunStatus.SKIPPED, `${r.id} should wait for its interval`))

  const second = await runAll(providers, now + 60 * 60_000)
  const byId = Object.fromEntries(second.map((r) => [r.id, r]))
  assert.equal(byId['pirate-weather'].status, RunStatus.SKIPPED, 'pirate runs every 2h')
  assert.equal(byId['open-meteo'].status, RunStatus.UPDATED)
  const tomorrow2 = await store.readLatest('tomorrow-io')
  assert.equal(tomorrow2.cursor, 9, 'tomorrow.io rotates to the next batch (20+20 mod 31)')
  assert.equal(tomorrow2.provinces.filter((p) => p.summary).length, 31, 'all provinces covered after two runs')

  const keyless = await new SourceRunner({ provider: createProviders({})[2], store, provinces: PROVINCES, log }).run(now)
  assert.equal(keyless.status, RunStatus.SKIPPED)

  const manifest = await buildManifest(outDir, now)
  assert.deepEqual(manifest.sources.map((s) => s.id), ['open-meteo', 'met-no', 'openweather', 'weatherapi', 'pirate-weather', 'tomorrow-io'])
  assert.ok(manifest.sources.every((s) => s.available > 0 && s.attribution && s.fetchedAtMs))
  assert.equal(JSON.parse(await readFile(path.join(outDir, 'sources.json'), 'utf8')).defaultSource, 'windy')
  console.log('OK', manifest.sources.map((s) => `${s.id}:${s.available}/${s.total}`).join(' '))
} finally {
  await rm(outDir, { recursive: true, force: true })
}
