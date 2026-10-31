import { getJson } from '../lib/http.mjs'
import { HourlyLedger, PTYPE, finalizeRows, fractionToPercent } from '../lib/series.mjs'
import { BaseProvider } from './base-provider.mjs'

const ENDPOINT = 'https://api.pirateweather.net/forecast/key'
const PTYPE_BY_NAME = { rain: PTYPE.RAIN, snow: PTYPE.SNOW, sleet: PTYPE.SLEET }

export class PirateWeatherProvider extends BaseProvider {
  get id() { return 'pirate-weather' }
  get label() { return 'Pirate Weather' }
  get model() { return 'hrrr-gfs-ecmwf' }
  get attribution() { return 'Powered by Pirate Weather (pirateweather.net)' }
  get envKey() { return 'PIRATE_WEATHER_API_KEY' }
  // Free tier is 20,000 calls/month: 31 provinces x 12 runs/day x 30 days = 11,160 calls.
  get intervalMinutes() { return 120 }

  async fetchProvince(province, nowMs) {
    const query = new URLSearchParams({
      units: 'ca', extend: 'hourly', version: '2', exclude: 'minutely,daily,alerts,currently',
    })
    const body = await getJson(`${ENDPOINT}/${province.lat},${province.lon}?${query}`, {
      headers: { apikey: this.apiKey },
    })
    const hours = body?.hourly?.data
    if (!hours?.length) throw new Error('empty hourly block')

    const rain = new HourlyLedger()
    hours.forEach((h) => rain.add(h.time * 1000, 1, h.precipIntensity))

    const raw = hours.map((h) => {
      const t = h.time * 1000
      const precip = rain.at(t)
      const ptype = PTYPE_BY_NAME[h.precipType] ?? PTYPE.NONE
      return {
        t,
        temp: h.temperature,
        feels: h.apparentTemperature,
        dew: h.dewPoint,
        rh: fractionToPercent(h.humidity),
        wind: h.windSpeed,
        gust: h.windGust,
        dir: h.windBearing,
        precip,
        snow: ptype === PTYPE.SNOW ? precip : 0,
        cloud: fractionToPercent(h.cloudCover),
        pressure: h.pressure,
        cape: h.cape,
        ptype,
      }
    })
    return { rows: finalizeRows(raw, nowMs), air: [] }
  }
}
