import { defineStore } from 'pinia'
import { fetchAlerts } from '../services/alertsService.js'
import { AlertsReport } from '../lib/alerts.js'

const CACHE_KEY = 'weather-alerts-cache'
const MIN_REFRESH_MS = 5 * 60 * 1000

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY))
  } catch {
    return null
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // quota or private mode
  }
}

export const useAlertsStore = defineStore('alerts', {
  state: () => ({
    payload: readCache(),
    status: 'idle',
    lastLoadedAt: 0,
  }),
  getters: {
    generatedAtMs: (state) => (state.payload?.generatedAt ? Date.parse(state.payload.generatedAt) : null),
  },
  actions: {
    report(favoriteIds) {
      return new AlertsReport(this.payload).build(favoriteIds)
    },
    async load(force = false) {
      if (this.status === 'loading') return
      if (!force && Date.now() - this.lastLoadedAt < MIN_REFRESH_MS && this.payload) return
      const hadData = Boolean(this.payload)
      this.status = 'loading'
      try {
        this.payload = await fetchAlerts()
        this.lastLoadedAt = Date.now()
        writeCache(this.payload)
        this.status = 'ok'
      } catch {
        this.status = hadData ? 'stale' : 'error'
      }
    },
  },
})
