import { aggregateDaily, buildSummary } from '../../src/lib/weather.js'

const MIN_ROWS = 4
const SCHEDULE_SLACK_MS = 5 * 60_000 // GitHub cron may start a few minutes late/early

export const RunStatus = Object.freeze({ UPDATED: 'updated', SKIPPED: 'skipped', FAILED: 'failed' })

/** Fetches one provider for all provinces and persists the snapshot in the same schema the UI already reads. */
export class SourceRunner {
  constructor({ provider, store, provinces, force = false, log = console }) {
    this.provider = provider
    this.store = store
    this.provinces = provinces
    this.force = force
    this.log = log
  }

  async run(nowMs = Date.now()) {
    const { provider } = this
    if (!provider.isConfigured()) {
      return { id: provider.id, status: RunStatus.SKIPPED, reason: `${provider.envKey} is not set` }
    }

    const previous = await this.store.readLatest(provider.id)
    if (!this.force && previous && !this.#isDue(previous, nowMs)) {
      return { id: provider.id, status: RunStatus.SKIPPED, reason: 'not due yet' }
    }

    const { selected, nextCursor } = this.#selectBatch(previous)
    const outcomes = await this.#fetchBatch(selected, nowMs)
    const fresh = new Map()
    const failed = new Set()

    for (const [index, province] of selected.entries()) {
      const outcome = outcomes[index]
      try {
        if (!outcome?.ok) throw outcome?.error ?? new Error('no result')
        fresh.set(province.id, this.#buildDocument(province, outcome.value, nowMs))
      } catch (error) {
        failed.add(province.id)
        this.log.warn(`[${provider.id}] ${province.id}: ${error.message}`)
      }
    }

    if (fresh.size === 0) {
      return { id: provider.id, status: RunStatus.FAILED, reason: 'no province could be fetched' }
    }

    const entries = []
    for (const province of this.provinces) {
      const freshDoc = fresh.get(province.id)
      if (freshDoc) await this.store.writeProvince(provider.id, freshDoc)
      const doc = freshDoc ?? (await this.store.readProvince(provider.id, province.id))
      entries.push(this.#toLatestEntry(province, doc, failed.has(province.id), freshDoc !== undefined, nowMs))
    }

    await this.store.writeLatest(provider.id, {
      schema: 1,
      id: provider.id,
      label: provider.label,
      source: provider.label,
      model: provider.model,
      attribution: provider.attribution,
      intervalMinutes: provider.intervalMinutes,
      fetchedAt: new Date(nowMs).toISOString(),
      fetchedAtMs: nowMs,
      okCount: fresh.size,
      failed: [...failed],
      cursor: nextCursor,
      provinces: entries,
    })
    return { id: provider.id, status: RunStatus.UPDATED, okCount: fresh.size, failed: failed.size, requested: selected.length }
  }

  #isDue(previous, nowMs) {
    return nowMs - previous.fetchedAtMs >= this.provider.intervalMinutes * 60_000 - SCHEDULE_SLACK_MS
  }

  #selectBatch(previous) {
    const total = this.provinces.length
    const limit = Math.min(this.provider.maxRequestsPerRun, total)
    if (limit >= total) return { selected: this.provinces, nextCursor: 0 }
    const start = (previous?.cursor ?? 0) % total
    const selected = Array.from({ length: limit }, (_, i) => this.provinces[(start + i) % total])
    return { selected, nextCursor: (start + limit) % total }
  }

  async #fetchBatch(selected, nowMs) {
    try {
      return await this.provider.fetchProvinces(selected, nowMs)
    } catch (error) {
      return selected.map(() => ({ ok: false, error }))
    }
  }

  #buildDocument(province, { rows, air = [] }, nowMs) {
    if (!rows || rows.length < MIN_ROWS) throw new Error('forecast too short')
    return {
      id: province.id,
      name: province.name,
      capital: province.capital,
      lat: province.lat,
      lon: province.lon,
      model: this.provider.model,
      fetchedAt: new Date(nowMs).toISOString(),
      fetchedAtMs: nowMs,
      summary: buildSummary(rows, province, nowMs),
      daily: aggregateDaily(rows, province),
      hourly: rows,
      air,
    }
  }

  #toLatestEntry(province, doc, hasFailed, isFresh, nowMs) {
    const summary = !doc ? null : isFresh ? doc.summary : buildSummary(doc.hourly, province, nowMs)
    return {
      id: province.id,
      name: province.name,
      capital: province.capital,
      lat: province.lat,
      lon: province.lon,
      fetchedAt: doc?.fetchedAt ?? null,
      stale: hasFailed || undefined,
      summary,
    }
  }
}
