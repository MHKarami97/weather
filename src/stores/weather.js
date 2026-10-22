import { defineStore } from 'pinia'
import { DEFAULT_FAVORITES } from '../lib/provinces.js'
import { fetchLatest, fetchProvince } from '../services/weatherService.js'

const FAV_KEY = 'weather-favorites'
const CACHE_KEY = 'weather-latest-cache'

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    provinces: [],
    fetchedAtMs: null,
    model: '',
    failed: [],
    status: 'idle', // idle | loading | ok | stale | error
    search: '',
    favorites: readJson(FAV_KEY) || DEFAULT_FAVORITES,
    details: {},
    detailStatus: {}, // id -> loading | ok | error
  }),

  getters: {
    favoriteProvinces(state) {
      return state.favorites.map((id) => state.provinces.find((p) => p.id === id)).filter(Boolean)
    },
    filteredProvinces(state) {
      const q = state.search.trim()
      if (!q) return state.provinces
      return state.provinces.filter((p) => p.name.includes(q) || p.capital.includes(q) || p.id.includes(q.toLowerCase()))
    },
  },

  actions: {
    applyLatest(payload) {
      this.provinces = payload.provinces
      this.fetchedAtMs = payload.fetchedAtMs || Date.parse(payload.fetchedAt)
      this.model = payload.model || ''
      this.failed = payload.failed || []
    },

    loadFromCache() {
      const cached = readJson(CACHE_KEY)
      if (cached?.provinces?.length) this.applyLatest(cached)
    },

    async refresh() {
      if (this.status === 'loading') return
      const hadData = this.provinces.length > 0
      const previous = this.fetchedAtMs
      this.status = 'loading'
      try {
        const payload = await fetchLatest()
        this.applyLatest(payload)
        if (previous && previous !== this.fetchedAtMs) this.details = {} // داده‌ی جدید: جزئیات دوباره خوانده شود
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)) } catch { /* quota */ }
        this.status = 'ok'
      } catch {
        this.status = hadData ? 'stale' : 'error'
      }
    },

    async loadProvince(id, { force = false } = {}) {
      if (this.details[id] && !force) return this.details[id]
      this.detailStatus[id] = 'loading'
      try {
        const data = await fetchProvince(id)
        this.details[id] = data
        this.detailStatus[id] = 'ok'
        return data
      } catch {
        this.detailStatus[id] = 'error'
        return null
      }
    },

    setSearch(v) { this.search = v },

    toggleFavorite(id) {
      this.favorites = this.favorites.includes(id) ? this.favorites.filter((x) => x !== id) : [...this.favorites, id]
      try { localStorage.setItem(FAV_KEY, JSON.stringify(this.favorites)) } catch { /* ignore */ }
    },
  },
})
