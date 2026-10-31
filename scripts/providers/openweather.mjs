import { getJson } from '../lib/http.mjs'
import { HourlyLedger, PTYPE, finalizeRows, interpolateHourly, msToKmh } from '../lib/series.mjs'
import { BaseProvider } from './base-provider.mjs'

const ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast'
const STEP_HOURS = 3

function conditionToPtype(id) {
  if (id === 511) return PTYPE.FREEZING_RAIN
  if (id >= 611 && id <= 613) return PTYPE.SLEET
  if (id >= 600 && id <= 622) return PTYPE.SNOW
  if (id >= 200 && id < 600) return PTYPE.RAIN
  return PTYPE.NONE
}

export class OpenWeatherProvider extends BaseProvider {
  get id() { return 'openweather' }
  get label() { return 'OpenWeather' }
  get model() { return '5-day-3-hour' }
  get attribution() { return 'Weather data provided by OpenWeather (openweathermap.org)' }
  get envKey() { return 'OPENWEATHER_API_KEY' }

  async fetchProvince(province, nowMs) {
    const query = new URLSearchParams({
      lat: String(province.lat), lon: String(province.lon), units: 'metric', appid: this.apiKey,
    })
    const body = await getJson(`${ENDPOINT}?${query}`)
    if (!body?.list?.length) throw new Error('empty forecast list')

    const rain = new HourlyLedger()
    const snow = new HourlyLedger()
    const types = new HourlyLedger()
    const points = body.list.map((item) => {
      const t = item.dt * 1000
      const start = t - STEP_HOURS * 3_600_000
      rain.add(start, STEP_HOURS, (item.rain?.['3h'] ?? 0) + (item.snow?.['3h'] ?? 0))
      snow.add(start, STEP_HOURS, item.snow?.['3h'] ?? 0)
      types.mark(start, STEP_HOURS, conditionToPtype(item.weather?.[0]?.id))
      return {
        t,
        temp: item.main.temp,
        feels: item.main.feels_like,
        rh: item.main.humidity,
        pressure: item.main.grnd_level ?? item.main.pressure,
        cloud: item.clouds?.all,
        wind: msToKmh(item.wind?.speed),
        gust: msToKmh(item.wind?.gust),
        dir: item.wind?.deg,
      }
    })

    const raw = interpolateHourly(points).map((row) => ({
      ...row, precip: rain.at(row.t), snow: snow.at(row.t), ptype: types.at(row.t) ?? PTYPE.NONE,
    }))
    return { rows: finalizeRows(raw, nowMs), air: [] }
  }
}
