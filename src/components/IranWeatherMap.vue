<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWeatherStore } from '../stores/weather.js'

const IRAN_BOUNDS = [[25.0, 44.0], [39.8, 63.4]]
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; mhkarami97</a>'
const BORDER_URLS = [
  `${import.meta.env.BASE_URL}geo/iran.geo.json`,
  'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries/IRN.geo.json',
]
const WORLD_RING = [[-85, -180], [-85, 180], [85, 180], [85, -180]]
const MASK_PANE = 'iranMask'

class IranMask {
  #L
  #map
  #overlay = null

  constructor(L, map) {
    this.#L = L
    this.#map = map
  }

  async apply() {
    const geojson = await this.#loadBorder()
    if (!geojson) return
    const holes = this.#outerRings(geojson).map((ring) => this.#L.GeoJSON.coordsToLatLngs(ring, 0))
    if (holes.length === 0) return

    const pane = this.#map.createPane(MASK_PANE)
    pane.style.zIndex = 350
    pane.style.pointerEvents = 'none'

    this.#overlay = this.#L
      .polygon([WORLD_RING, ...holes], {
        pane: MASK_PANE,
        stroke: false,
        fillColor: this.#backgroundColor(),
        fillOpacity: 0.8,
        fillRule: 'evenodd',
        interactive: false,
      })
      .addTo(this.#map)

    this.#L
      .geoJSON(geojson, { pane: MASK_PANE, interactive: false, style: { color: '#2563eb', weight: 1.5, fill: false } })
      .addTo(this.#map)
  }

  refreshColor() {
    this.#overlay?.setStyle({ fillColor: this.#backgroundColor() })
  }

  async #loadBorder() {
    for (const url of BORDER_URLS) {
      try {
        const response = await fetch(url)
        if (response.ok) return await response.json()
      } catch {
        // try next url
      }
    }
    return null
  }

  #outerRings(geojson) {
    const geometries = geojson.type === 'FeatureCollection'
      ? geojson.features.map((feature) => feature.geometry)
      : [geojson.geometry ?? geojson]
    const rings = []
    for (const geometry of geometries) {
      if (geometry?.type === 'Polygon') rings.push(geometry.coordinates[0])
      if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach((polygon) => rings.push(polygon[0]))
    }
    return rings
  }

  #backgroundColor() {
    const color = getComputedStyle(document.body).backgroundColor
    return color && color !== 'rgba(0, 0, 0, 0)' ? color : '#ffffff'
  }
}

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
let mask = null
let observer = null
let themeObserver = null
let initializing = false

async function initMap() {
  if (layer || initializing || !container.value) return
  initializing = true
  try {
    const [leafletModule] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    const L = leafletModule.default ?? leafletModule
    const map = L.map(container.value, { zoomSnap: 0.25, zoomDelta: 0.5, maxZoom: 8, maxBoundsViscosity: 1 })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 8, className: 'wx-tiles' }).addTo(map)
    map.fitBounds(IRAN_BOUNDS, { animate: false })
    map.setMinZoom(map.getZoom())
    map.setMaxBounds(L.latLngBounds(IRAN_BOUNDS).pad(0.15))
    layer = new ProvinceMarkerLayer(L, map, (id) => router.push({ name: 'province', params: { id } }))
    layer.sync(store.provinces)
    mask = new IranMask(L, map)
    mask.apply()
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

  themeObserver = new MutationObserver(() => requestAnimationFrame(() => mask?.refreshColor()))
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

watch(() => store.provinces, (provinces) => layer?.sync(provinces))

onBeforeUnmount(() => {
  observer?.disconnect()
  themeObserver?.disconnect()
  layer?.dispose()
  layer = null
  mask = null
})
</script>

<template>
  <div class="iran-map">
    <p v-if="failed" class="card empty-note">بارگذاری نقشه ممکن نشد. اتصال اینترنت را بررسی کنید.</p>
    <div v-show="!failed" ref="container" class="iran-map__canvas card" role="application" aria-label="نقشه آب‌وهوای لحظه‌ای استان‌ها"></div>
  </div>
</template>

<style scoped>
.iran-map__canvas { width: 100%; aspect-ratio: 4 / 3; min-height: 320px; max-height: 80vh; padding: 0; overflow: hidden; direction: ltr; }
@media (min-width: 900px) { .iran-map__canvas { aspect-ratio: 16 / 10; } }
</style>

<style>
.wx-pin-wrap { background: none; border: 0; }
.wx-pin { position: absolute; transform: translate(-50%, -50%); display: grid; justify-items: center; line-height: 1.1; cursor: pointer; direction: rtl; font-family: inherit; }
.wx-pin__icon { font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)); }
.wx-pin__temp { padding: 1px 6px; border-radius: 999px; background: #0f172a; color: #fff; font-size: 12px; }
.wx-pin__name { margin-top: 2px; padding: 0 4px; border-radius: 4px; background: rgba(255, 255, 255, 0.85); color: #111; font-size: 10px; white-space: nowrap; }

[data-theme='dark'] .wx-tiles { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.7); }
[data-theme='dark'] .iran-map__canvas.leaflet-container { background: #0b1220; }
[data-theme='dark'] .wx-pin__temp { background: #e2e8f0; color: #0f172a; }
[data-theme='dark'] .wx-pin__name { background: rgba(15, 23, 42, 0.85); color: #e2e8f0; }
[data-theme='dark'] .leaflet-control-attribution { background: rgba(15, 23, 42, 0.7); color: #94a3b8; }
[data-theme='dark'] .leaflet-control-attribution a { color: #93c5fd; }
</style>
