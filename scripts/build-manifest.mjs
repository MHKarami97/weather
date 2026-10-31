/**
 * Builds <OUT_DIR>/sources.json: the sources that currently have data and when each one was last updated.
 * The UI reads this file to render the source selector.
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SnapshotStore } from './lib/snapshot-store.mjs'
import { createProviders } from './providers/index.mjs'

const DEFAULT_SOURCE_ID = 'windy'
const WINDY_ATTRIBUTION = 'Windy.com (مدل GFS برای پیش‌بینی و CAMS برای کیفیت هوا)'

const countWithData = (latest) => latest.provinces.filter((province) => province.summary).length

function toEntry(latest, overrides = {}) {
  return {
    id: latest.id,
    label: latest.label,
    model: latest.model,
    attribution: latest.attribution,
    intervalMinutes: latest.intervalMinutes ?? 60,
    fetchedAt: latest.fetchedAt,
    fetchedAtMs: latest.fetchedAtMs,
    available: countWithData(latest),
    total: latest.provinces.length,
    ...overrides,
  }
}

async function readWindyEntry(store) {
  const latest = await store.readRootLatest()
  if (!latest?.provinces) return null
  return toEntry(
    { ...latest, id: DEFAULT_SOURCE_ID, label: `Windy (${String(latest.model ?? 'gfs').toUpperCase()})` },
    { attribution: WINDY_ATTRIBUTION },
  )
}

export async function buildManifest(outDir, nowMs = Date.now()) {
  const store = new SnapshotStore(outDir)
  const candidates = [await readWindyEntry(store)]
  for (const provider of createProviders({})) {
    const latest = await store.readLatest(provider.id)
    candidates.push(latest?.provinces ? toEntry(latest) : null)
  }
  const sources = candidates.filter((entry) => entry && entry.available > 0)
  const manifest = { schema: 1, generatedAt: new Date(nowMs).toISOString(), defaultSource: DEFAULT_SOURCE_ID, sources }
  await writeFile(path.join(outDir, 'sources.json'), JSON.stringify(manifest))
  return manifest
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  const outDir = path.resolve(process.env.OUT_DIR || 'data-out')
  const manifest = await buildManifest(outDir)
  console.log(`sources.json: ${manifest.sources.map((s) => `${s.id}(${s.available}/${s.total})`).join(', ') || 'no sources'}`)
}
