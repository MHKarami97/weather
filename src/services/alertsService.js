import { DATA_SOURCES } from '../config.js'

const TIMEOUT_MS = 8000
const ALERTS_PATH = 'alerts.json'

class AlertsService {
  constructor(bases) {
    this.bases = bases
  }

  async fetchAlerts() {
    let lastError = new Error('no data source')
    for (const base of this.bases) {
      try {
        const payload = await this.#fetchJson(base)
        if (this.#isValid(payload)) return payload
        throw new Error('invalid payload')
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  async #fetchJson(base) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const root = String(base).replace(/\/+$/, '')
      const url = `${root}/${ALERTS_PATH}?t=${Math.floor(Date.now() / 60000)}`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } finally {
      clearTimeout(timer)
    }
  }

  #isValid(payload) {
    return Boolean(payload) && typeof payload.provinces === 'object' && payload.provinces !== null
  }
}

export const alertsService = new AlertsService(DATA_SOURCES)
export const fetchAlerts = () => alertsService.fetchAlerts()
