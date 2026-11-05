<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWeatherStore } from '../stores/weather.js'

const IRAN_BOUNDS = [[24.8, 43.8], [39.9, 63.6]]
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap</a>'

class ProvinceMarkerLayer {
  #L
  #map
  #onSelect
  #markers = new Map()

  constructor(L, map, onSelect) {
    this.#L = L
    this.#map = map
    this.#onSelect = onSelect
  }

  sync(provinces) {
    for (const province of provinces) {
      if (!province.summary) continue
      const icon = this.#createIcon(province)
      const marker = this.#markers.get(province.id)
      if (marker) {
        marker.setIcon(icon)
        continue
      }
      const created = this.#L
        .marker([province.lat, province.lon], { icon, title: province.name, keyboard: true })
        .on('click', () => this.#onSelect(province.id))
        .addTo(this.#map)
      this.#markers.set(province.id, created)
    }
  }

  dispose() {
    this.#markers.clear()
    this.#map.remove()
  }

  #createIcon(province) {
    const { summary } = province
    const pin = document.createElement('div')
    pin.className = 'wx-pin'

    const glyph = document.createElement('span')
    glyph.className = 'wx-pin__icon'
    glyph.textContent = summary.condition?.icon ?? ''

    const temp = document.createElement('b')
    temp.className = 'wx-pin__temp'
    temp.textContent = Number.isFinite(summary.temp) ? `${Math.round(summary.temp)}°` : '–'

    const name = document.createElement('span')
    name.className = 'wx-pin__name'
    name.textContent = province.name

    pin.append(glyph, temp, name)
    return this.#L.divIcon({ html: pin, className: 'wx-pin-wrap', iconSize: [0, 0] })
  }
}

const store = useWeatherStore()
const router = useRouter()
const container = ref(null)
const failed = ref(false)

let layer = null
let observer = null
let initializing = false

async function initMap() {
  if (layer || initializing || !container.value) return
  initializing = true
  try {
    const [leafletModule] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    const L = leafletModule.default ?? leafletModule
    const map = L.map(container.value, { zoomControl: true, attributionControl: true, minZoom: 4, maxZoom: 8 })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 8 }).addTo(map)
    map.fitBounds(IRAN_BOUNDS)
    map.setMaxBounds([[15, 35], [47, 72]])
    layer = new ProvinceMarkerLayer(L, map, (id) => router.push({ name: 'province', params: { id } }))
    layer.sync(store.provinces)
  } catch {
    failed.value = true
  } finally {
    initializing = false
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        initMap()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(container.value)
})

watch(() => store.provinces, (provinces) => layer?.sync(provinces))

onBeforeUnmount(() => {
  observer?.disconnect()
  layer?.dispose()
  layer = null
})
</script>

<template>
  <section class="iran-map" aria-labelledby="map-title">
    <h2 id="map-title" class="section-title">نقشه آب‌وهوای ایران</h2>
    <p v-if="failed" class="card empty-note">بارگذاری نقشه ممکن نشد. اتصال اینترنت را بررسی کنید.</p>
    <div v-show="!failed" ref="container" class="iran-map__canvas card" role="application" aria-label="نقشه آب‌وهوای لحظه‌ای استان‌ها"></div>
  </section>
</template>

<style scoped>
.iran-map { margin-top: 24px; }
.iran-map__canvas { width: 100%; aspect-ratio: 4 / 3; min-height: 320px; max-height: 80vh; padding: 0; overflow: hidden; direction: ltr; }
@media (min-width: 900px) { .iran-map__canvas { aspect-ratio: 16 / 10; } }
</style>

<style>
.wx-pin-wrap { background: none; border: 0; }
.wx-pin { position: absolute; transform: translate(-50%, -50%); display: grid; justify-items: center; line-height: 1.1; cursor: pointer; direction: rtl; font-family: inherit; }
.wx-pin__icon { font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)); }
.wx-pin__temp { padding: 1px 6px; border-radius: 999px; background: #0f172a; color: #fff; font-size: 12px; }
.wx-pin__name { margin-top: 2px; padding: 0 4px; border-radius: 4px; background: rgba(255, 255, 255, 0.85); color: #111; font-size: 10px; white-space: nowrap; }
</style>
