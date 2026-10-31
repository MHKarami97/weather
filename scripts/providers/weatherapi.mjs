import { getJson } from '../lib/http.mjs'
import { HourlyLedger, PTYPE, finalizeRows, snowCmToWaterMm } from '../lib/series.mjs'
import { BaseProvider } from './base-provider.mjs'

const ENDPOINT = 'https://api.weatherapi.com/v1/forecast.json'

export class WeatherApiProvider extends BaseProvider {
  get id() { return 'weatherapi' }
  get label() { return 'WeatherAPI' }
  get model() { return 'forecast-v1' }
  get attribution() { return 'Powered by WeatherAPI.com' }
  get envKey() { return 'WEATHERAPI_KEY' }

  async fetchProvince(province, nowMs) {
    const query = new URLSearchParams({
      key: this.apiKey,
      q: `${province.lat},${province.lon}`,
      days: this.env.WEATHERAPI_DAYS ?? '3',
      aqi: 'no',
      alerts: 'no',
    })
    const body = await getJson(`${ENDPOINT}?${query}`)
    const hours = body?.forecast?.forecastday?.flatMap((day) => day.hour ?? [])
    if (!hours?.length) throw new Error('empty forecast')

    const rain = new HourlyLedger()
    const snow = new HourlyLedger()
    hours.forEach((h) => {
      const start = h.time_epoch * 1000 - 3_600_000
      rain.add(start, 1, h.precip_mm)
      snow.add(start, 1, snowCmToWaterMm(h.snow_cm))
    })

    const raw = hours.map((h) => {
      const t = h.time_epoch * 1000
      const snowMm = snow.at(t) ?? 0
      return {
        t,
        temp: h.temp_c,
        feels: h.feelslike_c,
        dew: h.dewpoint_c,
        rh: h.humidity,
        wind: h.wind_kph,
        gust: h.gust_kph,
        dir: h.wind_degree,
        precip: rain.at(t),
        snow: snowMm,
        cloud: h.cloud,
        pressure: h.pressure_mb,
        ptype: snowMm > 0 ? PTYPE.SNOW : (rain.at(t) ?? 0) > 0 ? PTYPE.RAIN : PTYPE.NONE,
      }
    })
    return { rows: finalizeRows(raw, nowMs), air: [] }
  }
}
