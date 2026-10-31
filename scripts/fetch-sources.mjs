/**
 * Fetches every configured secondary weather source and stores it next to the Windy snapshot.
 *
 * Environment:
 *   OUT_DIR  (default data-out)   | SOURCES (comma separated provider ids, default all) | FORCE=1 ignores intervals
 *   OPENWEATHER_API_KEY, WEATHERAPI_KEY, PIRATE_WEATHER_API_KEY, TOMORROW_API_KEY, MET_USER_AGENT
 * Providers whose key is missing are skipped, not failed.
 */
import path from 'node:path'
import { PROVINCES } from '../src/lib/provinces.js'
import { SnapshotStore } from './lib/snapshot-store.mjs'
import { RunStatus, SourceRunner } from './lib/source-runner.mjs'
import { createProviders } from './providers/index.mjs'

const outDir = path.resolve(process.env.OUT_DIR || 'data-out')
const only = process.env.SOURCES ? new Set(process.env.SOURCES.split(',').map((id) => id.trim())) : null
const force = process.env.FORCE === '1'

async function main() {
  const store = new SnapshotStore(outDir)
  const providers = createProviders().filter((provider) => !only || only.has(provider.id))

  const results = await Promise.all(
    providers.map((provider) =>
      new SourceRunner({ provider, store, provinces: PROVINCES, force })
        .run()
        .catch((error) => ({ id: provider.id, status: RunStatus.FAILED, reason: error.message })),
    ),
  )

  for (const result of results) {
    const detail = result.reason ?? `${result.okCount}/${result.requested} provinces refreshed`
    console.log(`${result.status.padEnd(7)} ${result.id}: ${detail}`)
    if (result.status === RunStatus.FAILED) console.log(`::warning title=${result.id} failed::${detail}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
