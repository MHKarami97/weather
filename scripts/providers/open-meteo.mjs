import { getJson } from '../lib/http.mjs'
import { PTYPE, finalizeRows, clipWindow, snowCmToWaterMm } from '../lib/series.mjs'
import { round } from '../../src/lib/weather.js'
import { BaseProvider } from './base-provider.mjs'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

const HOURLY = [
  'temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 'apparent_temperature', 'precipitation', 'snowfall',
  'weather_code', 'surface_pressure', 'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'cape',
]
const AIR_HOURLY = ['us_aqi', 'pm10', 'pm2_5', 'dust', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone', 'carbon_monoxide']

const FREEZING_CODES = new Set([56, 57, 66, 67])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])

function precipitationType(code, precip) {
  if (FREEZING_CODES.has(code)) return PTYPE.FREEZING_RAIN
  if (SNOW_CODES.has(code)) return PTYPE.SNOW
  return precip > 0 ? PTYPE.RAIN : PTYPE.NONE
}

const asList = (body) => (Array.isArray(body) ? body : [body])

export class OpenMeteoProvider extends BaseProvider {
  get id() { return 'open-meteo' }
  get label() { return 'Open-Meteo' }
  get model() { return 'best_match' }
  get attribution() {
    return 'Weather data by Open-Meteo.com؛ کیفیت هوا: Copernicus Atmosphere Monitoring Service (CAMS)'
  }

  async fetchProvinces(provinces, nowMs) {
    const location = {
      latitude: provinces.map((p) => p.lat).join(','),
      longitude: provinces.map((p) => p.lon).join(','),
      timeformat: 'unixtime',
    }
    const forecast = await getJson(`${FORECAST_URL}?${new URLSearchParams({
      ...location, hourly: HOURLY.join(','), wind_speed_unit: 'kmh', forecast_days: '10',
    })}`)
    const air = await this.#fetchAir(location)
    const forecasts = asList(forecast)

    return provinces.map((_, index) => {
      try {
        const rows = this.#toRows(forecasts[index], nowMs)
        return { ok: true, value: { rows, air: this.#toAirRows(air?.[index], nowMs) } }
      } catch (error) {
        return { ok: false, error }
      }
    })
  }

  async #fetchAir(location) {
    try {
      const body = await getJson(`${AIR_URL}?${new URLSearchParams({
        ...location, hourly: AIR_HOURLY.join(','), forecast_days: '5',
      })}`, { attempts: 2 })
      return asList(body)
    } catch (error) {
      console.warn(`[${this.id}] air-quality skipped: ${error.message}`)
      return null
    }
  }

  #toRows(body, nowMs) {
    const h = body?.hourly
    if (!h?.time?.length) throw new Error('empty hourly block')
    const raw = h.time.map((seconds, i) => {
      const precip = h.precipitation[i]
      return {
        t: seconds * 1000,
        temp: h.temperature_2m[i],
        feels: h.apparent_temperature[i],
        dew: h.dew_point_2m[i],
        rh: h.relative_humidity_2m[i],
        wind: h.wind_speed_10m[i],
        dir: h.wind_direction_10m[i],
        gust: h.wind_gusts_10m[i],
        precip,
        snow: precip == null ? null : Math.min(precip, snowCmToWaterMm(h.snowfall[i]) ?? 0),
        cloud: h.cloud_cover[i],
        low: h.cloud_cover_low[i],
        mid: h.cloud_cover_mid[i],
        high: h.cloud_cover_high[i],
        pressure: h.surface_pressure[i],
        cape: h.cape[i],
        ptype: precipitationType(h.weather_code[i], precip),
      }
    })
    return finalizeRows(raw, nowMs)
  }

  #toAirRows(body, nowMs) {
    const h = body?.hourly
    if (!h?.time?.length) return []
    const rows = h.time.map((seconds, i) => ({
      t: seconds * 1000,
      aqi: round(h.us_aqi[i], 0),
      pm25: round(h.pm2_5[i], 1),
      pm10: round(h.pm10[i], 1),
      dust: round(h.dust[i], 1),
      no2: round(h.nitrogen_dioxide[i], 1),
      so2: round(h.sulphur_dioxide[i], 1),
      o3: round(h.ozone[i], 1),
      co: round(h.carbon_monoxide[i], 0),
    }))
    return clipWindow(rows, nowMs)
  }
}
