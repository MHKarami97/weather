import { settleWithConcurrency } from '../lib/http.mjs'

/**
 * Contract for every weather source.
 * Subclasses implement `fetchProvince` (one request per province) or override `fetchProvinces` (batch APIs).
 * A result is `{ rows, air }` where rows follow the shape produced by `toForecastRow`.
 */
export class BaseProvider {
  constructor(env = process.env) {
    this.env = env
  }

  get id() { throw new Error('id is not implemented') }
  get label() { throw new Error('label is not implemented') }
  get model() { return 'default' }
  get attribution() { return this.label }
  get envKey() { return null }
  get intervalMinutes() { return 60 }
  get maxRequestsPerRun() { return Number.POSITIVE_INFINITY }
  get concurrency() { return 3 }
  get delayMs() { return 250 }

  get apiKey() {
    return this.envKey ? this.env[this.envKey]?.trim() || null : null
  }

  isConfigured() {
    return !this.envKey || this.apiKey !== null
  }

  async fetchProvince() {
    throw new Error(`${this.id}: fetchProvince is not implemented`)
  }

  /** @returns {Promise<Array<{ ok: boolean, value?: { rows: object[], air?: object[] }, error?: Error }>>} aligned with `provinces` */
  fetchProvinces(provinces, nowMs) {
    return settleWithConcurrency(
      provinces,
      this.concurrency,
      (province) => this.fetchProvince(province, nowMs),
      this.delayMs,
    )
  }
}
