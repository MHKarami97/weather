import { defineStore } from 'pinia'
import { DEFAULT_FAVORITES } from '../lib/provinces.js'
import { DEFAULT_SOURCE_ID, fetchLatest, fetchProvince, fetchSources } from '../services/weatherService.js'

const FAV_KEY = 'weather-favorites'
const SOURCE_KEY = 'weather-source'
const cacheKey = (sourceId) => (sourceId === DEFAULT_SOURCE_ID ? 'weather-latest-cache' : `weather-latest-cache:${sourceId}`)

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function readString(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeString(key, value) {
  try { localStorage.setItem(key, value) } catch { /* private mode / quota */ }
}

let refreshingSourceId = null

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
    sourceId: readString(SOURCE_KEY) || DEFAULT_SOURCE_ID,
    sources: [], // manifest entries: { id, label, fetchedAtMs, intervalMinutes, available, attribution, ... }
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
    availableSources(state) {
      return state.sources.filter((s) => s.available > 0)
    },
    currentSource(state) {
      return state.sources.find((s) => s.id === state.sourceId) || null
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
      const cached = readJson(cacheKey(this.sourceId))
      if (cached?.provinces?.length) this.applyLatest(cached)
    },

    async loadSources() {
      try {
        this.sources = (await fetchSources()).sources
      } catch {
        // manifest is optional: keep the last known list (or none) and stay on the current source
      }
    },

    async refresh() {
      const sourceId = this.sourceId
      if (this.status === 'loading' && refreshingSourceId === sourceId) return
      refreshingSourceId = sourceId
      const hadData = this.provinces.length > 0
      const previous = this.fetchedAtMs
      this.status = 'loading'
      try {
        const [payload] = await Promise.all([fetchLatest(sourceId), this.loadSources()])
        if (sourceId !== this.sourceId) return // user switched source while this request was in flight
        this.applyLatest(payload)
        if (previous && previous !== this.fetchedAtMs) this.details = {} // داده‌ی جدید: جزئیات دوباره خوانده شود
        try { localStorage.setItem(cacheKey(sourceId), JSON.stringify(payload)) } catch { /* quota */ }
        this.status = 'ok'
      } catch {
        if (sourceId === this.sourceId) this.status = hadData ? 'stale' : 'error'
      } finally {
        if (refreshingSourceId === sourceId) refreshingSourceId = null
      }
      await this.ensureValidSource()
    },

    /** If the saved source no longer has data, fall back to Windy (or the first source that does). */
    async ensureValidSource() {
      const usable = this.availableSources
      if (!usable.length || usable.some((s) => s.id === this.sourceId)) return
      const fallback = usable.find((s) => s.id === DEFAULT_SOURCE_ID) || usable[0]
      await this.selectSource(fallback.id)
    },

    async selectSource(id) {
      if (id === this.sourceId) return
      this.sourceId = id
      writeString(SOURCE_KEY, id)
      this.provinces = []
      this.fetchedAtMs = null
      this.model = ''
      this.failed = []
      this.details = {}
      this.detailStatus = {}
      this.loadFromCache()
      await this.refresh()
    },

    async loadProvince(id, { force = false } = {}) {
      if (this.details[id] && !force) return this.details[id]
      const sourceId = this.sourceId
      this.detailStatus[id] = 'loading'
      try {
        const data = await fetchProvince(id, sourceId)
        if (sourceId !== this.sourceId) return null
        this.details[id] = data
        this.detailStatus[id] = 'ok'
        return data
      } catch {
        if (sourceId === this.sourceId) this.detailStatus[id] = 'error'
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
