import { getJson } from '../lib/http.mjs'
import { HourlyLedger, PTYPE, finalizeRows, interpolateHourly, msToKmh } from '../lib/series.mjs'
import { BaseProvider } from './base-provider.mjs'

const ENDPOINT = 'https://api.met.no/weatherapi/locationforecast/2.0/complete'

function symbolToPtype(symbol = '') {
  if (symbol.includes('sleet')) return PTYPE.SLEET
  if (symbol.includes('snow')) return PTYPE.SNOW
  return PTYPE.NONE
}

export class MetNoProvider extends BaseProvider {
  get id() { return 'met-no' }
  get label() { return 'MET Norway' }
  get model() { return 'locationforecast-2.0' }
  get attribution() { return 'Data from MET Norway (api.met.no)، تحت مجوز Creative Commons' }
  get concurrency() { return 2 }
  get delayMs() { return 400 }

  get userAgent() {
    const fallback = `weather-pwa/1.0 ${this.env.GITHUB_REPOSITORY ?? 'local'} https://mhkarami97.ir`
    return this.env.MET_USER_AGENT?.trim() || fallback
  }

  async fetchProvince(province, nowMs) {
    const query = new URLSearchParams({ lat: province.lat.toFixed(4), lon: province.lon.toFixed(4) })
    const body = await getJson(`${ENDPOINT}?${query}`, { headers: { 'User-Agent': this.userAgent } })
    const series = body?.properties?.timeseries
    if (!series?.length) throw new Error('empty timeseries')

    const ledger = new HourlyLedger()
    const types = new HourlyLedger()
    const points = series.map((entry) => {
      const t = Date.parse(entry.time)
      const hours = entry.data.next_1_hours ? 1 : entry.data.next_6_hours ? 6 : 0
      const period = entry.data[`next_${hours}_hours`]
      if (period) {
        ledger.add(t, hours, period.details?.precipitation_amount)
        types.mark(t, hours, symbolToPtype(period.summary?.symbol_code))
      }
      const d = entry.data.instant.details
      return {
        t,
        temp: d.air_temperature,
        rh: d.relative_humidity,
        dew: d.dew_point_temperature,
        wind: msToKmh(d.wind_speed),
        gust: msToKmh(d.wind_speed_of_gust),
        dir: d.wind_from_direction,
        pressure: d.air_pressure_at_sea_level,
        cloud: d.cloud_area_fraction,
        low: d.cloud_area_fraction_low,
        mid: d.cloud_area_fraction_medium,
        high: d.cloud_area_fraction_high,
      }
    })

    const raw = interpolateHourly(points).map((row) => {
      const precip = ledger.at(row.t)
      const ptype = types.at(row.t) ?? PTYPE.NONE
      return { ...row, precip, ptype, snow: ptype === PTYPE.SNOW ? precip : 0 }
    })
    return { rows: finalizeRows(raw, nowMs), air: [] }
  }
}
