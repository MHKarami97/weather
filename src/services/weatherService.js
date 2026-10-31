import { DATA_SOURCES } from '../config.js'

const TIMEOUT_MS = 8000

/** Windy keeps its original location (data root) so existing installs and caches keep working. */
export const DEFAULT_SOURCE_ID = 'windy'

const sourcePrefix = (sourceId) => (sourceId === DEFAULT_SOURCE_ID ? '' : `sources/${encodeURIComponent(sourceId)}/`)

async function fetchJson(base, path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = `${base}${path}?t=${Math.floor(Date.now() / 60000)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** منابع را به ترتیب امتحان می‌کند: raw.githubusercontent → هم‌دامنه */
async function fetchFromSources(path, validate) {
  let lastErr = new Error('no data source')
  for (const base of DATA_SOURCES) {
    try {
      const json = await fetchJson(base, path)
      if (validate(json)) return json
      throw new Error('invalid payload')
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

export const fetchSources = () => fetchFromSources('sources.json', (j) => Array.isArray(j?.sources))

export const fetchLatest = (sourceId = DEFAULT_SOURCE_ID) =>
  fetchFromSources(`${sourcePrefix(sourceId)}latest.json`, (j) => Array.isArray(j?.provinces) && j.provinces.length > 0)

export const fetchProvince = (id, sourceId = DEFAULT_SOURCE_ID) =>
  fetchFromSources(`${sourcePrefix(sourceId)}provinces/${id}.json`, (j) => Array.isArray(j?.hourly) && j.hourly.length > 0)
