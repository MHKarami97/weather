import { getJson } from '../lib/http.mjs'
import { HourlyLedger, PTYPE, finalizeRows, msToKmh } from '../lib/series.mjs'
import { BaseProvider } from './base-provider.mjs'

const ENDPOINT = 'https://api.tomorrow.io/v4/weather/forecast'

function precipitationType(v) {
  if ((v.freezingRainIntensity ?? 0) > 0) return PTYPE.FREEZING_RAIN
  if ((v.snowIntensity ?? 0) > 0) return PTYPE.SNOW
  if ((v.sleetIntensity ?? 0) > 0) return PTYPE.SLEET
  return (v.rainIntensity ?? 0) > 0 ? PTYPE.RAIN : PTYPE.NONE
}

const totalIntensity = (v) =>
  (v.rainIntensity ?? 0) + (v.snowIntensity ?? 0) + (v.sleetIntensity ?? 0) + (v.freezingRainIntensity ?? 0)

export class TomorrowIoProvider extends BaseProvider {
  get id() { return 'tomorrow-io' }
  get label() { return 'Tomorrow.io' }
  get model() { return 'forecast-v4' }
  get attribution() { return 'Powered by Tomorrow.io' }
  get envKey() { return 'TOMORROW_API_KEY' }
  // Free plan: 25 requests/hour and 500/day. 20 provinces per hourly run = 480/day, full cycle every 2 hours.
  get maxRequestsPerRun() { return 20 }
  get concurrency() { return 1 }
  get delayMs() { return 1200 }

  async fetchProvince(province, nowMs) {
    const query = new URLSearchParams({
      location: `${province.lat},${province.lon}`, timesteps: '1h', units: 'metric', apikey: this.apiKey,
    })
    const body = await getJson(`${ENDPOINT}?${query}`, { attempts: 1 })
    const hours = body?.timelines?.hourly
    if (!hours?.length) throw new Error('empty hourly timeline')

    const rain = new HourlyLedger()
    const snow = new HourlyLedger()
    hours.forEach(({ time, values }) => {
      const t = Date.parse(time)
      rain.add(t, 1, totalIntensity(values))
      snow.add(t, 1, values.snowIntensity ?? 0)
    })

    const raw = hours.map(({ time, values: v }) => {
      const t = Date.parse(time)
      return {
        t,
        temp: v.temperature,
        feels: v.temperatureApparent,
        dew: v.dewPoint,
        rh: v.humidity,
        wind: msToKmh(v.windSpeed),
        gust: msToKmh(v.windGust),
        dir: v.windDirection,
        precip: rain.at(t),
        snow: snow.at(t),
        cloud: v.cloudCover,
        pressure: v.pressureSurfaceLevel,
        ptype: precipitationType(v),
      }
    })
    return { rows: finalizeRows(raw, nowMs), air: [] }
  }
}
